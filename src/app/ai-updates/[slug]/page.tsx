import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { enhanceArticle } from "@/lib/phrenos-updates/article-enhance";
import { PostFeedback } from "@/components/ai-updates/post-feedback";
import { UpdatesSubscribeForm } from "@/components/ai-updates/updates-subscribe-form";
import {
  getPublishedPostBySlug,
  isServiceRoleConfigured,
  sanitizeEditorialText,
  type PublishedPost,
} from "@/lib/phrenos-updates";

export const dynamic = "force-dynamic";

type AiUpdatePageProps = {
  params: Promise<{ slug: string }>;
};

const loadPost = cache(async (slug: string): Promise<PublishedPost | null> => {
  if (!isServiceRoleConfigured()) return null;
  try {
    return await getPublishedPostBySlug(slug);
  } catch (error) {
    console.error(`Could not load AI update "${slug}":`, error);
    return null;
  }
});

function formatPublishedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(date);
}

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_CTA_BUTTON_LABEL = "Build Your AI Strategy";

/** A final CTA line ending in "→" becomes the button label; otherwise the default label is used. */
function splitCta(cta: string): {
  primary: string;
  supporting: string | null;
  buttonLabel: string;
} {
  const parts = sanitizeEditorialText(cta)
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { primary: "", supporting: null, buttonLabel: DEFAULT_CTA_BUTTON_LABEL };
  }

  let buttonLabel = DEFAULT_CTA_BUTTON_LABEL;
  if (parts.length > 1 && parts[parts.length - 1].endsWith("→")) {
    buttonLabel = parts.pop() as string;
  }

  // A CTA saved as one long paragraph would print entirely in the headline style. Use the first
  // sentence as the headline and the rest as supporting copy.
  if (parts.length === 1 && parts[0].length > 140) {
    const sentences = parts[0].split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length > 1) {
      return { primary: sentences[0], supporting: sentences.slice(1).join(" "), buttonLabel };
    }
  }

  return {
    primary: parts[0],
    supporting: parts.slice(1).join(" ") || null,
    buttonLabel,
  };
}

