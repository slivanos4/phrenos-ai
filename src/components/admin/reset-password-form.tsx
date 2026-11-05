"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fieldClass, labelClass, panelClass, primaryButtonClass } from "@/components/admin/market-desk-ui";

type State = "checking" | "invalid" | "ready" | "done";

async function post<T>(body: unknown): Promise<T> {
  const response = await fetch("/api/phrenos-updates/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
  return payload as T;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, setState] = useState<State>("checking");
  const [needsCode, setNeedsCode] = useState(true);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      void Promise.resolve().then(() => setState("invalid"));
      return;
    }
    void post<{ needsCode: boolean }>({ action: "validate", token })
      .then((result) => {
        setNeedsCode(result.needsCode);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== again) return setError("The two passwords do not match.");
    setSaving(true);
    try {
      await post({ action: "complete", token, password, code });
      setState("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change the password.");
      setCode("");
    } finally {
      setSaving(false);
    }
  }

  if (state === "checking") return <div className={panelClass}><p className="text-sm text-[#a9b0a3]">Checking your link...</p></div>;

  if (state === "invalid") {
    return (
      <div className={panelClass}>
        <h1 className="font-serif text-2xl text-[#f1e8d6]">This link has expired</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#a9b0a3]">Reset links work once and last 30 minutes. Go back to the sign in page and choose Forgot password to get a new one.</p>
        <Link href="/admin/ai-updates" className={`${primaryButtonClass} mt-4`}>Back to sign in</Link>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className={panelClass}>
        <h1 className="font-serif text-2xl text-[#f1e8d6]">Password changed</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#a9b0a3]">Sign in with your new password. Your authenticator app shows a new code every 30 seconds, so wait for the next one if it asks.</p>
        <Link href="/admin/ai-updates" className={`${primaryButtonClass} mt-4`}>Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className={panelClass}>
      <h1 className="font-serif text-2xl text-[#f1e8d6]">Choose a new password</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block space-y-1.5">
          <span className={labelClass}>New password (at least 12 characters)</span>
          <span className="relative block">
            <input type={show ? "text" : "password"} autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} className={`${fieldClass} pr-16`} />
            <button type="button" onClick={() => setShow((current) => !current)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold tracking-[0.14em] text-[#e0c078] uppercase">{show ? "Hide" : "Show"}</button>
          </span>
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Type it again</span>
          <input type={show ? "text" : "password"} autoComplete="new-password" minLength={12} required value={again} onChange={(event) => setAgain(event.target.value)} className={fieldClass} />
        </label>
        {needsCode ? (
          <label className="block space-y-1.5">
            <span className={labelClass}>6-digit code from your authenticator app</span>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required value={code} onChange={(event) => setCode(event.target.value)} className={fieldClass} />
          </label>
        ) : null}
        {error ? <p className="text-sm text-[#e8b4a0]" role="alert">{error}</p> : null}
        <button type="submit" className={primaryButtonClass} disabled={saving}>{saving ? "Saving..." : "Change password"}</button>
      </form>
    </div>
  );
}
