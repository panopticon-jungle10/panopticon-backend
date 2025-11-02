# 애플리케이션 로그 생성기 가이드

## 🎯 목적

**MVP 로그 수집 시스템**을 위한 현실적인 애플리케이션 로그 생성기

실제 프로덕션 환경의 로그를 시뮬레이션하여:
- 로그 수집 파이프라인 테스트
- Fluent Bit 설정 검증
- Kafka 메시지 흐름 확인
- Backend 로그 처리 로직 개발

---

## 📊 생성되는 로그 타입

### 1. 🔍 DEBUG (10%)
디버깅 정보 - 개발 중 유용한 상세 정보

**예시:**
```json
{
  "timestamp": "2025-11-02T10:30:45.123Z",
  "level": "DEBUG",
  "service": "user-service",
  "message": "Cache hit for user profile",
  "trace_id": "trace-1730545845123-abc123def",
  "span_id": "span9x8y7z6w5v4u3t",
  "metadata": {
    "cache_key": "user:profile:5432",
    "ttl": 1800,
    "hit_rate": "85.23%"
  }
}
```

**시나리오:**
- 캐시 hit/miss
- 데이터베이스 연결 풀 상태
- 요청 헤더 정보
- 쿼리 실행 계획

---

### 2. ℹ️ INFO (60%)
일반 정보 - 정상적인 애플리케이션 동작

**예시:**
```json
{
  "timestamp": "2025-11-02T10:30:45.456Z",
  "level": "INFO",
  "service": "order-service",
  "message": "Order created successfully",
  "trace_id": "trace-1730545845456-xyz789ghi",
  "user_id": "user_7821",
  "session_id": "sess_8a9b0c1d2e3f",
  "ip_address": "192.168.1.100",
  "metadata": {
    "order_id": "order_54321",
    "items_count": 5,
    "total_amount": "456.78",
    "currency": "USD"
  }
}
```

**시나리오:**
- 사용자 로그인
- 주문 생성
- 결제 처리 성공
- 이메일 전송
- API 요청 처리
- 캐시 업데이트

---

### 3. ⚠️ WARN (20%)
경고 - 문제가 될 수 있는 상황

**예시:**
```json
{
  "timestamp": "2025-11-02T10:30:45.789Z",
  "level": "WARN",
  "service": "payment-service",
  "message": "Slow database query detected",
  "trace_id": "trace-1730545845789-mno456pqr",
  "metadata": {
    "query": "SELECT * FROM orders WHERE created_at > ?",
    "duration_ms": 2500,
    "threshold_ms": 1000,
    "affected_rows": 15000
  }
}
```

**시나리오:**
- 느린 쿼리
- 높은 메모리 사용
- API 요청 제한 근접
- Deprecated API 사용
- 재시도 시도

---

### 4. ❌ ERROR (8%)
에러 - 처리 가능한 오류

**예시:**
```json
{
  "timestamp": "2025-11-02T10:30:46.012Z",
  "level": "ERROR",
  "service": "payment-service",
  "message": "Payment processing failed",
  "trace_id": "trace-1730545846012-stu901vwx",
  "user_id": "user_3456",
  "error": {
    "type": "PaymentError",
    "message": "Insufficient funds in account",
    "stack_trace": "PaymentError: Insufficient funds in account\n    at payment-service.handler (/app/src/handlers/payment-service.js:85:12)\n    at processRequest (/app/src/server.js:120:8)"
  },
  "metadata": {
    "transaction_id": "txn_567890",
    "amount": "234.56",
    "payment_method": "card",
    "error_code": "INSUFFICIENT_FUNDS"
  }
}
```

**시나리오:**
- 결제 실패
- 데이터베이스 연결 실패
- 외부 API 호출 실패
- 요청 검증 실패
- 인증 실패
- 파일 업로드 실패

---

### 5. 🔥 FATAL (2%)
치명적 에러 - 서비스 중단 수준

**예시:**
```json
{
  "timestamp": "2025-11-02T10:30:46.345Z",
  "level": "FATAL",
  "service": "order-service",
  "message": "Service crashed due to out of memory",
  "trace_id": "trace-1730545846345-yza234bcd",
  "error": {
    "type": "OutOfMemoryError",
    "message": "Java heap space exceeded",
    "stack_trace": "OutOfMemoryError: Java heap space exceeded\n    at order-service.handler (/app/src/handlers/order-service.js:45:23)\n    at processRequest (/app/src/server.js:85:14)"
  },
  "metadata": {
    "heap_used_mb": 9500,
    "heap_max_mb": 8192,
    "gc_time_ms": 12000
  }
}
```

