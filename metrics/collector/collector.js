import https from "https";
import fs from "fs";

const NODE_NAME = process.env.NODE_NAME;
const TARGET_NAMESPACE = process.env.TARGET_NAMESPACE ?? "default";
const TARGET_POD_PREFIX = process.env.TARGET_POD_PREFIX ?? "log-generator";
const SCRAPE_INTERVAL =
  Number.parseInt(process.env.SCRAPE_INTERVAL_MS ?? "10000", 10) || 10000;
const ALLOW_INSECURE_TLS = process.env.ALLOW_INSECURE_TLS === "true";
const SERVICE_NAME_OVERRIDE = process.env.SERVICE_NAME ?? null;
const REGION_OVERRIDE = process.env.METRICS_REGION ?? null;

if (!NODE_NAME) {
  console.error("NODE_NAME env not set; unable to query kubelet stats");
  process.exit(1);
}

const tokenPath =
  process.env.SA_TOKEN_PATH ??
  "/var/run/secrets/kubernetes.io/serviceaccount/token";
const caPath =
  process.env.SA_CA_PATH ??
  "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";

function readFileOptional(path, encoding = "utf8") {
  try {
    return fs.readFileSync(path, encoding);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: `Failed to read file ${path}`,
        error: error instanceof Error ? error.message : String(error ?? ""),
      }),
    );
    return null;
  }
}

const bearerToken = readFileOptional(tokenPath, "utf8")?.trim();
const caCert = ALLOW_INSECURE_TLS ? null : readFileOptional(caPath);

if (!bearerToken || (!ALLOW_INSECURE_TLS && !caCert)) {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Missing service account token or CA cert; exiting",
    }),
  );
  process.exit(1);
}

const agent = new https.Agent({
  keepAlive: false,
  maxCachedSessions: 0,
  minVersion: "TLSv1.2",
  rejectUnauthorized: !ALLOW_INSECURE_TLS,
  ...(ALLOW_INSECURE_TLS ? {} : { ca: caCert }),
});

function fetchAndLogMetrics() {
  const path = `/api/v1/nodes/${NODE_NAME}/proxy/stats/summary`;
  const options = {
    hostname: "kubernetes.default.svc",
    servername: "kubernetes.default.svc",
    port: 443,
    path,
    method: "GET",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
    },
    agent,
    timeout: Number.parseInt(process.env.KUBELET_TIMEOUT_MS ?? "5000", 10),
  };

  const req = https.request(options, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      if (res.statusCode !== 200) {
        console.error(
          JSON.stringify({
            level: "error",
            msg: "Failed to fetch kubelet stats",
            statusCode: res.statusCode,
          }),
        );
        scheduleNext();
        return;
      }

      try {
        const body = Buffer.concat(chunks).toString("utf8");
        const data = JSON.parse(body);
        processSummary(data);
        scheduleNext();
      } catch (error) {
        console.error(
          JSON.stringify({
            level: "error",
            msg: "Failed to process kubelet stats payload",
            error:
              error instanceof Error ? error.message : String(error ?? ""),
          }),
        );
        scheduleNext();
      }
    });
  });

  req.on("error", (error) => {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to query kubelet stats",
        error: error instanceof Error ? error.message : String(error ?? ""),
      }),
    );
    scheduleNext();
  });

  req.on("timeout", () => {
    req.destroy(
      new Error("Timed out while waiting for kubelet stats response"),
    );
  });

  req.end();
}

function processSummary(summary) {
  if (!summary?.pods || !Array.isArray(summary.pods)) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Unexpected kubelet summary payload (missing pods array)",
      }),
    );
    return;
  }

  for (const pod of summary.pods) {
    if (pod.podRef?.namespace !== TARGET_NAMESPACE) {
      continue;
    }

    const podNetwork = Array.isArray(pod.networks)
      ? pod.networks[0]
      : pod.network;

    const podRxBytes = toNumberSafe(podNetwork?.rxBytes);
    const podTxBytes = toNumberSafe(podNetwork?.txBytes);

    const podName = pod.podRef?.name ?? null;
    if (!podName || !podName.startsWith(TARGET_POD_PREFIX)) {
      continue;
    }

    if (!Array.isArray(pod.containers)) {
      continue;
    }

    for (const container of pod.containers) {
      const usageNanoCores =
        typeof container?.cpu?.usageNanoCores === "number"
          ? container.cpu.usageNanoCores
          : Number(container?.cpu?.usageNanoCores ?? NaN);

      const usageCoreNanoSeconds =
        typeof container?.cpu?.usageCoreNanoSeconds === "number"
          ? container.cpu.usageCoreNanoSeconds
          : Number(container?.cpu?.usageCoreNanoSeconds ?? NaN);

      if (!Number.isFinite(usageNanoCores) && !Number.isFinite(usageCoreNanoSeconds)) {
        continue;
      }

      const cpuCores =
        Number.isFinite(usageNanoCores) && usageNanoCores >= 0
          ? usageNanoCores / 1_000_000_000
          : null;

      const cpuPercent = cpuCores !== null ? cpuCores * 100 : null;

      const memoryWorkingSet = toNumberSafe(container?.memory?.workingSetBytes);
      const memoryMb =
        memoryWorkingSet !== null ? memoryWorkingSet / (1024 * 1024) : null;

      const rootfsBytes = toNumberSafe(container?.rootfs?.usedBytes);
      const logsBytes = toNumberSafe(container?.logs?.usedBytes);
      const diskBytes =
        rootfsBytes !== null
          ? rootfsBytes
          : logsBytes !== null
            ? logsBytes
            : null;
      const diskMb = diskBytes !== null ? diskBytes / (1024 * 1024) : null;

      const timestampIso =
        typeof container?.cpu?.time === "string"
          ? container.cpu.time
          : new Date().toISOString();

      const timestampMs = Date.parse(timestampIso);

      const serviceName =
        SERVICE_NAME_OVERRIDE ??
        container.name ??
        podName.replace(`${TARGET_POD_PREFIX}-`, "");

      const record = {
        timestamp: Number.isFinite(timestampMs) ? timestampMs : Date.now(),
        timestamp_iso: timestampIso,
        "@timestamp": timestampIso,
        service: serviceName,
        podName,
        namespace: pod.podRef.namespace,
        cpu: cpuPercent ?? null,
        cpu_cores: cpuCores,
        memory: memoryMb ?? null,
        memory_bytes: memoryWorkingSet,
        disk: diskMb ?? null,
        disk_bytes: diskBytes,
        network_in: podRxBytes ?? null,
        network_out: podTxBytes ?? null,
        metadata: {
          region: REGION_OVERRIDE ?? null,
          node: summary.node?.nodeName ?? NODE_NAME,
          namespace: pod.podRef.namespace ?? null,
        },
      };

      console.log(JSON.stringify(record));
    }
  }

  scheduleNext();
}

function scheduleNext() {
  setTimeout(fetchAndLogMetrics, SCRAPE_INTERVAL);
}

fetchAndLogMetrics();

function toNumberSafe(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
