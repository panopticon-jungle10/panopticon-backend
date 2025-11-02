import * as fs from "fs";
import * as path from "path";

/**
 * 실제 애플리케이션 로그 생성기
 *
 * 목적: MVP 로그 수집 시스템 테스트를 위한 현실적인 애플리케이션 로그 생성
 *
 * 생성하는 로그 타입:
 * - 일반 애플리케이션 이벤트 (로그인, 주문, 결제 등)
 * - 에러 로그 (예외, 실패, 타임아웃 등)
 * - 성능 로그 (느린 쿼리, API 응답시간 등)
 * - 비즈니스 로그 (사용자 행동, 트랜잭션 등)
 */

// ============ 타입 정의 ============

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

interface ApplicationLog {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  trace_id: string;
  span_id?: string;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
  error?: {
    type: string;
    message: string;
    stack_trace?: string;
  };
}

// ============ 설정 ============

interface GeneratorConfig {
  logDir: string;
  logFile: string;
  services: string[];
  intervalMs: number;
  logDistribution: {
    debug: number; // 0-1
    info: number; // 0-1
    warn: number; // 0-1
    error: number; // 0-1
    fatal: number; // 0-1
  };
  enabledFeatures: {
    traceId: boolean;
    userId: boolean;
    ipAddress: boolean;
    metadata: boolean;
    stackTrace: boolean;
  };
}

const DEFAULT_CONFIG: GeneratorConfig = {
  logDir: "./logs",
  logFile: "application.log",
  services: [
    "user-service",
    "order-service",
    "payment-service",
    "notification-service",
    "auth-service",
  ],
  intervalMs: 1000, // 1초마다 로그 생성
  logDistribution: {
    debug: 0.1, // 10%
    info: 0.6, // 60%
    warn: 0.2, // 20%
    error: 0.08, // 8%
    fatal: 0.02, // 2%
  },
  enabledFeatures: {
    traceId: true,
    userId: true,
    ipAddress: true,
    metadata: true,
    stackTrace: true, // 에러 로그에만 적용
  },
};

// ============ 유틸리티 함수 ============

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateSpanId(): string {
  return Math.random().toString(36).substr(2, 16);
}

function generateUserId(): string {
  return `user_${getRandomInt(1000, 9999)}`;
}

function generateSessionId(): string {
  return `sess_${Math.random().toString(36).substr(2, 12)}`;
}

function generateIpAddress(): string {
  return `${getRandomInt(1, 255)}.${getRandomInt(1, 255)}.${getRandomInt(
    1,
    255,
  )}.${getRandomInt(1, 255)}`;
}

// 로그 레벨 선택 (분포에 따라)
function selectLogLevel(
  distribution: GeneratorConfig["logDistribution"],
): LogLevel {
  const random = Math.random();
  let cumulative = 0;

  const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
  const weights = [
    distribution.debug,
    distribution.info,
    distribution.warn,
    distribution.error,
    distribution.fatal,
  ];

  for (let i = 0; i < levels.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return levels[i];
    }
  }

  return "INFO"; // 기본값
}

// ============ 로그 시나리오 생성 ============

// DEBUG 로그 시나리오
const DEBUG_SCENARIOS = [
  {
    message: "Cache hit for user profile",
    metadata: () => ({
      cache_key: `user:profile:${getRandomInt(1000, 9999)}`,
      ttl: getRandomInt(300, 3600),
      hit_rate: (Math.random() * 100).toFixed(2) + "%",
    }),
  },
  {
    message: "Database connection pool status",
    metadata: () => ({
      active_connections: getRandomInt(5, 50),
      idle_connections: getRandomInt(10, 100),
      max_connections: 200,
    }),
  },
  {
    message: "Request headers received",
    metadata: () => ({
      user_agent: getRandomElement([
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)",
      ]),
      content_type: "application/json",
      accept_language: "en-US,en;q=0.9",
    }),
  },
  {
    message: "Query execution plan analyzed",
    metadata: () => ({
      query_type: getRandomElement(["SELECT", "UPDATE", "INSERT"]),
      estimated_rows: getRandomInt(10, 10000),
      index_used: Math.random() > 0.3,
    }),
  },
];

