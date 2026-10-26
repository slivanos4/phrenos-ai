import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { readinessAreas, type ReadinessResult } from "@/data/readiness-check";

const FOREST = rgb(0.063, 0.11, 0.078);
const GOLD = rgb(0.831, 0.686, 0.353);
const CHAMPAGNE = rgb(0.94, 0.85, 0.63);
const CREAM = rgb(0.98, 0.965, 0.93);
const INK = rgb(0.1, 0.13, 0.11);
const MUTED = rgb(0.42, 0.45, 0.41);
const TRACK = rgb(0.9, 0.86, 0.76);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 52;

/** The standard PDF fonts only cover Western European characters, so tidy anything else. */
function safe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^ -ÿ]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of safe(text).split(/\s+/)) {
    const attempt = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(attempt, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function logoBytes(): Promise<Uint8Array | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "brand", "phrenos_logo_white.png"));
  } catch {
    return null;
  }
}

/** A one-page, branded copy of someone's AI readiness result. */
export async function buildReadinessPdf(result: ReadinessResult): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Your AI readiness result");
  pdf.setAuthor("Phrenos.ai");
  const page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });

  // Header band
  const bandH = 84;
  page.drawRectangle({ x: 0, y: PAGE_H - bandH, width: PAGE_W, height: bandH, color: FOREST });
  page.drawRectangle({ x: 0, y: PAGE_H - bandH - 2, width: PAGE_W, height: 2, color: GOLD });
  let textX = MARGIN;
  const logo = await logoBytes();
  if (logo) {
    try {
      const image = await pdf.embedPng(logo);
      const h = 44;
      const w = (image.width / image.height) * h;
      page.drawImage(image, { x: MARGIN, y: PAGE_H - bandH / 2 - h / 2, width: w, height: h });
      textX = MARGIN + w + 12;
    } catch {
      // Fall back to the wordmark alone.
    }
  }
  page.drawText("Phrenos.ai", { x: textX, y: PAGE_H - bandH / 2 - 7, size: 21, font: serif, color: rgb(0.945, 0.91, 0.84) });
  const label = "AI READINESS RESULT";
  page.drawText(label, {
    x: PAGE_W - MARGIN - sansBold.widthOfTextAtSize(label, 9) - 8,
    y: PAGE_H - bandH / 2 - 3,
    size: 9,
    font: sansBold,
    color: GOLD,
  });

  let y = PAGE_H - bandH - 58;

  // Score
  page.drawText(`${result.percent}%`, { x: MARGIN, y, size: 58, font: serifBold, color: FOREST });
  const scoreW = serifBold.widthOfTextAtSize(`${result.percent}%`, 58);
  page.drawText("AI READINESS", { x: MARGIN + scoreW + 18, y: y + 30, size: 8.5, font: sansBold, color: MUTED });
  page.drawText(safe(result.tier.label), { x: MARGIN + scoreW + 18, y: y + 8, size: 22, font: serif, color: INK });
  y -= 26;
  page.drawRectangle({ x: MARGIN, y, width: 64, height: 3, color: GOLD });
  y -= 30;

  const bodyW = PAGE_W - MARGIN * 2;
  for (const line of wrap(result.tier.headline, serifBold, 17, bodyW)) {
    page.drawText(line, { x: MARGIN, y, size: 17, font: serifBold, color: FOREST });
    y -= 22;
  }
  y -= 4;
  for (const line of wrap(result.tier.summary, sans, 10.5, bodyW)) {
    page.drawText(line, { x: MARGIN, y, size: 10.5, font: sans, color: INK });
    y -= 15;
  }

  // Next moves
  y -= 18;
  page.drawText("YOUR NEXT THREE MOVES", { x: MARGIN, y, size: 8.5, font: sansBold, color: MUTED });
  y -= 20;
  result.tier.nextSteps.forEach((step, index) => {
    page.drawText(String(index + 1), { x: MARGIN, y: y - 1, size: 16, font: serifBold, color: GOLD });
    for (const line of wrap(step, sans, 10.5, bodyW - 26)) {
      page.drawText(line, { x: MARGIN + 26, y, size: 10.5, font: sans, color: INK });
      y -= 15;
    }
    y -= 6;
  });

  // By area
  y -= 14;
  page.drawText("BY AREA", { x: MARGIN, y, size: 8.5, font: sansBold, color: MUTED });
  y -= 22;
  const trackX = MARGIN + 190;
  const trackW = bodyW - 190 - 40;
  for (const area of result.areas) {
    page.drawText(safe(area.label), { x: MARGIN, y, size: 10.5, font: sans, color: INK });
    page.drawRectangle({ x: trackX, y: y - 1, width: trackW, height: 8, color: TRACK });
    page.drawRectangle({ x: trackX, y: y - 1, width: Math.max(2, (trackW * area.percent) / 100), height: 8, color: GOLD });
    page.drawText(`${area.percent}%`, { x: trackX + trackW + 10, y, size: 10.5, font: sansBold, color: FOREST });
    y -= 24;
  }

  // Start here
  y -= 10;
  const startLines = wrap(readinessAreas[result.weakest].firstStep, sans, 10.5, bodyW - 32);
  const boxH = 44 + startLines.length * 15;
  page.drawRectangle({ x: MARGIN, y: y - boxH + 14, width: bodyW, height: boxH, color: rgb(0.96, 0.92, 0.82) });
  page.drawRectangle({ x: MARGIN, y: y - boxH + 14, width: 4, height: boxH, color: GOLD });
  page.drawText(safe(`START HERE: ${readinessAreas[result.weakest].label}`.toUpperCase()), {
    x: MARGIN + 18,
    y: y - 6,
    size: 8.5,
    font: sansBold,
    color: FOREST,
  });
  let boxY = y - 26;
  for (const line of startLines) {
    page.drawText(line, { x: MARGIN + 18, y: boxY, size: 10.5, font: sans, color: INK });
    boxY -= 15;
  }

  // Footer
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 62, color: FOREST });
  page.drawText("Want to talk it through? Book a free 15-minute intro call at phrenosai.com/contact", {
    x: MARGIN,
    y: 36,
    size: 10,
    font: sans,
    color: CHAMPAGNE,
  });
  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  page.drawText(`phrenosai.com  |  Generated ${generated}`, { x: MARGIN, y: 20, size: 8.5, font: sans, color: rgb(0.66, 0.69, 0.64) });

  return pdf.save();
}
