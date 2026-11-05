import Link from "next/link";

const ITEMS = [
  { href: "/admin/ai-updates", label: "Content research", key: "content" },
  { href: "/admin/market-desk", label: "Market Desk", key: "markets" },
  { href: "/admin/ai-visibility", label: "AI visibility", key: "visibility" },
  { href: "/admin/leads", label: "Leads", key: "leads" },
] as const;

/** The dashboard tabs shared by every admin page. */
export function AdminNav({ current }: { current: (typeof ITEMS)[number]["key"] }) {
  return (
    <nav aria-label="Admin sections" className="mb-8 flex flex-wrap gap-2">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.16em] uppercase transition-colors ${
            item.key === current
              ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]"
              : "border-[#d4af5a]/25 text-[#a9b0a3] hover:border-[#d4af5a]/60 hover:text-[#f1e8d6]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
