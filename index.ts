import { Type } from "@sinclair/typebox";
import type {
  OpenClawPluginDefinition,
  OpenClawPluginApi,
  AnyAgentTool,
} from "./src/types.js";
import { resolveConfig, getAvailableModes } from "./src/config.js";
import { createSearchEngine } from "./src/search-engine.js";
import { createHookHandler } from "./src/hooks.js";
import { getErrorMessage } from "./src/error-handler.js";

const TOOL_NAME = "baidu_search";
const TOOL_DESCRIPTION = `Search the web using Baidu search engine.

Supports two modes:
- API mode: Official Baidu API (requires API key)
- Crawler mode: Direct web scraping (no API key needed)

Use this tool when:
- Query contains Chinese characters
- User asks about China/Chinese-specific content
- User explicitly mentions "百度" or "Baidu"

For English/international queries, use web_search instead.`;

const plugin: OpenClawPluginDefinition = {
  id: "baidu-search",
  name: "Baidu Search Provider",
  version: "1.0.2",
  description: "China-friendly Baidu search plugin for OpenClaw",

  register(api: OpenClawPluginApi) {
    const configResult = resolveConfig(api.pluginConfig as Record<string, unknown>);

    if (!configResult.ok) {
      const errors = configResult.errors?.map((e) => `${e.field}: ${e.message}`).join("; ");
      api.logger.error(`Baidu search plugin configuration errors: ${errors}`);
      return;
    }

    const config = configResult.config!;
    const searchEngine = createSearchEngine(config);

    const tool: AnyAgentTool = {
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      parameters: Type.Object({
        query: Type.String({
          description: "搜索关键词",
        }),
        count: Type.Optional(
          Type.Number({
            description: "返回结果数量 (1-10)",
            minimum: 1,
            maximum: 10,
            default: 5,
          }),
        ),
      }),
      execute: async (_toolCallId: string, args: Record<string, unknown>, signal?: AbortSignal) => {
        const query = args.query as string;
        const count = args.count as number | undefined;

        try {
          const result = await searchEngine.searchSafe(query, { count }, signal);

          if (result.success && result.content) {
            return {
              success: true,
              data: {
                content: result.content,
                citations: result.citations,
                results: result.results,
              },
            };
          }

          return {
            success: false,
            error: result.error?.userMessage || "Search failed",
          };
        } catch (error) {
          const message = getErrorMessage(error);
          api.logger.error(`Baidu search error: ${message}`);
          return {
            success: false,
            error: message,
          };
        }
      },
    };

    api.registerTool(tool);

    if (config.hookEnabled) {
      const hookHandler = createHookHandler({
        enabled: true,
        injectionMode: "append",
      });

      api.on("before_prompt_build", async () => {
        return hookHandler.beforePromptBuild();
      });
    }

    const modes = getAvailableModes(config);
    api.logger.info(
      `Baidu search plugin registered. Mode: ${config.mode}, Available modes: ${modes.join(", ")}`,
    );
  },
};

export default plugin;

export { resolveConfig } from "./src/config.js";
export { createSearchEngine } from "./src/search-engine.js";
export { BaiduSearchError, BaiduSearchErrorCode } from "./src/error-handler.js";
export type {
  BaiduSearchConfig,
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchMode,
  OpenClawPluginDefinition,
  OpenClawPluginApi,
  AnyAgentTool,
} from "./src/types.js";
