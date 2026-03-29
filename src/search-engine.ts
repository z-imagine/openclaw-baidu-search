import type { BaiduSearchConfig, SearchRequest, SearchResponse, ToolResult } from "./types.js";
import { SEARCH_LIMITS } from "./types.js";
import { ProviderFactory, createProviderFactory } from "./provider-factory.js";
import { BaiduSearchError, BaiduSearchErrorCode, shouldFallback, handleError } from "./error-handler.js";

export class SearchEngine {
  private config: BaiduSearchConfig;
  private providerFactory: ProviderFactory;

  constructor(config: BaiduSearchConfig) {
    this.config = config;
    this.providerFactory = createProviderFactory(config);
  }

  async search(query: string, options?: { count?: number }, signal?: AbortSignal): Promise<SearchResponse> {
    const count = Math.min(
      Math.max(options?.count ?? SEARCH_LIMITS.defaultCount, SEARCH_LIMITS.minCount),
      SEARCH_LIMITS.maxCount,
    );

    const request: SearchRequest = {
      query,
      count,
      offset: 0,
      timeout: this.config.timeout * 1000,
    };

    try {
      const provider = this.providerFactory.getProvider();
      await provider.initialize();
      return await provider.search(request, signal);
    } catch (error) {
      if (error instanceof BaiduSearchError && shouldFallback(error)) {
        const fallbackProvider = this.providerFactory.getFallbackProvider(error.code === BaiduSearchErrorCode.TIMEOUT ||
          error.code === BaiduSearchErrorCode.RATE_LIMITED ||
          error.code === BaiduSearchErrorCode.SERVICE_UNAVAILABLE ||
          error.code === BaiduSearchErrorCode.INVALID_RESPONSE ? "api" : "crawler");

        if (fallbackProvider) {
          try {
            await fallbackProvider.initialize();
            return await fallbackProvider.search(request, signal);
          } catch {
            throw error;
          }
        }
      }

      throw error;
    }
  }

  async searchSafe(query: string, options?: { count?: number }, signal?: AbortSignal): Promise<ToolResult> {
    try {
      const response = await this.search(query, options, signal);
      return {
        success: true,
        content: response.content,
        citations: response.citations,
        results: response.results,
      };
    } catch (error) {
      const handling = handleError(error);
      return {
        success: false,
        error: handling.error,
      };
    }
  }

  getConfig(): BaiduSearchConfig {
    return this.config;
  }

  getAvailableModes() {
    return this.providerFactory.getAvailableModes();
  }

  async dispose(): Promise<void> {
    await this.providerFactory.dispose();
  }
}

export function createSearchEngine(config: BaiduSearchConfig): SearchEngine {
  return new SearchEngine(config);
}