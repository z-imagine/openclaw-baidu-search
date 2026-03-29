/**
 * 百度搜索 Plugin 类型定义
 * @module types
 */

// =============================================================================
// 搜索模式类型
// =============================================================================

/** 搜索模式 */
export type SearchMode = "api" | "crawler" | "auto";

// =============================================================================
// 配置类型
// =============================================================================

/** 爬虫模式配置 */
export interface CrawlerConfig {
  /** 自定义 User-Agent */
  userAgent?: string;
  /** 最小请求间隔（毫秒），默认 1000 */
  minInterval?: number;
  /** 是否解析重定向 URL，默认 false */
  resolveRedirects?: boolean;
  /** 代理服务器 URL */
  proxyUrl?: string;
}

/** 百度搜索 Plugin 完整配置 */
export interface BaiduSearchConfig {
  // 通用配置
  /** 搜索模式，默认 "auto" */
  mode: SearchMode;
  /** 请求超时时间（秒），默认 30 */
  timeout: number;
  /** 失败重试次数，默认 3 */
  retryCount: number;
  /** 是否启用 Agent 引导 Hook，默认 true */
  hookEnabled: boolean;

  // 降级配置
  /** 是否启用模式降级，默认 true */
  fallbackEnabled: boolean;

  // API 模式配置
  /** 百度千帆 API Key（API 模式必需） */
  apiKey?: string;

  // 爬虫模式配置
  /** 爬虫特定配置 */
  crawler?: CrawlerConfig;
}

/** Plugin 原始配置（用户输入） */
export type BaiduSearchPluginConfig = Partial<Omit<BaiduSearchConfig, "mode" | "timeout" | "retryCount" | "hookEnabled" | "fallbackEnabled">> & {
  mode?: SearchMode;
  timeout?: number;
  retryCount?: number;
  hookEnabled?: boolean;
  fallbackEnabled?: boolean;
};

/** 配置解析结果 */
export interface ConfigResult {
  ok: boolean;
  config?: BaiduSearchConfig;
  errors?: ConfigError[];
}

/** 配置错误 */
export interface ConfigError {
  field: string;
  message: string;
  value?: unknown;
}

// =============================================================================
// 千帆 AI 搜索 API 类型
// =============================================================================

/** 千帆 AI 搜索请求体 */
export interface QianfanSearchRequest {
  messages: Array<{ content: string; role: string }>;
  search_source: string;
  resource_type_filter: Array<{ type: string; top_k?: number }>;
}

/** 千帆 AI 搜索响应 */
export interface QianfanSearchResponse {
  request_id: string;
  references?: QianfanSearchReference[];
  error_code?: number;
  error_msg?: string;
}

/** 千帆搜索结果引用 */
export interface QianfanSearchReference {
  id: number;
  title: string;
  url: string;
  snippet: string;
  content?: string;
  date?: string;
  type?: string;
}

// =============================================================================
// 搜索相关类型
// =============================================================================

/** 搜索请求参数 */
export interface SearchRequest {
  /** 搜索关键词（必需） */
  query: string;
  /** 返回结果数量，1-10，默认 5 */
  count?: number;
  /** 分页偏移，默认 0 */
  offset?: number;
  /** 请求超时（毫秒），覆盖全局配置 */
  timeout?: number;
}

/** 单条搜索结果 */
export interface SearchResult {
  /** 标题 */
  title: string;
  /** 链接 */
  url: string;
  /** 摘要 */
  snippet: string;
  /** 显示 URL */
  displayUrl?: string;
  /** 发布时间 */
  published?: string;
  /** 来源模式 */
  source?: SearchMode;
}

/** 响应元数据 */
export interface ResponseMetadata {
  /** 使用的模式 */
  mode: SearchMode;
  /** 请求耗时（毫秒） */
  duration: number;
  /** 总结果数（如可用） */
  totalResults?: number;
  /** 响应时间戳 */
  timestamp: number;
}

/** 搜索响应结果 */
export interface SearchResponse {
  /** 搜索结果摘要/合成内容 */
  content: string;
  /** 来源 URL 列表 */
  citations: string[];
  /** 详细结果列表 */
  results: SearchResult[];
  /** 响应元数据 */
  metadata: ResponseMetadata;
}

// =============================================================================
// 提供者相关类型
// =============================================================================

/** 提供者状态 */
export interface ProviderStatus {
  /** 提供者名称 */
  name: string;
  /** 模式 */
  mode: SearchMode;
  /** 是否可用 */
  available: boolean;
  /** 不可用原因 */
  reason?: string;
}

/** 健康检查结果 */
export interface HealthStatus {
  /** 是否健康 */
  healthy: boolean;
  /** 消息 */
  message?: string;
  /** 延迟（毫秒） */
  latency?: number;
}

// =============================================================================
// 错误相关类型
// =============================================================================

/** 错误码 */
export enum BaiduSearchErrorCode {
  // 配置错误 (E001, E003)
  MISSING_API_KEY = "E001",
  INVALID_CONFIG = "E003",

  // 认证错误 (E004)
  AUTH_FAILED = "E004",

  // 网络错误 (E005, E009)
  TIMEOUT = "E005",
  NETWORK_ERROR = "E009",

