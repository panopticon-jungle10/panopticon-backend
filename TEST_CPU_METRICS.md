# CPU 메트릭 테스트 가이드

쿠버네티스 로그 수집기(log-generator)에서 발생하는 CPU 사용량이 백엔드 API로 들어오는지 테스트하는 방법

---

## 📋 테스트 목적

FluentBit → Kafka → Backend → TimescaleDB 전체 파이프라인에서 CPU 메트릭이 정상적으로 흐르는지 확인

---

## 🔧 사전 준비

### 1. 인프라 실행 확인

```bash
# Docker Compose 서비스 확인
cd infra
docker-compose ps

# 필수 서비스: panopticon-kafka, timescaledb, redis
```

### 2. 백엔드 실행 확인

```bash
cd backend
npm run start:dev

# 콘솔에서 다음 메시지 확인:
# "Application is running on: http://localhost:3001"
# Kafka 연결 로그 확인 (CONNECTED 상태여야 함)
```

### 3. Kafka 토픽 생성 (최초 1회)

```bash
docker exec panopticon-kafka /opt/kafka/bin/kafka-topics.sh \
  --create \
  --topic metrics.system \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1
```

---

## 🧪 테스트 방법

### 방법 1: 단일 메트릭 전송 (빠른 확인)

```bash
echo '{"timestamp":'$(date +%s)'000,"service":"log-generator","podName":"test-pod-123","namespace":"default","nodeName":"kind-control-plane","cpu":78.5,"memory":512.3}' | docker exec -i panopticon-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic metrics.system
```

**기대 결과:**
백엔드 콘솔에 다음과 같은 로그 출력:
```
[METRIC] service=log-generator pod=test-pod-123 CPU=78.50% Memory=512.30Mi timestamp=2025-11-04T...
```

---

### 방법 2: 여러 메트릭 전송 (상세 확인)

```bash
# 1번 메시지 (CPU 60%)
echo '{"timestamp":'$(date +%s)'000,"service":"log-generator","podName":"test-pod-001","namespace":"default","nodeName":"kind-control-plane","cpu":60.5,"memory":250.0}' | docker exec -i panopticon-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic metrics.system

sleep 1

# 2번 메시지 (CPU 70%)
echo '{"timestamp":'$(date +%s)'000,"service":"log-generator","podName":"test-pod-002","namespace":"default","nodeName":"kind-control-plane","cpu":70.5,"memory":300.0}' | docker exec -i panopticon-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic metrics.system

sleep 1

# 3번 메시지 (CPU 80%)
echo '{"timestamp":'$(date +%s)'000,"service":"log-generator","podName":"test-pod-003","namespace":"default","nodeName":"kind-control-plane","cpu":80.5,"memory":350.0}' | docker exec -i panopticon-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic metrics.system
```

**기대 결과:**
백엔드 콘솔에 3개의 [METRIC] 로그가 순차적으로 출력됨

---

### 방법 3: DB 저장 확인 (완전한 테스트)

#### 3-1. 테스트 메시지 전송

```bash
echo '{"timestamp":'$(date +%s)'000,"service":"log-generator","podName":"db-test-pod-999","namespace":"default","nodeName":"kind-control-plane","cpu":85.5,"memory":400.0}' | docker exec -i panopticon-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic metrics.system
```

#### 3-2. 3초 대기

```bash
sleep 3
```

#### 3-3. DB 조회

```bash
PGPASSWORD=admin123 psql -h localhost -p 5433 -U admin -d panopticon -c "
SELECT
  time,
  service,
  pod_name,
  cpu,
  memory,
  namespace,
  node_name
FROM system_metrics
WHERE service = 'log-generator'
ORDER BY time DESC
LIMIT 5;
"
```

**기대 결과:**
```
           time            |   service     |     pod_name      | cpu  | memory | namespace |     node_name
---------------------------+---------------+-------------------+------+--------+-----------+-------------------
 2025-11-04 12:34:56+00   | log-generator | db-test-pod-999   | 85.5 |  400.0 | default   | kind-control-plane
```

