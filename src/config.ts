import type {
  BaiduSearchConfig,
  BaiduSearchPluginConfig,
  ConfigError,
  ConfigResult,
  CrawlerConfig,
  SearchMode,
} from "./types.js";

const ENV_VAR_MAPPING = {
  mode: "BAIDU_SEARCH_MODE",
  apiKey: "BAIDU_API_KEY",
  timeout: "BAIDU_SEARCH_TIMEOUT",
  retryCount: "BAIDU_SEARCH_RETRY_COUNT",
} as const;

function readEnvString(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

function readEnvNumber(key: string): number | undefined {
  const value = process.env[key];
  if (!value || !value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateTimeout(value: number | undefined): ConfigError | null {
  if (value === undefined) return null;
  if (!Number.isInteger(value) || value < 5 || value > 120) {
    return {
      field: "timeout",
      message: "timeout must be an integer between 5 and 120",
      value,
    };
  }
  return null;
}

function validateRetryCount(value: number | undefined): ConfigError | null {
  if (value === undefined) return null;
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    return {
      field: "retryCount",
      message: "retryCount must be an integer between 0 and 5",
      value,
    };
  }
  return null;
}

function validateMode(value: string | undefined): ConfigError | null {
  if (value === undefined) return null;
  if (value !== "api" && value !== "crawler" && value !== "auto") {
    return {
      field: "mode",
      message: "mode must be 'api', 'crawler', or 'auto'",
      value,
    };
  }
  return null;
}

function validateCrawlerConfig(crawler: CrawlerConfig | undefined): ConfigError[] {
  const errors: ConfigError[] = [];
  if (!crawler) return errors;

  if (crawler.minInterval !== undefined) {
    if (!Number.isInteger(crawler.minInterval) || crawler.minInterval < 0) {
      errors.push({
        field: "crawler.minInterval",
        message: "crawler.minInterval must be a non-negative integer",
        value: crawler.minInterval,
      });
    }
  }

  if (crawler.proxyUrl !== undefined && crawler.proxyUrl.trim()) {
    try {
      new URL(crawler.proxyUrl);
    } catch {
      errors.push({
        field: "crawler.proxyUrl",
        message: "crawler.proxyUrl must be a valid URL",
        value: crawler.proxyUrl,
      });
    }
  }

  return errors;
}

function resolveMode(config: Partial<BaiduSearchConfig>): SearchMode {
  const mode = config.mode;

  if (mode === "api") {
    if (!config.apiKey) {
      throw new Error("API mode requires apiKey to be configured");
    }
    return "api";
  }

  if (mode === "crawler") {
    return "crawler";
  }

  if (config.apiKey) {
    return "api";
  }

  return "crawler";
}

export function resolveConfig(pluginConfig: BaiduSearchPluginConfig = {}): ConfigResult {
  const errors: ConfigError[] = [];
  const rawMode = pluginConfig.mode ?? readEnvString(ENV_VAR_MAPPING.mode) ?? "auto";
  const config: BaiduSearchConfig = {
    mode: rawMode as SearchMode,
    timeout: pluginConfig.timeout ?? readEnvNumber(ENV_VAR_MAPPING.timeout) ?? 30,
    retryCount: pluginConfig.retryCount ?? readEnvNumber(ENV_VAR_MAPPING.retryCount) ?? 3,
    hookEnabled: pluginConfig.hookEnabled ?? true,
    fallbackEnabled: pluginConfig.fallbackEnabled ?? true,
    apiKey: pluginConfig.apiKey ?? readEnvString(ENV_VAR_MAPPING.apiKey),
    crawler: pluginConfig.crawler
      ? {
          userAgent: pluginConfig.crawler.userAgent,
          minInterval: pluginConfig.crawler.minInterval ?? 1000,
          resolveRedirects: pluginConfig.crawler.resolveRedirects ?? false,
          proxyUrl: pluginConfig.crawler.proxyUrl,
        }
      : undefined,
  };

  const timeoutError = validateTimeout(config.timeout);
  if (timeoutError) errors.push(timeoutError);

  const retryCountError = validateRetryCount(config.retryCount);
  if (retryCountError) errors.push(retryCountError);

  const modeError = validateMode(config.mode);
  if (modeError) errors.push(modeError);

  const crawlerErrors = validateCrawlerConfig(config.crawler);
  errors.push(...crawlerErrors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  try {
    const resolvedMode = resolveMode(config);
    config.mode = resolvedMode;
  } catch (e) {
    errors.push({
      field: "mode",
      message: e instanceof Error ? e.message : "Invalid mode configuration",
      value: config.mode,
    });
    return { ok: false, errors };
  }

  return { ok: true, config };
}

export function isApiModeAvailable(config: BaiduSearchConfig): boolean {
  return Boolean(config.apiKey);
}

export function getCrawlerConfig(config: BaiduSearchConfig): Required<CrawlerConfig> {
  return {
    userAgent: config.crawler?.userAgent ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    minInterval: config.crawler?.minInterval ?? 1000,
    resolveRedirects: config.crawler?.resolveRedirects ?? false,
    proxyUrl: config.crawler?.proxyUrl ?? "",
  };
}

export function getAvailableModes(config: BaiduSearchConfig): SearchMode[] {
  const modes: SearchMode[] = [];
  if (isApiModeAvailable(config)) {
    modes.push("api");
  }
  modes.push("crawler");
  return modes;
}