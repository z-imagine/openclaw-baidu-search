# 本地测试指南

## 一、环境准备

### 1. 安装依赖

```bash
cd packages/baidu-search
pnpm install
```

### 2. 构建项目

```bash
pnpm run build
```

### 3. 类型检查

```bash
pnpm run typecheck
```

---

## 二、测试方式

### 方式 A：独立测试（推荐用于功能验证）

创建测试脚本 `test-standalone.ts`：

```typescript
// test-standalone.ts
import { resolveConfig } from "./src/config.js";
import { createSearchEngine } from "./src/search-engine.js";

async function main() {
  // 测试爬虫模式
  const config = resolveConfig({
    mode: "crawler",
    timeout: 30,
  });

  if (!config.ok) {
    console.error("Config errors:", config.errors);
    return;
  }

  const engine = createSearchEngine(config.config!);

  try {
    const result = await engine.searchSafe("OpenClaw", { count: 5 });
    console.log("Search result:", JSON.stringify(result, null, 2));
  } finally {
    await engine.dispose();
  }
}

main().catch(console.error);
```

运行：

```bash
# 使用 tsx 运行
npx tsx test-standalone.ts
```

### 方式 B：集成到 OpenClaw 测试

#### 步骤 1：构建 Plugin

```bash
cd packages/baidu-search
pnpm run build
```

#### 步骤 2：复制到 OpenClaw extensions 目录

```bash
# 假设 OpenClaw 安装在 ~/projects/openclaw
cp -r dist ~/projects/openclaw/extensions/baidu-search/
cp openclaw.plugin.json ~/projects/openclaw/extensions/baidu-search/
```

#### 步骤 3：配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "plugins": {
    "entries": {
      "baidu-search": {
        "enabled": true,
        "config": {
          "mode": "crawler"
        }
      }
    }
  }
}
```

#### 步骤 4：重启 OpenClaw Gateway

```bash
openclaw gateway restart
```

#### 步骤 5：测试

```bash
openclaw agent --message "使用百度搜索 OpenClaw"
```

### 方式 C：使用 pnpm link 本地链接

```bash
# 在 plugin 目录
cd packages/baidu-search
pnpm link --global

# 在 OpenClaw 项目目录
cd ~/projects/openclaw
pnpm link --global @z-imagine/openclaw-baidu-search

# 重启 gateway
openclaw gateway restart
```

---

## 三、单元测试

### 运行测试

```bash
pnpm run test
```

### 测试覆盖率

```bash
pnpm run test:coverage
```

### 测试文件示例

创建 `test/search.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { resolveConfig } from "../src/config.js";
import { createSearchEngine } from "../src/search-engine.js";

describe("Baidu Search Plugin", () => {
  it("should resolve crawler config", () => {
    const result = resolveConfig({ mode: "crawler" });
    expect(result.ok).toBe(true);
    expect(result.config?.mode).toBe("crawler");
  });

  it("should create search engine", () => {
    const config = resolveConfig({ mode: "crawler" });
    if (!config.ok) return;
    
    const engine = createSearchEngine(config.config!);
    expect(engine).toBeDefined();
    expect(engine.getAvailableModes()).toContain("crawler");
  });
});
```

---

## 四、调试技巧

### 1. 启用详细日志

```typescript
// 在代码中添加
console.log("[BaiduSearch] Config:", config);
console.log("[BaiduSearch] Request:", request);
```

### 2. 测试爬虫模式

```typescript
// 测试 URL 构建
import { buildSearchUrl } from "./src/providers/utils/url-builder.js";

const url = buildSearchUrl("OpenClaw", { count: 5 });
console.log("Search URL:", url);
// 输出: https://www.baidu.com/s?wd=OpenClaw&ie=utf-8&oe=utf-8&rn=5
```

### 3. 测试 HTML 解析

```typescript
import { parseSearchResults } from "./src/providers/utils/html-parser.js";

// 模拟百度搜索结果 HTML
const testHtml = `
<div class="result">
  <h3 class="t">
    <a href="https://example.com">Test Title</a>
  </h3>
  <div class="c-abstract">Test snippet</div>
</div>
`;

const results = parseSearchResults(testHtml);
console.log("Parsed results:", results);
```

### 4. 模拟 API 响应

```typescript
// 使用 vitest mock
import { vi } from "vitest";

vi.stubGlobal("fetch", async (url: string) => {
  if (url.includes("baidu.com/s")) {
    return {
      ok: true,
      text: async () => "<html>...</html>",
    };
  }
  return { ok: false };
});
```

---

## 五、常见问题

### Q1: 构建失败 - 模块找不到

```bash
# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q2: 爬虫模式触发反爬虫

```
解决方案：
1. 增加 minInterval 到 2000ms 或更高
2. 使用代理
3. 切换到 API 模式
```

### Q3: API 模式认证失败

```
检查：
1. apiKey 是否正确
2. 百度智能云服务是否已开通
3. 网络是否能访问 aip.baidubce.com
```

### Q4: Plugin 未被加载

```bash
# 检查 plugin 状态
openclaw plugins list

# 检查配置是否正确
cat ~/.openclaw/openclaw.json
```

---

## 六、发布前检查清单

```bash
# 1. 运行测试
pnpm run test

# 2. 类型检查
pnpm run typecheck

# 3. 构建
pnpm run build

# 4. 检查构建产物
ls -la dist/

# 5. 本地测试
npx tsx test-standalone.ts

# 6. 更新版本号
npm version patch  # 或 minor / major

# 7. 发布
pnpm publish --access public
```
