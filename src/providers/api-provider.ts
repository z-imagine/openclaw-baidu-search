import type { ISearchProvider } from "./types.js";
import type {
  BaiduSearchConfig,
  HealthStatus,
  QianfanSearchRequest,
  QianfanSearchResponse,
  QianfanSearchReference,
  SearchMode,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "../types.js";
import { BAIDU_ENDPOINTS, SEARCH_LIMITS } from "../types.js";
import { createError, BaiduSearchError, BaiduSearchErrorCode } from "../error-handler.js";

export class ApiSearchProvider implements ISearchProvider {
  readonly name = "api";
  readonly mode: SearchMode = "api";
  readonly available: boolean;

  private config: BaiduSearchConfig;

  constructor(config: BaiduSearchConfig) {
    this.config = config;
    this.available = Boolean(config.apiKey);
  }

  async initialize(): Promise<void> {
    if (!this.available) {
      throw createError(BaiduSearchErrorCode.MISSING_API_KEY);
    }
  }

  async search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
    const startTime = Date.now();

    if (!this.available) {
      throw createError(BaiduSearchErrorCode.MISSING_API_KEY);
    }

    const count = Math.min(
      Math.max(request.count ?? SEARCH_LIMITS.defaultCount, SEARCH_LIMITS.minCount),
      SEARCH_LIMITS.maxCount,
    );

    const response = await this.executeSearch(
      request.query,
      count,
      signal,
    );

    const duration = Date.now() - startTime;

    return {
      content: this.formatContent(response.results),
      citations: response.results.map((r) => r.url),
      results: response.results,
      metadata: {
        mode: this.mode,
        duration,
        timestamp: Date.now(),
        totalResults: response.total,
      },
    };
  }

  private buildRequestBody(query: string, topK: number): QianfanSearchRequest {
    return {
      messages: [{ content: query, role: "user" }],
      search_source: "baidu_search_v2",
      resource_type_filter: [{ type: "web", top_k: topK }],
    };
  }

  private async executeSearch(
    query: string,
    count: number,
    signal?: AbortSignal,
  ): Promise<{ results: SearchResult[]; total?: number }> {
    const timeout = this.config.timeout * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    try {
      const requestBody = this.buildRequestBody(query, count);

      const response = await fetch(BAIDU_ENDPOINTS.search, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw createError(BaiduSearchErrorCode.AUTH_FAILED, {
            message: `Authentication failed: ${response.status}`,
            context: { status: response.status },
          });
        }
        if (response.status === 429) {
          throw createError(BaiduSearchErrorCode.RATE_LIMITED);
        }
        if (response.status >= 500) {
          throw createError(BaiduSearchErrorCode.SERVICE_UNAVAILABLE, {
            message: `Baidu API returned ${response.status}`,
          });
        }
        throw createError(BaiduSearchErrorCode.INVALID_RESPONSE, {
          message: `Baidu API error: ${response.status}`,
        });
      }

      const data = (await response.json()) as QianfanSearchResponse;
      return this.parseResponse(data);
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

  private parseResponse(data: QianfanSearchResponse): { results: SearchResult[]; total?: number } {
    if (data.error_code) {
      throw createError(BaiduSearchErrorCode.INVALID_RESPONSE, {
        message: data.error_msg || `API error: ${data.error_code}`,
        context: { errorCode: data.error_code },
      });
    }

    if (!data.references || !Array.isArray(data.references)) {
      return { results: [] };
    }

    const results: SearchResult[] = data.references
      .filter((ref): ref is QianfanSearchReference => Boolean(ref.url && ref.title))
      .map((ref) => ({
        title: ref.title,
        url: ref.url,
        snippet: ref.snippet || ref.content || "",
        displayUrl: ref.url,
        published: ref.date,
        source: "api",
      }));

    return {
      results,
      total: results.length,
    };
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
    if (!this.available) {
      return {
        healthy: false,
        message: "API Key not configured",
      };
    }

    return {
      healthy: true,
      message: "API provider is configured",
    };
  }

  async dispose(): Promise<void> {}
}