// INFO 로그 시나리오
const INFO_SCENARIOS = [
  {
    message: "User login successful",
    metadata: () => ({
      login_method: getRandomElement(["password", "oauth", "sso"]),
      device: getRandomElement(["web", "mobile", "tablet"]),
      location: getRandomElement(["Seoul", "Busan", "Tokyo", "New York"]),
    }),
  },
  {
    message: "Order created successfully",
    metadata: () => ({
      order_id: `order_${getRandomInt(10000, 99999)}`,
      items_count: getRandomInt(1, 10),
      total_amount: (Math.random() * 1000).toFixed(2),
      currency: "USD",
    }),
  },
  {
    message: "Payment processed successfully",
    metadata: () => ({
      transaction_id: `txn_${getRandomInt(100000, 999999)}`,
      payment_method: getRandomElement(["card", "paypal", "bank_transfer"]),
      amount: (Math.random() * 500).toFixed(2),
      processing_time_ms: getRandomInt(100, 500),
    }),
  },
  {
    message: "Email notification sent",
    metadata: () => ({
      notification_type: getRandomElement([
        "welcome",
        "order_confirmation",
        "password_reset",
      ]),
      recipient: `user${getRandomInt(1000, 9999)}@example.com`,
      template_id: `tmpl_${getRandomInt(1, 50)}`,
    }),
  },
  {
    message: "API request processed",
    metadata: () => ({
      endpoint: getRandomElement([
        "/api/users",
        "/api/orders",
        "/api/products",
      ]),
      method: getRandomElement(["GET", "POST", "PUT", "DELETE"]),
      status_code: 200,
      response_time_ms: getRandomInt(50, 500),
    }),
  },
  {
    message: "Cache updated successfully",
    metadata: () => ({
      cache_key: `product:${getRandomInt(1000, 9999)}`,
      operation: getRandomElement(["set", "update", "delete"]),
      expiry_seconds: getRandomInt(300, 3600),
    }),
  },
];

// WARN 로그 시나리오
const WARN_SCENARIOS = [
  {
    message: "Slow database query detected",
    metadata: () => ({
      query: "SELECT * FROM orders WHERE created_at > ?",
      duration_ms: getRandomInt(1000, 5000),
      threshold_ms: 1000,
      affected_rows: getRandomInt(1000, 50000),
    }),
  },
  {
    message: "High memory usage detected",
    metadata: () => ({
      current_usage_mb: getRandomInt(7000, 9000),
      threshold_mb: 8000,
      usage_percent: getRandomInt(75, 95),
    }),
  },
  {
    message: "API rate limit approaching",
    metadata: () => ({
      current_requests: getRandomInt(800, 950),
      limit: 1000,
      window_seconds: 60,
      user_id: generateUserId(),
    }),
  },
  {
    message: "Deprecated API endpoint used",
    metadata: () => ({
      endpoint: "/api/v1/legacy/users",
      replacement: "/api/v2/users",
      sunset_date: "2025-12-31",
    }),
  },
  {
    message: "Retry attempt for failed operation",
    metadata: () => ({
      operation: getRandomElement([
        "payment_processing",
        "email_send",
        "api_call",
      ]),
      attempt: getRandomInt(1, 3),
      max_attempts: 3,
      next_retry_seconds: getRandomInt(5, 30),
    }),
  },
];

