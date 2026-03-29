import type { ISearchProvider } from "./types.js";
import type {
  BaiduSearchConfig,
  CrawlerConfig,
  HealthStatus,
  SearchMode,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "../types.js";
import { SEARCH_LIMITS } from "../types.js";
import { createError, BaiduSearchError, BaiduSearchErrorCode } from "../error-handler.js";
import { buildSearchUrl } from "./utils/url-builder.js";
import { parseSearchResults, detectAntiCrawler, detectCaptcha } from "./utils/html-parser.js";
import { RateLimiter, getGlobalRateLimiter } from "./utils/rate-limiter.js";
import { getCrawlerConfig } from "../config.js";

export class CrawlerSearchProvider implements ISearchProvider {
  readonly name = "crawler";
  readonly mode: SearchMode = "crawler";
  readonly available = true;

  private config: BaiduSearchConfig;
  private crawlerConfig: Required<CrawlerConfig>;
  private rateLimiter: RateLimiter;

  constructor(config: BaiduSearchConfig) {
    this.config = config;
    this.crawlerConfig = getCrawlerConfig(config);
    this.rateLimiter = getGlobalRateLimiter(this.crawlerConfig.minInterval);
  }

  async initialize(): Promise<void> {}

  async search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
    const startTime = Date.now();

    const count = Math.min(
      Math.max(request.count ?? SEARCH_LIMITS.defaultCount, SEARCH_LIMITS.minCount),
      SEARCH_LIMITS.maxCount,
    );

    await this.rateLimiter.acquire();

    const url = buildSearchUrl(request.query, {
      count,
      offset: request.offset ?? 0,
    });

    const html = await this.fetchPage(url, signal);

    if (detectAntiCrawler(html)) {
      if (detectCaptcha(html)) {
        throw createError(BaiduSearchErrorCode.CAPTCHA_REQUIRED);
      }
      throw createError(BaiduSearchErrorCode.ANTI_CRAWLER);
    }

    const results = parseSearchResults(html);

    if (results.length === 0) {
      throw createError(BaiduSearchErrorCode.NO_RESULTS);
    }

    const duration = Date.now() - startTime;

    return {
      content: this.formatContent(results),
      citations: results.map((r) => r.url),
      results,
      metadata: {
        mode: this.mode,
        duration,
        timestamp: Date.now(),
        totalResults: results.length,
      },
    };
  }

  private async fetchPage(url: string, signal?: AbortSignal): Promise<string> {
    const timeout = this.config.timeout * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const headers: Record<string, string> = {
      "User-Agent": this.crawlerConfig.userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate",
      Connection: "keep-alive",
      "Cache-Control": "max-age=0",
    };

    if (this.crawlerConfig.proxyUrl) {
      headers["X-Proxy-URL"] = this.crawlerConfig.proxyUrl;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: combinedSignal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 403) {
          throw createError(BaiduSearchErrorCode.IP_BLOCKED);
        }
        if (response.status === 429) {
          throw createError(BaiduSearchErrorCode.RATE_LIMITED);
        }
        throw createError(BaiduSearchErrorCode.SERVICE_UNAVAILABLE, {
          message: `HTTP ${response.status}`,
        });
      }

      const html = await response.text();
      return html;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof BaiduSearchError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw createError(BaiduSearchErrorCode.TIMEOUT, { cause: error });
      }

      throw createError(BaiduSearchErrorCode.NETWORK_ERROR, {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  private formatContent(results: SearchResult[]): string {
    if (results.length === 0) {
      return "未找到相关搜索结果。";
    }

    const lines = results.map((r, i) => {
      const parts = [`${i + 1}. ${r.title}`];
      if (r.snippet) {
        parts.push(`   ${r.snippet}`);
      }
      parts.push(`   来源: ${r.url}`);
      return parts.join("\n");
    });

    return lines.join("\n\n");
  }

  async checkHealth(): Promise<HealthStatus> {
    try {
      await this.rateLimiter.acquire();

      const url = buildSearchUrl("test");
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": this.crawlerConfig.userAgent,
        },
      });

      return {
        healthy: response.ok,
        message: response.ok ? "Crawler provider is healthy" : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  async dispose(): Promise<void> {
    this.rateLimiter.reset();
  }
}