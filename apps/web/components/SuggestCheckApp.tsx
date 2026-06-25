"use client";

import { useState } from "react";
import Link from "next/link";
import type { SuggestAnalysis, AnalyzedSuggest } from "@reviewcheck/core";
import { CTAS } from "@reviewcheck/config";

const LEVEL_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "高リスク", cls: "bg-red-100 text-red-700" },
  medium: { label: "注意", cls: "bg-amber-100 text-amber-700" },
  low: { label: "弱", cls: "bg-slate-100 text-slate-600" },
};

const RISK_SUMMARY: Record<
  string,
  { title: string; cls: string; lead: string }
> = {
  high: {
    title: "高リスク：ネガティブな検索候補が出ています",
    cls: "border-red-200 bg-red-50",
    lead: "来店前のお客様が最初に目にする場所に、不安をあおる候補が表示されています。早めの対策をおすすめします。",
  },
  medium: {
    title: "注意：気になる検索候補が出ています",
    cls: "border-amber-200 bg-amber-50",
    lead: "印象を下げかねない候補が出ています。放置すると定着することがあるため、今のうちに対策を検討しましょう。",
  },
  low: {
    title: "軽微：わずかに気になる候補があります",
    cls: "border-slate-200 bg-white",
    lead: "今すぐの危険度は低めですが、増えていないか定期的な確認をおすすめします。",
  },
  safe: {
    title: "良好：ネガティブな検索候補は見つかりませんでした",
    cls: "border-emerald-200 bg-emerald-50",
    lead: "現在は良い状態です。ただしサジェストは、悪い口コミやネットの話題である日突然変わります。月次モニタリングで備えておくと安心です。",
  },
};

export function SuggestCheckApp({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<SuggestAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function run(q: string) {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const r = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("failed");
      const j = (await r.json()) as SuggestAnalysis;
      setData(j);
    } catch {
      setError(
        "検索候補を取得できませんでした。時間をおいて、もう一度お試しください。",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const negatives = data?.negatives ?? [];
  const hasNegatives = negatives.length > 0;
  const risk = data?.risk ?? "safe";
  const summary = RISK_SUMMARY[risk] ?? RISK_SUMMARY.safe!;
  const consultHref = query.trim()
    ? `${CTAS.suggest.href}&store=${encodeURIComponent(query.trim())}`
    : CTAS.suggest.href;

  return (
    <div>
      {/* 入力 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <label
          htmlFor="suggest-q"
          className="block text-sm font-bold text-slate-800"
        >
          店舗名・会社名・サービス名
        </label>
        <p className="mt-1 text-xs text-slate-500">
          検索窓に入れたときにGoogleが出す候補（オートコンプリート）を調べます。
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="suggest-q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例：◯◯クリニック / 株式会社△△"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "確認中…" : "検索候補を調べる"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          ※ 表示はGoogleが実際に返した候補のみです。地域・端末・検索履歴により変わります。
        </p>
      </form>

      {/* 結果 */}
      {loading ? (
        <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
          検索候補を確認しています…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      ) : searched && data ? (
        <div className="mt-6 space-y-5">
          {/* サマリー */}
          <section className={`overflow-hidden rounded-2xl border ${summary.cls}`}>
            <div className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                {hasNegatives
                  ? summary.title
                  : RISK_SUMMARY.safe!.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {hasNegatives ? summary.lead : RISK_SUMMARY.safe!.lead}
              </p>

              {hasNegatives ? (
                <ul className="mt-4 space-y-2">
                  {negatives.map((n: AnalyzedSuggest, i) => {
                    const badge = n.level ? LEVEL_BADGE[n.level] : null;
                    return (
                      <li
                        key={`${n.text}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3"
                      >
                        <span className="min-w-0 break-words text-sm text-slate-800">
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
              ) : null}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {hasNegatives ? (
                  <Link
                    href={consultHref}
                    className="inline-flex items-center justify-center rounded-xl bg-cta px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-cta-strong"
                  >
                    {CTAS.suggest.label}
                  </Link>
                ) : (
                  <Link
                    href={CTAS.monitoring.href}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    検索候補を月次モニタリングする
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* 取得した候補一覧（透明性のため全件表示） */}
          {data.suggestions.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h3 className="text-sm font-bold text-slate-900">
                実際に表示された検索候補（{data.suggestions.length}件）
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.suggestions.map((s, i) => (
                  <span
                    key={`${s.text}-${i}`}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      s.level
                        ? "bg-red-50 font-bold text-red-700 ring-1 ring-red-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {s.text}
                  </span>
                ))}
              </div>
            </section>
          ) : (
            <p className="text-sm text-slate-500">
              この語ではGoogleの検索候補が取得できませんでした。別名・店舗名＋地名でもお試しください。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