// ERROR 로그 시나리오
const ERROR_SCENARIOS = [
  {
    message: "Payment processing failed",
    error: {
      type: "PaymentError",
      message: "Insufficient funds in account",
    },
    metadata: () => ({
      transaction_id: `txn_${getRandomInt(100000, 999999)}`,
      amount: (Math.random() * 500).toFixed(2),
      payment_method: "card",
      error_code: "INSUFFICIENT_FUNDS",
    }),
  },
  {
    message: "Database connection failed",
    error: {
      type: "DatabaseError",
      message: "Connection timeout after 30 seconds",
    },
    metadata: () => ({
      host: "db.example.com",
      port: 5432,
      database: "production",
      retry_count: getRandomInt(1, 3),
    }),
  },
  {
    message: "External API call failed",
    error: {
      type: "NetworkError",
      message: "Request timeout",
    },
    metadata: () => ({
      api_endpoint: "https://api.external-service.com/v1/data",
      timeout_ms: 5000,
      status_code: 504,
    }),
  },
  {
    message: "Invalid request payload",
    error: {
      type: "ValidationError",
      message: "Missing required field: email",
    },
    metadata: () => ({
      endpoint: "/api/users",
      method: "POST",
      validation_errors: [
        "email is required",
        "password must be at least 8 characters",
      ],
    }),
  },
  {
    message: "Authentication failed",
    error: {
      type: "AuthenticationError",
      message: "Invalid credentials",
    },
    metadata: () => ({
      username: `user_${getRandomInt(1000, 9999)}`,
      failed_attempts: getRandomInt(1, 5),
      locked_until: new Date(Date.now() + 30 * 60000).toISOString(),
    }),
  },
  {
    message: "File upload failed",
    error: {
      type: "FileUploadError",
      message: "File size exceeds maximum allowed",
    },
    metadata: () => ({
      file_name: `document_${getRandomInt(1, 100)}.pdf`,
      file_size_mb: getRandomInt(15, 50),
      max_size_mb: 10,
    }),
  },
];

// FATAL 로그 시나리오
const FATAL_SCENARIOS = [
  {
    message: "Service crashed due to out of memory",
    error: {
      type: "OutOfMemoryError",
      message: "Java heap space exceeded",
    },
    metadata: () => ({
      heap_used_mb: getRandomInt(8000, 10000),
      heap_max_mb: 8192,
      gc_time_ms: getRandomInt(5000, 15000),
    }),
  },
  {
    message: "Critical system failure",
    error: {
      type: "SystemError",
      message: "Unable to recover from disk failure",
    },
    metadata: () => ({
      disk_path: "/data/production",
      error_code: "IO_ERROR",
      last_successful_write: new Date(Date.now() - 5 * 60000).toISOString(),
    }),
  },
  {
    message: "Unhandled exception in request handler",
    error: {
      type: "UnhandledError",
      message: "Null pointer exception",
    },
    metadata: () => ({
      request_id: generateTraceId(),
      handler: "OrderController.createOrder",
      thread_name: `worker-${getRandomInt(1, 10)}`,
    }),
  },
];

// ============ 로그 생성 함수 ============

function generateStackTrace(errorType: string, service: string): string {
  const traces = [
    `${errorType}: ${getRandomElement(ERROR_SCENARIOS).error.message}
    at ${service}.handler (/app/src/handlers/${service}.js:${getRandomInt(
      10,
      200,
    )}:${getRandomInt(1, 50)})
    at processRequest (/app/src/server.js:${getRandomInt(
      50,
      300,
    )}:${getRandomInt(1, 50)})
    at IncomingMessage.emit (events.js:${getRandomInt(200, 400)}:${getRandomInt(
      1,
      30,
    )})
    at endReadableNT (_stream_readable.js:${getRandomInt(
      1000,
      1500,
    )}:${getRandomInt(1, 20)})`,

    `${errorType}: Database query failed
    at DatabaseClient.query (/app/node_modules/pg/lib/client.js:${getRandomInt(
      100,
      500,
    )}:${getRandomInt(1, 30)})
    at ${service}.findUser (/app/src/services/${service}.js:${getRandomInt(
      20,
      150,
    )}:${getRandomInt(1, 40)})
    at async Router.handle (/app/src/routes/index.js:${getRandomInt(
      10,
      100,
    )}:${getRandomInt(1, 20)})`,

    `${errorType}: Network timeout
    at Timeout._onTimeout (/app/node_modules/axios/lib/adapters/http.js:${getRandomInt(
      100,
      300,
    )}:${getRandomInt(1, 30)})
    at listOnTimeout (internal/timers.js:${getRandomInt(
      500,
      600,
    )}:${getRandomInt(1, 20)})
    at processTimers (internal/timers.js:${getRandomInt(
      400,
      500,
    )}:${getRandomInt(1, 20)})`,
  ];

  return getRandomElement(traces);
}

