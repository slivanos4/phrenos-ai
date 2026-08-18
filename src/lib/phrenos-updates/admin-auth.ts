const COOKIE_NAME = "phrenos_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export const ADMIN_SESSION_COOKIE = COOKIE_NAME;

export type AdminSessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
  };
};

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

function adminPassword(): string {
  return (process.env.PHRENOS_ADMIN_PASSWORD ?? "").trim();
}

export function isAdminAuthConfigured(): boolean {
  return adminPassword().length > 0;
}

/** Falls back to the password so a session secret is optional in small deployments. */
function signingSecret(): string {
  const explicit = (process.env.PHRENOS_ADMIN_SECRET ?? "").trim();
  if (explicit) return explicit;

  const password = adminPassword();
  if (!password) {
    throw new AdminAuthError(
      "PHRENOS_ADMIN_PASSWORD is not configured on the server.",
      503
    );
  }
  return `phrenos-admin-fallback:${password}`;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(signature);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function verifyAdminPassword(password: string | null | undefined): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return constantTimeEqual(String(password ?? ""), expected);
}

/** Signed, expiring session value. Apply with response.cookies.set(...). */
export async function createAdminSession(
  ttlSeconds = SESSION_TTL_SECONDS
): Promise<AdminSessionCookie> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = String(expiresAt);
  const signature = await sign(payload);

  return {
    name: COOKIE_NAME,
    value: `${payload}.${signature}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ttlSeconds,
    },
  };
}

export function clearAdminSession(): AdminSessionCookie {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.split("=");
    if (rawKey?.trim() === name) {
      return decodeURIComponent(rawValue.join("=").trim());
    }
  }
  return null;
}

export async function verifyAdminSession(request: Request): Promise<boolean> {
  if (!isAdminAuthConfigured()) return false;

  const raw = readCookie(request, COOKIE_NAME);
  if (!raw) return false;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) return false;

  try {
    return constantTimeEqual(await sign(payload), signature);
  } catch {
    return false;
  }
}

export async function requireAdminSession(request: Request): Promise<void> {
  if (!isAdminAuthConfigured()) {
    throw new AdminAuthError("PHRENOS_ADMIN_PASSWORD is not configured on the server.", 503);
  }
  if (!(await verifyAdminSession(request))) {
    throw new AdminAuthError("Admin sign in required.", 401);
  }
}

export function verifyCronSecret(request: Request): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return constantTimeEqual(header, `Bearer ${secret}`);
}

/** Cron routes accept either the cron bearer token or a signed admin session. */
export async function verifyCronOrAdmin(request: Request): Promise<boolean> {
  return verifyCronSecret(request) || (await verifyAdminSession(request));
}
