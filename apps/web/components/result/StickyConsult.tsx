"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** 測る前の余白。ボタンの枠と、端末下端の安全領域を足した高さ。 */
export const STICKY_CONSULT_FALLBACK =
  "calc(7.5rem + env(safe-area-inset-bottom))";

export function stickyConsultPadding(): { paddingBottom: string } {
  return {
    paddingBottom: `var(--sticky-consult-offset, ${STICKY_CONSULT_FALLBACK})`,
  };
}

/**
 * 画面下の相談ボタン。
 * 高さは本文末尾の余白にそのまま使う（安全領域を含む実測）。
 * 出典や表がこの帯にかかるあいだは、ボタンを表示しない。
 */
export function StickyConsult({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(false);

  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const root = document.documentElement;

    const applyHeight = () => {
      // ボタンの枠に、文字が触れない分の余白を足す。安全領域は枠の中に含まれる。
      const height = `${bar.offsetHeight + 16}px`;
      root.style.setProperty("--sticky-consult-offset", height);
      root.style.scrollPaddingBottom = height;
    };
    applyHeight();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(applyHeight) : null;
    observer?.observe(bar);

    const overlapsProtected = () => {
      const barRect = bar.getBoundingClientRect();
      for (const node of document.querySelectorAll("[data-sticky-protect]")) {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.bottom > barRect.top + 1 && rect.top < barRect.bottom - 1) {
          return true;
        }
      }
      return false;
    };
    const tick = () => setHeld(overlapsProtected());
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      root.style.removeProperty("--sticky-consult-offset");
      root.style.scrollPaddingBottom = "";
    };
  }, []);

  return (
    <div
      ref={ref}
      data-sticky-consult=""
      aria-hidden={held}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
        held ? "invisible" : ""
      }`}
    >
      <div className={held ? "pointer-events-none" : "pointer-events-auto"}>
        {children}
      </div>
    </div>
  );
}
