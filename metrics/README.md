# Fluent Bit Metrics Stack

이 디렉터리는 로컬 쿠버네티스 환경(k3d, kind, minikube, Docker Desktop 등)에서 `log-generator` 파드의 CPU 메트릭을 수집해 카프카로 전달하는 Fluent Bit 구성을 제공합니다. Fluent Bit는 `kubeletstats` 입력 플러그인을 사용해 `log-generator` 컨테이너만 필터링하고, 수집된 메트릭을 동시에 `stdout`과 `metrics` 카프카 토픽으로 전송합니다.

## 사전 준비

- 로컬 쿠버네티스 클러스터 (Docker Desktop, kind, 또는 minikube 등)
- `k8s_userside_log_generator/k8s_http_to_flu_to_server/log-generator-deployment.yaml`로 배포하는 `log-generator` 이미지
- 카프카 브로커(레포의 `kafka/docker-compose.kafka.yml` 활용 가능). Fluent Bit 파드에서 접근 가능한 주소로 리스닝해야 합니다.
  - 예: Docker Desktop → `localhost:9092`
  - 예: kind → `host.docker.internal:9092`

## 배포 순서

1. `log-generator` 이미지 준비 및 쿠버네티스 배포
   ```bash
   # 레포 루트 기준
   docker build -t log-generator:latest k8s_userside_log_generator/log_generator_server

   # kind/minikube를 사용한다면 이미지 로드
   kind load docker-image log-generator:latest
   # 또는
   minikube image load log-generator:latest

   # 배포
   kubectl apply -f k8s_userside_log_generator/k8s_http_to_flu_to_server/log-generator-deployment.yaml
   ```

2. 메트릭 수집기 이미지 빌드 및 로드
   ```bash
   docker build -t metrics-collector:latest metrics/collector

   # kind를 사용 중이라면
   kind load docker-image metrics-collector:latest
   # minikube라면
   minikube image load metrics-collector:latest
   ```

3. Fluent Bit 메트릭 수집 스택 배포
   ```bash
    kubectl apply -f metrics/fluent-bit-metrics.yaml
   ```

4. 로그 확인
   ```bash
   kubectl logs -n logging -l app=fluent-bit -f
   ```
   `metrics` 토픽으로 전송되는 JSON 메시지를 Fluent Bit 파드 표준 출력에서도 동시에 확인할 수 있습니다.

## 카프카 브로커 주소 변경

`metrics/fluent-bit-metrics.yaml` DaemonSet의 환경 변수 값을 로컬 환경에 맞게 조정하세요.

```yaml
env:
  - name: KAFKA_BROKERS
    value: host.docker.internal:9092  # 예시
  - name: TARGET_NAMESPACE
    value: default                    # log-generator가 위치한 네임스페이스
  - name: TARGET_POD_PREFIX
    value: log-generator              # pod 이름 프리픽스
  - name: ALLOW_INSECURE_TLS
    value: "false"                    # TLS 검증이 문제면 "true"로
```

다중 브로커를 사용한다면 콤마로 구분해 전달할 수 있습니다.

> ❗️ `metrics-collector`가 `Failed to query kubelet stats`(TLS handshake) 오류를 계속 찍는다면 `ALLOW_INSECURE_TLS`를 `"true"`로 임시 설정해 인증서 검증을 끄고 동작부터 확인하세요. 클러스터 CA를 올바르게 전달할 수 있다면 다시 `"false"`로 돌리는 것을 권장합니다.

## 백엔드 연동

Pod 안의 `metrics-collector` 사이드카가 kubelet의 stats summary API를 주기적으로 호출해 `log-generator` 컨테이너 CPU 정보를 JSON으로 stdout에 남깁니다. Fluent Bit가 해당 로그를 수집해 `metrics` 토픽으로 전송합니다. 백엔드 NestJS 서버는 새로 추가된 `MetricsKafkaService`를 통해 이 토픽을 구독하며, 각 메시지를 콘솔에 출력하도록 구성했습니다(데이터베이스 저장 없음). 자세한 내용은 `backend` 디렉터리를 참조하세요.

## End-to-End 실행 예시 (Kind 환경)

### 1. Kind 클러스터 재생성
```bash
kind delete cluster --name log-cluster || true
kind create cluster --config k8s_userside_log_generator/k8s_http_to_flu_to_server/kind-config.yaml --name log-cluster
kubectl config use-context kind-log-cluster
```

### 2. Docker 이미지 빌드 & Kind에 로드
```bash
# 레포 루트 기준
docker build -t log-generator:latest k8s_userside_log_generator/log_generator_server
docker build -t metrics-collector:latest metrics/collector
kind load docker-image log-generator:latest --name log-cluster
kind load docker-image metrics-collector:latest --name log-cluster
```

### 3. Kafka 브로커 가동
```bash
docker compose -f kafka/docker-compose.kafka.yml up -d
```

### 4. Kubernetes 리소스 배포
```bash
kubectl apply -f k8s_userside_log_generator/k8s_http_to_flu_to_server/log-generator-deployment.yaml
kubectl apply -f metrics/fluent-bit-metrics.yaml
kubectl -n logging set env daemonset/fluent-bit KAFKA_BROKERS=host.docker.internal:29092 --overwrite
kubectl -n logging set env daemonset/fluent-bit ALLOW_INSECURE_TLS=true --overwrite
kubectl -n logging set env daemonset/fluent-bit KUBELET_TIMEOUT_MS=60000 --overwrite
kubectl -n logging set env daemonset/fluent-bit SCRAPE_INTERVAL_MS=20000 --overwrite
kubectl -n logging rollout restart daemonset/fluent-bit
kubectl get pods -A
```

### 5. Kafka/Fluent Bit 동작 확인
```bash
kubectl -n logging logs -l app=fluent-bit -c metrics-collector --tail=20
kubectl -n logging logs -l app=fluent-bit -c fluent-bit --tail=20
docker exec -it panopticon-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic metrics \
  --from-beginning \
  --max-messages 5
```

### 6. 백엔드에서 메트릭 소비 확인
```bash
cd backend
npm install
KAFKA_BROKERS=localhost:9092 npm run start:dev
```
콘솔에 `service=log-generator`, `cpu%=...`, `memMB=...`, `netIn=...` 등이 주기적으로 출력되면 CPU 메트릭이 끝까지 전달된 것입니다.
