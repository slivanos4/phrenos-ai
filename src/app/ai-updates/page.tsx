import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import {
  isServiceRoleConfigured,
  listPublishedPosts,
  type PublishedPost,
} from "@/lib/phrenos-updates";

export const metadata: Metadata = {
  title: "AI Updates",
  description:
    "Weekly notes on Generative AI models, products and industry moves, written for leaders putting AI to work.",
};

export const revalidate = 300;

function formatPublishedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(date);
}

async function loadPosts(): Promise<PublishedPost[]> {
  if (!isServiceRoleConfigured()) return [];
  try {
    return await listPublishedPosts();
  } catch (error) {
    console.error("Could not load published AI updates:", error);
    return [];
  }
}

export default async function AiUpdatesPage() {
  const posts = await loadPosts();

  return (
    <>
      <PageHero
        image="ai-updates"
        position="center right"
        mobilePosition="65% center"
        eyebrow="AI Updates"
        title="Intelligence worth paying attention to."
        description="Notes on Generative AI, automation and the organisational judgement required to put them to work."
      />

      <section className="bg-forest pt-10 pb-16 lg:pt-14 lg:pb-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          {posts.length > 0 ? (
            <>
              <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
                Latest updates
              </p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="flex flex-col rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/60 p-6 transition-colors hover:border-[#d4af5a]/60"
                  >
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">
                      {formatPublishedDate(post.published_at)}
                    </p>
                    <h2 className="mt-3 font-serif text-2xl leading-snug text-ivory">
                      <Link
                        href={`/ai-updates/${post.slug}`}
                        className="transition-colors hover:text-[#e0c078]"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    {post.hook ? (
                      <p className="mt-3 text-sm leading-relaxed text-sage">
                        {post.hook}
                      </p>
                    ) : null}
                    <Link
                      href={`/ai-updates/${post.slug}`}
                      className="mt-6 inline-flex text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline"
                    >
                      Read the update
                    </Link>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-base leading-relaxed text-sage sm:text-lg">
                This space gathers reflections on how AI is reshaping work,
                decision-making and organisational capability. New intelligence
                will appear here after the first approved batch.
              </p>
              <Link
                href="/contact"
                className="mt-10 inline-flex items-center justify-center rounded-full border border-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-ivory transition-colors hover:bg-gold hover:text-forest"
              >
                Build Your AI Strategy
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
