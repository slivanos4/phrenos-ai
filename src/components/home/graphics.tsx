import { DrawOnView } from "@/components/home/motion";

/** A small seeded random number generator, so server and browser draw the same picture. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const WIDTH = 1200;
const HEIGHT = 170;
const MID = HEIGHT / 2;

function noisePath(seed: number, amplitude: number): string {
  const random = seeded(seed);
  const points: string[] = [];
  for (let x = 0; x <= WIDTH; x += 12) {
    // The noise calms down as it travels right, handing over to the clean line.
    const calm = Math.max(0.03, 1 - x / (WIDTH * 0.78));
    const y = MID + (random() - 0.5) * 2 * amplitude * calm;
    points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

function signalPath(): string {
  const points: string[] = [];
  for (let x = 0; x <= WIDTH; x += 8) {
    const rise = Math.min(1, x / (WIDTH * 0.55));
    const y = MID - Math.sin((x / WIDTH) * Math.PI * 3.2) * 34 * rise - rise * 6;
    points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

/** Static noise on the left that resolves into one clean gold line on the right. */
export function SignalNoise({ from, to }: { from: string; to: string }) {
  const noise = [11, 23, 37, 41, 59, 67, 83].map((seed, index) => noisePath(seed, 62 - index * 3));
  const signal = signalPath();
  return (
    <DrawOnView className="signal-noise relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${from} resolving into ${to}`}
      >
        <defs>
          <linearGradient id="signal-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#a9b0a3" stopOpacity="0.2" />
            <stop offset="0.35" stopColor="#d4af5a" />
            <stop offset="1" stopColor="#f0d9a0" />
          </linearGradient>
          <filter id="signal-blur" x="-5%" y="-40%" width="110%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        {noise.map((d, index) => (
          <path key={index} d={d} className="noise-line" fill="none" stroke="#a9b0a3" strokeWidth="1" />
        ))}
        <path d={signal} className="signal-glow" fill="none" stroke="#d4af5a" strokeWidth="9" filter="url(#signal-blur)" />
        <path d={signal} className="signal-line" fill="none" stroke="url(#signal-fade)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-1 text-[11px] font-semibold tracking-[0.3em] uppercase">
        <span className="text-sage">{from}</span>
        <span className="text-[#e0c078]">{to}</span>
      </div>
    </DrawOnView>
  );
}

const iconProps = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "icon-draw h-14 w-14",
  "aria-hidden": true,
};

/** Five hand-drawn gold line icons, one per service, in the same geometric hand as the Phrenos monogram. */
export function ServiceIcon({ index }: { index: number }) {
  switch (index) {
    case 0: // Strategy: a compass
      return (
        <svg {...iconProps}>
          <circle cx="32" cy="32" r="24" />
          <path d="M32 8v5M32 51v5M8 32h5M51 32h5" />
          <path d="M40.5 23.5 36 36l-12.5 4.5L28 28z" />
          <circle cx="32" cy="32" r="2" />
        </svg>
      );
    case 1: // Automation: a loop of linked nodes
      return (
        <svg {...iconProps}>
          <circle cx="14" cy="32" r="5" />
          <circle cx="32" cy="14" r="5" />
          <circle cx="50" cy="32" r="5" />
          <circle cx="32" cy="50" r="5" />
          <path d="M17.5 27.5 27.5 17.5M36.5 17.5l10 10M46.5 36.5l-10 10M27.5 46.5l-10-10" />
          <path d="M32 26v12M26 32h12" />
        </svg>
      );
    case 2: // Content and systems: layered pages
      return (
        <svg {...iconProps}>
          <rect x="16" y="10" width="32" height="42" rx="3" />
          <path d="M22 10V6h30v42h-4" />
          <path d="M23 22h18M23 29h18M23 36h11" />
          <path d="M40 44l3 3 6-7" />
        </svg>
      );
    case 3: // Intelligence: a radar sweep
      return (
        <svg {...iconProps}>
          <circle cx="32" cy="32" r="24" />
          <circle cx="32" cy="32" r="14" />
          <path d="M32 32 49 15" />
          <circle cx="42" cy="38" r="2" />
          <circle cx="24" cy="22" r="2" />
          <circle cx="32" cy="32" r="1.6" />
        </svg>
      );
    default: // Enablement: people rising together
      return (
        <svg {...iconProps}>
          <circle cx="32" cy="16" r="6" />
          <circle cx="15" cy="30" r="5" />
          <circle cx="49" cy="30" r="5" />
          <path d="M32 24v10M19 36l9 8M45 36l-9 8" />
          <path d="M10 56c0-9 5-14 12-14M54 56c0-9-5-14-12-14M22 56c0-6 4-10 10-10s10 4 10 10" />
        </svg>
      );
  }
}
