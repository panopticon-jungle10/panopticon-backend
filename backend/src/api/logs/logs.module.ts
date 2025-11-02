import { Module } from "@nestjs/common";
import { LogsController } from "./logs.controller";
import { LogsService } from "./logs.service";
import { EsSetModule } from "../../es-set/es-set.module";

@Module({
  imports: [EsSetModule], // EsSetService를 사용하기 위해 명시적으로 import
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
