"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SuggestAnalysis } from "@reviewcheck/core";
import { CTAS } from "@reviewcheck/config";

const LEVEL_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "高リスク", cls: "bg-red-100 text-red-700" },
  medium: { label: "注意", cls: "bg-amber-100 text-amber-700" },
  low: { label: "弱", cls: "bg-slate-100 text-slate-600" },
};

/**
 * 「Google検索での見られ方」セクション。
 * 店名のサジェスト（実際に出る候補のみ）を取得し、ネガティブ候補があれば提示してサジェスト対策へ誘導。
 */
export function SuggestSection({
  storeName,
  storeQuery,
}: {
  storeName: string;
  storeQuery?: string;
}) {
  const [data, setData] = useState<SuggestAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetch(`/api/suggest?q=${encodeURIComponent(storeName)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: SuggestAnalysis) => {
        if (alive) setData(j);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [storeName]);

  if (failed) return null;

  const suggestHref = storeQuery
    ? `${CTAS.suggest.href}&store=${encodeURIComponent(storeQuery)}`
    : CTAS.suggest.href;
  const monitorHref = storeQuery
    ? `${CTAS.monitoring.href}&store=${encodeURIComponent(storeQuery)}`
    : CTAS.monitoring.href;

  const negatives = data?.negatives ?? [];
  const hasNegatives = negatives.length > 0;

  return (
    <section
      className={`overflow-hidden rounded-2xl border ${
        hasNegatives ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            🔍
          </span>
          <h2 className="text-lg font-bold text-slate-900">
            Google検索での見られ方（サジェスト）
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          検索窓に店名を入れたとき、Googleが自動表示する候補（オートコンプリート）です。
          来店前のお客様の多くが最初に目にします。
        </p>

        {loading ? (
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
            検索候補を確認しています…
          </div>
        ) : hasNegatives ? (
          <div className="mt-4">
            <p className="text-sm font-bold text-red-700">
              ⚠️ ネガティブな検索候補が{negatives.length}件見つかりました
            </p>
            <ul className="mt-2 space-y-2">
              {negatives.map((n, i) => {
                const badge = n.level ? LEVEL_BADGE[n.level] : null;
                return (
                  <li
                    key={`${n.text}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3"
                  >
                    <span className="min-w-0 truncate text-sm text-slate-800">
                      {n.text}
                    </span>
                    {badge ? (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              こうした候補は、口コミ以前の段階で来店をためらわせます。
              正当な方法（ポジティブな情報の発信・検索ボリュームの健全化）で、目立たなくする対策が可能です。
            </p>
            <div className="mt-4">
              <Link
                href={suggestHref}
                className="inline-flex items-center justify-center rounded-xl bg-cta px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-cta-strong"
              >
                {CTAS.suggest.label}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-bold text-emerald-700">
              ✅ 現在、ネガティブな検索候補は見つかりませんでした
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              良い状態です。ただしサジェストは、悪い口コミやネット上の話題で
              <strong className="text-slate-900">ある日突然</strong>
              ネガティブ候補が出ることがあります。月次モニタリングで、出た瞬間に気づける状態にしておくと安心です。
            </p>
            <div className="mt-4">
              <Link
                href={monitorHref}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                検索候補も月次モニタリングする
              </Link>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          ※
          表示はGoogleが実際に返した候補のみです。地域・端末・検索履歴により表示は変わります。候補の有無は時期によって変動します。
        </p>
      </div>
    </section>
  );
}
