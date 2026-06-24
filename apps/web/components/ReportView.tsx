import type { DiagnosisResult } from "@reviewcheck/core";
import Link from "next/link";
import { CTAS } from "@reviewcheck/config";
import { ScoreMeter, ScoreBadge, StarRating, StatCompare } from "@reviewcheck/ui";
import { Disclaimer } from "./Disclaimer";
import { ConsultCtaGrid } from "./CtaGrid";
import { ShareReport } from "./ShareReport";
import { OpportunityLoss } from "./OpportunityLoss";
import { StickyConsultCta } from "./StickyConsultCta";

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

/** 「あと何件」を行動計画に翻訳するときの想定ペース（件/月） */
const REVIEWS_PER_MONTH = 5;

/** 必要件数を「毎月N件ペースなら約◯ヶ月」に変換 */
function monthsToReach(reviewsNeeded: number): number {
  return Math.max(1, Math.ceil(reviewsNeeded / REVIEWS_PER_MONTH));
}

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
  const competitors = input.competitors ?? [];
  // デモ（架空のサンプル値）のときだけ注記。手入力の実数値には出さない。
  const isMock = store.source === "mock";
  // 競合がすべて placeId を持つ＝Places から自動検出されたもの
  const autoCompetitors =
    competitors.length > 0 && competitors.every((c) => Boolean(c.placeId));

  // 主要シナリオ（星5の口コミで埋める想定）＝「あと何件」の代表値
  const primaryScenario =
    simulation.scenarios.find((s) => s.newReviewStar === 5) ??
    simulation.scenarios.find((s) => s.reviewsNeeded != null) ??
    null;
  const primaryNeeded =
    primaryScenario && primaryScenario.reviewsNeeded != null
      ? primaryScenario.reviewsNeeded
      : null;

  // 競合に後れを取っているか（痛み→希望コピーの出し分け）
  const reviewBehind =
    comparison && comparison.reviewCountDiff < 0
      ? -comparison.reviewCountDiff
      : 0;
  const ratingBehind =
    comparison && comparison.ratingDiff < 0 ? -comparison.ratingDiff : 0;
  // mock は明示的なデモ体験時のみ発生する（実店舗の自動取得失敗時は手入力を促す）ため、
  // 競合に後れているときは痛み→希望をデモでも表示してよい。
  const showPainHope = comparison != null && reviewBehind > 0;

  return (
    <div className="space-y-8 pb-24">
      {isMock ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong className="font-bold">これはサンプル（デモ）です：</strong>
          結果の見え方を体験いただくための架空の店舗・数値です。あなたのお店を診断するには、上の入力欄に店舗名またはGoogleマップURLを入れて「無料で診断する」を押してください。
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
            {comparison ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-medium text-blue-700">
                  周辺{comparison.total}店中
                </span>
                <span className="text-sm font-extrabold text-blue-800">
                  口コミ数 第{comparison.reviewCountRank}位
                </span>
                <span className="text-xs font-medium text-blue-600">
                  ／ 星評価 第{comparison.ratingRank}位
                </span>
              </div>
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

      {/* 痛み→希望：後れているときだけ、危機感とすぐの解決策をワンセットで */}
      {showPainHope ? (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
          <div className="border-b border-amber-200 bg-amber-100/60 p-4">
            <p className="flex items-start gap-2 text-sm font-bold text-amber-900">
              <span aria-hidden>⚠️</span>
              <span>
                競合平均より口コミが{reviewBehind}件少なく
                {ratingBehind > 0
                  ? `、星評価も${ratingBehind.toFixed(1)}ポイント低い`
                  : ""}
                状態です。検討中のお客様に「選ばれにくい」可能性があります。
              </span>
            </p>
          </div>
          <div className="p-4">
            <p className="flex items-start gap-2 text-sm font-bold text-emerald-800">
              <span aria-hidden>✅</span>
              <span>
                でも、追いつけます。
                {primaryNeeded != null && primaryNeeded > 0 ? (
                  <>
                    毎月{REVIEWS_PER_MONTH}件ペースで高評価の口コミを増やせば、
                    <strong className="text-emerald-900">
                      約{monthsToReach(primaryNeeded)}ヶ月
                    </strong>
                    で競合平均に届く計算です。
                  </>
                ) : (
                  <>今の強みを活かせば、競合との差はまだ十分に縮められます。</>
                )}
              </span>
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-emerald-700">
              まずは最初の1件から。下の「あと何件で追いつける？」と「改善のポイント」に、具体的な進め方をまとめています。
            </p>
          </div>
        </section>
      ) : null}

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

          {competitors.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  比較した競合店舗
                </h3>
                {autoCompetitors ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    自動検出
                  </span>
                ) : null}
              </div>
              <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {competitors.map((c, i) => (
                  <li
                    key={c.placeId ?? `${c.name}-${i}`}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {c.mapsUrl ? (
                          <a
                            href={c.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 hover:underline"
                          >
                            {c.name || `競合${i + 1}`}
                          </a>
                        ) : (
                          (c.name ?? `競合${i + 1}`)
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="flex items-center gap-1 text-sm">
                        <span className="text-amber-500">★</span>
                        <span className="font-bold text-slate-900">
                          {c.rating.toFixed(1)}
                        </span>
                      </span>
                      <span className="font-mono text-sm text-slate-600">
                        {c.reviewCount}
                        <span className="ml-0.5 text-xs text-slate-400">件</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {autoCompetitors ? (
                <p className="mt-2 text-xs text-slate-400">
                  ※
                  周辺の同業種から口コミ数の多い順に自動抽出した目安です。対象は手動でも調整できます。
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 機会損失の金額目安（競合に後れているときのみ） */}
      {showPainHope && comparison ? (
        <OpportunityLoss
          storeRating={store.rating}
          competitorAvgRating={comparison.avgRating}
          reviewBehind={reviewBehind}
          avgReviewCount={comparison.avgReviewCount}
        />
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
              {s.reviewsNeeded != null && s.reviewsNeeded > 0 ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                  <span aria-hidden>📅</span>
                  毎月{REVIEWS_PER_MONTH}件のペースなら、約
                  <strong className="font-extrabold">
                    {monthsToReach(s.reviewsNeeded)}ヶ月
                  </strong>
                  で到達
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          ※ Googleの評価は丸め処理・反映タイミングがあるため、件数・期間はあくまで目安です。
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

      {/* 月次モニタリング（サブスク）誘導：競合は毎月動く＝放置リスクを継続価値に変える */}
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
              継続プラン
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              競合は毎月、口コミを増やしています
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            今日の診断は「ある一日のスナップショット」です。競合の口コミ・星評価・順位は毎月動きます。
            <strong className="text-slate-900">
              月次モニタリング
            </strong>
            なら、毎月あなたと競合の変化を自動でレポートし、抜かれそうなときにお知らせ。
            「気づいたら差が開いていた」を防ぎます。
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600" aria-hidden>
                ✓
              </span>
              毎月の順位・口コミ数・星評価の推移レポート
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600" aria-hidden>
                ✓
              </span>
              競合に抜かれそうなときのアラート
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600" aria-hidden>
                ✓
              </span>
              その月にやるべき改善アクションの提案
            </li>
          </ul>
          <div className="mt-4">
            <Link
              href={CTAS.monitoring.href}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {CTAS.monitoring.label}
            </Link>
          </div>
        </div>
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

      <StickyConsultCta />
    </div>
  );
}
