"use client";

import { FormEvent, useState } from "react";
import { contactPage, site } from "@/data/site-content";

const WEB3FORMS_ACCESS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ||
  "5aa18ac3-e2ed-4643-bf2f-a251364db741";

const fieldClass =
  "w-full rounded-full border border-[#d4af5a]/55 bg-[#101c14]/55 px-5 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-sage/55 focus:border-[#e0c078] focus:bg-[#101c14]/75";

const areaClass =
  "w-full min-h-36 resize-y rounded-2xl border border-[#d4af5a]/55 bg-[#101c14]/55 px-5 py-4 text-sm text-ivory outline-none transition-colors placeholder:text-sage/55 focus:border-[#e0c078] focus:bg-[#101c14]/75";

type ContactFormProps = {
  onActiveChange?: (active: boolean) => void;
  onSubmittedChange?: (submitted: boolean) => void;
};

export function ContactForm({
  onActiveChange,
  onSubmittedChange,
}: ContactFormProps = {}) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSubmittedState(value: boolean) {
    setSubmitted(value);
    onSubmittedChange?.(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    // Honeypot — bots fill this; real users never see it
    if (String(data.get("botcheck") || "")) {
      setSubmittedState(true);
      return;
    }

    const accessKey = WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setError("Form is not configured yet. Please email us directly.");
      return;
    }

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const organisation = String(data.get("organisation") || "").trim();
    const role = String(data.get("role") || "").trim();
    const message = String(data.get("message") || "").trim();

    setSending(true);
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Phrenos.ai enquiry${organisation ? `: ${organisation}` : ""}`,
          from_name: "Phrenos.ai contact form",
          name,
          email,
          organisation: organisation || "Not provided",
          role: role || "Not provided",
          message,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Something went wrong. Please try again.");
      }

      form.reset();
      setSubmittedState(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-[#d4af5a]/35 bg-[#101c14]/70 px-6 py-10 text-center backdrop-blur-sm"
        role="status"
      >
        <p className="font-serif text-2xl text-ivory">{contactPage.success}</p>
        <p className="mt-4 text-sm text-sage">
          Prefer email? Write to{" "}
          <a
            href={`mailto:${site.email}`}
            className="text-[#e0c078] transition-colors hover:text-[#f1e8d6]"
          >
            {site.email}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setSubmittedState(false)}
          className="mt-8 inline-flex rounded-full border border-[#d4af5a] px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-[#d4af5a]/10"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate={false}
      onFocusCapture={() => onActiveChange?.(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onActiveChange?.(false);
        }
      }}
    >
      {/* Honeypot */}
      <input
        type="checkbox"
        name="botcheck"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-medium tracking-[0.18em] text-[#e0c078] uppercase">
            {contactPage.fields.name}
          </span>
          <input
            required
            name="name"
            type="text"
            autoComplete="name"
            className={fieldClass}
            placeholder="Alex Morgan"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-medium tracking-[0.18em] text-[#e0c078] uppercase">
            {contactPage.fields.email}
          </span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            placeholder="alex@company.com"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-medium tracking-[0.18em] text-[#e0c078] uppercase">
            {contactPage.fields.organisation}
          </span>
          <input
            name="organisation"
            type="text"
            autoComplete="organization"
            className={fieldClass}
            placeholder="Company name"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-medium tracking-[0.18em] text-[#e0c078] uppercase">
            {contactPage.fields.role}
          </span>
          <input
            name="role"
            type="text"
            autoComplete="organization-title"
            className={fieldClass}
            placeholder="Chief Operating Officer"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-medium tracking-[0.18em] text-[#e0c078] uppercase">
          {contactPage.fields.message}
        </span>
        <textarea
          required
          name="message"
          rows={6}
          className={areaClass}
          placeholder="Share the challenge, opportunity or question you’d like to explore."
        />
      </label>

      {error ? (
        <p className="text-sm text-[#e8b4a0]" role="alert">
          {error}{" "}
          <a
            href={`mailto:${site.email}`}
            className="text-[#e0c078] underline-offset-2 hover:underline"
          >
            {site.email}
          </a>
        </p>
      ) : null}

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-sage">
          Or email{" "}
          <a
            href={`mailto:${site.email}`}
            className="text-[#e0c078] transition-colors hover:text-[#f1e8d6]"
          >
            {site.email}
          </a>
        </p>
        <button
          type="submit"
          disabled={sending}
          className="contact-spark-btn inline-flex items-center justify-center rounded-full border border-[#d4af5a] bg-ivory px-7 py-3.5 text-sm font-semibold tracking-wide text-forest transition-transform duration-300 hover:scale-[1.02] hover:bg-[#f7f0e2] disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
        >
          {sending ? "Sending…" : contactPage.fields.submit}
        </button>
      </div>
    </form>
  );
}
