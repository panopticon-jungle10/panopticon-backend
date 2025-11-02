import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Client } from "@elastic/elasticsearch";

/**
 * Elasticsearch 클라이언트 공통 서비스
 * - ES 연결을 중앙에서 관리
 * - 여러 모듈에서 재사용 가능
 */
@Injectable()
export class EsSetService implements OnModuleInit {
  private readonly logger = new Logger(EsSetService.name);
  private readonly client: Client;

  constructor() {
    const esNode = process.env.ELASTICSEARCH_NODE || "http://localhost:9200";

    this.client = new Client({
      node: esNode,
    });

    this.logger.log(`Elasticsearch client initialized: ${esNode}`);
  }

  async onModuleInit() {
    try {
      const health = await this.client.cluster.health();
      this.logger.log(`Elasticsearch connected successfully: ${health.status}`);
    } catch (error) {
      this.logger.error("Failed to connect to Elasticsearch", error);
    }
  }

  /**
   * Elasticsearch 클라이언트 인스턴스 반환
   * @returns ES Client
   */
  getClient(): Client {
    return this.client;
  }
}
