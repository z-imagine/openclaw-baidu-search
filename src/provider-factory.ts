import type { ISearchProvider } from "./providers/types.js";
import type { BaiduSearchConfig, SearchMode } from "./types.js";
import { ApiSearchProvider } from "./providers/api-provider.js";
import { CrawlerSearchProvider } from "./providers/crawler-provider.js";
import { isApiModeAvailable } from "./config.js";

export class ProviderFactory {
  private config: BaiduSearchConfig;
  private providers: Map<SearchMode, ISearchProvider> = new Map();
  private currentProvider: ISearchProvider | null = null;

  constructor(config: BaiduSearchConfig) {
    this.config = config;
  }

  createProvider(): ISearchProvider {
    const mode = this.resolveMode();

    if (this.providers.has(mode)) {
      this.currentProvider = this.providers.get(mode)!;
      return this.currentProvider;
    }

    let provider: ISearchProvider;

    switch (mode) {
      case "api":
        provider = new ApiSearchProvider(this.config);
        break;
      case "crawler":
        provider = new CrawlerSearchProvider(this.config);
        break;
      default:
        provider = new CrawlerSearchProvider(this.config);
    }

    this.providers.set(mode, provider);
    this.currentProvider = provider;

    return provider;
  }

  getProvider(): ISearchProvider {
    if (this.currentProvider) {
      return this.currentProvider;
    }
    return this.createProvider();
  }

  getFallbackProvider(excludeMode: SearchMode): ISearchProvider | null {
    if (!this.config.fallbackEnabled) {
      return null;
    }

    const fallbackOrder: SearchMode[] = ["api", "crawler"];

    for (const mode of fallbackOrder) {
      if (mode === excludeMode) continue;

      if (mode === "api" && !isApiModeAvailable(this.config)) continue;

      if (this.providers.has(mode)) {
        return this.providers.get(mode)!;
      }

      let provider: ISearchProvider;
      if (mode === "api") {
        provider = new ApiSearchProvider(this.config);
      } else {
        provider = new CrawlerSearchProvider(this.config);
      }

      this.providers.set(mode, provider);
      return provider;
    }

    return null;
  }

  getAvailableModes(): SearchMode[] {
    const modes: SearchMode[] = [];

    if (isApiModeAvailable(this.config)) {
      modes.push("api");
    }
    modes.push("crawler");

    return modes;
  }

  switchMode(mode: SearchMode): ISearchProvider {
    if (mode === "api" && !isApiModeAvailable(this.config)) {
      throw new Error("API mode is not available: missing API credentials");
    }

    if (this.providers.has(mode)) {
      this.currentProvider = this.providers.get(mode)!;
      return this.currentProvider;
    }

    let provider: ISearchProvider;
    if (mode === "api") {
      provider = new ApiSearchProvider(this.config);
    } else {
      provider = new CrawlerSearchProvider(this.config);
    }

    this.providers.set(mode, provider);
    this.currentProvider = provider;

    return provider;
  }

  private resolveMode(): SearchMode {
    const mode = this.config.mode;

    if (mode === "api") {
      if (!isApiModeAvailable(this.config)) {
        throw new Error("API mode requires apiKey");
      }
      return "api";
    }

    if (mode === "crawler") {
      return "crawler";
    }

    if (isApiModeAvailable(this.config)) {
      return "api";
    }

    return "crawler";
  }

  async dispose(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.dispose();
    }
    this.providers.clear();
    this.currentProvider = null;
  }
}

export function createProviderFactory(config: BaiduSearchConfig): ProviderFactory {
  return new ProviderFactory(config);
}
