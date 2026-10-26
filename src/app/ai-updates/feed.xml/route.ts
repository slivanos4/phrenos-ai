import { isServiceRoleConfigured, listPublishedPosts } from "@/lib/phrenos-updates";

export const revalidate = 3600;

const SITE = "https://phrenosai.com";

const xml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** The AI Updates articles as an RSS feed, newest first. */
export async function GET() {
  let posts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  if (isServiceRoleConfigured()) {
    try {
      posts = await listPublishedPosts(30);
    } catch (error) {
      console.error("rss: could not load posts:", error);
    }
  }

  const items = posts
    .map((post) => {
      const link = `${SITE}/ai-updates/${post.slug}`;
      return `    <item>
      <title>${xml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description>${xml(post.hook || "")}</description>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Phrenos.ai AI Updates</title>
    <link>${SITE}/ai-updates</link>
    <atom:link href="${SITE}/ai-updates/feed.xml" rel="self" type="application/rss+xml" />
    <description>Plain-English analysis of the AI news that matters, for business leaders.</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
