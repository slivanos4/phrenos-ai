"use client";

import { useEffect, useId, useState } from "react";
import { HeroNetwork } from "@/components/hero-network";
import { romanNumerals, services } from "@/data/site-content";

type ServicesProps = {
  hideIntro?: boolean;
};

/** Champagne / bronze gold — matches the atlas mock */
const GOLD = {
  bright: "#e8d5a3",
  mid: "#d4af5a",
  deep: "#b88b36",
  mute: "#c4b48a",
  dim: "#8a7a55",
  line: "#c9a24a",
} as const;

const CX = 300;
const CY = 290;
const VB_W = 620;
const VB_H = 600;

const EMBLEM_SIZE = 288;
/** Punch-out so ring strokes never cross the column / Φ */
const EMBLEM_RX = 128;
const EMBLEM_RY = 140;

/** Primary orbit that carries the five capabilities (mock layout) */
const PRIMARY_R = 228;

/**
 * Inner chart rings from the mock — faint concentric circles.
 * Outer primary ring is drawn separately, brighter.
 */
const INNER_RINGS = [
  { r: 118, width: 0.7, opacity: 0.14, dash: "2 9" },
  { r: 142, width: 0.75, opacity: 0.18, dash: undefined },
  { r: 166, width: 0.7, opacity: 0.14, dash: "2 10" },
  { r: 190, width: 0.85, opacity: 0.22, dash: undefined },
  { r: 210, width: 0.7, opacity: 0.12, dash: "3 11" },
] as const;

/**
 * Evenly spaced on the primary circle (72° apart), starting at the top.
 * I top · II upper-right · III lower-right · IV lower-left · V left
 */
const NODES = [
  { angle: -90 }, // I Strategy
  { angle: -18 }, // II Automation
  { angle: 54 }, // III Content
  { angle: 126 }, // IV Intelligence
  { angle: 198 }, // V Enablement
] as const;

/** Sparks that travel the orbits — motion while nodes stay fixed */
const SPARKS = [
  ...Array.from({ length: 18 }, (_, i) => ({
    r: PRIMARY_R,
    base: (i * 20) % 360,
    size: 1.35 + (i % 3) * 0.35,
    speed: 4.2,
    opacity: 0.55 + (i % 4) * 0.1,
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    r: 190,
    base: (i * 36 + 8) % 360,
    size: 0.9,
    speed: 5.5,
    opacity: 0.35,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    r: 166,
    base: (i * 45 + 14) % 360,
    size: 0.7,
    speed: -3.2,
    opacity: 0.28,
  })),
] as const;

const pointIcons = [
  <path
    key="pen"
    d="M18 42 L22 28 L38 12 L44 18 L28 34 L14 46 Z M34 16 L40 22"
    stroke="currentColor"
    strokeWidth="1.45"
    fill="none"
  />,
  <path
    key="shield"
    d="M28 10 L44 16 V28 C44 38 36 44 28 48 C20 44 12 38 12 28 V16 Z M22 28 L26 32 L34 22"
    stroke="currentColor"
    strokeWidth="1.45"
    fill="none"
  />,
  <path
    key="people"
    d="M18 36 C18 30 22 26 28 26 C34 26 38 30 38 36 M28 26 C28 22 25 19 22 19 C19 19 16 22 16 26 M34 22 C34 19 36.5 16 40 16 C43.5 16 46 19 46 22 C46 27 42 30 38 30"
    stroke="currentColor"
    strokeWidth="1.45"
    fill="none"
  />,
  <path
    key="chart"
    d="M12 40 V16 M12 40 H44 M18 40 V30 M26 40 V22 M34 40 V26 M42 40 V18"
    stroke="currentColor"
    strokeWidth="1.45"
    fill="none"
  />,
] as const;

function polar(radius: number, angleDeg: number) {
  const θ = (angleDeg * Math.PI) / 180;
  // Round so SSR and client serialize identical attributes
  return {
    x: Math.round((CX + radius * Math.cos(θ)) * 100) / 100,
    y: Math.round((CY + radius * Math.sin(θ)) * 100) / 100,
  };
}

