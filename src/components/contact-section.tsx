"use client";

import { useState } from "react";
import { ContactForm } from "@/components/contact-form";
import { contactPage } from "@/data/site-content";

const contactHelpItems = [
  {
    label: "AI Strategy & Adoption",
    detail: "turning ambition into a plan leadership can fund.",
  },
  {
    label: "Workflow Automation",
    detail: "redesigning manual processes into reliable systems.",
  },
  {
    label: "Content & Digital Systems",
    detail: "governed content engines that scale production without losing brand voice.",
  },
  {
    label: "Website Development",
    detail: "designed and built end-to-end, from brief to a live site that converts.",
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
                What we help with
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
                Tell us where the friction is, and we&rsquo;ll help find the
                leverage.
              </p>
            </div>

            <div className="rounded-sm border border-[#d4af5a]/25 bg-forest-secondary/40 p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#e0c078] uppercase">
                Response time
              </p>
              <p className="mt-3 text-sm leading-relaxed text-sage">
                Every message is read personally. Expect a reply within a
                couple of business days.
              </p>
            </div>
          </div>

          <div className="rounded-sm border border-[#d4af5a]/25 bg-forest-secondary/40 p-5 sm:p-8">
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
