"use client";

import { useState } from "react";
import Link from "next/link";
import type { SuggestAnalysis, AnalyzedSuggest } from "@reviewcheck/core";
import { CTAS } from "@reviewcheck/config";
import { DiagnosisProgressNote } from "./result/DiagnosisProgressNote";
import { NextDiagnoses } from "./result/NextDiagnoses";
import { ResultHook, ResultMethodDetails, UnconfirmedList } from "./result/ResultReading";

const LEVEL_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "強い語", cls: "bg-red-100 text-red-950" },
  medium: { label: "気になる語", cls: "bg-amber-100 text-amber-950" },
  low: { label: "弱い語", cls: "bg-slate-100 text-slate-800" },
};

const STORY: Record<string, { title: string; lead: string; gain: string; loss: string }> = {
  high: {
    title: "ネガティブな検索候補が出ています",
    lead: "取得できた候補に、次の語が出ています。",
    gain: "その語の材料が減ると、店名から続く候補も入れ替わります。",
    loss: "同じ話題が残っているあいだは、店名を入れた候補にこの語が出ます。",
  },
  medium: {
    title: "気になる検索候補が出ています",
    lead: "取得できた候補に、印象を下げうる語があります。",
    gain: "その語が候補から外れると、店名のあとに続く語が変わります。",
    loss: "語が残っているあいだは、検索候補に表示されます。",
  },
  low: {
    title: "気になる検索候補が少しあります",
    lead: "取得できた候補に、件数は少ないものの気になる語があります。",
    gain: "増えていなければ、候補の大半はいまのままです。",
    loss: "件数が増えると、店名の候補に占める割合が変わります。",
  },
  safe: {
    title: "ネガティブな検索候補は見つかりませんでした",
    lead: "取得できた候補に、ネガティブな語はありませんでした。",
    gain: "いまの候補は、店名から悪い語へつながっていません。",
    loss: "口コミや話題が変わると、候補は入れ替わります。今月の並びが来月も同じとは限りません。",
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
  const risk = data?.risk ?? "unknown";
  const unverified = !hasNegatives && risk !== "safe";
  const story = hasNegatives
    ? (STORY[risk] ?? STORY.high!)
    : unverified
      ? {
          title: "取得できた検索候補",
          lead:
            data && data.suggestions.length > 0
              ? "取得できた候補は次のとおりです。良し悪しの判定はしていません。"
              : "判定に使える検索候補は、今回返ってきませんでした。",
          gain: "取得できた候補が、いま残せる記録です。",
          loss: "取得が完了していない分は、この一覧に含まれていません。",
        }
      : STORY.safe!;
  const consultHref = query.trim()
    ? `${CTAS.suggest.href}&store=${encodeURIComponent(query.trim())}`
    : CTAS.suggest.href;
  const primaryHref = unverified ? null : hasNegatives ? consultHref : CTAS.monitoring.href;
  const primaryLabel = hasNegatives
    ? CTAS.suggest.label
    : "検索候補を月次モニタリングする";
  const missed =
    data && data.status !== "ok"
      ? ["検索候補の一部：取得が完了していません。判定は取得できた候補についてだけです。"]
      : [];

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <label
          htmlFor="suggest-q"
          className="block text-base font-bold text-slate-900"
        >
          店舗名・会社名・サービス名
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="suggest-q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例：◯◯クリニック / 株式会社△△"
            className="min-w-0 flex-1 rounded-xl border border-slate-500 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-blue-800 px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "確認中…" : "検索候補を調べる"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="mt-6 flex items-center gap-3 text-base text-slate-800">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          検索候補を取得しています…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-base text-amber-950">
          {error}
        </div>
      ) : searched && data ? (
        <div className="mt-6 space-y-5">
          <section
            data-result-section="result"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              {story.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-slate-800">{story.lead}</p>
            {data.suggestions.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {data.suggestions.map((item: AnalyzedSuggest, i) => {
                  const badge = item.level ? LEVEL_BADGE[item.level] : null;
                  return (
                    <li
                      key={`${item.text}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <span className="min-w-0 break-words text-base text-slate-900">
                        {item.text}
                      </span>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-base font-bold ${
                          badge ? badge.cls : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {badge ? badge.label : "その他"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : unverified ? null : (
              <p className="mt-4 text-base text-slate-800">
                この語では、Googleの検索候補は表示されませんでした。別名や、店舗名に地名を足した語でも調べられます。
              </p>
            )}
            <div className="mt-4">
              <ResultHook>この候補を減らしたときと、残したときの違いは、次に続きます。</ResultHook>
            </div>
          </section>

          <section
            data-result-section="gains"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              直すと得られること
            </h2>
            <p className="mt-2 text-base leading-relaxed text-slate-800">{story.gain}</p>
            <div className="mt-4">
              <ResultHook>このまま候補が残る場合は、次のとおりです。</ResultHook>
            </div>
          </section>

          <section
            data-result-section="losses"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              このままだと失うこと
            </h2>
            <p className="mt-2 text-base leading-relaxed text-slate-800">{story.loss}</p>
            {primaryHref ? (
              <div className="mt-4">
                <ResultHook>次の一歩はひとつです。</ResultHook>
              </div>
            ) : null}
          </section>

          {primaryHref ? (
            <section
              data-result-section="cta"
              data-suggest-cta=""
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-xl bg-blue-800 px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-900"
              >
                {primaryLabel}
              </Link>
            </section>
          ) : null}

          {primaryHref ? (
            <section
              data-result-section="cta-repeat"
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <p className="text-base leading-relaxed text-slate-800">
                読み終えたところの次の一歩です。
              </p>
              <Link
                href={primaryHref}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-800 px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-900"
              >
                {primaryLabel}
              </Link>
            </section>
          ) : null}

          <DiagnosisProgressNote appId="suggest-check" className="text-left" />
          <NextDiagnoses context={{ surface: "suggest", risk }} />

          <UnconfirmedList lines={missed} note="上の候補一覧には入れていません。" />

          <ResultMethodDetails>
            <p>
              検索窓に店名を入れたとき、Googleが返す候補だけを見ています。表示は実際に返った語だけです。
            </p>
            <p>地域・端末・検索履歴で変わります。候補の有無は時期によっても動きます。</p>
          </ResultMethodDetails>
        </div>
      ) : null}
    </div>
  );
}