export function Services({ hideIntro = false }: ServicesProps) {
  const [active, setActive] = useState(2);
  const [phase, setPhase] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const uid = useId();
  const service = services[active];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mounted || reduceMotion) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPhase((p) => p + dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mounted, reduceMotion]);

  // Keep first paint identical on server and client
  const motion = mounted && !reduceMotion ? phase : 0;

  const nodeStates = NODES.map((node, index) => {
    const p = polar(PRIMARY_R, node.angle);
    return { ...p, angle: node.angle, index };
  });
  const activePt = nodeStates[active];

  return (
    <section
      id="consultancy"
      className={`relative isolate overflow-hidden bg-[#0a100c] ${
        hideIntro ? "pt-6 pb-14 lg:pt-8 lg:pb-18" : "pt-24 pb-14"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-18" aria-hidden>
        <HeroNetwork interactive={false} className="opacity-70" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_34%_48%,rgba(201,162,74,0.12),transparent_50%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[92rem] px-5 sm:px-8 lg:px-12">
        {hideIntro ? null : (
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">
              Consultancy
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-[#ead9b0] sm:text-5xl">
              Capability with commercial intent.
            </h2>
          </div>
        )}

        <div className="relative grid items-center gap-2 lg:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)] lg:gap-0">
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className="h-auto w-full"
              role="listbox"
              aria-label="Consultancy offerings"
              aria-activedescendant={`${uid}-node-${active}`}
            >
              <defs>
                <radialGradient id={`${uid}-field`} cx="48%" cy="48%" r="50%">
                  <stop offset="0%" stopColor={GOLD.bright} stopOpacity="0.14" />
                  <stop offset="45%" stopColor={GOLD.deep} stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#0a100c" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${uid}-burst`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff6d8" stopOpacity="1" />
                  <stop offset="25%" stopColor={GOLD.bright} stopOpacity="0.7" />
                  <stop offset="60%" stopColor={GOLD.mid} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={GOLD.deep} stopOpacity="0" />
                </radialGradient>
                <filter
                  id={`${uid}-glow`}
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur stdDeviation="7" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <mask
                  id={`${uid}-ring-mask`}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width={VB_W}
                  height={VB_H}
                >
                  <rect width={VB_W} height={VB_H} fill="white" />
                  <ellipse
                    cx={CX}
                    cy={CY}
                    rx={EMBLEM_RX}
                    ry={EMBLEM_RY}
                    fill="black"
                  />
                </mask>
              </defs>

              <circle cx={CX} cy={CY} r="300" fill={`url(#${uid}-field)`} />

              {/* Orrery rings — mock style, masked clear of the column */}
              <g mask={`url(#${uid}-ring-mask)`}>
                {INNER_RINGS.map((ring) => (
                  <circle
                    key={ring.r}
                    cx={CX}
                    cy={CY}
                    r={ring.r}
                    fill="none"
                    stroke={GOLD.line}
                    strokeOpacity={ring.opacity}
                    strokeWidth={ring.width}
                    strokeDasharray={ring.dash}
                    style={
                      motion
                        ? {
                            strokeDashoffset: motion * (ring.r > 170 ? -4 : 3),
                          }
                        : undefined
                    }
                  />
                ))}

                {/* Primary capability orbit */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={PRIMARY_R}
                  fill="none"
                  stroke={GOLD.bright}
                  strokeOpacity="0.55"
                  strokeWidth="1.55"
                />
                <circle
                  cx={CX}
                  cy={CY}
                  r={PRIMARY_R}
                  fill="none"
                  stroke={GOLD.mid}
                  strokeOpacity="0.35"
                  strokeWidth="1.1"
                  strokeDasharray="3 14"
                  style={
                    motion ? { strokeDashoffset: -motion * 9 } : undefined
                  }
                />

                {/* Traveling sparks on the orbits */}
                {SPARKS.map((spark, i) => {
                  const angle = spark.base + motion * spark.speed;
                  const p = polar(spark.r, angle);
                  return (
                    <circle
                      key={`spark-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={spark.size}
                      fill={GOLD.bright}
                      opacity={spark.opacity}
                      filter={
                        spark.r === PRIMARY_R
                          ? `url(#${uid}-glow)`
                          : undefined
                      }
                    />
                  );
                })}
              </g>

              {/* Soft tether to the detail panel */}
              <line
                x1={activePt.x}
                y1={activePt.y}
                x2={VB_W}
                y2={activePt.y}
                stroke={GOLD.mid}
                strokeOpacity="0.45"
                strokeWidth="1.05"
                className="atlas-spoke"
              />

              {/* Column + Φ — hero centrepiece */}
              <image
                href="/brand/atlas-centre.png?v=6"
                x={CX - EMBLEM_SIZE / 2}
                y={CY - EMBLEM_SIZE / 2 - 2}
                width={EMBLEM_SIZE}
                height={EMBLEM_SIZE}
                style={{
                  filter: "drop-shadow(0 0 36px rgba(212,175,90,0.48))",
                }}
              />

              {/* Stationary service nodes on the primary orbit */}
              {nodeStates.map((p) => {
                const item = services[p.index];
                const isActive = p.index === active;
                const labelY = p.y + (isActive ? 44 : 38);
                return (
                  <g
                    key={item.title}
                    id={`${uid}-node-${p.index}`}
                    role="option"
                    aria-selected={isActive}
                    tabIndex={0}
                    className="atlas-node cursor-pointer outline-none"
                    onClick={() => setActive(p.index)}
                    onMouseEnter={() => setActive(p.index)}
                    onFocus={() => setActive(p.index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActive(p.index);
                      }
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        setActive((i) => (i + 1) % services.length);
                      }
                      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        setActive(
                          (i) => (i - 1 + services.length) % services.length,
                        );
                      }
                    }}
                  >
                    {isActive ? (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="52"
                        fill={`url(#${uid}-burst)`}
                        filter={`url(#${uid}-glow)`}
                      />
                    ) : null}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? 30 : 22}
                      fill="none"
                      stroke={isActive ? GOLD.bright : GOLD.mid}
                      strokeOpacity={isActive ? 0.4 : 0.22}
                      strokeWidth="0.85"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? 24 : 16}
                      fill="#0c1410"
                      stroke={isActive ? GOLD.bright : GOLD.mid}
                      strokeOpacity={isActive ? 1 : 0.8}
                      strokeWidth={isActive ? 1.9 : 1.25}
                    />
                    <text
                      x={p.x}
                      y={p.y + 5}
                      textAnchor="middle"
                      fill={isActive ? GOLD.bright : GOLD.mid}
                      style={{
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        fontSize: isActive ? "16px" : "13px",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {romanNumerals[p.index]}
                    </text>
                    <rect
                      x={p.x - 64}
                      y={labelY - 11}
                      width="128"
                      height="16"
                      rx="2"
                      fill="#0a100c"
                      opacity="0.75"
                    />
                    <text
                      x={p.x}
                      y={labelY}
                      textAnchor="middle"
                      fill={isActive ? GOLD.bright : GOLD.mute}
                      style={{
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        fontSize: "12px",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.short}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            key={service.title}
            className="atlas-detail relative z-10 max-w-md justify-self-center px-2 lg:justify-self-start lg:pl-4 xl:pl-2"
            aria-live="polite"
          >
            <p
              className="font-serif text-[0.78rem] tracking-[0.34em] uppercase"
              style={{ color: GOLD.mid }}
            >
              {romanNumerals[active]}. {service.short}
            </p>
            <h3
              className="mt-3 font-serif text-[2.2rem] leading-[1.12] tracking-tight sm:text-[2.65rem]"
              style={{ color: GOLD.bright }}
            >
              {service.title}
            </h3>

            <div className="mt-5 flex items-center gap-3" aria-hidden>
              <span
                className="h-px flex-1"
                style={{ background: `${GOLD.mid}99` }}
              />
              <span className="text-[0.55rem]" style={{ color: GOLD.mid }}>
                ◆
              </span>
              <span
                className="h-px flex-1"
                style={{ background: `${GOLD.mid}99` }}
              />
            </div>

            <p
              className="mt-5 text-[1.02rem] leading-relaxed sm:text-[1.1rem]"
              style={{ color: GOLD.mute }}
            >
              {service.description}
            </p>

            <ul className="mt-7">
              {service.points.map((point, index) => (
                <li
                  key={point}
                  className="flex items-start gap-4 border-t py-3.5 first:border-t-0 first:pt-1"
                  style={{ borderColor: `${GOLD.mid}40` }}
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      borderColor: `${GOLD.mid}a6`,
                      color: GOLD.mid,
                    }}
                  >
                    <svg viewBox="0 0 56 56" className="h-5 w-5" aria-hidden>
                      {pointIcons[index % pointIcons.length]}
                    </svg>
                  </span>
                  <p
                    className="pt-2 text-[0.95rem] leading-snug"
                    style={{ color: GOLD.mute }}
                  >
                    {point}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pb-2 lg:mt-6">
          <div className="mx-auto flex max-w-xl items-center gap-3" aria-hidden>
            <span
              className="h-px flex-1"
              style={{ background: `${GOLD.mid}80` }}
            />
            <span className="text-[0.5rem]" style={{ color: GOLD.mid }}>
              ◆
            </span>
            <span
              className="h-px flex-1"
              style={{ background: `${GOLD.mid}80` }}
            />
          </div>
          <p
            className="mt-4 text-center font-serif text-sm italic tracking-wide sm:text-base"
            style={{ color: GOLD.mid }}
          >
            An atlas for intelligence. A compass for impact.
          </p>
        </div>
      </div>
    </section>
  );
}
