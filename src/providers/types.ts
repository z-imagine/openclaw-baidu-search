import type {
  HealthStatus,
  SearchMode,
  SearchRequest,
  SearchResponse,
} from "../types.js";

export interface ISearchProvider {
  readonly name: string;
  readonly mode: SearchMode;
  readonly available: boolean;

  initialize(): Promise<void>;
  search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse>;
  checkHealth(): Promise<HealthStatus>;
  dispose(): Promise<void>;
}

export type SearchProviderConstructor = new (config: unknown) => ISearchProvider;