function generateLog(config: GeneratorConfig): ApplicationLog {
  const service = getRandomElement(config.services);
  const level = selectLogLevel(config.logDistribution);

  let scenario: any;

  // 레벨별 시나리오 선택
  switch (level) {
    case "DEBUG":
      scenario = getRandomElement(DEBUG_SCENARIOS);
      break;
    case "INFO":
      scenario = getRandomElement(INFO_SCENARIOS);
      break;
    case "WARN":
      scenario = getRandomElement(WARN_SCENARIOS);
      break;
    case "ERROR":
      scenario = getRandomElement(ERROR_SCENARIOS);
      break;
    case "FATAL":
      scenario = getRandomElement(FATAL_SCENARIOS);
      break;
  }

  // 기본 로그 구조
  const log: ApplicationLog = {
    timestamp: getCurrentTimestamp(),
    level,
    service,
    message: scenario.message,
    trace_id: generateTraceId(),
  };

  // 선택적 필드 추가
  if (config.enabledFeatures.traceId) {
    log.span_id = generateSpanId();
  }

  if (config.enabledFeatures.userId && Math.random() > 0.3) {
    log.user_id = generateUserId();
  }

  if (Math.random() > 0.5) {
    log.session_id = generateSessionId();
  }

  if (config.enabledFeatures.ipAddress && Math.random() > 0.4) {
    log.ip_address = generateIpAddress();
  }

  // 메타데이터 추가
  if (config.enabledFeatures.metadata && scenario.metadata) {
    log.metadata = scenario.metadata();
  }

  // 에러 정보 추가 (ERROR, FATAL 레벨)
  if ((level === "ERROR" || level === "FATAL") && scenario.error) {
    log.error = {
      type: scenario.error.type,
      message: scenario.error.message,
    };

    // 스택 트레이스 추가 (50% 확률)
    if (config.enabledFeatures.stackTrace && Math.random() > 0.5) {
      log.error.stack_trace = generateStackTrace(scenario.error.type, service);
    }
  }

  return log;
}

// ============ 로그 작성 클래스 ============

class ApplicationLogger {
  private config: GeneratorConfig;
  private logFilePath: string;
  private writeStream: fs.WriteStream | null = null;
  private logCount = 0;

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.logFilePath = path.join(config.logDir, config.logFile);
    this.initLogFile();
  }

  private initLogFile(): void {
    // 로그 디렉토리 생성
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
      console.log(`✅ 로그 디렉토리 생성: ${this.config.logDir}`);
    }

    // WriteStream 생성 (append 모드)
    this.writeStream = fs.createWriteStream(this.logFilePath, { flags: "a" });
    console.log(`✅ 로그 파일 준비 완료: ${this.logFilePath}`);
  }

  public writeLog(log: ApplicationLog): void {
    if (!this.writeStream) {
      console.error("❌ WriteStream이 초기화되지 않았습니다.");
      return;
    }

    // JSON Lines 포맷으로 작성 (한 줄에 하나의 JSON)
    const logLine = JSON.stringify(log) + "\n";
    this.writeStream.write(logLine);
    this.logCount++;
  }

  public generateAndWriteLogs(): void {
    // 1초마다 1~5개의 로그 생성 (랜덤)
    const logsToGenerate = getRandomInt(1, 5);

    for (let i = 0; i < logsToGenerate; i++) {
      const log = generateLog(this.config);
      this.writeLog(log);
    }
  }

  public getLogCount(): number {
    return this.logCount;
  }

  public close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      console.log("✅ 로그 스트림 종료");
    }
  }
}

