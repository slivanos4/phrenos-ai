import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site-content";

type BrandLockupProps = {
  href?: string;
  showDefinition?: boolean;
  priority?: boolean;
  size?: "sm" | "md";
};

const sizes = {
  sm: {
    mark: "h-7 w-auto",
    word: "text-lg leading-none tracking-[0.015em]",
    definition: "text-[0.58rem] tracking-[0.045em]",
    gap: "gap-2",
  },
  md: {
    mark: "h-8 w-auto lg:h-[2.15rem]",
    word: "text-[1.35rem] leading-none tracking-[0.015em] sm:text-2xl",
    definition: "text-[0.62rem] tracking-[0.05em] sm:text-[0.68rem]",
    gap: "gap-2.5",
  },
} as const;

export function BrandLockup({
  href = "/",
  showDefinition = true,
  priority = false,
  size = "md",
}: BrandLockupProps) {
  const s = sizes[size];

  return (
    <Link
      href={href}
      className="group inline-flex min-w-0 items-center"
      aria-label={`${site.name} home`}
    >
      <span className={`flex items-center ${s.gap}`}>
        <Image
          src="/brand/phrenos_logo_white.png"
          alt=""
          width={407}
          height={424}
          className={`${s.mark} shrink-0 opacity-[0.95] transition-opacity duration-300 group-hover:opacity-100`}
          priority={priority}
          unoptimized
        />
        <span className="flex min-w-0 flex-col justify-center">
          <span className={`font-serif font-medium text-ivory ${s.word}`}>
            Phrenos
            <span className="font-medium text-gold">.ai</span>
          </span>
          {showDefinition ? (
            <span
              className={`mt-1 font-serif italic leading-none text-sage/70 transition-colors duration-300 group-hover:text-sage/90 ${s.definition}`}
            >
              {site.definition}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
