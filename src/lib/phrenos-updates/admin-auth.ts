const COOKIE_NAME = "phrenos_admin_session";
const PENDING_COOKIE_NAME = "phrenos_admin_pending";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PENDING_TTL_SECONDS = 60 * 10;

/** Sessions carry this marker only once the authenticator code has been checked. Older cookies lack it and stop working. */
const MFA_MARK = "mfa";
const PENDING_MARK = "pending";

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

/** Key material for encrypting the authenticator secret at rest. */
export function adminSecretMaterial(): string {
  return signingSecret();
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

/** Signed, expiring session value. Only issue this once password and authenticator code both passed. */
export async function createAdminSession(
  ttlSeconds = SESSION_TTL_SECONDS
): Promise<AdminSessionCookie> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${expiresAt}:${MFA_MARK}`;
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

/** Short-lived proof that the password was right, so the authenticator step can follow. Grants no access by itself. */
export async function createPendingSession(): Promise<AdminSessionCookie> {
  const expiresAt = Math.floor(Date.now() / 1000) + PENDING_TTL_SECONDS;
  const payload = `${expiresAt}:${PENDING_MARK}`;
  const signature = await sign(payload);

  return {
    name: PENDING_COOKIE_NAME,
    value: `${payload}.${signature}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PENDING_TTL_SECONDS,
    },
  };
}

export function clearPendingSession(): AdminSessionCookie {
  return {
    name: PENDING_COOKIE_NAME,
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

async function verifySignedCookie(request: Request, name: string, mark: string): Promise<boolean> {
  if (!isAdminAuthConfigured()) return false;

  const raw = readCookie(request, name);
  if (!raw) return false;

  const dot = raw.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const [expiry, marker] = payload.split(":");
  if (!signature || marker !== mark) return false;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) return false;

  try {
    return constantTimeEqual(await sign(payload), signature);
  } catch {
    return false;
  }
}

export function verifyAdminSession(request: Request): Promise<boolean> {
  return verifySignedCookie(request, COOKIE_NAME, MFA_MARK);
}

/** True when the password was entered correctly in the last few minutes and the code is still owed. */
export function verifyPendingSession(request: Request): Promise<boolean> {
  return verifySignedCookie(request, PENDING_COOKIE_NAME, PENDING_MARK);
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
