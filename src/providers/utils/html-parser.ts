import type { SearchResult } from "../../types.js";
import { extractRealUrl } from "./url-builder.js";

export function parseSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  const resultPattern = /<div[^>]*class="[^"]*(?:result|c-container)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*(?:result|c-container)|<div\s+id="page")/gi;

  const matches = html.matchAll(resultPattern);

  for (const match of matches) {
    const blockHtml = match[1];
    if (blockHtml) {
      const result = parseResultBlock(blockHtml);
      if (result) {
        results.push(result);
      }
    }
  }

  if (results.length === 0) {
    return parseWithFallbackPatterns(html);
  }

  return results;
}

function parseResultBlock(html: string): SearchResult | null {
  const titleMatch = html.match(/<h3[^>]*class="[^"]*t[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if (!titleMatch || !titleMatch[1] || !titleMatch[2]) return null;

  const url = titleMatch[1];
  const title = stripHtmlTags(titleMatch[2]).trim();

  if (!url || !title) return null;

  const snippetMatch = html.match(/<div[^>]*class="[^"]*c-abstract[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const snippet = snippetMatch && snippetMatch[1] ? stripHtmlTags(snippetMatch[1]).trim() : "";

  const displayUrlMatch = html.match(/<a[^>]*class="[^"]*c-showurl[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  const displayUrl = displayUrlMatch && displayUrlMatch[1] ? stripHtmlTags(displayUrlMatch[1]).trim() : undefined;

  const realUrl = extractRealUrl(url);

  return {
    title,
    url: realUrl || url,
    snippet,
    displayUrl,
    source: "crawler",
  };
}

function parseWithFallbackPatterns(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  const linkPattern = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    const title = match[2] ? stripHtmlTags(match[2]).trim() : "";

    if (
      url &&
      title &&
      !url.includes("baidu.com") &&
      title.length > 3 &&
      !isNavigationUrl(url)
    ) {
      results.push({
        title,
        url,
        snippet: "",
        source: "crawler",
      });

      if (results.length >= 10) break;
    }
  }

  return results;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isNavigationUrl(url: string): boolean {
  const navigationPatterns = [
    /javascript:/i,
    /#$/,
    /void\(0\)/,
    /baidu\.com\/$/i,
  ];

  return navigationPatterns.some((p) => p.test(url));
}

export function detectAntiCrawler(html: string): boolean {
  const antiCrawlerPatterns = [
    /验证码/,
    /verify/,
    /安全验证/,
    /请输入验证码/,
    /访问频率过高/,
    /ip.*被封/i,
    /forbidden/i,
    /访问受限/,
  ];

  return antiCrawlerPatterns.some((p) => p.test(html));
}

export function detectCaptcha(html: string): boolean {
  const captchaPatterns = [
    /验证码/,
    /captcha/i,
    /verify.*code/i,
    /input.*验证/,
  ];

  return captchaPatterns.some((p) => p.test(html));
}