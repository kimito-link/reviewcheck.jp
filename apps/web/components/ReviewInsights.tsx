import type { ReviewAnalysis } from "@reviewcheck/core";

/**
 * マップ口コミの簡易分析の表示。
 * 代表口コミ（最大5件程度）から、好評点・改善余地・代表コメントを見せる。
 * 件数が少ないことを明示し、断定を避ける。
 */
export function ReviewInsights({ analysis }: { analysis: ReviewAnalysis }) {
  const total = analysis.count || 1;
  const pos = analysis.positiveCount;
  const neg = analysis.negativeCount;
  const neu = analysis.neutralCount;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">口コミの中身を分析</h2>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
          サンプル{analysis.count}件
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        実際に表示されている口コミから、評価されている点・改善の余地がありそうな点を抽出しました。
      </p>

      {/* ポジ/ネガ比率バー */}
      <div className="mt-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          {pos > 0 ? (
            <div
              className="bg-emerald-500"
              style={{ width: `${pct(pos)}%` }}
              aria-hidden
            />
          ) : null}
          {neu > 0 ? (
            <div
              className="bg-slate-300"
              style={{ width: `${pct(neu)}%` }}
              aria-hidden
            />
          ) : null}
          {neg > 0 ? (
            <div
              className="bg-red-400"
              style={{ width: `${pct(neg)}%` }}
              aria-hidden
            />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            高評価 {pos}件
          </span>
          {neu > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden />
              中立 {neu}件
            </span>
          ) : null}
          {neg > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden />
              低評価 {neg}件
            </span>
          ) : null}
        </div>
      </div>

      {/* 好評点／改善余地 */}
      {analysis.positiveAspects.length > 0 || analysis.concernAspects.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {analysis.positiveAspects.length > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800">
                よく評価されている点
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {analysis.positiveAspects.map((a) => (
                  <li
                    key={a}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {analysis.concernAspects.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">
                改善の余地がありそうな点
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {analysis.concernAspects.map((a) => (
                  <li
                    key={a}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 代表コメント */}
      {analysis.sampleHighlight || analysis.sampleConcern ? (
        <div className="mt-5 space-y-2">
          {analysis.sampleHighlight ? (
            <blockquote className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/60 p-3 text-sm text-slate-700">
              {analysis.sampleHighlight}
            </blockquote>
          ) : null}
          {analysis.sampleConcern ? (
            <blockquote className="rounded-xl border-l-4 border-amber-400 bg-amber-50/60 p-3 text-sm text-slate-700">
              {analysis.sampleConcern}
            </blockquote>
          ) : null}
        </div>
      ) : null}

      {/* 強いネガティブ語の注意喚起 */}
      {analysis.flaggedKeywords.length > 0 ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong className="font-bold">要注意：</strong>
          口コミ内に「{analysis.flaggedKeywords.slice(0, 3).join("・")}」
          といった強い表現が見られます。放置すると検討中のお客様の不安につながりやすいため、
          早めの返信・対応をおすすめします。
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">{analysis.note}</p>
    </section>
  );
}
