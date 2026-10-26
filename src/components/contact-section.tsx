"use client";

import { useState } from "react";
import { ContactForm } from "@/components/contact-form";
import { booking, bookCallIsExternal, contactPage } from "@/data/site-content";

const contactHelpItems = [
  {
    label: "AI Strategy & Adoption",
    detail: "turning ambition into a plan your leadership team can fund.",
  },
  {
    label: "Workflow Automation",
    detail: "redesigning manual processes into reliable systems.",
  },
  {
    label: "Content & Digital Systems",
    detail: "governed content engines and AI-assisted websites, designed and built end to end.",
  },
  {
    label: "Competitive Intelligence",
    detail: "structured insight instead of scattered research.",
  },
  {
    label: "Training & Enablement",
    detail: "building AI fluency and judgement across your team.",
  },
] as const;

export function ContactSection() {
  const [active, setActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <section
      id="contact-form"
      className={`contact-section relative overflow-hidden bg-forest pt-10 pb-20 lg:pt-12 lg:pb-28 ${
        active || submitted ? "is-lit" : ""
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(184,139,54,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="contact-spark pointer-events-none absolute top-[18%] left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(224,192,120,0.28)_0%,rgba(184,139,54,0.1)_45%,transparent_72%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10 max-w-xl">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">
            Begin
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-ivory sm:text-4xl">
            A short note is enough.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-sage sm:text-lg">
            {contactPage.formIntro}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-8">
          <div className="flex flex-col gap-6">
            <div className="rounded-sm border border-[#d4af5a]/25 bg-forest-secondary/40 p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#e0c078] uppercase">
                The five capabilities
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-sage">
                {contactHelpItems.map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af5a]"
                      aria-hidden
                    />
                    <span>
                      <span className="font-medium text-ivory">
                        {item.label}:
                      </span>{" "}
                      {item.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-sm border border-[#d4af5a]/25 bg-forest-secondary/40 p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#e0c078] uppercase">
                Not sure where to start?
              </p>
              <p className="mt-3 text-sm leading-relaxed text-sage">
                Take the{" "}
                <a
                  href="/resources/ai-readiness"
                  data-track="cta_readiness_check"
                  data-track-location="contact-page"
                  className="text-[#e0c078] underline-offset-4 hover:underline"
                >
                  free AI readiness check
                </a>{" "}
                to see where you stand, or simply tell us where the friction
                is and we&rsquo;ll help find the leverage.
              </p>
            </div>

            <div className="rounded-sm border border-[#d4af5a]/25 bg-forest-secondary/40 p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#e0c078] uppercase">
                What happens next
              </p>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-sage">
                {contactPage.nextSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 font-serif text-base text-[#d4af5a]">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="rounded-sm border border-[#d4af5a]/25 bg-forest-secondary/40 p-5 sm:p-8">
            {bookCallIsExternal ? (
              <div className="mb-8 rounded-xl border border-[#d4af5a]/40 bg-[#d4af5a]/[0.08] p-5">
                <p className="font-serif text-xl text-[#e0c078]">Prefer to pick a time?</p>
                <p className="mt-2 text-sm leading-relaxed text-ivory/85">
                  Choose a slot that suits you for a free 15-minute intro call. No preparation needed.
                </p>
                <a
                  href={booking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="cta_booking_link"
                  data-track-location="contact-page"
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-gold bg-gold px-6 py-3 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078]"
                >
                  {booking.label}
                </a>
                <p className="mt-5 text-xs tracking-[0.18em] text-sage uppercase">Or send a note instead</p>
              </div>
            ) : null}
            <ContactForm
              onActiveChange={setActive}
              onSubmittedChange={setSubmitted}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
