import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Consumer, Kafka, KafkaConfig, logLevel } from "kafkajs";

type KubeletContainerMetric = {
  cpu?: {
    usageNanoCores?: unknown;
    usageCoreNanoSeconds?: unknown;
  };
  log?: unknown;
  kubernetes?: {
    container_name?: unknown;
    namespace_name?: unknown;
    pod_name?: unknown;
  };
  ["@timestamp"]?: unknown;
  [key: string]: unknown;
};

type ParsedLegacyMetric = {
  namespace: string | null;
  pod: string | null;
  container: string | null;
  timestamp: string | null;
  usageNanoCores: number | null;
  usageCoreSecondsTotal: number | null;
  cpuCores: number | null;
  cpuPercent: number | null;
};

type ParsedMetric =
  | {
      kind: "flat";
      metric: NormalizedFlatMetric;
    }
  | { kind: "legacy"; metric: ParsedLegacyMetric };

type NormalizedFlatMetric = {
  timestamp: number | null;
  timestampIso: string | null;
  service: string | null;
  namespace: string | null;
  podName: string | null;
  cpuPercent: number | null;
  cpuCores: number | null;
  memoryMb: number | null;
  memoryBytes: number | null;
  diskMb: number | null;
  diskBytes: number | null;
  networkIn: number | null;
  networkOut: number | null;
  metadata: {
    region: string | null;
    node: string | null;
    namespace: string | null;
  };
};

const DEFAULT_CLIENT_ID = "panopticon-backend-metrics";
const DEFAULT_BROKERS = ["localhost:9092"];
const DEFAULT_TOPIC = "metrics";
const DEFAULT_GROUP_ID = "panopticon-backend-metrics-consumer";

