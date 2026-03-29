# @z-imagine/openclaw-baidu-search

百度搜索 Provider for OpenClaw，支持 API 和爬虫两种模式。

## 功能特性

- 🔄 **双模式支持**: API 模式和爬虫模式，可根据配置灵活切换
- 🇨🇳 **中文优化**: 针对中文内容优化搜索质量
- 📊 **结果格式化**: 返回标准化的搜索结果
- 🔗 **引用追踪**: 提供来源 URL 作为引用
- 🔐 **安全发布**: 构建产物与运行时配置分离，避免将本地 `.env` 打入发布包
- ⚡ **自动降级**: API 模式失败时可自动降级到爬虫模式
- 🎯 **Agent 引导**: 通过 Hook 注入工具选择指导

## 安装

```bash
openclaw plugins install @z-imagine/openclaw-baidu-search
```

## 配置

### API 模式

```json
// ~/.openclaw/openclaw.json
{
  "plugins": {
    "entries": {
      "baidu-search": {
        "enabled": true,
        "config": {
          "mode": "api",
          "apiKey": "your-baidu-api-key"
        }
      }
    }
  }
}
```

### 爬虫模式

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

### 自动模式（推荐）

```json
{
  "plugins": {
    "entries": {
      "baidu-search": {
        "enabled": true,
        "config": {
          "mode": "auto",
          "apiKey": "your-baidu-api-key",
          "fallbackEnabled": true
        }
      }
    }
  }
}
```

## 环境变量

```bash
# 模式选择
export BAIDU_SEARCH_MODE="auto"

# API 模式配置
export BAIDU_API_KEY="your-api-key"
```

`.env` 仅建议用于本地调试，发布时不会进入 npm 包。发包前可执行 `npm pack --dry-run` 再次确认。

## 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `mode` | string | `"auto"` | 搜索模式: `api`, `crawler`, `auto` |
| `apiKey` | string | - | 百度 API Key（API 模式必需） |
| `timeout` | number | `30` | 请求超时时间（秒） |
| `retryCount` | number | `3` | 失败重试次数 |
| `fallbackEnabled` | boolean | `true` | 是否启用模式降级 |
| `hookEnabled` | boolean | `true` | 是否启用 Agent 引导 |

### 爬虫模式配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `userAgent` | string | Chrome UA | 自定义 User-Agent |
| `minInterval` | number | `1000` | 最小请求间隔（毫秒） |
| `resolveRedirects` | boolean | `false` | 是否解析重定向 URL |
| `proxyUrl` | string | - | 代理服务器 URL |

## 模式对比

| 特性 | API 模式 | 爬虫模式 |
|------|----------|----------|
| 稳定性 | 高 | 中 |
| 合规性 | 高 | 需注意使用限制 |
| 成本 | 可能收费 | 免费 |
| 速度 | 快 | 较慢 |
| 配置要求 | API Key | 无 |

## 获取百度 API 凭证

1. 访问 [百度智能云控制台](https://console.bce.baidu.com/)
2. 创建应用或开通搜索服务
3. 获取 API Key
4. 配置到 OpenClaw

## 使用示例

配置完成后，Agent 会根据查询内容自动选择使用百度搜索：

```
用户: 帮我搜索一下 OpenClaw 是什么
Agent: [自动使用 baidu_search 工具]

用户: Search for OpenClaw documentation
Agent: [使用 web_search 工具]

用户: 用百度搜索一下天气
Agent: [使用 baidu_search 工具]
```

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm run build

# 测试
pnpm run test

# 类型检查
pnpm run typecheck

# 开发模式（监听文件变化）
pnpm run dev
```

## 本地测试

详细的本地测试指南请参阅 [TESTING.md](./TESTING.md)。

### 快速测试

```bash
# 1. 安装依赖并构建
pnpm install && pnpm run build

# 2. 运行独立测试
npx tsx test-standalone.ts

# 3. 或集成到 OpenClaw 测试
# 复制 dist/ 和 openclaw.plugin.json 到 OpenClaw extensions 目录
# 重启 gateway: openclaw gateway restart
```

## 项目结构

```
@z-imagine/openclaw-baidu-search/
├── index.ts                    # 入口模块
├── openclaw.plugin.json        # Plugin 清单
├── src/
│   ├── types.ts               # 类型定义
│   ├── config.ts              # 配置解析
│   ├── error-handler.ts       # 错误处理
│   ├── search-engine.ts       # 搜索引擎（门面）
│   ├── provider-factory.ts    # 提供者工厂
│   ├── hooks.ts               # Hook 处理
│   └── providers/
│       ├── types.ts           # ISearchProvider 接口
│       ├── api-provider.ts    # API 模式实现
│       ├── crawler-provider.ts # 爬虫模式实现
│       └── utils/
│           ├── url-builder.ts # URL 构建工具
│           ├── html-parser.ts # HTML 解析工具
│           └── rate-limiter.ts # 请求限流器
└── test/                      # 测试文件
```

## License

MIT
