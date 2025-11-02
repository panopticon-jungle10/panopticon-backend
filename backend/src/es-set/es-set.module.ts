import { Module } from "@nestjs/common";
import { EsSetService } from "./es-set.service";

/**
 * Elasticsearch 모듈
 * - ES 클라이언트를 제공하는 공통 모듈
 * - 사용하려는 모듈에서 명시적으로 import 필요
 */
@Module({
  providers: [EsSetService],
  exports: [EsSetService], // 다른 모듈에서 사용할 수 있도록 export
})
export class EsSetModule {}
