"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { headerCta, navigation } from "@/data/site-content";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled || menuOpen
          ? "border-b border-ivory/10 bg-forest/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between gap-4 px-4 sm:h-[5.25rem] sm:px-6 lg:h-[5.5rem] lg:px-8">
        <BrandLockup priority size="md" />

        <nav
          className="hidden items-center gap-2 xl:gap-2.5 lg:flex"
          aria-label="Primary"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-sage/70 px-3.5 py-1.5 text-sm font-medium tracking-wide text-ivory/80 transition-colors hover:border-sage hover:bg-sage/10 hover:text-ivory"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={headerCta.href}
            className="hidden rounded-full border border-gold px-4 py-2 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-gold/10 sm:inline-flex"
          >
            {headerCta.label}
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sage/70 text-ivory lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex w-4 flex-col gap-1.5" aria-hidden>
              <span
                className={`h-px w-full bg-current transition-transform ${menuOpen ? "translate-y-[3.5px] rotate-45" : ""}`}
              />
              <span
                className={`h-px w-full bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`h-px w-full bg-current transition-transform ${menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="mobile-nav"
          className="border-t border-ivory/10 bg-forest/95 px-6 py-8 backdrop-blur-md lg:hidden"
        >
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex w-fit rounded-full border border-sage/70 px-4 py-2 font-serif text-xl text-ivory transition-colors hover:border-sage hover:bg-sage/10"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={headerCta.href}
              className="mt-2 inline-flex w-fit rounded-full border border-gold px-4 py-2 text-sm font-medium tracking-wide text-ivory sm:hidden"
              onClick={() => setMenuOpen(false)}
            >
              {headerCta.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
