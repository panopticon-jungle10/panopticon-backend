# Panopticon Backend

NestJS 기반 APM 백엔드로, 수집된 로그·스팬을 Elasticsearch에 적재하고 조회/알림/롤업을 제공합니다. Kafka를 통해 들어오는 실시간 이벤트를 처리하고, 대시보드용 HTTP API와 WebSocket 알림 채널을 함께 제공합니다.

## 아키텍처 한눈에 보기
- **stream-processor**: Kafka `apm.logs`/`apm.spans` 토픽 소비 → 검증 후 ES 데이터 스트림(`logs-apm`, `traces-apm`)에 `_bulk` 색인. ERROR 로그는 별도 토픽(`apm.logs.error`)으로 포워딩.
- **query-api**: 서비스/엔드포인트 메트릭, 스팬/로그 검색, 단일 트레이스 조회용 읽기 전용 HTTP API. 롤업(1분 버킷) 데이터와 Redis 캐시를 활용해 긴 구간 조회를 가속.
- **error-stream**: `apm.logs.error`를 소비해 WebSocket으로 프런트엔드에 실시간 에러 알림 송신.
- **aggregator**: 닫힌 분(minute) 단위로 `traces-apm`을 집계해 롤업 데이터 스트림(`metrics-apm`)을 채우는 워커.
- **shared**: 공통 DTO, 저장소, Kafka/ES 설정, Redis 캐시 유틸.

## 주요 기능
- APM 로그/스팬 ingest 및 `_bulk` 색인 최적화(배치/바이트/타이머 기준 플러시, 병렬 플러시 한도).
- 서비스·엔드포인트 메트릭(요청 건수, p95/p90/p50, 에러율)과 트레이스/스팬/로그 검색 API 제공.
- 롤업 파이프라인(1분 버킷) 및 롤업+RAW 자동 병합 조회, Redis 기반 단기 캐시.
- Kafka → WebSocket 에러 스트림 브리지로 실시간 에러 알림.

## 디렉터리 구조
```
backend/
  src/
    query-api/           # 읽기 전용 HTTP API
    stream-processor/    # Kafka 컨슈머(로그/스팬) + 샘플 프로듀서
    error-stream/        # 에러 로그 WebSocket 브리지
    aggregator/          # 롤업 워커
    shared/              # 공통 DTO/서비스/설정
```

## 빠른 시작
> 모든 명령은 `backend` 디렉터리에서 실행합니다.

```bash
cd backend
npm ci

# 로컬 개발 (env는 .env/.env.local 사용)
npm run start:query-api          # HTTP API (포트 3001)
npm run start:stream-processor   # Kafka 컨슈머
npm run start:error-stream       # WebSocket + Kafka
npm run start:aggregator         # 롤업 워커
```

