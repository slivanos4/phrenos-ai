import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
import { footer, site } from "@/data/site-content";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ivory/10 bg-forest-secondary">
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
            <p>Independent AI consultancy.</p>
            <Link
              href="/admin/ai-updates"
              className="text-sage/35 transition-colors hover:text-sage/70"
              aria-label="AI Updates desk"
            >
              Desk
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
