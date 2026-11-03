import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { adminSecretMaterial } from "@/lib/phrenos-updates/admin-auth";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { ADMIN_SECURITY_TABLE } from "@/lib/phrenos-updates/tables";
import { generateTotpSecret, verifyTotp } from "@/lib/phrenos-updates/totp";

const MAX_FAILED_CODES = 5;
const LOCK_MINUTES = 15;

type SecurityRow = {
  totp_secret_enc: string | null;
  enrolled_at: string | null;
  last_step: number;
  failed_attempts: number;
  locked_until: string | null;
};

export type TotpCheck =
  | { ok: true }
  | { ok: false; reason: "wrong" | "locked" | "not-started"; retryAfterMinutes?: number };

function key(): Buffer {
  return createHash("sha256").update(`totp-at-rest:${adminSecretMaterial()}`).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64")).join(".");
}

function decrypt(stored: string): string {
  const [iv, tag, body] = stored.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

async function readRow(): Promise<SecurityRow | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(ADMIN_SECURITY_TABLE)
    .select("totp_secret_enc, enrolled_at, last_step, failed_attempts, locked_until")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    throw new Error(
      /phrenos_admin_security/.test(error.message)
        ? "Two-step sign in needs its table. Run supabase/migrations/007_admin_two_step.sql in Supabase."
        : error.message
    );
  }
  return (data as SecurityRow | null) ?? null;
}

export async function isTwoStepEnrolled(): Promise<boolean> {
  const row = await readRow();
  return Boolean(row?.enrolled_at && row.totp_secret_enc);
}

/** Starts (or restarts) enrolment and returns the secret to show once. Refused once enrolled. */
export async function beginEnrolment(): Promise<string> {
  if (await isTwoStepEnrolled()) throw new Error("Two-step sign in is already set up.");
  const secret = generateTotpSecret();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from(ADMIN_SECURITY_TABLE).upsert({
    id: 1,
    totp_secret_enc: encrypt(secret),
    enrolled_at: null,
    last_step: 0,
    failed_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return secret;
}

/** Checks a code against the stored secret. Completes enrolment the first time it matches. */
export async function checkCode(code: string): Promise<TotpCheck> {
  const row = await readRow();
  if (!row?.totp_secret_enc) return { ok: false, reason: "not-started" };

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    const minutes = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000);
    return { ok: false, reason: "locked", retryAfterMinutes: minutes };
  }

  const supabase = createServiceRoleClient();
  const step = verifyTotp(decrypt(row.totp_secret_enc), code, Number(row.last_step));

  if (step === null) {
    const failed = row.failed_attempts + 1;
    const lock = failed >= MAX_FAILED_CODES;
    await supabase
      .from(ADMIN_SECURITY_TABLE)
      .update({
        failed_attempts: lock ? 0 : failed,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    return lock
      ? { ok: false, reason: "locked", retryAfterMinutes: LOCK_MINUTES }
      : { ok: false, reason: "wrong" };
  }

  const { error } = await supabase
    .from(ADMIN_SECURITY_TABLE)
    .update({
      last_step: step,
      failed_attempts: 0,
      locked_until: null,
      enrolled_at: row.enrolled_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function readEnrolmentSecret(): Promise<string | null> {
  const row = await readRow();
  return row?.totp_secret_enc && !row.enrolled_at ? decrypt(row.totp_secret_enc) : null;
}