// ============ CLI 파라미터 파싱 ============

function parseArguments(): Partial<GeneratorConfig> {
  const args = process.argv.slice(2);
  const config: Partial<GeneratorConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case "--log-dir":
        config.logDir = value;
        i++;
        break;
      case "--log-file":
        config.logFile = value;
        i++;
        break;
      case "--interval":
        config.intervalMs = parseInt(value, 10);
        i++;
        break;
      case "--help":
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
실제 애플리케이션 로그 생성기
===========================

목적: MVP 로그 수집 시스템을 위한 현실적인 애플리케이션 로그 생성

로그 레벨:
  DEBUG   - 디버깅 정보 (캐시 hit, DB 연결 상태 등)
  INFO    - 일반 정보 (로그인, 주문 생성, API 요청 등)
  WARN    - 경고 (느린 쿼리, 높은 메모리 사용 등)
  ERROR   - 에러 (결제 실패, DB 연결 실패 등)
  FATAL   - 치명적 에러 (서비스 크래시, 시스템 장애 등)

사용법:
  npm run app-logs [옵션]

옵션:
  --log-dir <디렉토리>       로그 파일 저장 디렉토리 (기본값: ./logs)
  --log-file <파일명>        로그 파일명 (기본값: application.log)
  --interval <밀리초>        로그 생성 간격 (기본값: 1000)
  --help                     도움말 표시

예시:
  npm run app-logs
  npm run app-logs -- --interval 500
  npm run app-logs -- --log-dir /var/log/app --log-file app.log

Fluent Bit 연동:
  1. 이 프로그램이 로그를 파일로 작성 (JSON Lines 포맷)
  2. Fluent Bit이 tail로 로그 수집
  3. Kafka로 전송
  4. Backend에서 처리 및 저장
  `);
}

// ============ 메인 실행 ============

async function main() {
  const cliConfig = parseArguments();
  const config: GeneratorConfig = { ...DEFAULT_CONFIG, ...cliConfig };

  console.log("\n🚀 애플리케이션 로그 생성기 시작\n");
  console.log("📊 설정:");
  console.log(`   로그 경로: ${path.join(config.logDir, config.logFile)}`);
  console.log(`   생성 간격: ${config.intervalMs}ms`);
  console.log(`   서비스 목록: ${config.services.join(", ")}`);
  console.log("\n📡 로그 레벨 분포:");
  console.log(`   DEBUG: ${(config.logDistribution.debug * 100).toFixed(0)}%`);
  console.log(`   INFO:  ${(config.logDistribution.info * 100).toFixed(0)}%`);
  console.log(`   WARN:  ${(config.logDistribution.warn * 100).toFixed(0)}%`);
  console.log(`   ERROR: ${(config.logDistribution.error * 100).toFixed(0)}%`);
  console.log(`   FATAL: ${(config.logDistribution.fatal * 100).toFixed(0)}%`);
  console.log("\n💡 종료하려면 Ctrl+C를 누르세요.\n");

  const logger = new ApplicationLogger(config);

  // 주기적으로 로그 생성
  const interval = setInterval(() => {
    logger.generateAndWriteLogs();
    const timestamp = new Date().toLocaleTimeString();
    process.stdout.write(
      `⏱️  [${timestamp}] 로그 ${logger.getLogCount()}개 생성 완료\r`,
    );
  }, config.intervalMs);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n\n⏹️  종료 중...");
    console.log(`📊 총 ${logger.getLogCount()}개의 로그 생성됨`);
    clearInterval(interval);
    logger.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exit(1);
});
