import Link from "next/link";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageShell({ eyebrow, title, description }: PageShellProps) {
  return (
    <section className="bg-forest pt-32 pb-24 lg:pt-40 lg:pb-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight text-ivory sm:text-6xl">
          {title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-sage">{description}</p>
        <p className="mt-10 text-sm text-ivory/50">
          Detailed page content coming soon.{" "}
          <Link href="/contact" className="text-gold hover:text-[#c99a45]">
            Build your AI strategy
          </Link>{" "}
          in the meantime.
        </p>
      </div>
    </section>
  );
}
