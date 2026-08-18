import type { GeneratedSource } from "@/lib/phrenos-updates/types";
import { extractPublishedDateFromHtml } from "@/lib/phrenos-updates/source-dates";

const BOT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PhrenosResearch/1.0; +https://phrenosai.com)",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
};

export type SourceUrlStatus = "ok" | "missing" | "unknown";

function isNotFoundStatus(status: number): boolean {
  return status === 404 || status === 410;
}

function isReachableStatus(status: number): boolean {
  if (isNotFoundStatus(status)) return false;
  return (status >= 200 && status < 400) || status === 403;
}

export async function verifySourceUrl(url: string): Promise<SourceUrlStatus> {
  if (!url) return "missing";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: BOT_HEADERS,
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { ...BOT_HEADERS, Range: "bytes=0-2048" },
      });
    }

    if (isNotFoundStatus(response.status)) return "missing";
    if (isReachableStatus(response.status)) return "ok";
    return "unknown";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyArticleSources(sources: GeneratedSource[]): Promise<GeneratedSource[]> {
  const verified: GeneratedSource[] = [];

  for (const source of sources) {
    if (source.is_synthesis || !source.url) {
      verified.push(source);
      continue;
    }

    const status = await verifySourceUrl(source.url);
    if (status !== "missing") {
      verified.push(source);
    }
  }

  return verified;
}

export async function fetchPublishedDateFromPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { ...BOT_HEADERS, Range: "bytes=0-65535" },
    });

    if (!response.ok) return null;

    const html = await response.text();
    return extractPublishedDateFromHtml(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
