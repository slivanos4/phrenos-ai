/**
 * The outlook: a plain-language reading of where a price pattern stands and what would have to change for a turn. It describes the chart.
 * It is not a forecast, never names a price, and never says to buy or sell. This file is pure, so the browser can use it on any row.
 */
export type OutlookState = "uptrend" | "pullback" | "sideways" | "falling" | "sharp_fall" | "bounce" | "basing" | "recovering" | "unknown";
export type OutlookTone = "good" | "neutral" | "warn" | "bad";

export type OutlookInput = {
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  /** Price against its 200-day average, as a fraction (0.05 is 5% above). */
  vs_sma200: number | null;
  vol_30d?: number | null;
};

export type Outlook = {
  state: OutlookState;
  label: string;
  tone: OutlookTone;
  comment: string;
  /** What would have to happen for the picture to improve, or what would worsen it. */
  turn_watch: string[];
};

const pct = (value: number) => `${Math.abs(value * 100).toFixed(0)}%`;

export function outlookFrom(input: OutlookInput): Outlook {
  const { change_1d: c1, change_7d: c7, change_30d: c30, change_90d: c90, vs_sma200: vs200 } = input;
  if (c7 === null && c30 === null && vs200 === null) {
    return { state: "unknown", label: "Not enough history", tone: "neutral", comment: "There is not enough price history yet to describe the trend.", turn_watch: [] };
  }
  const below200 = vs200 !== null ? vs200 < 0 : c90 !== null ? c90 < 0 : (c30 ?? 0) < 0;
  const sharp = (c1 !== null && c1 <= -0.08) || (c7 !== null && c7 <= -0.15);

  if (sharp) {
    return {
      state: "sharp_fall",
      label: "Sharp fall",
      tone: "bad",
      comment: `It has dropped sharply${c7 !== null ? ` (${pct(c7)} down over 7 days)` : ""}. After a drop this size the reason matters more than the chart, and prices usually swing hard in both directions for a while. The price alone cannot yet say whether the fall is over.`,
      turn_watch: [
        "The cause: whether the news behind the fall is resolved, or still getting worse.",
        "Several sessions without a new low, which is how falls usually start to settle.",
        "Daily swings getting smaller rather than larger.",
        "A climb back above the level it fell from would be a stronger sign than a one-day bounce.",
      ],
    };
  }
  if (below200) {
    if (c7 !== null && c7 > 0.03 && (c30 ?? 0) < 0) {
      return {
        state: "bounce", label: "Downtrend, bouncing", tone: "warn",
        comment: "It is bouncing inside a longer downtrend. Bounces like this often fade, so one good week is not yet a turn.",
        turn_watch: ["Climbing back above its 200-day average, which is where a downtrend usually ends.", "Holding the bounce for several weeks rather than a few days.", "A new low being made again would mean the bounce failed."],
      };
    }
    if (c7 !== null && c7 < -0.03) {
      return {
        state: "falling", label: "Downtrend, still falling", tone: "bad",
        comment: "It is below its long-term average and still falling. Nothing in the price shows a turn yet: that would need it to stop making new lows first.",
        turn_watch: ["It stops making new lows for a few weeks.", "Falls get smaller and swings calm down.", "It climbs back above its 200-day average."],
      };
    }
    if ((c30 ?? 0) > 0.03) {
      return {
        state: "recovering", label: "Recovering", tone: "neutral",
        comment: "It is still below its 200-day average but has been rising over the last month, so the trend may be trying to turn. It is not confirmed until it climbs back above that average.",
        turn_watch: ["A close above its 200-day average.", "Rises continuing without a sharp pullback.", "A drop back below the recent low would cancel the recovery."],
      };
    }
    return {
      state: "basing", label: "Downtrend, steadying", tone: "warn",
      comment: "It is in a longer downtrend, but the fall has slowed. A pause can come before a turn, but nothing in the price confirms one yet.",
      turn_watch: ["Breaking out above the top of its recent range.", "A close above its 200-day average.", "Breaking below the bottom of its recent range would mean the fall is resuming."],
    };
  }
  // Above its long-term average.
  if (c7 !== null && c7 < -0.03 && (c30 ?? 0) > -0.05) {
    return {
      state: "pullback", label: "Uptrend, pulling back", tone: "neutral",
      comment: "The longer trend is up, and it has dipped over the last week. Dips inside an uptrend are common. It becomes more of a concern if it falls below its 200-day average.",
      turn_watch: ["Falling below its 200-day average would turn the trend down.", "Rising again past its recent high would resume the uptrend."],
    };
  }
  if ((c30 ?? 0) > 0.02) {
    return {
      state: "uptrend", label: "Uptrend", tone: "good",
      comment: "It is above its 200-day average and has risen over the last month: an established uptrend. Trends end, usually when it falls back below that average or swings become much larger.",
      turn_watch: ["A close below its 200-day average would turn the trend down.", "A sharp rise in daily swings, or one very large down day, would raise the risk."],
    };
  }
  return {
    state: "sideways", label: "Sideways", tone: "neutral",
    comment: "It is above its long-term average but has gone nowhere over the last month. A move out of its range, up or down, would show which way it is leaning.",
    turn_watch: ["Rising above the top of its recent range would point up.", "Falling through the bottom of its range, or below its 200-day average, would point down."],
  };
}

export const TONE_CLASS: Record<OutlookTone, string> = {
  good: "border-[#8fbf9f]/60 text-[#8fbf9f]",
  neutral: "border-[#e0c078]/50 text-[#e0c078]",
  warn: "border-[#e8a070]/60 text-[#e8a070]",
  bad: "border-[#e8b4a0]/70 text-[#e8b4a0]",
};
