import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck() {
    return {
      timestamp: new Date().toISOString(),
      message: 'ok',
    };
  }

  /**
   * 로컬테스트용 엔드포인트
   * @param data
   * @returns
   */
  @Post('sdk/logs')
  @HttpCode(HttpStatus.ACCEPTED)
  async getLogsFromSdk(@Body() data: any) {
    const logData = Array.isArray(data) ? data : [data];
    console.log(JSON.stringify(logData, null, 2));

    return { success: true };
  }

  @Post('sdk/traces')
  @HttpCode(HttpStatus.ACCEPTED)
  async getTraceFromSdk(@Body() data: any) {
    const traceData = Array.isArray(data) ? data : [data];
    console.log(JSON.stringify(traceData, null, 2));

    return { success: true };
  }
}