export async function generateMetadata({
  params,
}: AiUpdatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);

  if (!post) {
    return { title: "AI Update", robots: { index: false, follow: true } };
  }

  const description =
    post.hook?.trim() || toPlainText(post.summary_html).slice(0, 180);

  return {
    title: post.title,
    description,
    alternates: { canonical: `/ai-updates/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.published_at,
      url: `/ai-updates/${post.slug}`,
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

export default async function AiUpdatePage({ params }: AiUpdatePageProps) {
  const { slug } = await params;
  const post = await loadPost(slug);

  if (!post) notFound();

  const title = sanitizeEditorialText(post.title);
  const hook = sanitizeEditorialText(post.hook);
  const summaryHtml = sanitizeEditorialText(post.summary_html);
  const bodyHtml = sanitizeEditorialText(post.body_html);
  const cta = splitCta(post.cta ?? "");
  const { html: articleHtml, sections, minutes } = enhanceArticle(bodyHtml);

  const articleUrl = `https://phrenosai.com/ai-updates/${post.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: hook || toPlainText(summaryHtml).slice(0, 180),
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      "@type": "Person",
      name: "Sophia Livanos",
    },
    publisher: {
      "@type": "Organization",
      name: "Phrenos.ai",
      logo: {
        "@type": "ImageObject",
        url: "https://phrenosai.com/brand/phrenos_logo_green.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
  };

  return (
    <article className="relative isolate bg-forest pt-32 pb-20 lg:pt-40 lg:pb-28">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {/* Viewport-fixed artwork so the owl stays visible and never stretches with article length. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-forest" />
        <picture>
          <source srcSet="/brand/pages/article-owl.webp" type="image/webp" />
          <img
            src="/brand/pages/article-owl.jpg"
            alt=""
            className="absolute top-0 right-0 hidden h-full w-[min(58vw,880px)] object-cover object-[72%_42%] opacity-[0.58] lg:block"
            decoding="async"
          />
        </picture>
        <picture>
          <source srcSet="/brand/pages/article-owl.webp" type="image/webp" />
          <img
            src="/brand/pages/article-owl.jpg"
            alt=""
            className="absolute inset-0 h-[70vh] w-full object-cover object-[78%_30%] opacity-35 lg:hidden"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#101C14_0%,#101C14_46%,rgba(16,28,20,0.92)_60%,rgba(16,28,20,0.55)_78%,rgba(16,28,20,0.28)_100%)] lg:block" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,28,20,0.55)_0%,rgba(16,28,20,0.82)_38%,#101C14_72%)] lg:bg-[linear-gradient(180deg,rgba(16,28,20,0.35)_0%,transparent_22%,transparent_70%,rgba(16,28,20,0.55)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        <Link
          href="/ai-updates"
          className="text-[11px] font-semibold tracking-[0.22em] text-sage uppercase transition-colors hover:text-[#e0c078]"
        >
          Back to AI Updates
        </Link>

        <header className="mt-6 overflow-hidden rounded-2xl border border-[#d4af5a]/35 bg-[linear-gradient(135deg,rgba(212,175,90,0.2),rgba(16,28,20,0.9)_58%)] p-6 shadow-2xl backdrop-blur-sm md:p-10">
          <div className="flex flex-wrap items-center gap-3 text-[11px] tracking-[0.22em] uppercase">
            <span className="rounded-full border border-[#d4af5a]/60 bg-[#d4af5a]/15 px-3 py-1 font-semibold text-[#e0c078]">
              AI Update
            </span>
            <span className="text-ivory/65">{formatPublishedDate(post.published_at)}</span>
            <span className="text-ivory/65">{minutes} min read</span>
          </div>
          <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-tight tracking-tight text-ivory sm:text-5xl">
            {title}
          </h1>
          {hook ? (
            <p className="mt-6 max-w-3xl border-l-4 border-[#d4af5a] pl-4 text-lg leading-relaxed text-ivory/90 sm:text-xl">
              {hook}
            </p>
          ) : null}
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <div className="rounded-2xl border border-[#d4af5a]/20 bg-[#0b140e]/80 p-6 backdrop-blur-sm md:p-10">
              {summaryHtml ? (
                <div
                  className="mb-8 rounded-xl border border-[#d4af5a]/30 bg-[#d4af5a]/[0.07] px-5 py-5 text-sm leading-relaxed text-[#d5d0c1] [&_li]:mt-1.5 [&_li]:ml-4 [&_li]:list-disc [&_li]:marker:text-[#d4af5a] [&_p]:mt-2 [&_ul]:mt-0"
                  dangerouslySetInnerHTML={{ __html: summaryHtml }}
                />
              ) : null}
              <div className="ai-article" dangerouslySetInnerHTML={{ __html: articleHtml }} />
            </div>

            {cta.primary ? (
              <div className="mt-8 rounded-2xl border border-[#d4af5a]/40 bg-[linear-gradient(135deg,rgba(212,175,90,0.22),rgba(11,20,14,0.9))] px-6 py-8 text-center backdrop-blur-[2px]">
                <p
                  className={`font-serif leading-snug font-semibold text-[#e0c078] ${
                    cta.primary.length > 110 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
                  }`}
                >
                  {cta.primary}
                </p>
                {cta.supporting ? (
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ivory/80 sm:text-base">
                    {cta.supporting}
                  </p>
                ) : null}
                <Link
                  href="/contact#contact-form"
                  className="mt-7 inline-flex items-center justify-center rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078]"
                >
                  {cta.buttonLabel}
                </Link>
              </div>
            ) : null}

            <PostFeedback postId={post.id} />

            <div className="mt-12 border-t border-[#d4af5a]/20 pt-10">
              <UpdatesSubscribeForm source="ai-update-article" compact />
            </div>

            <div className="mt-10 border-t border-[#d4af5a]/20 pt-6">
              <Link
                href="/ai-updates"
                className="text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline"
              >
                All AI Updates
              </Link>
            </div>
          </div>

          {sections.length > 0 ? (
            <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start">
              <nav
                aria-label="In this article"
                className="rounded-2xl border border-[#d4af5a]/25 bg-[#0b140e]/80 p-5 backdrop-blur-sm"
              >
                <p className="text-[11px] font-semibold tracking-[0.22em] text-[#e0c078] uppercase">
                  In this article
                </p>
                <ol className="mt-4 space-y-3">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="group flex items-start gap-3 text-sm leading-snug text-ivory/80 transition-colors hover:text-[#e0c078]"
                      >
                        <span className="mt-0.5 text-xs font-semibold text-[#d4af5a]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          ) : null}
        </div>
      </div>
    </article>
  );
}
