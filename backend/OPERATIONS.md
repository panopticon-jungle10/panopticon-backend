# Backend Operations Guide

Panopticon 백엔드를 빌드/배포/운영하기 위한 실무 가이드입니다. 각 기능은 별도 이미지/프로세스로 분리되어 있어 장애 격리와 독립 스케일링이 가능합니다.

## 컴포넌트와 Docker 타깃
| 역할 | Docker target | 설명 |
| --- | --- | --- |
| Query API | `query-api` | 서비스/엔드포인트 메트릭, 스팬/로그 검색, 트레이스 조회 |
| Stream Processor | `stream-processor` | Kafka `apm.logs`/`apm.spans` 소비 → ES 데이터 스트림에 `_bulk` 색인, ERROR 로그는 별도 토픽으로 복제 |
| Error Stream | `error-stream` | `apm.logs.error` 소비 → WebSocket(`ws://host:3010/ws/error-logs`) 브로드캐스트 |
| Aggregator | `aggregator` | 닫힌 1분 구간을 롤업 집계해 `metrics-apm` 데이터 스트림에 저장 |

## 로컬 실행/빌드
모든 명령은 `backend`에서 실행합니다.

```bash
npm ci
npm run start:query-api          # 포트 3001
npm run start:stream-processor   # Kafka 컨슈머
npm run start:error-stream       # WebSocket + Kafka
npm run start:aggregator         # 롤업 워커

# 프로덕션 빌드
npm run build

# Docker 이미지 빌드 예시
docker build -f backend/Dockerfile -t panopticon-query-api --target query-api backend
docker build -f backend/Dockerfile -t panopticon-stream-processor --target stream-processor backend
docker build -f backend/Dockerfile -t panopticon-error-stream --target error-stream backend
docker build -f backend/Dockerfile -t panopticon-aggregator --target aggregator backend
```

ECR 푸시 예시:
```bash
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag panopticon-query-api:latest <account>.dkr.ecr.<region>.amazonaws.com/panopticon-query-api:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/panopticon-query-api:latest
```

## 서비스별 핵심 환경 변수
- 공통: `ELASTICSEARCH_NODE`, `OPENSEARCH_USERNAME/PASSWORD`, `OPENSEARCH_REJECT_UNAUTHORIZED`, `USE_ISM`, `KAFKA_BROKERS`(또는 `KAFKA_BROKERS_LOCAL`), `KAFKA_SSL`, `KAFKA_SASL_*`
- Query API: `PORT`, `ROLLUP_ENABLED`, `ROLLUP_THRESHOLD_MINUTES`, `ROLLUP_BUCKET_MINUTES`, `ROLLUP_CACHE_TTL_SECONDS`, `REDIS_HOST`(캐시 활성화)
- Stream Processor: `KAFKA_APM_LOG_TOPIC`, `KAFKA_APM_SPAN_TOPIC`, `_bulk` 튜닝(`BULK_BATCH_SIZE`, `BULK_BATCH_BYTES_MB`, `BULK_FLUSH_INTERVAL_MS`, `BULK_MAX_PARALLEL_FLUSHES`), 처리량 로그(`STREAM_THROUGHPUT_*`)
- Error Stream: `KAFKA_APM_LOG_ERROR_TOPIC`, `ERROR_STREAM_PORT`, `ERROR_STREAM_WS_ORIGINS`, `ERROR_STREAM_WS_PATH`
- Aggregator: `ROLLUP_AGGREGATOR_ENABLED`, `ROLLUP_BUCKET_SECONDS`, `ROLLUP_POLL_INTERVAL_MS`, `ROLLUP_INITIAL_LOOKBACK_MINUTES`, `ROLLUP_INDEX_PREFIX`, `ROLLUP_CHECKPOINT_INDEX`

## 운영/성능 튜닝 팁
- **Bulk 색인**: `_bulk` 버퍼 크기와 동시 플러시(`BULK_MAX_PARALLEL_FLUSHES`)를 클러스터 상태에 맞게 조정합니다.
- **Kafka 소비량 모니터링**: `STREAM_THROUGHPUT_*`로 샘플 처리량 로그를 남겨 병목을 조기에 파악합니다.
- **롤업 조회 전략**: 긴 구간 조회는 롤업 버킷(`metrics-apm`)을 우선 사용하고 최신 구간만 RAW를 읽습니다. 캐시 TTL을 상황에 맞게 늘리거나 줄이세요.
- **보안**: TLS/SSL·SASL(AWS MSK IAM 포함)을 환경 변수로 켜고, ISM/ILM/템플릿은 부팅 시 자동 생성되지만 프로덕션에서는 최소 권한 계정으로 접속하세요.
- **WebSocket 알림**: 허용 Origin은 `ERROR_STREAM_WS_ORIGINS`로 제한하고, 에러 토픽 소비가 실패하면 로그로 확인 후 Kafka 설정을 점검합니다.

## 배포 체크리스트
- ECR에 최신 이미지 푸시 여부 확인 (`query-api`, `stream-processor`, `error-stream`, `aggregator` 각각).
- ECS/Compose에 필수 환경 변수 입력: ES, Kafka, Redis, 롤업/캐시/버퍼 설정.
- Kafka 토픽 권한 및 SASL/SSL 설정 검증.
- 롤업/캐시 기능 플래그(`ROLLUP_ENABLED`, `ROLLUP_AGGREGATOR_ENABLED`, `ROLLUP_CACHE_TTL_SECONDS`) 원하는 상태인지 확인.
- WebSocket 경로/Origin, 헬스체크 엔드포인트(`/query/health`, `/health`)를 로드밸런서에 등록.

## 트러블슈팅 힌트
- **컨슈머 지연**: `_bulk` 설정 과도, Kafka fetch 옵션(`KAFKA_FETCH_*`) 조정 필요 여부 확인.
- **롤업 누락**: Aggregator 로그에서 체크포인트/집계/저장 단계 에러 확인, `ROLLUP_CHECKPOINT_INDEX` 접근 권한 점검.
- **캐시 미동작**: `REDIS_HOST` 설정 여부, TLS 옵션(`REDIS_USE_TLS`, `REDIS_REJECT_UNAUTHORIZED`) 확인.
- **에러 알림 미수신**: `apm.logs.error` 토픽 유입 여부와 Error Stream WebSocket 접속 로그 확인. 프런트 CORS/Origin 설정 점검.
