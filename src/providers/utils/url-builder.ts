import { BAIDU_ENDPOINTS } from "../../types.js";

export function buildSearchUrl(
  query: string,
  options?: {
    count?: number;
    offset?: number;
  },
): string {
  const url = new URL(BAIDU_ENDPOINTS.webSearch);

  url.searchParams.set("wd", query);
  url.searchParams.set("ie", "utf-8");
  url.searchParams.set("oe", "utf-8");

  if (options?.count) {
    url.searchParams.set("rn", String(options.count));
  }

  if (options?.offset) {
    url.searchParams.set("pn", String(options.offset));
  }

  return url.toString();
}

export function extractRealUrl(baiduUrl: string): string | null {
  if (!baiduUrl) return null;

  if (!baiduUrl.includes("baidu.com/link")) {
    return baiduUrl;
  }

  try {
    const url = new URL(baiduUrl);
    const targetUrl = url.searchParams.get("url");
    if (targetUrl) {
      return decodeURIComponent(targetUrl);
    }
  } catch {
    return baiduUrl;
  }

  return baiduUrl;
}