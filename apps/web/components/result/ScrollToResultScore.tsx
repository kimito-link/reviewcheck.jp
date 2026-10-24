"use client";

import { useEffect } from "react";

/** 結果が出たら、点数が見える位置までスクロールする。 */
export function ScrollToResultScore() {
  useEffect(() => {
    const run = () => {
      const el = document.getElementById("result-score");
      if (!el || typeof el.scrollIntoView !== "function") return;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches;
      el.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    };
    const id = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(id);
  }, []);
  return null;
}
