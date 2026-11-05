import { NextResponse } from "next/server";
import { AdminAuthError, createSignedToken, errorResponse, readSignedToken } from "@/lib/phrenos-updates";
import { checkCode, isTwoStepEnrolled, noteResetRequest, passwordFingerprint, setPassword } from "@/lib/phrenos-updates/admin-security";
import { sendEmail, siteOrigin } from "@/lib/market-desk/notify";

const PURPOSE = "reset";
const LINK_MINUTES = 30;

/** "Forgot password?" asks for a link. The reply is the same whether or not an email could be sent, so it reveals nothing. */
async function requestReset(): Promise<Response> {
  const recovery = (process.env.PHRENOS_ADMIN_EMAIL ?? "").trim();
  if (!recovery) {
    return NextResponse.json({ error: "A recovery email has not been set up yet. Ask the site owner to set PHRENOS_ADMIN_EMAIL." }, { status: 503 });
  }
  const allowed = await noteResetRequest();
  if (allowed) {
    const token = await createSignedToken(PURPOSE, await passwordFingerprint(), LINK_MINUTES * 60);
    const link = `${siteOrigin()}/admin/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail(
      recovery,
      "Reset your Phrenos.ai admin password",
      `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#1a221c;">
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a9893d;">Phrenos.ai admin</p>
  <h1 style="margin:0 0 16px;font-size:22px;color:#101c14;">Reset your password</h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#4a5248;">Someone asked to reset the admin password. This link works once and expires in ${LINK_MINUTES} minutes. You will also need a code from your authenticator app.</p>
  <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;padding:12px 20px;background:#101c14;color:#f1e8d6;text-decoration:none;border-radius:999px;font-size:14px;">Choose a new password</a></p>
  <p style="margin:0;font-size:12px;color:#7a8278;line-height:1.5;">If you did not ask for this, ignore this email. Nothing changes unless the link is used with your authenticator code.</p>
</div>`,
    );
  }
  return NextResponse.json({ ok: true, message: "If a recovery email is set up, a reset link is on its way. It expires in 30 minutes." });
}

/** The link only checks that it is valid. The password changes after the authenticator code is checked too. */
async function completeReset(body: { token?: string; password?: string; code?: string }): Promise<Response> {
  const token = await readSignedToken(String(body.token ?? ""), PURPOSE);
  if (!token || token.fingerprint !== (await passwordFingerprint())) {
    return NextResponse.json({ error: "This reset link has expired or was already used. Ask for a new one." }, { status: 400 });
  }
  if (body.password === undefined) return NextResponse.json({ ok: true, valid: true, needsCode: await isTwoStepEnrolled() });

  const password = String(body.password);
  if (password.length < 12) return NextResponse.json({ error: "Use at least 12 characters." }, { status: 400 });

  if (await isTwoStepEnrolled()) {
    const result = await checkCode(String(body.code ?? ""));
    if (!result.ok) {
      if (result.reason === "locked") return NextResponse.json({ error: `Too many wrong codes. Try again in ${result.retryAfterMinutes} minutes.` }, { status: 429 });
      return NextResponse.json({ error: "That authenticator code is not right. Try the current one." }, { status: 401 });
    }
  }
  await setPassword(password);
  return NextResponse.json({ ok: true, message: "Password changed. Sign in with the new password and your next authenticator code." });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: "request" | "validate" | "complete"; token?: string; password?: string; code?: string };
    if (body.action === "request") return await requestReset();
    if (body.action === "validate") return await completeReset({ token: body.token });
    if (body.action === "complete") return await completeReset(body);
    return NextResponse.json({ error: "Unknown request." }, { status: 400 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : "Reset failed";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
