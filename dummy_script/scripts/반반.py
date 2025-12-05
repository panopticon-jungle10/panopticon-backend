"""
Locust Performance Test for Producer Server - High-Volume Traffic

Goal: Generate high-volume traffic with both logs and traces

Configuration:
- Each request sends 40 items total:
  - 20 logs to /dummy/logs
  - 20 spans to /dummy/traces (2 traces × 10 spans each)

Usage:
    # Single instance (headless) - Recommended for testing
    ./scripts/run-locust-traffic.sh

    # Web UI mode
    locust -f scripts/locustfile_traffic.py --host https://api.jungle-panopticon.cloud/producer

    # Distributed master (for 5-instance setup)
    locust -f scripts/locustfile_traffic.py --host <URL> --master --expect-workers 4

    # Distributed worker
    locust -f scripts/locustfile_traffic.py --worker --master-host <master-ip>

Environment Variables:
    PRODUCER_URL: Override target server (default: https://api.jungle-panopticon.cloud/producer)
"""

import random
import os
from datetime import datetime, timezone, timedelta
from locust import HttpUser, task, constant, events
from locust.runners import MasterRunner


# Configuration
PRODUCER_URL = os.getenv("PRODUCER_URL", "https://api.jungle-panopticon.cloud/producer")

# Data structure constants
SPANS_PER_TRACE = 10  # Each trace contains 10 spans
TRACES_PER_REQUEST = 2  # Each request contains 2 complete traces
LOGS_PER_REQUEST = 20  # Each request sends 20 logs
TOTAL_ITEMS_PER_REQUEST = (
    TRACES_PER_REQUEST * SPANS_PER_TRACE + LOGS_PER_REQUEST
)  # 40 total items

# Statistics tracking
request_count = 0


def generate_trace_id():
    """Generate a random 32-character hex trace ID"""
    return "".join(random.choices("0123456789abcdef", k=32))


def generate_span_id():
    """Generate a random 16-character hex span ID"""
    return "".join(random.choices("0123456789abcdef", k=16))


def generate_single_trace(service_name="API-Backend-Local", environment="Develop"):
    """
    Generate a single trace containing 10 connected spans.

    All 10 spans share the same trace_id and are connected via parent-child
    relationships forming a chain.

    Args:
        service_name: Service name for all spans in this trace
        environment: Environment name (e.g., 'Develop', 'production')

    Returns:
        list: 10 span dictionaries sharing the same trace_id
    """
    # Generate unique trace_id for this trace
    trace_id = generate_trace_id()

    # Base timestamp for this trace (will increment slightly for each span)
    base_time = datetime.now(timezone.utc) - timedelta(
        milliseconds=random.randint(0, 1000)
    )

    spans = []
    parent_span_id = None  # First span has no parent

    for i in range(SPANS_PER_TRACE):
        # Generate unique span_id
        span_id = generate_span_id()

        # Increment timestamp slightly for each span in the chain
        span_timestamp = base_time + timedelta(milliseconds=i * random.uniform(1, 5))

        # Alternate between CLIENT (database) and SERVER (HTTP) kinds
        kind = random.choice(["CLIENT", "SERVER"])

        # Build span based on kind
        span = {
            "type": "span",
            "timestamp": span_timestamp.isoformat(),
            "service_name": service_name,
            "environment": environment,
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_span_id": parent_span_id,  # null for first span, else previous span_id
            "name": (
                f"SELECT operation-{i}"
                if kind == "CLIENT"
                else f"GET /api/endpoint-{i}"
            ),
            "kind": kind,
            "duration_ms": round(random.uniform(1, 100), 2),
            "status": random.choice(["OK"] * 9 + ["ERROR"]),  # 90% OK, 10% ERROR
        }

        # Add kind-specific fields
        if kind == "CLIENT":
            span.update(
                {
                    "db_system": "postgresql",
                    "db_statement": f"SELECT * FROM table{i} WHERE id = {random.randint(1, 1000)}",
                    "db_operation": "SELECT",
                }
            )
        else:  # SERVER
            span.update(
                {
                    "http_method": "GET",
                    "http_path": f"/posts/{i}",
                    "http_url": f"http://localhost:3001/posts/{i}",
                    "http_status_code": 200 if span["status"] == "OK" else 500,
                }
            )

        spans.append(span)
        parent_span_id = span_id  # Next span's parent is this span

    return spans


def generate_log_data():
    """Generate a simple log entry matching the producer's expected format"""
    return {
        "type": "log",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service_name": "sample-service",
        "environment": "prod",
        "level": "INFO",
        "message": "샘플 APM 로그 이벤트",
        "trace_id": generate_trace_id(),
        "span_id": generate_span_id(),
        "http_method": "GET",
        "http_path": "/api/sample",
        "http_status_code": 200,
        "labels": {
            "feature": "sample",
            "host": "local",
        },
    }


def generate_batch_spans():
    """
    Generate a batch of 20 spans (2 traces × 10 spans each).

    Each trace is independent with its own trace_id and timestamp.

    Returns:
        list: 20 span dictionaries from 2 independent traces
    """
    all_spans = []

    # Generate 2 complete traces
    for _ in range(TRACES_PER_REQUEST):
        trace_spans = generate_single_trace()
        all_spans.extend(trace_spans)

    return all_spans


def generate_batch_logs():
    """
    Generate a batch of 20 logs.

    Returns:
        list: 20 log dictionaries
    """
    return [generate_log_data() for _ in range(LOGS_PER_REQUEST)]


