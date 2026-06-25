"use client";

import { useState } from "react";

/**
 * 競合に後れている分の「機会損失（目安）」を、客単価と月間来店数から概算する。
 * ※ あくまで目安。係数・前提はすべて「計算根拠」で開示し、誇張表示を避ける。
 */
export function OpportunityLoss({
  storeRating,
  competitorAvgRating,
  reviewBehind,
  avgReviewCount,
}: {
  storeRating: number;
  competitorAvgRating: number;
  reviewBehind: number;
  avgReviewCount: number;
}) {
  const [spend, setSpend] = useState("4000");
  const [monthly, setMonthly] = useState("150");

  const avgSpend = Math.max(0, Number(spend) || 0);
  const monthlyCustomers = Math.max(0, Number(monthly) || 0);

  // 取りこぼし率（目安）：星評価差と口コミ数差から概算。上限25%でクリップ。
  const ratingGap = Math.max(0, competitorAvgRating - storeRating);
  const reviewGapRatio =
    avgReviewCount > 0 ? Math.min(1, reviewBehind / avgReviewCount) : 0;
  const lostRate = Math.min(
    0.25,
    ratingGap * 0.08 + reviewGapRatio * 0.08,
  );

  const lostCustomers = monthlyCustomers * lostRate;
  const monthlyLoss = Math.round(avgSpend * lostCustomers);
  const yearlyLoss = monthlyLoss * 12;

  const yen = (n: number) => `約${n.toLocaleString("ja-JP")}円`;

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50">
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">
          競合との差は、毎月いくら分？
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          客単価と月間の来店数を入れると、競合平均に追いついた場合に期待できる
          <strong className="text-slate-900">上乗せ（=今の機会損失の目安）</strong>
          をざっくり試算します。
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              客単価（円）
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              月間の来店数（だいたい）
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">月間の機会損失（目安）</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-600">
              {yen(monthlyLoss)}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">年間にすると（目安）</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-600">
              {yen(yearlyLoss)}
            </p>
          </div>
        </div>

        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-800">
            計算の根拠を見る
          </summary>
          <div className="mt-2 space-y-1 leading-relaxed">
            <p>
              月間の機会損失（目安）= 客単価 × 月間来店数 × 取りこぼし率
            </p>
            <p>
              取りこぼし率（目安・上限25%）= 星評価の差 × 8% ＋ 口コミ数の不足割合 ×
              8%
            </p>
            <p>
              この試算では 星評価の差 {ratingGap.toFixed(1)}・口コミ数の不足
              {reviewBehind}件（競合平均 {avgReviewCount}件 比）から、
              取りこぼし率を約{(lostRate * 100).toFixed(1)}%、
              取りこぼし客数を月 約{lostCustomers.toFixed(1)}人と仮定しています。
            </p>
            <p className="text-slate-500">
              ※
              実際の集客は立地・業種・季節・広告など多くの要因で変わります。本試算はあくまで概算の目安で、効果を保証するものではありません。
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
