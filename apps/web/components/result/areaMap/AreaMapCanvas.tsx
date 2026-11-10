"use client";

import { useEffect, useRef, useState } from "react";
import type { AreaMapPin } from "@reviewcheck/core/areaMap";

const FRAME =
  "relative z-0 h-64 w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100 sm:h-80";

type MapPhase = "pending" | "ready" | "fallback";

/**
 * 地図は高さだけ先に確保し、画面に入ってからプロバイダを読む。
 * プロバイダ・タイル・JS のどれが落ちても、この枠の高さは変えない。
 */
export function AreaMapCanvas({ pins }: { pins: AreaMapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const [phase, setPhase] = useState<MapPhase>("pending");
  const pinKey = pins
    .map((pin) => `${pin.id}:${pin.lat}:${pin.lng}:${pin.mark}`)
    .join("|");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pinsRef.current.length < 2) return;

    let cancelled = false;
    let cleanup = () => {};
    let observer: IntersectionObserver | undefined;

    const fail = () => {
      if (!cancelled) setPhase("fallback");
    };

    const mount = () => {
      void (async () => {
        try {
          if (document.documentElement.dataset.areaMap === "fallback") {
            throw new Error("map provider unavailable");
          }
          const { osmLeafletProvider } = await import("./osmLeafletProvider");
          if (cancelled) return;
          cleanup = await osmLeafletProvider.mount(container, pinsRef.current);
          if (cancelled) {
            cleanup();
            return;
          }
          setPhase("ready");
        } catch {
          fail();
        }
      })();
    };

    if (document.documentElement.dataset.areaMap === "fallback") {
      fail();
      return () => {
        cancelled = true;
      };
    }

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        cancelled = true;
      };
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        mount();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(container);

    return () => {
      cancelled = true;
      observer?.disconnect();
      cleanup();
    };
  }, [pinKey]);

  return (
    <div
      className={FRAME}
      data-area-map-frame
      data-area-map-state={phase}
      aria-label="このエリアの地図"
    >
      {phase === "fallback" ? (
        <p
          role="status"
          className="flex h-full items-center justify-center px-4 text-center text-base leading-relaxed text-slate-900"
        >
          地図を表示できませんでした。同じお店は、この下の一覧で比べられます。
        </p>
      ) : (
        <>
          <div
            ref={containerRef}
            className="absolute inset-0"
            data-area-map-canvas
          />
          {phase === "pending" ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-base leading-relaxed text-slate-800">
              地図はこの欄が見えたときに読み込みます。表示できないときは、下の一覧が正です。
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