**시나리오:**
- Out of Memory
- 시스템 장애
- 처리되지 않은 예외

---

## 🚀 사용 방법

### 1️⃣ 로그 생성기 실행

```bash
# 기본 설정으로 실행
npm run logs

# 커스텀 설정
npm run logs -- --interval 500 --log-dir ./custom-logs

# 도움말
npm run logs -- --help
```

**옵션:**
- `--log-dir <디렉토리>`: 로그 저장 경로 (기본: `./logs`)
- `--log-file <파일명>`: 로그 파일명 (기본: `application.log`)
- `--interval <밀리초>`: 로그 생성 간격 (기본: 1000ms)

---

### 2️⃣ Fluent Bit 실행

```bash
# Docker로 실행 (추천)
docker run -d \
  --name fluent-bit-logs \
  --network host \
  -v $(pwd)/fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf \
  -v $(pwd)/parsers.conf:/fluent-bit/etc/parsers.conf \
  -v $(pwd)/logs:/fluent-bit/logs \
  fluent/fluent-bit:latest

# 로컬 실행 (macOS)
brew install fluent-bit
fluent-bit -c fluent-bit.conf
```

---

### 3️⃣ Kafka 확인

```bash
# Consumer로 실시간 확인
docker exec -it panopticon-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic application-logs

# 특정 개수만 확인
docker exec -it panopticon-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic application-logs \
  --max-messages 10
```

---

## 📁 로그 포맷

### JSON Lines 포맷

각 로그는 **한 줄에 하나의 JSON 객체**로 저장됩니다.

```json
{"timestamp":"2025-11-02T10:30:45.123Z","level":"INFO","service":"user-service","message":"User login successful","trace_id":"trace-xxx"}
{"timestamp":"2025-11-02T10:30:45.456Z","level":"ERROR","service":"payment-service","message":"Payment failed","trace_id":"trace-yyy"}
```

**장점:**
- ✅ 파싱이 간단 (한 줄 = 하나의 이벤트)
- ✅ Fluent Bit이 읽기 쉬움
- ✅ 대용량 로그 처리에 효율적
- ✅ 스트리밍 처리 가능

---

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────┐
│  Application Log Generator      │
│  (log-generator.ts)             │
│                                 │
│  - DEBUG (10%)                  │
│  - INFO  (60%)                  │
│  - WARN  (20%)                  │
│  - ERROR (8%)                   │
│  - FATAL (2%)                   │
└────────────┬────────────────────┘
             │
             │ Write to file (JSON Lines)
             ▼
┌─────────────────────────────────┐
│  application.log                │
│  (./logs/application.log)       │
└────────────┬────────────────────┘
             │
             │ Tail & Parse (JSON)
             ▼
┌─────────────────────────────────┐
│  Fluent Bit                     │
│  (fluent-bit.conf)              │
│                                 │
│  - INPUT: tail                  │
│  - PARSER: json                 │
│  - FILTER: enrichment           │
│  - OUTPUT: kafka                │
└────────────┬────────────────────┘
             │
             │ Send to Kafka
             ▼
┌─────────────────────────────────┐
│  Apache Kafka                   │
│  Topic: application-logs        │
└────────────┬────────────────────┘
             │
             │ Consume
             ▼
