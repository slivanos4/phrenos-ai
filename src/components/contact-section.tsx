"use client";

import { useState } from "react";
import { ContactForm } from "@/components/contact-form";

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

      <div className="relative mx-auto max-w-3xl px-6 lg:px-8">
        <div className="mb-8 max-w-xl">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">
            Begin
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-ivory sm:text-4xl">
            A short note is enough.
          </h2>
        </div>
        <div className="rounded-sm border border-[#d4af5a]/25 bg-forest-secondary/40 p-5 sm:p-8">
          <ContactForm
            onActiveChange={setActive}
            onSubmittedChange={setSubmitted}
          />
        </div>
      </div>
    </section>
  );
}
