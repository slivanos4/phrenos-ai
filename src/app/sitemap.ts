import type { MetadataRoute } from "next";
import { isServiceRoleConfigured, listPublishedPosts } from "@/lib/phrenos-updates";

const siteUrl = "https://phrenosai.com";

export const revalidate = 3600;

const staticRoutes: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/consultancy", priority: 0.9 },
  { path: "/approach", priority: 0.8 },
  { path: "/work", priority: 0.8 },
  { path: "/ai-updates", priority: 0.8 },
  { path: "/resources", priority: 0.7 },
  { path: "/about", priority: 0.7 },
  { path: "/contact", priority: 0.6 },
];

async function loadPublishedSlugs(): Promise<
  Array<{ slug: string; publishedAt: string }>
> {
  if (!isServiceRoleConfigured()) return [];
  try {
    const posts = await listPublishedPosts(500);
    return posts.map((post) => ({
      slug: post.slug,
      publishedAt: post.published_at,
    }));
  } catch (error) {
    console.error("sitemap: could not load published AI updates:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await loadPublishedSlugs();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    changeFrequency: route.path === "/ai-updates" ? "weekly" : "monthly",
    priority: route.priority,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/ai-updates/${post.slug}`,
    lastModified: post.publishedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries];
}