class HighVolumeTrafficTest(HttpUser):
    """
    High-volume logs and traces load test for producer server.

    Each user sends both logs and traces:
    - 20 logs to /dummy/logs
    - 20 spans (2 traces × 10 spans) to /dummy/traces
    - Total: 40 items per batch

    No wait time for maximum throughput.
    """

    # No delay between requests for maximum throughput
    wait_time = constant(0)

    # Override host with environment variable
    host = PRODUCER_URL

    @task
    def send_batch_logs(self):
        """Send 20 logs to /dummy/logs endpoint"""
        # Generate batch of 20 logs
        batch_logs = generate_batch_logs()

        with self.client.post(
            "/dummy/logs",
            json=batch_logs,
            catch_response=True,
            name="POST /dummy/logs (20 logs)",
        ) as response:
            if response.status_code == 202:
                response.success()
            else:
                response.failure(f"Expected 202, got {response.status_code}")

    @task
    def send_batch_spans(self):
        """Send 20 spans (2 traces × 10 spans) to /dummy/traces endpoint"""
        global request_count

        # Generate batch of 20 spans
        batch_spans = generate_batch_spans()

        with self.client.post(
            "/dummy/traces",
            json=batch_spans,
            catch_response=True,
            name="POST /dummy/traces (20 spans)",
        ) as response:
            if response.status_code == 202:
                request_count += 1
                response.success()
            else:
                response.failure(f"Expected 202, got {response.status_code}")


# Event handlers for test lifecycle
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Print test configuration when test starts"""
    if not isinstance(environment.runner, MasterRunner):
        global request_count
        request_count = 0

        print("\n" + "=" * 80)
        print("🚀 High-Volume Traffic Load Test Starting")
        print("=" * 80)
        print(f"Target Server: {PRODUCER_URL}")
        print(f"Test Endpoints:")
        print(f"  - POST /dummy/logs (20 logs per request)")
        print(f"  - POST /dummy/traces (20 spans per request)")
        print(f"\nData per Request:")
        print(f"  - Logs: {LOGS_PER_REQUEST} items")
        print(
            f"  - Traces: {TRACES_PER_REQUEST} traces × {SPANS_PER_TRACE} spans = {TRACES_PER_REQUEST * SPANS_PER_TRACE} spans"
        )
        print(f"  - Total: {TOTAL_ITEMS_PER_REQUEST} items per batch")
        print(f"\nTrace Structure:")
        print(f"  - Each request contains {TRACES_PER_REQUEST} independent traces")
        print(f"  - Each trace contains {SPANS_PER_TRACE} connected spans")
        print(f"  - All spans in a trace share the same trace_id")
        print(f"  - Timestamps increment within each trace")
        print(f"\nSpan Properties:")
        print(f"  - kind: CLIENT (database) or SERVER (HTTP)")
        print(f"  - duration_ms: 1-100ms (random)")
        print(f"  - status: OK (90%) or ERROR (10%)")
        print(f"  - parent_span_id: null for root, else previous span_id")
        print(f"\nTest will run continuously until stopped.")
        print("=" * 80 + "\n")


@events.request.add_listener
def on_request(
    request_type, name, response_time, response_length, exception, context, **kwargs
):
    """Track progress every 1,000 requests"""
    global request_count

    if request_count % 1000 == 0 and request_count > 0:
        total_items = request_count * TOTAL_ITEMS_PER_REQUEST
        total_logs = request_count * LOGS_PER_REQUEST
        total_spans = request_count * TRACES_PER_REQUEST * SPANS_PER_TRACE
        print(
            f"Progress: {request_count:,} batches ({total_logs:,} logs, {total_spans:,} spans = {total_items:,} total items sent)"
        )


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print summary when test stops"""
    if not isinstance(environment.runner, MasterRunner):
        stats = environment.stats.total
        total_logs = request_count * LOGS_PER_REQUEST
        total_spans = request_count * TRACES_PER_REQUEST * SPANS_PER_TRACE
        total_items = request_count * TOTAL_ITEMS_PER_REQUEST

        print("\n" + "=" * 80)
        print("✅ High-Volume Traffic Load Test Completed")
        print("=" * 80)
        print(f"Total Batches Sent: {request_count:,}")
        print(f"Total Logs Sent: ~{total_logs:,}")
        print(f"Total Spans Sent: ~{total_spans:,}")
        print(f"Total Items Sent: ~{total_items:,}")
        print(f"Total HTTP Requests: {stats.num_requests:,}")
        print(f"\nTotal Failures: {stats.num_failures:,}")
        print(
            f"Failure Rate: {stats.num_failures / max(stats.num_requests, 1) * 100:.2f}%"
        )
        print(f"Average Response Time: {stats.avg_response_time:.2f}ms")
        if stats.total_rps > 0:
            actual_items_per_sec = (
                stats.total_rps / 2 * TOTAL_ITEMS_PER_REQUEST
            )  # Divide by 2 because we have 2 tasks
            print(f"\nPerformance:")
            print(f"  - Requests/sec: {stats.total_rps:.2f}")
            print(f"  - Items/sec: ~{actual_items_per_sec:,.0f}")
        print("\nDetailed metrics available in:")
        print("  - Locust web UI: http://localhost:8089")
        print("  - HTML report (if --html flag was used)")
        print("=" * 80 + "\n")
