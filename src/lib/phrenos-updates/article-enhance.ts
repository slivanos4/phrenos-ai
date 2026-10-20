// Turns a published article's plain HTML into a more readable page: sections with anchors and numbers, a pull quote
// for an opening quoted line, highlighted quoted phrases, and a callout for a takeaway section. Pure string work.

export type ArticleSection = { id: string; title: string };

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const slug = (text: string) =>
  text.toLowerCase().replace(/&[a-z#0-9]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";

// Sections that are the takeaway of the piece get a coloured callout instead of plain text.
const CALLOUT = /(one question|short version|takeaway|worth taking|before you go|what to do|what to ask|next step)/i;

/** Quoted phrases in running text get a colour. Tags are left alone. */
function highlightQuotes(html: string): string {
  return html.replace(
    />([^<]+)</g,
    (_whole, text: string) =>
      `>${text.replace(/(?:"|&quot;)([^"<&]{3,90}?)(?:"|&quot;)/g, '<span class="ai-quote">&ldquo;$1&rdquo;</span>')}<`,
  );
}

/** A paragraph that is only a short quoted line, such as an opening line said out loud, becomes a pull quote. */
function pullQuote(html: string): string {
  return html.replace(
    /^(\s*)<p>\s*(?:"|&quot;|&ldquo;)([^<]{8,140}?)(?:"|&quot;|&rdquo;)\s*<\/p>/,
    '$1<blockquote class="ai-pullquote">$2</blockquote>',
  );
}

export function enhanceArticle(html: string): { html: string; sections: ArticleSection[]; minutes: number } {
  const words = stripTags(html).split(" ").filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 210));
  const parts = html.split(/(<h2[^>]*>[\s\S]*?<\/h2>)/i);
  const sections: ArticleSection[] = [];
  const used = new Set<string>();
  let out = highlightQuotes(pullQuote(parts[0] ?? ""));
  let number = 0;
  for (let i = 1; i < parts.length; i += 2) {
    const title = stripTags(parts[i]);
    let id = slug(title);
    while (used.has(id)) id = `${id}-2`;
    used.add(id);
    number += 1;
    sections.push({ id, title });
    const body = highlightQuotes(parts[i + 1] ?? "");
    const callout = CALLOUT.test(title);
    out += `<section id="${id}" class="ai-section${callout ? " ai-callout" : ""}"><h2><span class="ai-num">${String(number).padStart(2, "0")}</span>${title
      .replace(/&/g, "&amp;")
      .replace(/&amp;(amp|lt|gt|quot|#\d+);/g, "&$1;")}</h2>${body}</section>`;
  }
  return { html: out, sections, minutes };
}
