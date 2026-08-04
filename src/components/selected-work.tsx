"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { romanNumerals, selectedWork } from "@/data/site-content";

type SelectedWorkProps = {
  hideIntro?: boolean;
  /** Sit on a shared page background instead of painting its own forest fill */
  continuous?: boolean;
};

const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

type FlipBookHandle = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    getCurrentPageIndex: () => number;
  };
};

const BookPage = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; hard?: boolean }
>(function BookPage({ children, className = "", hard = false }, ref) {
  return (
    <div
      ref={ref}
      data-density={hard ? "hard" : "soft"}
      className={`book-page overflow-hidden ${className}`}
    >
      <div className="book-page-inner overflow-hidden">{children}</div>
    </div>
  );
});

export function SelectedWork({
  hideIntro = false,
  continuous = false,
}: SelectedWorkProps) {
  const bookRef = useRef<FlipBookHandle | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [dims, setDims] = useState({ width: 380, height: 520 });
  const [portrait, setPortrait] = useState(false);
  const [ready, setReady] = useState(false);

  const pageCount = 2 + selectedWork.length * 2;
  const singleLeaf = portrait || page === 0 || page >= pageCount - 1;

  const pages = useMemo(() => {
    const nodes: ReactNode[] = [];

    nodes.push(
      <BookPage key="cover" hard className="book-cover book-cover-art">
        <div className="flex h-full flex-col justify-between p-7 sm:p-9">
          <div className="book-cover-panel">
            <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-[#e0c078] uppercase">
              Phrenos.ai
            </p>
            <h3 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-[#f1e8d6] sm:text-[2.05rem]">
              AI Solutions
              <br />
              Portfolio
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#ebe2cf]">
              Five systems that turn slow, repetitive work into intelligence,
              with a human always in the loop.
            </p>
          </div>
          <div className="book-cover-footer flex items-end justify-between gap-4">
            <span className="font-serif text-5xl text-[#d4af5a]">Φ</span>
            <p className="text-[0.65rem] tracking-[0.2em] text-[#e0c078] uppercase">
              Volume I
            </p>
          </div>
        </div>
      </BookPage>,
    );

    selectedWork.forEach((item, index) => {
      nodes.push(
        <BookPage key={`${item.title}-plate`} className="book-plate-page">
          <div className="relative h-full w-full overflow-hidden">
            <div
              className="book-plate-art absolute inset-0"
              style={{
                backgroundImage: `url(${item.image}?v=6)`,
              }}
              role="img"
              aria-label={item.title}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,10,0.2)_0%,transparent_24%,transparent_70%,rgba(8,12,10,0.45)_100%)]"
              aria-hidden
            />
            <div className="relative z-[1] flex h-full flex-col justify-between p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="font-serif text-4xl text-[#e0c078]/90 sm:text-5xl">
                  {romanNumerals[index]}
                </p>
                <p className="text-[0.6rem] font-semibold tracking-[0.24em] text-[#e0c078] uppercase">
                  {item.tag}
                </p>
              </div>
              <p className="text-[0.65rem] tracking-[0.2em] text-[#f1e8d6]/9 uppercase">
                {item.title}
              </p>
            </div>
          </div>
        </BookPage>,
      );

      nodes.push(
        <BookPage key={`${item.title}-story`}>
          <div className="flex h-full flex-col p-6 sm:p-8">
            <p className="text-[0.6rem] font-semibold tracking-[0.24em] text-[#8a6a2a] uppercase">
              {String(index + 1).padStart(2, "0")} · {item.tag}
            </p>
            <h3 className="mt-3 font-serif text-[1.35rem] leading-snug tracking-tight text-[#1a2218] sm:text-[1.5rem]">
              {item.headline}
            </h3>

            <div className="mt-5 grid gap-4">
              <div>
                <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-[#8a6a2a] uppercase">
                  The problem
                </p>
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[#3f4b41]">
                  {item.problem}
                </p>
              </div>
              <div>
                <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-[#8a6a2a] uppercase">
                  What we built
                </p>
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[#3f4b41]">
                  {item.solution}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-sm bg-[#101c14] px-3.5 py-3">
              <p className="text-center text-[0.72rem] leading-snug tracking-wide">
                <span className="text-[#f1e8d6]/85">{item.transformation.from}</span>
                <span className="mx-2 text-[#d4af5a]">→</span>
                <span className="font-semibold text-[#e0c078]">
                  {item.transformation.to}
                </span>
              </p>
            </div>

            <div className="mt-auto pt-5">
              <p className="text-center text-[0.58rem] font-semibold tracking-[0.22em] text-[#8a6a2a] uppercase">
                How it works
              </p>
              <div className="mt-3 flex items-start justify-between gap-1">
                {item.steps.map((step, stepIndex) => (
                  <div
                    key={step}
                    className="flex min-w-0 flex-1 flex-col items-center text-center"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#b88b36]/45 text-[0.65rem] text-[#8a6a2a]">
                      {stepIndex + 1}
                    </span>
                    <p className="mt-2 text-[0.58rem] leading-snug text-[#4a564c]">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BookPage>,
      );
    });

    nodes.push(
      <BookPage key="closing" hard className="book-cover">
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden p-10 text-center">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,139,54,0.18),transparent_55%)]"
            aria-hidden
          />
          <p className="relative text-[0.65rem] font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">
            End of volume
          </p>
          <p className="relative mt-5 font-serif text-3xl tracking-tight text-[#f1e8d6]">
            The next system starts with a conversation.
          </p>
          <p className="relative mt-8 font-serif text-4xl text-[#d4af5a]/70">Φ</p>
        </div>
      </BookPage>,
    );

    return nodes;
  }, []);

  useEffect(() => {
    const measure = () => {
      const shell = shellRef.current;
      if (!shell) return;
      const available = shell.clientWidth;
      const isPortrait = available < 760;
      setPortrait(isPortrait);

      // Keep the full book on screen: height is capped to the viewport, then width follows.
      const maxHeight = Math.max(
        340,
        Math.min(Math.round(window.innerHeight * 0.58), 560),
      );

      if (isPortrait) {
        let width = Math.min(available - 24, 360);
        let height = Math.round(width * 1.42);
        if (height > maxHeight) {
          height = maxHeight;
          width = Math.round(height / 1.42);
        }
        setDims({ width, height });
      } else {
        let width = Math.min(Math.floor((available - 48) / 2), 420);
        let height = Math.round(width * 1.32);
        if (height > maxHeight) {
          height = maxHeight;
          width = Math.round(height / 1.32);
        }
        setDims({ width, height });
      }
      setReady(true);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const bookKey = `${portrait ? "p" : "l"}-${dims.width}x${dims.height}`;

  const flipNext = useCallback(() => {
    bookRef.current?.pageFlip()?.flipNext();
  }, []);

  const flipPrev = useCallback(() => {
    bookRef.current?.pageFlip()?.flipPrev();
  }, []);

  // page-flip always lays out a 2-page landscape stage; shrinking the shell to one
  // page clips the cover. Keep the full stage width and shift closed covers to center.
  const spreadWidth = portrait ? dims.width : dims.width * 2;
  const coverShift =
    !portrait && page === 0
      ? -dims.width / 2
      : !portrait && page >= pageCount - 1
        ? dims.width / 2
        : 0;

  return (
    <section
      id="work"
      className={`relative z-10 overflow-x-clip pb-24 lg:pb-28 ${
        continuous
          ? "mt-0 bg-transparent pt-2 sm:pt-4"
          : hideIntro
            ? "mt-0 bg-forest pt-8 sm:pt-10 lg:-mt-8 lg:pt-6"
            : "bg-forest pt-8 lg:pt-10"
      }`}
    >
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {hideIntro ? (
          <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">
                Case systems
              </p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight text-ivory sm:text-4xl">
                Hold the book. Turn the page.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-sage sm:text-right">
              Drag a corner to curl the paper. Turned pages stay in your left
              hand as the next leaf opens on the right.
            </p>
          </div>
        ) : (
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Selected work
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-ivory">
              Systems that turn intelligence into action.
            </h2>
          </div>
        )}

        <div className="mb-7 flex items-center justify-between gap-4">
          <p className="font-serif text-sm tracking-[0.18em] text-[#e0c078]">
            Leaf {Math.min(page + 1, pageCount)}{" "}
            <span className="text-ivory/35">/</span> {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              onClick={flipPrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af5a]/50 text-[#e0c078] transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10"
            >
              <span aria-hidden>←</span>
            </button>
            <button
              type="button"
              aria-label="Next page"
              onClick={flipNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af5a]/50 text-[#e0c078] transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10"
            >
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={shellRef}
        className="relative mx-auto w-full max-w-6xl px-3 sm:px-6"
      >
        {ready ? (
          <div className="book-stage mx-auto flex justify-center overflow-visible">
            <div
              className={`book-block${singleLeaf ? " is-single" : ""}`}
              style={{
                width: spreadWidth,
                transform: coverShift ? `translateX(${coverShift}px)` : undefined,
              }}
            >
              <div className="book-block-shadow" aria-hidden />
              <HTMLFlipBook
                key={bookKey}
                ref={bookRef}
                width={dims.width}
                height={dims.height}
                size="fixed"
                minWidth={240}
                maxWidth={420}
                minHeight={320}
                maxHeight={620}
                drawShadow
                flippingTime={1100}
                usePortrait={portrait}
                startPage={0}
                autoSize={false}
                maxShadowOpacity={0.75}
                showCover
                mobileScrollSupport
                clickEventForward={false}
                useMouseEvents
                swipeDistance={20}
                showPageCorners
                disableFlipByClick={false}
                className="work-flipbook"
                style={{}}
                startZIndex={1}
                onFlip={(e: { data: number }) => setPage(e.data)}
              >
                {pages}
              </HTMLFlipBook>
            </div>
          </div>
        ) : (
          <div className="flex h-[28rem] w-full items-center justify-center text-sage">
            Opening the book…
          </div>
        )}
      </div>
    </section>
  );
}
