"use client";

import { useState } from "react";
import Link from "next/link";
import { CTAS } from "@reviewcheck/config";

/**
 * 結果画面で常時追従する相談CTA。離脱直前のひと押し用。
 * マイクロコンバージョン（重い「相談」ではなく「15分の無料相談」）で心理的ハードルを下げる。
 */
export function StickyConsultCta() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            この差を埋める具体策、知りたいですか？
          </p>
          <p className="truncate text-xs text-slate-500">
            まずは15分の無料相談。売り込みはしません。
          </p>
        </div>
        <Link
          href={CTAS.freeConsult.href}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cta px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cta-strong"
        >
          無料で相談
        </Link>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="閉じる"
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}
