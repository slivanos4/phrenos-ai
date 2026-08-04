import type { Metadata } from "next";
import { SelectedWork } from "@/components/selected-work";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected Phrenos.ai engagements across competitive intelligence, content systems, governance and knowledge assistants.",
};

export default function WorkPage() {
  return (
    <div className="relative isolate bg-forest">
      {/* Viewport-tall art plane that soft-fades into forest — no hard seam */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[100svh]"
        aria-hidden
      >
        <picture>
          <source srcSet="/brand/pages/work.webp?v=7" type="image/webp" />
          <img
            src="/brand/pages/work.jpg?v=7"
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </picture>
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(90deg, rgba(6,8,7,0.72) 0%, rgba(6,8,7,0.38) 26%, rgba(6,8,7,0.1) 50%, rgba(6,8,7,0.28) 100%),
              linear-gradient(180deg, rgba(6,8,7,0.4) 0%, transparent 22%, transparent 48%, rgba(16,28,20,0.45) 68%, rgba(16,28,20,0.82) 84%, #101C14 100%)
            `,
          }}
        />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-6 sm:px-8 lg:px-8 lg:pt-36 lg:pb-4">
        <p className="animate-fade-up text-xs font-semibold tracking-[0.28em] text-gold uppercase">
          Selected work
        </p>
        <h1 className="animate-fade-up-delay-1 mt-4 max-w-2xl font-serif text-4xl tracking-tight text-ivory sm:text-5xl lg:text-[3.35rem]">
          Systems that turn intelligence into action.
        </h1>
        <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-sage sm:text-lg">
          Five AI systems from the portfolio: competitive intelligence, brand
          governance, knowledge, content hubs and reporting.
        </p>
      </section>

      <div className="relative z-10">
        <SelectedWork hideIntro continuous />
      </div>
    </div>
  );
}