@Injectable()
export class MetricsKafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsKafkaService.name);
  private readonly kafka: Kafka;
  private readonly topic: string;
  private readonly groupId: string;
  private readonly enabled: boolean;
  private consumer: Consumer | null = null;
  private lastKubeletErrorLoggedAt = 0;

  constructor() {
    const brokersEnv =
      process.env.KAFKA_BROKERS ?? process.env.KAFKA_METRICS_BROKERS;
    const brokers = brokersEnv
      ? brokersEnv
          .split(",")
          .map((broker) => broker.trim())
          .filter(Boolean)
      : DEFAULT_BROKERS;

    if (brokers.length === 0) {
      throw new Error("Kafka configuration error: no brokers provided");
    }

    const kafkaConfig: KafkaConfig = {
      clientId: process.env.KAFKA_METRICS_CLIENT_ID ?? DEFAULT_CLIENT_ID,
      brokers,
      logLevel: logLevel.NOTHING,
      ssl: process.env.KAFKA_METRICS_SSL === "true",
    };

    this.kafka = new Kafka(kafkaConfig);
    this.topic = process.env.KAFKA_METRICS_TOPIC ?? DEFAULT_TOPIC;
    this.groupId = process.env.KAFKA_METRICS_CONSUMER_GROUP ?? DEFAULT_GROUP_ID;
    this.enabled =
      process.env.KAFKA_METRICS_ENABLED !== "false" &&
      process.env.NODE_ENV !== "test";
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log("Kafka metrics consumer disabled");
      return;
    }

    await this.ensureTopic();

    this.consumer = this.kafka.consumer({
      groupId: this.groupId,
      allowAutoTopicCreation: true,
    });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.topic,
      fromBeginning: false,
    });

    this.logger.log(
      `Kafka metrics consumer subscribed: topic=${this.topic}, groupId=${this.groupId}`,
    );

    void this.consumer
      .run({
        eachMessage: async ({ message }) => {
          const rawValue = message.value?.toString();
          if (!rawValue) {
            this.logger.warn("Received Kafka metrics message without payload");
            return;
          }

          try {
            const parsed = JSON.parse(rawValue) as KubeletContainerMetric;
            const isCollectorError = this.isKubeletError(
              parsed as unknown as Record<string, unknown>,
            );
            const metric = this.extractMetric(parsed);
            if (!metric) {
              if (isCollectorError) {
                this.logCollectorError();
                return;
              }

              this.logger.warn(
                `Kafka metrics message missing CPU data, raw=${rawValue}`,
              );
              return;
            }

            this.printMetric(metric);
          } catch (error) {
            this.logger.error(
              `Failed to parse Kafka metrics message: ${rawValue}`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        },
      })
      .catch((error) => {
        this.logger.error(
          `Kafka metrics consumer run failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.enabled || !this.consumer) {
      return;
    }

    await this.consumer.stop();
    await this.consumer.disconnect();
    this.logger.log("Kafka metrics consumer stopped");
  }

  private async ensureTopic(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        waitForLeaders: true,
        topics: [
          {
            topic: this.topic,
            numPartitions: Number(
              process.env.KAFKA_METRICS_TOPIC_PARTITIONS ?? 1,
            ),
            replicationFactor: Number(
              process.env.KAFKA_METRICS_TOPIC_REPLICATION ?? 1,
            ),
          },
        ],
      });
    } catch (error) {
      this.logger.debug(
        `Kafka metrics topic creation skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      await admin.disconnect();
    }
  }

  private extractMetric(payload: KubeletContainerMetric): ParsedMetric | null {
    const normalized = this.unwrapLogPayload(payload);

    if (this.isKubeletError(normalized)) {
      return null; // 조용히 무시
    }

    const flat = this.parseFlattenedMetric(normalized);
    if (flat) {
      return { kind: "flat", metric: flat };
    }

    const legacy = this.parseLegacyMetric(normalized);
    if (legacy) {
      return { kind: "legacy", metric: legacy };
    }

    return null;
  }

  private isKubeletError(payload: Record<string, unknown>): boolean {
    const logStr = String(payload.log || "");
    const msgStr = String(payload.msg || "");
    const errorStr = String(payload.error || "");

    // kubelet stats 관련 에러 패턴 감지
    return (
      logStr.includes("Failed to query kubelet") ||
      logStr.includes("Timed out while waiting for kubelet") ||
      msgStr.includes("Failed to query kubelet") ||
      msgStr.includes("Timed out while waiting for kubelet") ||
      errorStr.includes("kubelet stats")
    );
  }

  private unwrapLogPayload(
    payload: KubeletContainerMetric,
  ): Record<string, unknown> {
    const base: Record<string, unknown> =
      typeof payload === "object" && payload !== null ? { ...payload } : {};

    const logField = payload.log;
    if (typeof logField !== "string") {
      return base;
    }

    const jsonStart = logField.indexOf("{");
    if (jsonStart === -1) {
      return base;
    }

    const jsonCandidate = logField.slice(jsonStart);
    try {
      const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
      return { ...base, ...parsed };
    } catch (error) {
      this.logger.debug?.(
        `Failed to parse log field payload: ${jsonCandidate}`,
        error instanceof Error ? error.stack : undefined,
      );
      return base;
    }
  }

  private printMetric(metric: ParsedMetric): void {
    if (metric.kind === "flat") {
      const parts = [
        metric.metric.timestampIso
          ? `ts=${metric.metric.timestampIso}`
          : metric.metric.timestamp !== null
            ? `ts=${metric.metric.timestamp}`
            : null,
        metric.metric.service ? `service=${metric.metric.service}` : null,
        metric.metric.namespace ? `ns=${metric.metric.namespace}` : null,
        metric.metric.podName ? `pod=${metric.metric.podName}` : null,
        metric.metric.cpuPercent !== null
          ? `cpu%=${metric.metric.cpuPercent.toFixed(2)}`
          : null,
        metric.metric.cpuCores !== null
          ? `cpuCores=${metric.metric.cpuCores.toFixed(4)}`
          : null,
        metric.metric.memoryMb !== null
          ? `memMB=${metric.metric.memoryMb.toFixed(2)}`
          : null,
        metric.metric.diskMb !== null
          ? `diskMB=${metric.metric.diskMb.toFixed(2)}`
          : null,
        metric.metric.networkIn !== null
          ? `netIn=${metric.metric.networkIn}`
          : null,
        metric.metric.networkOut !== null
          ? `netOut=${metric.metric.networkOut}`
          : null,
        metric.metric.metadata.node
          ? `node=${metric.metric.metadata.node}`
          : null,
        metric.metric.metadata.region
          ? `region=${metric.metric.metadata.region}`
          : null,
      ].filter((value): value is string => Boolean(value));

      this.logger.log(parts.join(" | "));
      return;
    }

    const legacy = metric.metric;
    if (!legacy.container || legacy.cpuCores === null) {
      this.logger.warn("Kafka legacy metrics message missing CPU data");
      return;
    }

    const parts = [
      legacy.timestamp ? `ts=${legacy.timestamp}` : null,
      legacy.namespace ? `ns=${legacy.namespace}` : null,
      legacy.pod ? `pod=${legacy.pod}` : null,
      `container=${legacy.container}`,
      `cpu=${legacy.cpuCores.toFixed(6)} cores`,
      legacy.cpuPercent !== null
        ? `cpu%=${legacy.cpuPercent.toFixed(2)}`
        : null,
      legacy.usageNanoCores !== null
        ? `nanoCores=${legacy.usageNanoCores}`
        : null,
    ].filter((value): value is string => Boolean(value));

    this.logger.log(parts.join(" | "));
  }

  private parseFlattenedMetric(
    payload: Record<string, unknown>,
  ): NormalizedFlatMetric | null {
    const cpuPercent = this.coerceNumber(payload.cpu);
    if (cpuPercent === null) {
      return null;
    }

    const cpuCores = this.coerceNumber(payload.cpu_cores);
    const memoryMb = this.coerceNumber(payload.memory);
    const diskMb = this.coerceNumber(payload.disk);

    const networkIn = this.coerceNumber(payload.network_in);
    const networkOut = this.coerceNumber(payload.network_out);

    const memoryBytes = this.coerceNumber(payload.memory_bytes);
    const diskBytes = this.coerceNumber(payload.disk_bytes);

    const timestamp = this.coerceNumber(payload.timestamp);
    const timestampIso =
      typeof payload.timestamp_iso === "string"
        ? payload.timestamp_iso
        : typeof payload["@timestamp"] === "string"
          ? (payload["@timestamp"] as string)
          : null;

    const metadata = this.parseMetadata(payload.metadata);

    return {
      timestamp,
      timestampIso,
      service: typeof payload.service === "string" ? payload.service : null,
      namespace:
        typeof payload.namespace === "string" ? payload.namespace : null,
      podName: typeof payload.podName === "string" ? payload.podName : null,
      cpuPercent,
      cpuCores,
      memoryMb,
      memoryBytes,
      diskMb,
      diskBytes,
      networkIn,
      networkOut,
      metadata,
    };
  }

  private parseLegacyMetric(
    payload: Record<string, unknown>,
  ): ParsedLegacyMetric | null {
    const candidate = payload as KubeletContainerMetric;
    const usageNanoRaw = candidate.cpu?.usageNanoCores;
    const usageNsRaw = candidate.cpu?.usageCoreNanoSeconds;

    const usageNanoCores =
      typeof usageNanoRaw === "number"
        ? usageNanoRaw
        : typeof usageNanoRaw === "string"
          ? Number(usageNanoRaw)
          : null;

    const usageNs =
      typeof usageNsRaw === "number"
        ? usageNsRaw
        : typeof usageNsRaw === "string"
          ? Number(usageNsRaw)
          : null;

    if (usageNanoCores === null && usageNs === null) {
      return null;
    }

    const cpuCores =
      usageNanoCores !== null ? usageNanoCores / 1_000_000_000 : null;
    const cpuPercent = cpuCores !== null ? cpuCores * 100 : null;

    const namespace =
      typeof candidate.kubernetes?.namespace_name === "string"
        ? candidate.kubernetes?.namespace_name
        : null;
    const pod =
      typeof candidate.kubernetes?.pod_name === "string"
        ? candidate.kubernetes?.pod_name
        : null;
    const container =
      typeof candidate.kubernetes?.container_name === "string"
        ? candidate.kubernetes?.container_name
        : null;

    const timestamp =
      typeof candidate["@timestamp"] === "string"
        ? (candidate["@timestamp"] as string)
        : null;

    return {
      namespace,
      pod,
      container,
      timestamp,
      usageNanoCores,
      usageCoreSecondsTotal: usageNs !== null ? usageNs / 1_000_000_000 : null,
      cpuCores,
      cpuPercent,
    };
  }

  private coerceNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private parseMetadata(metadata: unknown): NormalizedFlatMetric["metadata"] {
    if (typeof metadata !== "object" || metadata === null) {
      return { region: null, node: null, namespace: null };
    }

    const record = metadata as Record<string, unknown>;
    return {
      region: typeof record.region === "string" ? record.region : null,
      node: typeof record.node === "string" ? record.node : null,
      namespace: typeof record.namespace === "string" ? record.namespace : null,
    };
  }

  private logCollectorError(): void {
    const now = Date.now();
    if (now - this.lastKubeletErrorLoggedAt > 30_000) {
      this.logger.debug(
        "Kafka metrics message contained kubelet error payload (ignored)",
      );
      this.lastKubeletErrorLoggedAt = now;
    }
  }
}
