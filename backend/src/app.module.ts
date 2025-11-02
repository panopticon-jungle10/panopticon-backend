import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { KafkaModule } from "./kafka-set/kafka.module";
import { LogsModule } from "./api/logs/logs.module";
import { EsSetModule } from "./es-set/es-set.module";

@Module({
  imports: [KafkaModule, LogsModule, EsSetModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