---

## 🔍 문제 해결

### 1. 백엔드 콘솔에 [METRIC] 로그가 안보여요

**확인 사항:**
```bash
# 백엔드 로그에서 Kafka 연결 확인
# "Kafka consumer connected" 메시지가 있어야 함

# Kafka 토픽에 메시지가 들어갔는지 확인
docker exec panopticon-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic metrics.system \
  --from-beginning \
  --max-messages 5
```

**해결 방법:**
- backend/.env에서 `KAFKA_BROKERS=localhost:9092` 확인
- backend/src/main.ts에 Kafka microservice 연결 코드 확인
- 백엔드 재시작: `npm run start:dev`

---

### 2. DB에 데이터가 안들어가요

**확인 사항:**
```bash
# TimescaleDB 테이블 존재 확인
PGPASSWORD=admin123 psql -h localhost -p 5433 -U admin -d panopticon -c "\dt system_metrics"
```

**해결 방법:**
```bash
# 테이블이 없으면 생성
cd infra/test/metrics
PGPASSWORD=admin123 psql -h localhost -p 5433 -U admin -d panopticon -f init_metrics_tables.sql
```

---

### 3. Kafka 토픽이 없다고 나와요

**해결 방법:**
```bash
# 토픽 생성
docker exec panopticon-kafka /opt/kafka/bin/kafka-topics.sh \
  --create \
  --topic metrics.system \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

# 토픽 확인
docker exec panopticon-kafka /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server localhost:9092
```

---

## 📊 메트릭 데이터 구조

백엔드가 받는 CPU 메트릭 JSON 형식:

```json
{
  "timestamp": 1730707200000,
  "service": "log-generator",
  "podName": "log-generator-pod-123",
  "namespace": "default",
  "nodeName": "kind-control-plane",
  "cpu": 78.5,
  "memory": 512.3
}
```

**필드 설명:**
- `timestamp`: Unix timestamp (밀리초)
- `service`: 서비스 이름 (로그 생성기는 "log-generator")
- `podName`: 쿠버네티스 파드 이름
- `namespace`: 쿠버네티스 네임스페이스
- `nodeName`: 쿠버네티스 노드 이름
- `cpu`: CPU 사용률 (단위: %, 0-100)
- `memory`: 메모리 사용량 (단위: Mi)

---

## 🚀 실전 FluentBit 연동

위 테스트가 모두 성공하면, 실제 쿠버네티스에서 FluentBit이 자동으로 CPU 메트릭을 수집하도록 설정:

### 1. Metrics Server 설치 (최초 1회)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 2. FluentBit 설정 적용

```bash
cd k8s_userside_log_generator/k8s_http_to_flu_to_server
kubectl apply -f fluent-bit.yaml
```

### 3. FluentBit 재시작

```bash
kubectl -n logging rollout restart daemonset/fluent-bit
```

### 4. FluentBit 로그 확인

```bash
kubectl -n logging logs -l app=fluent-bit --tail=50 -f
```

**기대 결과:**
30초마다 다음과 같은 로그:
```
[METRIC] service=log-generator pod=log-generator-xyz cpu=XX.XX memory=YYY.YY
```

---

## ✅ 최종 확인 체크리스트

- [ ] Kafka, TimescaleDB 컨테이너 실행 중
- [ ] 백엔드 서버 실행 중 (localhost:3001)
- [ ] Kafka 토픽 `metrics.system` 생성됨
- [ ] 테스트 메시지 전송 시 백엔드 콘솔에 [METRIC] 로그 출력
- [ ] DB 조회 시 system_metrics 테이블에 데이터 저장 확인
- [ ] FluentBit 설정 적용 완료 (실전 환경)

---

**작성일:** 2025-11-04
**테스트 환경:** macOS, Docker Desktop, Kind Kubernetes
