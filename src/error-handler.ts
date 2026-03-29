import {
  BaiduSearchErrorCode,
  type BaiduSearchErrorDetail,
  type BaiduSearchErrorType,
  type ErrorHandlingResult,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from "./types.js";

export { BaiduSearchErrorCode };

const ERROR_MESSAGES: Record<BaiduSearchErrorCode, { message: string; userMessage: string }> = {
  [BaiduSearchErrorCode.MISSING_API_KEY]: {
    message: "Baidu API Key is not configured",
    userMessage: "百度搜索未配置 API Key，请在配置中设置 apiKey 或环境变量 BAIDU_API_KEY",
  },
  [BaiduSearchErrorCode.INVALID_CONFIG]: {
    message: "Invalid configuration",
    userMessage: "配置无效，请检查配置项",
  },
  [BaiduSearchErrorCode.AUTH_FAILED]: {
    message: "Authentication failed",
    userMessage: "认证失败，请检查 API Key 是否正确",
  },
  [BaiduSearchErrorCode.TIMEOUT]: {
    message: "Search request timed out",
    userMessage: "百度搜索请求超时，请稍后重试",
  },
  [BaiduSearchErrorCode.RATE_LIMITED]: {
    message: "Rate limited by Baidu API",
    userMessage: "百度搜索请求过于频繁，请稍后重试",
  },
  [BaiduSearchErrorCode.SERVICE_UNAVAILABLE]: {
    message: "Baidu service is unavailable",
    userMessage: "百度搜索服务暂时不可用，请稍后重试",
  },
  [BaiduSearchErrorCode.NO_RESULTS]: {
    message: "No search results found",
    userMessage: "未找到相关搜索结果",
  },
  [BaiduSearchErrorCode.NETWORK_ERROR]: {
    message: "Network connection failed",
    userMessage: "网络连接失败，请检查网络",
  },
  [BaiduSearchErrorCode.INVALID_RESPONSE]: {
    message: "Invalid response from Baidu API",
    userMessage: "服务响应异常，请稍后重试",
  },
  [BaiduSearchErrorCode.ANTI_CRAWLER]: {
    message: "Anti-crawler detection triggered",
    userMessage: "触发反爬虫检测，建议切换到 API 模式",
  },
  [BaiduSearchErrorCode.PARSE_ERROR]: {
    message: "Failed to parse search results",
    userMessage: "解析搜索结果失败",
  },
  [BaiduSearchErrorCode.IP_BLOCKED]: {
    message: "IP has been blocked by Baidu",
    userMessage: "IP 被限制，请稍后重试或使用 API 模式",
  },
  [BaiduSearchErrorCode.CAPTCHA_REQUIRED]: {
    message: "Captcha verification required",
    userMessage: "需要验证码验证，建议使用 API 模式",
  },
  [BaiduSearchErrorCode.INVALID_MODE]: {
    message: "Invalid search mode",
    userMessage: "无效的搜索模式配置",
  },
};

const ERROR_TYPE_MAP: Record<BaiduSearchErrorCode, BaiduSearchErrorType> = {
  [BaiduSearchErrorCode.MISSING_API_KEY]: "configuration",
  [BaiduSearchErrorCode.INVALID_CONFIG]: "configuration",
  [BaiduSearchErrorCode.AUTH_FAILED]: "authentication",
  [BaiduSearchErrorCode.TIMEOUT]: "network",
  [BaiduSearchErrorCode.RATE_LIMITED]: "api",
  [BaiduSearchErrorCode.SERVICE_UNAVAILABLE]: "api",
  [BaiduSearchErrorCode.NO_RESULTS]: "search",
  [BaiduSearchErrorCode.NETWORK_ERROR]: "network",
  [BaiduSearchErrorCode.INVALID_RESPONSE]: "api",
  [BaiduSearchErrorCode.ANTI_CRAWLER]: "crawler",
  [BaiduSearchErrorCode.PARSE_ERROR]: "crawler",
  [BaiduSearchErrorCode.IP_BLOCKED]: "crawler",
  [BaiduSearchErrorCode.CAPTCHA_REQUIRED]: "crawler",
  [BaiduSearchErrorCode.INVALID_MODE]: "configuration",
};

const RETRYABLE_ERRORS = new Set<BaiduSearchErrorCode>([
  BaiduSearchErrorCode.TIMEOUT,
  BaiduSearchErrorCode.RATE_LIMITED,
  BaiduSearchErrorCode.SERVICE_UNAVAILABLE,
  BaiduSearchErrorCode.NETWORK_ERROR,
]);

const FALLBACK_ERRORS = new Set<BaiduSearchErrorCode>([
  BaiduSearchErrorCode.AUTH_FAILED,
  BaiduSearchErrorCode.TIMEOUT,
  BaiduSearchErrorCode.RATE_LIMITED,
  BaiduSearchErrorCode.SERVICE_UNAVAILABLE,
  BaiduSearchErrorCode.INVALID_RESPONSE,
  BaiduSearchErrorCode.ANTI_CRAWLER,
  BaiduSearchErrorCode.IP_BLOCKED,
  BaiduSearchErrorCode.CAPTCHA_REQUIRED,
]);

export class BaiduSearchError extends Error {
  readonly code: BaiduSearchErrorCode;
  readonly type: BaiduSearchErrorType;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly fallback: boolean;
  readonly cause?: Error;
  readonly context?: Record<string, unknown>;

  constructor(detail: BaiduSearchErrorDetail) {
    super(detail.message);
    this.name = "BaiduSearchError";
    this.code = detail.code;
    this.type = detail.type;
    this.userMessage = detail.userMessage;
    this.retryable = detail.retryable;
    this.fallback = detail.fallback;
    this.cause = detail.cause;
    this.context = detail.context;
  }

  toDetail(): BaiduSearchErrorDetail {
    return {
      code: this.code,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      retryable: this.retryable,
      fallback: this.fallback,
      cause: this.cause,
      context: this.context,
    };
  }
}

export function createError(
  code: BaiduSearchErrorCode,
  options?: {
    cause?: Error;
    context?: Record<string, unknown>;
    message?: string;
  },
): BaiduSearchError {
  const messages = ERROR_MESSAGES[code];
  const type = ERROR_TYPE_MAP[code];
  const retryable = RETRYABLE_ERRORS.has(code);
  const fallback = FALLBACK_ERRORS.has(code);

  return new BaiduSearchError({
    code,
    type,
    message: options?.message ?? messages.message,
    userMessage: messages.userMessage,
    retryable,
    fallback,
    cause: options?.cause,
    context: options?.context,
  });
}

export function classifyError(error: unknown): BaiduSearchError {
  if (error instanceof BaiduSearchError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("abort") || message.includes("timeout")) {
      return createError(BaiduSearchErrorCode.TIMEOUT, { cause: error });
    }

    if (message.includes("network") || message.includes("econnrefused") || message.includes("enotfound")) {
      return createError(BaiduSearchErrorCode.NETWORK_ERROR, { cause: error });
    }

    if (message.includes("rate") || message.includes("429") || message.includes("too many")) {
      return createError(BaiduSearchErrorCode.RATE_LIMITED, { cause: error });
    }

    if (message.includes("503") || message.includes("502") || message.includes("service unavailable")) {
      return createError(BaiduSearchErrorCode.SERVICE_UNAVAILABLE, { cause: error });
    }

    if (message.includes("captcha") || message.includes("验证码")) {
      return createError(BaiduSearchErrorCode.CAPTCHA_REQUIRED, { cause: error });
    }

    if (message.includes("blocked") || message.includes("forbidden") || message.includes("403")) {
      return createError(BaiduSearchErrorCode.IP_BLOCKED, { cause: error });
    }

    if (message.includes("parse") || message.includes("json") || message.includes("unexpected token")) {
      return createError(BaiduSearchErrorCode.PARSE_ERROR, { cause: error });
    }

    return createError(BaiduSearchErrorCode.INVALID_RESPONSE, {
      cause: error,
      message: error.message,
    });
  }

  return createError(BaiduSearchErrorCode.INVALID_RESPONSE, {
    message: String(error),
  });
}

export function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): number {
  const delay = policy.baseDelay * Math.pow(policy.backoffFactor, attempt);
  return Math.min(delay, policy.maxDelay);
}

export function handleError(
  error: unknown,
  attempt: number = 0,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): ErrorHandlingResult {
  const classified = classifyError(error);

  if (classified.retryable && attempt < policy.maxAttempts) {
    return {
      retry: true,
      delay: calculateRetryDelay(attempt, policy),
      fallback: classified.fallback,
      error: classified.toDetail(),
    };
  }

  return {
    retry: false,
    fallback: classified.fallback,
    error: classified.toDetail(),
  };
}

export function shouldFallback(error: BaiduSearchError): boolean {
  return error.fallback;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof BaiduSearchError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}