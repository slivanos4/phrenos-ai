import { DrawOnView, Reveal } from "@/components/home/motion";

// The first two lines are lifted from the About narrative in Sophia's own words; the last two she chose.
const steps = [
  {
    title: "Osteopathy",
    line: "Taught me how the nervous system drives behaviour.",
  },
  {
    title: "Neuroscience & neurolinguistics",
    line: "The mechanics of how people process language and make decisions.",
  },
  {
    title: "Generative AI",
    line: "Custom GPTs, agentic workflows, automation platforms and reporting.",
  },
  {
    title: "Phrenos.ai",
    line: "AI that strengthens people’s judgement instead of replacing it.",
  },
] as const;

export function AboutJourney() {
  return (
    <section className="relative overflow-hidden border-y border-ivory/10 bg-forest-secondary py-20 lg:py-28">
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,90,0.1),transparent_65%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">The path</p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl lg:text-[2.75rem]">
            From the nervous system to the neural network.
          </h2>
        </Reveal>

        <DrawOnView className="relative mt-14">
          {/* The line that connects the steps: horizontal on wide screens, vertical on phones. */}
          <span
            className="journey-line absolute top-3 bottom-3 left-[0.8rem] w-px bg-gradient-to-b from-[#d4af5a]/30 via-[#e0c078] to-[#d4af5a] lg:top-[0.8rem] lg:right-3 lg:bottom-auto lg:left-3 lg:h-px lg:w-auto lg:bg-gradient-to-r"
            aria-hidden
          />
          <ol className="relative grid gap-10 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="journey-node relative pl-12 lg:pt-12 lg:pl-0"
                style={{ ["--step" as string]: index }}
              >
                <span
                  className={`absolute top-0.5 left-0 flex h-[1.65rem] w-[1.65rem] items-center justify-center rounded-full border lg:top-0 ${
                    index === steps.length - 1
                      ? "border-[#f0d9a0] bg-[#d4af5a] shadow-[0_0_32px_rgba(224,192,120,0.9)]"
                      : "border-[#d4af5a]/70 bg-forest-secondary"
                  }`}
                  aria-hidden
                >
                  <span className={`h-2 w-2 rounded-full ${index === steps.length - 1 ? "bg-forest" : "bg-[#d4af5a]"}`} />
                </span>
                <h3 className="font-serif text-2xl leading-snug text-[#e0c078]">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ivory/85">{step.line}</p>
              </li>
            ))}
          </ol>
        </DrawOnView>
      </div>
    </section>
  );
}
