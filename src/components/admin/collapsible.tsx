"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";

/**
 * "Collapse all" / "Expand all" signal. Each fold compares its own last toggle with the latest
 * signal, so no effects are needed and a fold the user opens afterwards keeps its own choice.
 */
export type CollapseSignal = { open: boolean; tick: number };

export const CollapseAllContext = createContext<CollapseSignal>({ open: true, tick: 0 });

const STORAGE_PREFIX = "phrenos-open:";

function readStored(storageKey: string | null): boolean | null {
  if (!storageKey) return null;
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    return value === null ? null : value !== "0";
  } catch {
    return null;
  }
}

/** Open or closed state for a fold. A storageKey remembers the choice in this browser. */
export function useFold(storageKey: string | null, defaultOpen: boolean) {
  const all = useContext(CollapseAllContext);
  const [own, setOwn] = useState(() => ({
    open: all.tick > 0 ? all.open : (readStored(storageKey) ?? defaultOpen),
    tick: all.tick,
  }));

  const open = own.tick >= all.tick ? own.open : all.open;

  function toggle() {
    const next = !open;
    setOwn({ open: next, tick: all.tick });
    if (storageKey) {
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, next ? "1" : "0");
      } catch {
        // Remembering the choice is a convenience only.
      }
    }
  }

  return { open, toggle };
}

export function FoldChevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-1 shrink-0 text-lg leading-none text-[#e0c078] transition-transform ${open ? "rotate-180" : ""}`}
    >
      ▾
    </span>
  );
}

type CollapsibleProps = {
  title: ReactNode;
  /** One line shown under the title, so a closed section still says what is inside. */
  summary?: ReactNode;
  /** Buttons that sit beside the fold button (outside it, so they stay clickable). */
  actions?: ReactNode;
  /** Remembers open or closed in this browser. Leave out for folds that come and go with the data. */
  storageKey?: string;
  defaultOpen?: boolean;
  /** Wrapper classes, e.g. the shared panel look. */
  className?: string;
  titleClassName?: string;
  summaryClassName?: string;
  children: ReactNode;
};

const EYEBROW =
  "block text-[10px] font-semibold tracking-[0.22em] text-[#a9b0a3] uppercase";

export function Collapsible({
  title,
  summary,
  actions,
  storageKey,
  defaultOpen = true,
  className = "",
  titleClassName = EYEBROW,
  summaryClassName = "mt-1 block text-sm text-[#f1e8d6]",
  children,
}: CollapsibleProps) {
  const bodyId = useId();
  const { open, toggle } = useFold(storageKey ?? null, defaultOpen);

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start justify-between gap-4 text-left"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
        >
          <span className="min-w-0">
            <span className={titleClassName}>{title}</span>
            {summary ? <span className={summaryClassName}>{summary}</span> : null}
          </span>
          <FoldChevron open={open} />
        </button>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div id={bodyId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
