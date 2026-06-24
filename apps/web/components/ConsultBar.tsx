"use client";

import { useEffect, useState } from "react";
import { LineCtaButton } from "./LineCtaButton";

/**
 * 画面下に常設する固定相談バー。
 * 少しスクロールしたら出現し、離脱前に必ずLINE相談へ到達させる。
 */
export function ConsultBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-700 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-6px_28px_rgba(0,0,0,0.45)] transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
      style={{ backgroundColor: "#0f1b2d" }}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-1">
        <LineCtaButton fullWidth className="min-h-11" text="口コミ・MEOをLINEで相談する" />
        <p className="text-center text-[11px] text-slate-300 sm:text-xs">
          簡易診断は無料／やらせ・口コミ購入は一切なし
        </p>
      </div>
    </div>
  );
}
