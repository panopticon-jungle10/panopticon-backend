/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from "@nestjs/common";
import { EsSetService } from "../../es-set/es-set.service";

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private readonly esSetService: EsSetService) {
    this.logger.log("LogsService initialized with EsSetService");
  }

  /**
   * 최근 로그 100개 조회
   */
  async getRecentLogs(size: number = 100): Promise<any> {
    try {
      const esClient = this.esSetService.getClient();

      const result = await esClient.search({
        index: "logs-*", // logs-로 시작하는 모든 인덱스 조회
        query: {
          match_all: {}, // 모든 로그 조회
        },
        sort: [
          {
            "@timestamp": {
              // timestamp 기준 내림차순 정렬 (최신순)
              order: "desc" as const,
            },
          },
        ],
        size: size, // 조회할 개수
      });

      // 결과 추출 - _source의 원본 로그만 반환
      const logs = result.hits.hits.map((hit: any) => hit._source);

      this.logger.log(`Retrieved ${logs.length} logs from Elasticsearch`);

      return {
        total: result.hits.total,
        logs: logs,
      };
    } catch (error) {
      this.logger.error("Failed to query Elasticsearch", error);
      throw error;
    }
  }
}
