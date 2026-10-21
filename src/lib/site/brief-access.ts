import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const BRIEF_COOKIE = "phrenos_brief_access";
export const BRIEF_ACCESS_DAYS = 30;
export const BRIEF_FILENAME = "How-to-Brief-AI-Like-a-Strategist.pdf";

/** The PDF lives outside /public, so it can only leave the server through the download route. */
const PDF_PATH = path.join(process.cwd(), "private-assets", "brief-ai-like-a-strategist.pdf");

function secret(): string | null {
  const explicit = (process.env.PHRENOS_DOWNLOAD_SECRET ?? "").trim() || (process.env.PHRENOS_ADMIN_SECRET ?? "").trim();
  if (explicit) return `phrenos-download:${explicit}`;
  const password = (process.env.PHRENOS_ADMIN_PASSWORD ?? "").trim();
  return password ? `phrenos-download-fallback:${password}` : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** A signed, expiring value that says "this browser gave an email address". Null when no secret is configured. */
export function createAccessCookieValue(): string | null {
  const key = secret();
  if (!key) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + BRIEF_ACCESS_DAYS * 86_400;
  return `${expiresAt}.${sign(String(expiresAt), key)}`;
}

export function hasBriefAccess(request: Request): boolean {
  const key = secret();
  if (!key) return false;
  const header = request.headers.get("cookie") ?? "";
  const part = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${BRIEF_COOKIE}=`));
  const value = part?.slice(BRIEF_COOKIE.length + 1);
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(expires, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function readBriefPdf(): Promise<Buffer> {
  return readFile(PDF_PATH);
}
