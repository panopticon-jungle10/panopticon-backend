import { Module } from "@nestjs/common";
import { MetricsKafkaService } from "./metrics.service";

@Module({
  providers: [MetricsKafkaService],
})
export class MetricsModule {}