┌─────────────────────────────────┐
│  Backend Service                │
│  - Kafka Consumer               │
│  - 로그 레벨별 처리             │
│  - ElasticSearch/TimescaleDB    │
│    저장                         │
└─────────────────────────────────┘
```

---

## 🔑 주요 필드 설명

| 필드 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `timestamp` | ✅ | ISO 8601 타임스탬프 | `2025-11-02T10:30:45.123Z` |
| `level` | ✅ | 로그 레벨 | `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL` |
| `service` | ✅ | 서비스 이름 | `user-service`, `payment-service` |
| `message` | ✅ | 로그 메시지 | `User login successful` |
| `trace_id` | ✅ | 분산 추적 ID | `trace-1730545845123-abc123` |
| `span_id` | ⚠️ | 스팬 ID | `span9x8y7z6w5v4u3t` |
| `user_id` | ⚠️ | 사용자 ID | `user_5432` |
| `session_id` | ⚠️ | 세션 ID | `sess_8a9b0c1d2e3f` |
| `ip_address` | ⚠️ | IP 주소 | `192.168.1.100` |
| `metadata` | ⚠️ | 추가 컨텍스트 | `{ "order_id": "order_123" }` |
| `error` | ⚠️ | 에러 정보 (ERROR/FATAL) | `{ "type": "PaymentError", ... }` |

---

## 💡 Backend에서 처리 예시

### Kafka Consumer (TypeScript/Node.js)

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'log-processor',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'log-consumer-group' });

await consumer.subscribe({ topic: 'application-logs' });

await consumer.run({
  eachMessage: async ({ message }) => {
    const log = JSON.parse(message.value.toString());
    
    // 로그 레벨별 처리
    switch (log.level) {
      case 'ERROR':
      case 'FATAL':
        // 긴급 알림 전송
        await sendAlert(log);
        // 에러 로그 특별 저장
        await saveToErrorDB(log);
        break;
        
      case 'WARN':
        // 경고 모니터링
        await checkWarningThreshold(log);
        break;
        
      case 'INFO':
      case 'DEBUG':
        // 일반 저장
        await saveToLogDB(log);
        break;
    }
    
    // ElasticSearch 저장
    await indexToElastic(log);
  }
});
```

### 로그 검색 예시

```typescript
// 특정 사용자의 에러 로그 찾기
const errorLogs = await elastic.search({
  index: 'application-logs',
  body: {
    query: {
      bool: {
        must: [
          { match: { user_id: 'user_5432' } },
          { terms: { level: ['ERROR', 'FATAL'] } }
        ]
      }
    },
    sort: [{ timestamp: 'desc' }]
  }
});

// 느린 쿼리 찾기
const slowQueries = await elastic.search({
  index: 'application-logs',
  body: {
    query: {
      bool: {
        must: [
          { match: { level: 'WARN' } },
          { match: { message: 'Slow database query' } },
          { range: { 'metadata.duration_ms': { gte: 1000 } } }
        ]
      }
    }
  }
});

// Trace ID로 전체 요청 추적
const trace = await elastic.search({
  index: 'application-logs',
  body: {
    query: {
      match: { trace_id: 'trace-1730545845123-abc123' }
    },
    sort: [{ timestamp: 'asc' }]
  }
});
```

---

## 🎯 활용 시나리오

### 시나리오 1: 정상 운영
```bash
# 낮은 에러율, 정상적인 로그 흐름
npm run logs
```

### 시나리오 2: 높은 트래픽
```bash
# 빠른 로그 생성
npm run logs -- --interval 100
```

### 시나리오 3: 에러 많은 상황
현재는 코드 수정 필요 (에러율 증가)
```typescript
// DEFAULT_CONFIG에서 수정
logDistribution: {
  debug: 0.05,
  info: 0.30,
  warn: 0.25,
  error: 0.30,
  fatal: 0.10,
}
```

---

## 🐛 트러블슈팅

### Q: 로그가 Kafka에 안 들어갑니다
```bash
# 1. Fluent Bit 로그 확인
docker logs fluent-bit-logs

# 2. Kafka 토픽 확인
docker exec panopticon-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list

# 3. Fluent Bit stdout 확인 (디버깅용 OUTPUT 활성화됨)
```

### Q: JSON 파싱 에러가 발생합니다
```bash
# 로그 파일 확인 (올바른 JSON Lines 포맷인지)
cat logs/application.log | jq '.'

# 각 줄이 유효한 JSON인지 확인
cat logs/application.log | while read line; do echo $line | jq '.' > /dev/null || echo "Invalid JSON: $line"; done
```

---

## 📚 다음 단계

1. ✅ **로그 생성기 실행** - 완료!
2. ⏳ **Fluent Bit 설정** - `fluent-bit-app.conf` 사용
3. ⏳ **Kafka 토픽 생성** - `application-logs`
4. ⏳ **Backend Consumer 구현** - 팀원 작업
5. ⏳ **저장소 연동** - ElasticSearch/TimescaleDB
6. ⏳ **Dashboard 구현** - Grafana/Kibana

---

## 📊 메트릭 vs 로그

현재 프로젝트는 **로그 수집**에 집중합니다.

나중에 메트릭이 필요하면:
- Prometheus 메트릭 추가
- Golden Signals 활용
- 별도 메트릭 수집 파이프라인 구축

**지금은 로그만으로 충분합니다!** ✅
