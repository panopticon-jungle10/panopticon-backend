import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import type { KafkaConfig } from "kafkajs";

const DEFAULT_BROKER = "localhost:9092";

function resolveBrokerList(raw?: string): string[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }

  const isRunningInsideDocker = process.env.KAFKA_IN_DOCKER === "true";

  return raw
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean)
    .map((broker) => {
      if (!isRunningInsideDocker && broker.startsWith("kafka:")) {
        return broker.replace(/^kafka(?=:)/, "localhost");
      }
      return broker;
    });
}

export function parseKafkaBrokers(): string[] {
  const preferLocalOverride =
    process.env.KAFKA_BROKERS_LOCAL && process.env.KAFKA_IN_DOCKER !== "true";
  const brokersEnv = preferLocalOverride
    ? process.env.KAFKA_BROKERS_LOCAL
    : process.env.KAFKA_BROKERS;
  const fallback = process.env.KAFKA_BROKER_FALLBACK ?? DEFAULT_BROKER;

  const brokers = resolveBrokerList(brokersEnv);
  if (process.env.DEBUG_KAFKA_BROKERS === "true") {
    console.log(
      "[kafka-config] 환경 변수에서 읽은 브로커:",
      brokersEnv,
      "→ 변환 결과:",
      brokers,
    );
  }

  if (brokers.length === 0) {
    const fallbackList = resolveBrokerList(fallback);
    if (fallbackList.length === 0) {
      throw new Error("Kafka 브로커 설정을 찾을 수 없습니다.");
    }
    return fallbackList;
  }

  return brokers;
}

interface KafkaMicroserviceParams {
  clientId: string;
  groupId: string;
  allowAutoTopicCreation?: boolean;
  brokers?: string[];
}

type KafkaSecurityOverrides = Pick<KafkaConfig, "ssl" | "sasl">;

// fetch 옵션 기본값 (환경 변수가 없을 때 사용)
const DEFAULT_FETCH_MAX_BYTES = 50 * 1024 * 1024; // 50MB
const DEFAULT_FETCH_MAX_BYTES_PER_PARTITION = 10 * 1024 * 1024; // 10MB
const DEFAULT_FETCH_MIN_BYTES = 1 * 1024 * 1024; // 1MB
const DEFAULT_FETCH_MAX_WAIT_MS = 50;

// 양수인 정수 환경 변수만 추출해 Kafka fetch 옵션에 안전하게 반영한다.
function parsePositiveInt(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildKafkaSecurityConfig(): KafkaSecurityOverrides {
  const sslEnabled = process.env.KAFKA_SSL === "true";
  const sslRejectUnauthorized =
    process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== "false";

  const ssl = sslEnabled
    ? { rejectUnauthorized: sslRejectUnauthorized }
    : undefined;

  const mechanism = process.env.KAFKA_SASL_MECHANISM;
  if (!mechanism) {
    return { ssl };
  }

  if (mechanism === "oauthbearer") {
    const region =
      process.env.KAFKA_AWS_REGION ??
      process.env.AWS_REGION ??
      "ap-northeast-2";

    return {
      ssl,
      sasl: {
        mechanism: "oauthbearer",
        oauthBearerProvider: async () => {
          try {
            const { generateAuthToken } = await import(
              "aws-msk-iam-sasl-signer-js"
            );
            const token = await generateAuthToken({ region });
            return { value: token.token };
          } catch (error) {
            throw new Error(`AWS MSK IAM 토큰 생성에 실패했습니다: ${error}`);
          }
        },
      },
    };
  }

  const username = process.env.KAFKA_SASL_USERNAME;
  const password = process.env.KAFKA_SASL_PASSWORD;
  if (username && password) {
    return {
      ssl,
      sasl: {
        mechanism: mechanism,
        username,
        password,
      } as KafkaConfig["sasl"],
    };
  }

  return { ssl };
}

export function getKafkaSecurityOverrides(): KafkaSecurityOverrides {
  return buildKafkaSecurityConfig();
}

export function createKafkaMicroserviceOptions(
  params: KafkaMicroserviceParams,
): MicroserviceOptions {
  const brokers = params.brokers ?? parseKafkaBrokers();
  const { ssl, sasl } = buildKafkaSecurityConfig();

  if (brokers.length === 0) {
    throw new Error(
      "Kafka microservice configuration requires at least one broker",
    );
  }

  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: params.clientId,
        brokers,
        ssl,
        sasl,
      },
      consumer: {
        groupId: params.groupId,
        allowAutoTopicCreation: params.allowAutoTopicCreation ?? true,
        partitionsConsumedConcurrently: Number.parseInt(
          process.env.KAFKA_CONCURRENT_PARTITIONS ?? "3",
          10,
        ),
        // fetch 용량/대기 시간을 환경 변수로 조절해 한 번에 더 많은 레코드를 끌어올 수 있다.
        maxBytes:
          parsePositiveInt(process.env.KAFKA_FETCH_MAX_BYTES) ??
          DEFAULT_FETCH_MAX_BYTES,
        maxBytesPerPartition:
          parsePositiveInt(process.env.KAFKA_FETCH_MAX_BYTES_PER_PARTITION) ??
          DEFAULT_FETCH_MAX_BYTES_PER_PARTITION,
        minBytes:
          parsePositiveInt(process.env.KAFKA_FETCH_MIN_BYTES) ??
          DEFAULT_FETCH_MIN_BYTES,
        maxWaitTimeInMs:
          parsePositiveInt(process.env.KAFKA_FETCH_MAX_WAIT_MS) ??
          DEFAULT_FETCH_MAX_WAIT_MS,
      },
    },
  };
}
