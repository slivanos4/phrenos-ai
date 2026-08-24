import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PostFeedback } from "@/components/ai-updates/post-feedback";
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

function splitCta(cta: string): { primary: string; supporting: string | null } {
  const parts = sanitizeEditorialText(cta)
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { primary: "", supporting: null };
  return {
    primary: parts[0],
    supporting: parts.slice(1).join(" ") || null,
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

  return (
    <article className="relative isolate overflow-hidden bg-forest pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src="/brand/pages/article-owl.jpg"
          alt=""
          className="h-full w-full object-cover object-[78%_center] opacity-[0.42] sm:opacity-50"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,28,20,0.96)_0%,rgba(16,28,20,0.9)_38%,rgba(16,28,20,0.72)_62%,rgba(16,28,20,0.55)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,28,20,0.55)_0%,transparent_18%,transparent_72%,rgba(16,28,20,0.85)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 lg:px-8">
        <Link
          href="/ai-updates"
          className="text-[11px] font-semibold tracking-[0.22em] text-sage uppercase transition-colors hover:text-[#e0c078]"
        >
          Back to AI Updates
        </Link>

        <p className="mt-8 text-xs font-semibold tracking-[0.28em] text-gold uppercase">
          {formatPublishedDate(post.published_at)}
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-ivory sm:text-5xl">
          {title}
        </h1>
        {hook ? (
          <p className="mt-5 text-base leading-relaxed text-sage sm:text-lg">
            {hook}
          </p>
        ) : null}

        {summaryHtml ? (
          <div
            className="mt-8 rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/70 px-5 py-5 text-sm leading-relaxed text-[#c9c6ba] backdrop-blur-[2px] [&_li]:mt-1.5 [&_li]:ml-4 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-0"
            dangerouslySetInnerHTML={{ __html: summaryHtml }}
          />
        ) : null}

        <div
          className="mt-10 text-base leading-relaxed text-[#d5d0c1] [&>*+*]:mt-5 [&_a]:text-[#e0c078] [&_a]:underline-offset-2 [&_a:hover]:underline [&_blockquote]:border-l [&_blockquote]:border-[#d4af5a]/45 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ivory [&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ivory [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-ivory [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {cta.primary ? (
          <div className="mt-12 rounded-2xl border border-[#d4af5a]/30 bg-[#101c14]/75 px-6 py-8 text-center backdrop-blur-[2px]">
            <p className="font-serif text-2xl leading-snug text-ivory sm:text-3xl">
              {cta.primary}
            </p>
            {cta.supporting ? (
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-sage sm:text-base">
                {cta.supporting}
              </p>
            ) : null}
            <Link
              href="/contact"
              className="mt-7 inline-flex items-center justify-center rounded-full border border-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-ivory transition-colors hover:bg-gold hover:text-forest"
            >
              Build Your AI Strategy
            </Link>
          </div>
        ) : null}

        <PostFeedback postId={post.id} />

        <div className="mt-10 border-t border-[#d4af5a]/20 pt-6">
          <Link
            href="/ai-updates"
            className="text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline"
          >
            All AI Updates
          </Link>
        </div>
      </div>
    </article>
  );
}
