import type { HookConfig } from "./types.js";

const DEFAULT_GUIDANCE = `
## 搜索工具选择指南

当需要搜索网页时，请根据以下规则选择工具：

### 使用 baidu_search 的场景
- 查询包含中文字符
- 用户询问中国/中文相关内容
- 用户显式提到"百度"或"Baidu"
- 需要中文新闻、中文网站信息

### 使用 web_search 的场景
- 查询为英文或其他语言
- 需要国际/全球信息
- 技术文档搜索（通常为英文）

### 示例
| 用户查询 | 工具选择 | 原因 |
|----------|----------|------|
| "搜索 Python 教程" | baidu_search | 中文查询 |
| "Search for OpenClaw docs" | web_search | 英文查询 |
| "查一下北京天气" | baidu_search | 中国本地信息 |
| "用百度搜索新闻" | baidu_search | 显式指定 |
`.trim();

export function createHookHandler(config: HookConfig) {
  return {
    beforePromptBuild: () => {
      if (!config.enabled) {
        return {};
      }

      const guidance = config.customGuidance || DEFAULT_GUIDANCE;

      if (config.injectionMode === "prepend") {
        return {
          prependSystemContext: guidance,
        };
      }

      return {
        appendSystemContext: guidance,
      };
    },
  };
}

export function getGuidanceContent(config: HookConfig): string {
  return config.customGuidance || DEFAULT_GUIDANCE;
}