### 필수/주요 환경 변수
- OpenSearch/ES: `ELASTICSEARCH_NODE`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`, `OPENSEARCH_REJECT_UNAUTHORIZED`, `USE_ISM`
- Kafka: `KAFKA_BROKERS` (`KAFKA_BROKERS_LOCAL`), `KAFKA_SSL`, `KAFKA_SASL_MECHANISM`, `KAFKA_SASL_USERNAME/PASSWORD`, `KAFKA_AWS_REGION`
- APM 토픽: `KAFKA_APM_LOG_TOPIC`, `KAFKA_APM_SPAN_TOPIC`, `KAFKA_APM_LOG_ERROR_TOPIC`
- Redis 캐시: `REDIS_HOST` (캐시 비활성화 시 생략), `METRICS_CACHE_PREFIX`, `METRICS_CACHE_TTL_SECONDS`
- 롤업: `ROLLUP_ENABLED`, `ROLLUP_THRESHOLD_MINUTES`, `ROLLUP_BUCKET_MINUTES`, `ROLLUP_CACHE_TTL_SECONDS`

## API 개요 (주요 엔드포인트)
- **트레이스**
  - `GET /query/traces/:traceId` : 단일 트레이스의 스팬/로그 전체 반환(서비스/환경 필터 선택)
  - `GET /query/services/:serviceName/traces` : 서비스별 루트 스팬 검색(상태/지연/시간 범위/정렬/페이지)
- **스팬 검색**
  - `GET /query/spans` : 서비스/환경/이름/종류/상태/지연/트레이스·부모 ID 기준 검색, 페이지네이션/정렬 지원
- **로그 검색**
  - `GET /query/logs` : 서비스/환경/레벨/트레이스·스팬 ID/메시지로 검색, 기본 최근 15분 범위
- **서비스 메트릭**
  - `GET /query/services/:serviceName/metrics` : 요청 건수(버킷 합계), p95/p90/p50, 에러율 시계열. 긴 구간은 롤업+RAW 병합, Redis 캐시 활용
- **서비스 개요**
  - `GET /query/services` : 시간 구간 내 서비스별 요청수/p95/에러율 목록(정렬/검색/limit 지원)
- **엔드포인트 메트릭/트레이스**
  - `GET /query/services/:serviceName/endpoints` : 엔드포인트별 요청수/p95/에러율 랭킹(정렬/필터/limit)
  - `GET /query/services/:serviceName/endpoints/:endpointName/traces` : 특정 엔드포인트의 최근 에러/느린 트레이스
- **WebSocket 에러 알림**
  - 경로: `ws://<host>:3010/ws/error-logs` (환경 변수로 변경 가능)
  - 이벤트: `error-log` (Kafka `apm.logs.error` 소비 후 전송)

## 롤업 파이프라인
- Aggregator가 닫힌 1분 구간을 계획(MinuteWindowPlanner) → 서비스/환경별 percentiles 및 에러율 집계 → `metrics-apm` 데이터 스트림에 `_bulk create` 저장.
- Query API는 조회 구간이 `ROLLUP_THRESHOLD_MINUTES` 이상이면 과거 구간을 롤업으로 채우고, 최신 구간은 RAW 집계로 결합해 응답.

## 운영 팁
- Kafka/ES/Redis는 `infra/docker-compose.yml`로 로컬 부트스트랩 가능.
- `_bulk` 설정은 `BULK_BATCH_SIZE`, `BULK_BATCH_BYTES_MB`, `BULK_MAX_PARALLEL_FLUSHES` 등으로 조정해 클러스터 부하에 맞출 수 있습니다.
- Throughput 모니터링: `STREAM_THROUGHPUT_*` 환경 변수를 설정하면 컨슈머 처리량 로그를 샘플링해 남깁니다.
- 보안: OpenSearch ISM 또는 Elasticsearch ILM/템플릿을 자동 생성하지만, 프로덕션에서는 최소 권한 계정과 TLS 설정을 사용하세요.

## 샘플 이벤트 발행
```bash
npm run test:sample:log   # Kafka에 샘플 로그 전송
npm run test:sample:span  # Kafka에 샘플 스팬 전송
```

## 운영 가이드 링크
- 백엔드 빌드/배포/환경 변수 세부 가이드는 [backend/OPERATIONS.md](backend/OPERATIONS.md)를 참고하세요.

## 이 아키텍처의 강점
- **책임 분리 + 스케일링**: ingest(stream-processor) / 롤업(aggregator) / 조회(query-api) / 실시간 알림(error-stream)을 각각 컨테이너로 분리해 장애 격리, 트래픽 패턴별 독립 확장이 가능.
- **운영 튜너블**: 환경 변수만으로 ILM/ISM, Kafka SSL/SASL, `_bulk` 버퍼, 롤업/캐시 전략을 즉시 조정해 인프라 부하에 맞출 수 있음.
- **성능 보호**: 1분 롤업 + Redis 캐시로 긴 구간 조회를 가볍게 하고, ThroughputTracker/배치 플러시로 컨슈머 병목을 방지.
- **데이터 신뢰성**: DTO 검증, ISM/ILM 자동 생성, idempotent 롤업 ID로 중복/충돌을 줄이고, 에러 로그는 별도 토픽으로 분리해 손실 위험을 낮춤.
