import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord, CompressionTypes } from 'kafkajs';

// 토픽별 설정
interface TopicConfig {
  topic: string;
  acks: number; // 0, 1, or -1(all)
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  // 토픽별 설정 정의
  private readonly topicConfigs: Record<string, TopicConfig> = {
    logs: {
      topic: 'apm.logs',
      acks: 1,
    },
    spans: {
      topic: 'apm.spans',
      acks: 1,
    },
  };

  constructor(private readonly configService: ConfigService) {
    const client =
      this.configService.get<string>('MSK_CLIENT') || 'panopticon-producer';
    // 환경변수에서 MSK 브로커 엔드포인트들을 가져와서 배열로 변환
    const brokers = this.configService
      .get<string>('MSK_BROKERS')
      ?.split(',') || ['localhost:9094'];
    // AWS 리전 정보 가져오기
    const region = this.configService.get<string>('AWS_REGION');
    // 환경 구분 (development = 로컬 카프카, production = MSK)
    const isProduction = process.env.NODE_ENV === 'production';

    // 로컬 개발 환경: PLAINTEXT 연결
    // 배포 환경: MSK IAM 인증 사용
    this.kafka = new Kafka({
      clientId: client,
      brokers,
      ...(isProduction && {
        ssl: true,
        sasl: {
          mechanism: 'oauthbearer',
          oauthBearerProvider: async () => {
            const { generateAuthToken } = await import(
              'aws-msk-iam-sasl-signer-js'
            );

            const authTokenResponse = await generateAuthToken({
              region: region || 'ap-northeast-2',
            });

            return {
              value: authTokenResponse.token,
            };
          },
        },
      }),
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: !isProduction, // 로컬에서는 자동 생성
      transactionTimeout: 30000,
      retry: {
        retries: 3,
        initialRetryTime: 100,
        multiplier: 2,
        maxRetryTime: 30000,
      },
      // 배치 비활성화 (즉시 전송)
      idempotent: false,
      maxInFlightRequests: 1,
    });

    this.logger.log(
      `Kafka configured for ${isProduction ? 'production (MSK)' : 'development (local)'} in region: ${region}`,
    );
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka Producer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka Producer', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka Producer disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka Producer/Admin', error);
    }
  }

  /**
   * 카프카 진입점.
   */
  private async sendMessage(
    topicKey: string,
    messages: Array<{ key?: string; value: string }>,
  ) {
    if (!this.isConnected) {
      throw new Error('Kafka Producer is not connected');
    }

    const config = this.topicConfigs[topicKey];
    if (!config) {
      throw new Error(`Unknown topic key: ${topicKey}`);
    }

    try {
      const record: ProducerRecord = {
        topic: config.topic,
        acks: config.acks,
        compression: CompressionTypes.None, // 압축 비활성화
        messages: messages.map((msg) => ({
          key: msg.key,
          value: msg.value,
        })),
      };

      const result = await this.producer.send(record);
      this.logger.debug(result);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send message to topic ${config.topic}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Log 데이터 전송 (파티션 키: service_name)
   */
  async sendLogs(logData: any[]) {
    const normalLog = logData.filter((log) => log.service_name);

    const messages = normalLog.map((log) => ({
      key: log.trace_id || 'unknown', // 파티션 키: service_name
      value: JSON.stringify(log),
    }));

    return this.sendMessage('logs', messages);
  }
  /**
   * Span 데이터 전송 (파티션 키: trace_id)
   * OpenTelemetry Trace/Span 데이터 처리
   */
  async sendSpans(spanData: any | any[]) {
    const spans = Array.isArray(spanData) ? spanData : [spanData];

    const messages = spans.map((span) => ({
      key: span.trace_id || span.traceId || 'unknown', // 파티션 키: trace_id
      value: JSON.stringify(span),
    }));

    return this.sendMessage('spans', messages);
  }
  isProducerConnected() {
    return this.producer ? true : false;
  }
}
