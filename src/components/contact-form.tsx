"use client";

import { FormEvent, useState } from "react";
import { contactPage, site } from "@/data/site-content";

const fieldClass =
  "w-full rounded-full border border-gold/50 bg-forest-secondary/60 px-5 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-sage/60 focus:border-gold focus:bg-forest-secondary";

const areaClass =
  "w-full min-h-36 resize-y rounded-2xl border border-gold/50 bg-forest-secondary/60 px-5 py-4 text-sm text-ivory outline-none transition-colors placeholder:text-sage/60 focus:border-gold focus:bg-forest-secondary";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const organisation = String(data.get("organisation") || "").trim();
    const role = String(data.get("role") || "").trim();
    const message = String(data.get("message") || "").trim();

    const subject = encodeURIComponent(
      `Phrenos.ai enquiry${organisation ? `: ${organisation}` : ""}`,
    );
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${email}`,
        `Organisation: ${organisation || "Not provided"}`,
        `Role: ${role || "Not provided"}`,
        "",
        message,
      ].join("\n"),
    );

    setSubmitted(true);
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-gold/40 bg-forest-secondary/50 px-6 py-10 text-center"
        role="status"
      >
        <p className="font-serif text-2xl text-ivory">{contactPage.success}</p>
        <p className="mt-4 text-sm text-sage">
          If your email client didn’t open, write to{" "}
          <a
            href={`mailto:${site.email}`}
            className="text-gold transition-colors hover:text-[#c99a45]"
          >
            {site.email}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-8 inline-flex rounded-full border border-gold px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-gold/10"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
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
          <span className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
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
          <span className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
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
          <span className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
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
        <span className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
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

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-sage">
          Or email{" "}
          <a
            href={`mailto:${site.email}`}
            className="text-gold transition-colors hover:text-[#c99a45]"
          >
            {site.email}
          </a>
        </p>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full border border-gold bg-ivory px-7 py-3.5 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#f7f0e2]"
        >
          {contactPage.fields.submit}
        </button>
      </div>
    </form>
  );
}
