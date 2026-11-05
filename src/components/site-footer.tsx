import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { bookCallHref, bookCallIsExternal, contactCta, footer, site } from "@/data/site-content";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ivory/10 bg-forest-secondary">
      <div className="border-b border-ivory/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-sm text-ivory/85">Both free: a 15-minute intro call, and the AI readiness check.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={bookCallHref}
              {...(bookCallIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              data-track="cta_book_call"
              data-track-location="footer"
              className="inline-flex items-center justify-center rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078]"
            >
              {contactCta.button.label}
            </Link>
            <Link
              href={contactCta.secondary.href}
              data-track="cta_readiness_check"
              data-track-location="footer"
              className="inline-flex items-center justify-center rounded-full border border-[#d4af5a]/60 px-5 py-2.5 text-xs font-semibold tracking-wide text-ivory transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10"
            >
              {contactCta.secondary.label}
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandLockup showDefinition={false} size="sm" />
          <p className="mt-5 text-sm tracking-wide text-sage">{site.tagline}</p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">
            Explore
          </p>
          <ul className="mt-4 space-y-3">
            {footer.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-ivory/75 transition-colors hover:text-ivory"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">
            Connect
          </p>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={site.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-ivory/75 transition-colors hover:text-ivory"
              >
                LinkedIn
              </a>
            </li>
            <li>
              <a
                href={`mailto:${site.email}`}
                className="text-sm text-ivory/75 transition-colors hover:text-ivory"
              >
                {site.email}
              </a>
            </li>
          </ul>
        </div>

        <div className="lg:text-right">
          <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">
            Phrenos.ai
          </p>
          <p className="mt-4 text-sm leading-relaxed text-sage">
            Mind, intellect, reason: applied to Generative AI strategy,
            automation and organisational enablement.
          </p>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-sage/80 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <p>Independent, UK-based AI consultancy led by Sophia Livanos.</p>
            <Link
              href="/privacy"
              className="transition-colors hover:text-ivory"
            >
              Privacy
            </Link>
            <CookieSettingsButton className="transition-colors hover:text-ivory" />
            <Link
              href="/admin/ai-updates"
              className="text-sage/35 transition-colors hover:text-sage/70"
              aria-label="Admin"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
