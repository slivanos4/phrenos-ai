// Best effort on serverless: stops one visitor hammering a form from one instance.
const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;

export function tooManyRequests(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > MAX_PER_WINDOW;
}
