import { NextResponse } from "next/server";
import { BRIEF_FILENAME, hasBriefAccess, readBriefPdf } from "@/lib/site/brief-access";

export const dynamic = "force-dynamic";

/** The cheat sheet PDF, handed over only to a browser that has given an email address. */
export async function GET(request: Request) {
  if (!hasBriefAccess(request)) {
    const url = new URL("/resources", request.url);
    url.hash = "cheat-sheet";
    return NextResponse.redirect(url, 302);
  }

  const download = new URL(request.url).searchParams.get("dl") === "1";
  const pdf = await readBriefPdf();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${BRIEF_FILENAME}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
