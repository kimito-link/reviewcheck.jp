import type { DiagnosisResult } from "@reviewcheck/core";
import { ScoreMeter, ScoreBadge, StarRating, StatCompare } from "@reviewcheck/ui";
import { Disclaimer } from "./Disclaimer";
import { ConsultCtaGrid } from "./CtaGrid";
import { ShareReport } from "./ShareReport";

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  high: { label: "最優先", cls: "bg-red-100 text-red-700" },
  medium: { label: "優先", cls: "bg-amber-100 text-amber-700" },
  low: { label: "推奨", cls: "bg-slate-100 text-slate-600" },
};

const FACTOR_DOT: Record<string, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
  info: "bg-slate-400",
};

/** 診断結果の表示。/check と /report/[id] で共通利用。 */
export function ReportView({
  result,
  shareUrl,
}: {
  result: DiagnosisResult;
  shareUrl?: string;
}) {
  const { input, comparison, simulation } = result;
  const store = input.store;
  // デモ（架空のサンプル値）のときだけ注記。手入力の実数値には出さない。
  const isMock = store.source === "mock";

  return (
    <div className="space-y-8">
      {isMock ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong className="font-bold">デモ／参考値で表示中：</strong>
          現在 Google Places API
          が未接続のため、星評価・口コミ数はサンプル値です。正確な数値は、実際のGoogleマップの数値を入力するか、Places
          API接続後に反映されます。
        </div>
      ) : null}

      {/* スコアと店舗概要 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center">
            <ScoreMeter score={result.score} band={result.band} />
            <div className="mt-3">
              <ScoreBadge band={result.band} />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">診断対象</p>
            <p className="text-lg font-bold text-slate-900">
              {store.name || "店舗"}
            </p>
            {store.category || store.address ? (
              <p className="text-xs text-slate-500">
                {[store.category, store.address].filter(Boolean).join("｜")}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
              <div>
                <span className="text-xs text-slate-500">星評価</span>
                <div className="flex items-center gap-2">
                  <StarRating rating={store.rating} size="md" />
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">口コミ数</span>
                <p className="font-mono text-xl font-extrabold text-slate-900">
                  {store.reviewCount}
                  <span className="ml-0.5 text-xs font-medium text-slate-400">
                    件
                  </span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {result.summary}
            </p>
            {store.mapsUrl ? (
              <a
                href={store.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline"
              >
                Googleマップで開く →
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* 競合比較 */}
      {comparison ? (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">競合との比較</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCompare
              label="星評価"
              mine={store.rating.toFixed(1)}
              rivalAvg={comparison.avgRating.toFixed(1)}
              diff={comparison.ratingDiff}
            />
            <StatCompare
              label="口コミ数"
              mine={store.reviewCount}
              rivalAvg={comparison.avgReviewCount}
              diff={comparison.reviewCountDiff}
              unit="件"
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            比較した{comparison.total}店舗中、星評価は
            <strong className="text-slate-900">
              {" "}
              {comparison.ratingRank}位
            </strong>
            、口コミ数は
            <strong className="text-slate-900">
              {" "}
              {comparison.reviewCountRank}位
            </strong>
            です。
          </p>
        </section>
      ) : null}

      {/* あと何件で追いつけるか */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          あと何件で目標に近づける？
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          現在 星 {simulation.currentRating}・口コミ {simulation.currentReviewCount} 件 →
          目標 星 <strong className="text-slate-900">{simulation.targetRating}</strong>
          {simulation.targetBasis === "competitor"
            ? "（競合平均を目標に設定）"
            : simulation.targetBasis === "custom"
              ? "（指定の目標）"
              : "（推奨の目標値）"}
        </p>
        <ul className="mt-4 space-y-3">
          {simulation.scenarios.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-900">
                  {s.label}
                </span>
                <span className="shrink-0 font-mono text-base font-extrabold text-blue-700">
                  {s.reviewsNeeded == null
                    ? "到達困難"
                    : s.reviewsNeeded === 0
                      ? "達成済み"
                      : `あと約${s.reviewsNeeded}件`}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {s.note}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          ※ Googleの評価は丸め処理・反映タイミングがあるため、件数はあくまで目安です。
        </p>
      </section>

      {/* 選ばれやすさスコアの内訳 */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          選ばれやすさスコアの内訳
        </h2>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {result.factors.map((f) => (
            <li key={f.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-4">
              <div className="flex min-w-[12rem] items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${FACTOR_DOT[f.status]}`}
                />
                <span className="font-semibold text-slate-900">{f.title}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {f.max > 0 ? (
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {f.points} / {f.max} 点
                    </span>
                  ) : null}
                  {f.estimated ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                      推定値
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-slate-700">{f.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 改善ポイント */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">改善のポイント</h2>
        <ul className="space-y-3">
          {result.improvements.map((imp) => {
            const p = PRIORITY_LABEL[imp.priority];
            return (
              <li
                key={imp.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${p?.cls ?? ""}`}
                  >
                    {p?.label ?? ""}
                  </span>
                  <span className="font-bold text-slate-900">{imp.title}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {imp.detail}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {shareUrl ? <ShareReport url={shareUrl} /> : null}

      {/* 相談導線 */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-lg font-bold text-slate-900">
          診断後にできること・ご相談
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          口コミ改善・レビュー返信・MEO対策・悪評対策まで、Googleのポリシーに沿った正当な方法でサポートします。まずはお気軽にご相談ください。
        </p>
        <div className="mt-4">
          <ConsultCtaGrid />
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
