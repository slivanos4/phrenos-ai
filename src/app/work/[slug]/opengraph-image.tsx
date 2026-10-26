import { caseStudyBySlug } from "@/data/case-studies";
import { selectedWork } from "@/data/site-content";
import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai case study";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  const work = study ? selectedWork.find((item) => item.title === study.title) : undefined;
  return renderPageOg({
    eyebrow: work ? `Case study  ·  ${work.tag}` : "Case study",
    title: study?.name ?? "Case study",
  });
}
