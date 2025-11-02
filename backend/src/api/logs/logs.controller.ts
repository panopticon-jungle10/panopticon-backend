import { Controller, Get, Query } from "@nestjs/common";
import { LogsService } from "./logs.service";

@Controller("api/logs")
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * GET /api/logs
   * 최근 로그 100개 조회 (기본값)
   *
   * Query params:
   * - size: 조회할 로그 개수 (기본값: 100)
   */
  @Get()
  async getLogs(@Query("size") size?: string) {
    const logSize = size ? parseInt(size, 10) : 100;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.logsService.getRecentLogs(logSize);
  }
}