  // API 错误 (E006, E007, E010)
  RATE_LIMITED = "E006",
  SERVICE_UNAVAILABLE = "E007",
  INVALID_RESPONSE = "E010",

  // 爬虫错误 (E011-E014)
  ANTI_CRAWLER = "E011",
  PARSE_ERROR = "E012",
  IP_BLOCKED = "E013",
  CAPTCHA_REQUIRED = "E014",

  // 搜索错误 (E008, E015)
  NO_RESULTS = "E008",
  INVALID_MODE = "E015",
}

/** 错误类型 */
export type BaiduSearchErrorType =
  | "configuration"
  | "authentication"
  | "network"
  | "api"
  | "crawler"
  | "search";

/** 重试策略 */
export interface RetryPolicy {
  /** 最大重试次数 */
  maxAttempts: number;
  /** 基础延迟（毫秒） */
  baseDelay: number;
  /** 最大延迟（毫秒） */
  maxDelay: number;
  /** 退避因子 */
  backoffFactor: number;
}

/** 错误处理结果 */
export interface ErrorHandlingResult {
  /** 是否应该重试 */
  retry: boolean;
  /** 重试延迟（毫秒），如果 retry 为 true */
  delay?: number;
  /** 是否可以降级 */
  fallback: boolean;
  /** 标准化错误 */
  error?: BaiduSearchErrorDetail;
}

/** 错误详情 */
export interface BaiduSearchErrorDetail {
  /** 错误码 */
  code: BaiduSearchErrorCode;
  /** 错误类型 */
  type: BaiduSearchErrorType;
  /** 技术错误消息 */
  message: string;
  /** 用户友好的错误消息 */
  userMessage: string;
  /** 是否可重试 */
  retryable: boolean;
  /** 是否可降级 */
  fallback: boolean;
  /** 原始错误 */
  cause?: Error;
  /** 上下文信息 */
  context?: Record<string, unknown>;
}

// =============================================================================
// Hook 相关类型
// =============================================================================

/** Hook 配置 */
export interface HookConfig {
  /** 是否启用，默认 true */
  enabled: boolean;
  /** 注入位置 */
  injectionMode: "append" | "prepend";
  /** 自定义指导文本 */
  customGuidance?: string;
}

// =============================================================================
// 工具相关类型
// =============================================================================

/** 工具执行上下文 */
export interface ToolExecutionContext {
  /** Plugin 配置 */
  config: BaiduSearchConfig;
  /** 工作目录 */
  workspaceDir?: string;
  /** Agent ID */
  agentId?: string;
  /** 会话 Key */
  sessionKey?: string;
  /** 会话 ID */
  sessionId?: string;
  /** 消息通道 */
  messageChannel?: string;
}

/** 工具返回结果 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean;
  /** 搜索内容 */
  content?: string;
  /** 引用 URL 列表 */
  citations?: string[];
  /** 详细结果 */
  results?: SearchResult[];
  /** 错误信息 */
  error?: BaiduSearchErrorDetail;
}

// =============================================================================
// 默认值常量
// =============================================================================

/** 默认配置值 */
export const DEFAULT_CONFIG = {
  mode: "auto" as SearchMode,
  timeout: 30,
  retryCount: 3,
  hookEnabled: true,
  fallbackEnabled: true,
} as const;

/** 默认爬虫配置 */
export const DEFAULT_CRAWLER_CONFIG: Required<CrawlerConfig> = {
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  minInterval: 1000,
  resolveRedirects: false,
  proxyUrl: "",
};

/** 默认重试策略 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

/** 搜索结果数量限制 */
export const SEARCH_LIMITS = {
  minCount: 1,
  maxCount: 10,
  defaultCount: 5,
} as const;

/** 百度 API 端点 */
export const BAIDU_ENDPOINTS = {
  search: "https://qianfan.baidubce.com/v2/ai_search/web_search",
  webSearch: "https://www.baidu.com/s",
} as const;

// =============================================================================
// OpenClaw Plugin API 类型 (本地定义，避免依赖 openclaw 包)
// =============================================================================

/** Plugin 日志器 */
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** Agent 工具参数 Schema */
export type ToolParameterSchema = Record<string, unknown>;

/** Agent 工具执行结果 */
export interface AgentToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** Agent 工具定义 */
export interface AnyAgentTool {
  name: string;
  description?: string;
  parameters?: ToolParameterSchema;
  ownerOnly?: boolean;
  execute?: (_toolCallId: string, args: Record<string, unknown>, signal?: AbortSignal) => Promise<AgentToolResult>;
}

/** Hook 事件结果 */
export interface HookEventResult {
  prependSystemContext?: string;
  appendSystemContext?: string;
}

/** Plugin API */
export interface OpenClawPluginApi {
  pluginConfig: Record<string, unknown>;
  logger: PluginLogger;
  registerTool: (tool: AnyAgentTool, opts?: { name?: string; optional?: boolean }) => void;
  on: (event: string, handler: () => Promise<HookEventResult>) => void;
  registerHook?: (events: string | string[], handler: unknown, opts?: unknown) => void;
  registerHttpRoute?: (params: unknown) => void;
}

/** Plugin 定义 */
export interface OpenClawPluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  register: (api: OpenClawPluginApi) => void | Promise<void>;
}