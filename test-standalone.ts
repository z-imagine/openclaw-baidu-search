import "dotenv/config";
import { resolveConfig } from "./src/config.js";
import { createSearchEngine } from "./src/search-engine.js";

async function main() {
  console.log("=== Baidu Search Plugin 本地测试 ===\n");

  // 配置从 .env 文件读取，支持以下环境变量：
  // - BAIDU_API_KEY: 百度千帆 API Key
  // - BAIDU_SEARCH_MODE: 搜索模式 (api | crawler | auto)
  // - BAIDU_SEARCH_TIMEOUT: 超时时间（秒）
  
  console.log("1. 测试配置解析...");
  const configResult = resolveConfig();

  if (!configResult.ok) {
    console.error("配置错误:", configResult.errors);
    console.log("\n提示: 请创建 .env 文件并配置 BAIDU_API_KEY");
    console.log("示例 .env 内容:");
    console.log("  BAIDU_API_KEY=your-qianfan-api-key");
    console.log("  BAIDU_SEARCH_MODE=auto");
    return;
  }

  console.log("✓ 配置解析成功");
  console.log(`  模式: ${configResult.config!.mode}`);
  console.log(`  超时: ${configResult.config!.timeout}s`);
  console.log(`  API Key: ${configResult.config!.apiKey ? "已配置" : "未配置"}\n`);

  console.log("2. 创建搜索引擎...");
  const engine = createSearchEngine(configResult.config!);
  console.log("✓ 搜索引擎创建成功\n");

  console.log("3. 执行搜索测试 (查询: OpenClaw)...");
  const startTime = Date.now();
  
  try {
    const result = await engine.searchSafe("OpenClaw", { count: 5 });
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✓ 搜索成功 (${duration}ms)`);
      console.log(`  结果数: ${result.results?.length ?? 0}`);
      console.log(`  引用数: ${result.citations?.length ?? 0}\n`);

      if (result.results && result.results.length > 0) {
        console.log("搜索结果:");
        result.results.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.title}`);
          console.log(`     URL: ${r.url}`);
          if (r.snippet) {
            const snippet = r.snippet.length > 80 ? r.snippet.substring(0, 80) + "..." : r.snippet;
            console.log(`     摘要: ${snippet}`);
          }
        });
      }
    } else {
      console.log(`✗ 搜索失败: ${result.error?.userMessage || result.error?.message}`);
    }
  } catch (error) {
    console.log(`✗ 搜索异常: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await engine.dispose();
  }

  console.log("\n=== 测试完成 ===");
}

main().catch(console.error);