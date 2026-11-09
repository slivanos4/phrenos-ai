"use client";

import { useEffect, useState } from "react";
import type { TokenRow } from "@/lib/market-desk/api-tokens";
import { api, eyebrowClass, fieldClass, microButtonClass, panelClass, primaryButtonClass, when } from "@/components/admin/market-desk-ui";

/** Make and revoke read-only tokens for your own tools. A token is shown once, when it is made. */
export function ApiAccessCard({ setError }: { setError: (value: string | null) => void }) {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = typeof window === "undefined" ? "https://www.phrenosai.com" : window.location.origin;

  useEffect(() => {
    void api<{ tokens: TokenRow[] }>("/api/market-desk/tokens").then((result) => setTokens(result.tokens)).catch(() => setTokens([]));
  }, []);

  async function make() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ token: string; row: TokenRow }>("/api/market-desk/tokens", { method: "POST", json: { label } });
      setFresh(result.token);
      setTokens((current) => [result.row, ...(current ?? [])]);
      setLabel("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not make the token.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this token? Anything using it stops working straight away.")) return;
    try {
      await api("/api/market-desk/tokens", { method: "DELETE", json: { id } });
      setTokens((current) => (current ?? []).map((token) => (token.id === id ? { ...token, revoked_at: new Date().toISOString() } : token)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke it.");
    }
  }

  return (
    <section className={panelClass}>
      <p className={eyebrowClass}>API access</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a9b0a3]">Pull rankings, asset summaries, daily Pulses and market figures into your own tools, spreadsheets or AI agents. Read-only, 60 requests a minute per token. A token is shown once, so copy it when it appears.</p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <input className={`${fieldClass} max-w-xs`} placeholder="What will use it? For example: my spreadsheet" value={label} maxLength={60} onChange={(event) => setLabel(event.target.value)} />
        <button type="button" className={primaryButtonClass} disabled={busy || label.trim().length === 0} onClick={() => void make()}>{busy ? "Making..." : "Make a token"}</button>
      </div>

      {fresh ? (
        <div className="mt-4 rounded-xl border border-[#e0c078]/50 bg-[#e0c078]/8 p-4">
          <p className="text-sm font-semibold text-[#f1e8d6]">Copy this token now. It will not be shown again.</p>
          <code className="mt-2 block break-all rounded-lg bg-[#0a100c] px-3 py-2 text-xs text-[#e0c078]">{fresh}</code>
          <div className="mt-2 flex gap-2"><button type="button" className={microButtonClass} onClick={() => void navigator.clipboard.writeText(fresh)}>Copy</button><button type="button" className={microButtonClass} onClick={() => setFresh(null)}>I have copied it</button></div>
        </div>
      ) : null}

      {tokens && tokens.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {tokens.map((token) => (
            <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 px-4 py-2.5 text-sm">
              <span className="min-w-0"><span className="text-[#f1e8d6]">{token.label}</span><span className="block text-[11px] text-[#a9b0a3]">{token.prefix}... · made {when(token.created_at)} · {token.last_used_at ? `last used ${when(token.last_used_at)}` : "never used"}</span></span>
              {token.revoked_at ? <span className="text-[11px] text-[#e8b4a0]">Revoked</span> : <button type="button" className={microButtonClass} onClick={() => void revoke(token.id)}>Revoke</button>}
            </li>
          ))}
        </ul>
      ) : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-[11px] font-semibold tracking-[0.16em] text-[#a9b0a3] uppercase">How to use it</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0a100c] p-3 text-[11px] leading-relaxed text-[#c9c6ba]">{`curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${base}/api/v1/market/rankings?type=crypto&limit=20"

/api/v1/market/rankings?type=&limit=   ranked list with scores
/api/v1/market/asset?key=cg:bitcoin     one asset: price, risk, our view, latest Pulse
/api/v1/market/pulse?key=yahoo:AAPL     last 7 daily Pulses
/api/v1/market/stats                    market value, Fear and Greed, trending`}</pre>
      </details>
    </section>
  );
}
