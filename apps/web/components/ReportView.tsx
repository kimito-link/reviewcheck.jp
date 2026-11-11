import type { DiagnosisResult } from "@reviewcheck/core";
import { FINDING_CARD_TEXTS, staleRuleVersionNote } from "@reviewcheck/core";
import { buildAreaComparison } from "@reviewcheck/core/areaMap";
import { RESULT_ESTIMATE_SENTENCE } from "@reviewcheck/config";
import { ScoreMeter, ScoreBadge, StatCompare } from "@reviewcheck/ui";
import { Disclaimer } from "./Disclaimer";
import { ShareReport } from "./ShareReport";
import { FindingCard } from "./FindingCard";
import {
  buildCountSummary,
  collectUnconfirmedLines,
  formatDiagnosedAtJst,
  isActionableImprovement,
  isConfirmedFactor,
  leftAloneParagraphs,
} from "@/lib/resultCopy";
import type { CohortPublic } from "@/lib/cohort/public";
import { AreaCompare } from "./result/AreaCompare";
import { GoogleMapsCredit } from "./result/GoogleMapsCredit";
import { CohortCompareNote } from "./result/CohortCompareNote";
import { DiagnosisPerks } from "./result/DiagnosisPerks";
import { DiagnosisProgressNote } from "./result/DiagnosisProgressNote";
import { NextDiagnoses } from "./result/NextDiagnoses";
import { OtherMenus } from "./result/OtherMenus";
import { ResultActionProvider } from "./result/ResultActionContext";
import { ResultHook, ResultMethodDetails, UnconfirmedList } from "./result/ResultReading";
import { ResultNextCta } from "./result/ResultNextCta";
import { PlacesFactsView } from "./result/PlacesFactsView";
import { ScoreHistoryNote } from "./result/ScoreHistoryNote";
import { ScrollToResultScore } from "./result/ScrollToResultScore";
import { SharerLineConsult } from "./SharerLineConsult";

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  high: { label: "最優先", cls: "bg-red-100 text-red-900" },
  medium: { label: "優先", cls: "bg-amber-100 text-amber-950" },
  low: { label: "推奨", cls: "bg-slate-100 text-slate-800" },
};

const FACTOR_DOT: Record<string, string> = {
  good: "bg-slate-700",
  warn: "bg-amber-700",
  bad: "bg-red-700",
  info: "bg-slate-400",
};

const FACTOR_STATUS_LABEL: Record<string, string> = {
  good: "良好",
  warn: "注意",
  bad: "不足",
  info: "未確認",
};

/** 「あと何件」を行動計画に翻訳するときの想定ペース（件/月） */
const REVIEWS_PER_MONTH = 5;

function monthsToReach(reviewsNeeded: number): number {
  return Math.max(1, Math.ceil(reviewsNeeded / REVIEWS_PER_MONTH));
}

export interface ReportShareContext {
  /** 共有URLに記録されていた版。未記録なら undefined */
  loadedRuleVersion?: string;
  /** 共有URLに取得時刻があるか */
  fetchedAtRecorded: boolean;
}

/** 診断結果の表示。/check と /report/[id] で共通利用。 */
export function ReportView({
  result,
  shareUrl,
  refLine,
  shareContext,
  cohort = null,
}: {
  result: DiagnosisResult;
  shareUrl?: string;
  /** アフィリエイター紹介コード（?ref=RH-XXXX で着地時）。monitor 橋URLに伝搬する。 */
  refCode?: string;
  /** 共有した人の公式LINE（?ref_line=）。許可リスト外は表示しない。 */
  refLine?: string;
  /**
   * 共有URLを開いたときだけ渡す。
   * その場の診断では渡さない（注記を出さない）。
   */
  shareContext?: ReportShareContext;
  /** 業種×地域の集計。しきい値未満は null または show:false。 */
  cohort?: CohortPublic | null;
}) {
  const { input, comparison, simulation } = result;
  const store = input.store;
  const competitors = input.competitors ?? [];
  if (store.source === "places" || store.source === "mock") {
    return (
      <PlacesFactsView
        facts={{
          kind: "facts",
          sample: store.source === "mock",
          diagnosedAt: result.diagnosedAt,
          placesAttributed: result.placesAttributed === true,
          ...(result.areaScopeText ? { areaScopeText: result.areaScopeText } : {}),
          input: {
            store,
            competitors: competitors.map((item) => ({
              ...(item.name ? { name: item.name } : {}),
              rating: item.rating,
              reviewCount: item.reviewCount,
              ...(item.placeId ? { placeId: item.placeId } : {}),
              ...(typeof item.lat === "number" ? { lat: item.lat } : {}),
              ...(typeof item.lng === "number" ? { lng: item.lng } : {}),
            })),
          },
        }}
        shareUrl={shareUrl}
        refLine={refLine}
      />
    );
  }
  const autoCompetitors =
    competitors.length > 0 && competitors.every((c) => Boolean(c.placeId));
  const confirmedFactors = result.factors.filter((factor) => isConfirmedFactor(factor));
  const gains = result.improvements.filter((item) => isActionableImprovement(item));
  const missed = collectUnconfirmedLines(result);

  const monitoringHref = "";

  const storeQuery = store.mapsUrl || store.name || "";
  const suggestHref = storeQuery
    ? `/suggest-check/?store=${encodeURIComponent(storeQuery)}`
    : "/suggest-check/";

  const area = buildAreaComparison(store, competitors);
  const countLine = buildCountSummary(store, comparison);
  const fetchedAtRecorded = shareContext ? shareContext.fetchedAtRecorded : true;
  const metaLine = fetchedAtRecorded
    ? `採点ルール v${result.ruleVersion} ／ 取得：${formatDiagnosedAtJst(result.diagnosedAt)}（日本時間）`
    : `採点ルール v${result.ruleVersion} ／ 取得：記録なし`;
  const ruleNote = shareContext
    ? staleRuleVersionNote(shareContext.loadedRuleVersion)
    : null;
  const alone = leftAloneParagraphs({
    reviewCountDiff: comparison ? comparison.reviewCountDiff : null,
    ratingDiff: comparison ? comparison.ratingDiff : null,
  });

  const ctaProps = {
    score: result.score,
    ruleVersion: result.ruleVersion,
    shopName: store.name,
    category: store.category,
    address: store.address,
    monitoringHref,
  };
  const behindPeers = comparison
    ? comparison.ratingDiff < 0 || comparison.reviewCountDiff < 0
    : false;

  return (
    <ResultActionProvider>
      <div
        className="space-y-8"
        style={{
          paddingBottom:
            "var(--sticky-consult-offset, calc(7.5rem + env(safe-area-inset-bottom)))",
        }}
      >
        <section
          id="result-score"
          data-result-section="result"
          data-sticky-protect=""
          className="scroll-mt-20 space-y-6"
        >
          <ScrollToResultScore />

          {store.source === "manual" ? (
            <p className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-base leading-relaxed text-slate-900">
              これは、入力された数字の計算です。Googleの公開情報ではありません。出典の表示はありません。
            </p>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div
                data-result-section="score"
                className="flex flex-col items-center lg:shrink-0 lg:items-start"
              >
                <ScoreMeter score={result.score} band={result.band} size="lg" />
                <div className="mt-3">
                  <ScoreBadge band={result.band} />
                </div>
                <ScoreHistoryNote />
              </div>

              <div data-result-section="estimate" className="min-w-0 flex-1">
                <p className="text-center text-base font-bold leading-snug text-slate-900 sm:text-lg lg:text-left">
                  {countLine}
                </p>
                <p className="mt-2 text-center text-base font-bold text-slate-900 lg:text-left">
                  {store.name || "店舗"}
                </p>
                {result.placesAttributed ? <GoogleMapsCredit /> : null}
                {store.category || store.address ? (
                  <p className="mt-0.5 text-center text-base text-slate-800 lg:text-left">
                    {[store.category, store.address].filter(Boolean).join("｜")}
                  </p>
                ) : null}
                {store.mapsUrl ? (
                  <a
                    href={store.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-base font-bold text-blue-800 underline decoration-blue-800 underline-offset-2 lg:mt-1"
                  >
                    Googleマップで開く
                  </a>
                ) : null}
                {ruleNote ? (
                  <p className="mt-3 text-base font-medium leading-relaxed text-amber-950">
                    {ruleNote}
                  </p>
                ) : null}
                <CohortCompareNote cohort={cohort} />
              </div>
            </div>
          </div>

          {area ? (
            <AreaCompare
              area={area}
              attributeToGoogle={result.placesAttributed === true}
              scopeText={result.areaScopeText}
              lead={
                store.source === "manual"
                  ? "並べている数字は、入力された値です。Googleの検索結果でも、エリア全体の順位でもありません。"
                  : undefined
              }
            />
          ) : null}

          <section data-result-section="findings" className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              主な所見
            </h2>
            <p className="text-base leading-relaxed text-slate-800">{result.summary}</p>
            <FindingCard result={result} />
          </section>

          <section id="score-breakdown" data-result-section="causes" className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              点数の内訳
            </h2>
            {confirmedFactors.length > 0 ? (
              <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {confirmedFactors.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-4"
                  >
                    <div className="flex min-w-[12rem] items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${FACTOR_DOT[f.status]}`}
                        aria-hidden
                      />
                      <span className="text-base font-bold text-slate-900">
                        {FACTOR_STATUS_LABEL[f.status] ?? f.status}
                      </span>
                      <span className="text-base font-semibold text-slate-900">{f.title}</span>
                    </div>
                    <div className="flex-1">
                      {f.max > 0 ? (
                        <p className="font-mono text-base font-bold text-slate-800">
                          {f.points} / {f.max} 点
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-base text-slate-800">{f.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {comparison ? (
              <div>
                <h3 className="text-base font-bold text-slate-900">周辺との比較</h3>
                <p className="mt-1 text-base leading-relaxed text-slate-800">
                  比べた{comparison.total}店のなかで、星評価は{comparison.ratingRank}
                  位、口コミ数は{comparison.reviewCountRank}位です。
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                {competitors.length > 0 ? (
                  <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                    {competitors.map((c, i) => (
                      <li
                        key={c.placeId ?? `${c.name}-${i}`}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <p className="min-w-0 truncate text-base font-medium text-slate-800">
                          {c.mapsUrl ? (
                            <a
                              href={c.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-800 underline decoration-blue-800 underline-offset-2"
                            >
                              {c.name || `周辺${i + 1}`}
                            </a>
                          ) : (
                            (c.name ?? `周辺${i + 1}`)
                          )}
                        </p>
                        <p className="shrink-0 text-base text-slate-800">
                          <span aria-hidden>★</span>
                          <span className="sr-only">星</span>
                          <span className="ml-1 font-bold text-slate-900">
                            {c.rating.toFixed(1)}
                          </span>
                          <span className="ml-3 font-mono">
                            {c.reviewCount}
                            <span className="ml-0.5">件</span>
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <ResultHook>
              この点数を動かしたときに見える変化は、次に続きます。
            </ResultHook>
          </section>
        </section>

        <section data-result-section="gains" className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            直すと得られること
          </h2>
          {gains.length > 0 ? (
            <ul className="space-y-3">
              {gains.map((imp) => {
                const p = PRIORITY_LABEL[imp.priority];
                return (
                  <li
                    key={imp.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-base font-bold ${p?.cls ?? ""}`}
                      >
                        {p?.label ?? ""}
                      </span>
                      <span className="text-base font-bold text-slate-900">{imp.title}</span>
                    </div>
                    <p className="mt-1.5 text-base leading-relaxed text-slate-800">
                      {imp.detail}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-base font-bold text-slate-900">
              目標まで、あと何件か
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-slate-800">
              目標は
              {simulation.targetBasis === "competitor"
                ? "近隣の競合平均"
                : simulation.targetBasis === "custom"
                  ? "指定した値"
                  : "おすすめの基準値"}
              です。高評価の口コミがあと何件くらい必要かの目安です。
            </p>
            <p className="mt-2 text-base text-slate-800">
              現在 星{" "}
              <strong className="text-slate-900">{simulation.currentRating}</strong>
              ・口コミ{" "}
              <strong className="text-slate-900">
                {simulation.currentReviewCount}
              </strong>{" "}
              件 → 目標 星{" "}
              <strong className="text-slate-900">{simulation.targetRating}</strong>
            </p>
            <ul className="mt-4 space-y-3">
              {simulation.scenarios.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-bold text-slate-900">
                      {s.label}
                    </span>
                    <span className="shrink-0 font-mono text-base font-extrabold text-blue-800">
                      {s.reviewsNeeded == null
                        ? "到達困難"
                        : s.reviewsNeeded === 0
                          ? "達成済み"
                          : `あと約${s.reviewsNeeded}件`}
                    </span>
                  </div>
                  <p className="mt-1 text-base leading-relaxed text-slate-800">
                    {s.note}
                  </p>
                  {s.reviewsNeeded != null && s.reviewsNeeded > 0 ? (
                    <p className="mt-2 text-base font-medium text-slate-800">
                      毎月{REVIEWS_PER_MONTH}件のペースなら、約
                      {monthsToReach(s.reviewsNeeded)}ヶ月で到達する計算です。
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <ResultHook>
            直したあとの目安の次は、いまの差を置いたままにした場合です。
          </ResultHook>
        </section>

        <section
          data-result-section="if-left-alone"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            このままだと失うこと
          </h2>
          <div className="mt-3 space-y-2 text-base leading-relaxed text-slate-800">
            {alone.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="mt-4">
            <ResultHook>
              所見と、直したときと、このままのときの三つが揃いました。次の一歩はひとつです。
            </ResultHook>
          </div>
        </section>

        <section
          id="result-next-step"
          data-result-section="cta"
          className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <ResultNextCta {...ctaProps} shopToggle />
          <div className="mt-4">
            <ResultHook>結果をこの端末に残す方法は、この次です。</ResultHook>
          </div>
        </section>

        <DiagnosisPerks result={result} cohort={cohort} />

        {shareUrl ? (
          <div data-result-section="share" className="space-y-4">
            <ShareReport
              url={shareUrl}
              storeName={store.name}
              score={result.score}
              ruleVersion={result.ruleVersion}
              refLine={refLine}
            />
            <SharerLineConsult refLine={refLine} />
            <ResultHook>読み終えたところの次の一歩は、この次です。</ResultHook>
          </div>
        ) : (
          <ResultHook>読み終えたところの次の一歩は、この次です。</ResultHook>
        )}

        <section
          data-result-section="cta-repeat"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <ResultNextCta {...ctaProps} />
        </section>

        <div className="space-y-3">
          <DiagnosisProgressNote appId="check" />
          <NextDiagnoses
            context={{
              surface: "review",
              score: result.score,
              hasWebsite: Boolean(store.website),
              behindPeers,
            }}
          />
          <ResultHook>
            取得できなかった項目と、この診断の確かめ方は、この下にまとめています。
          </ResultHook>
        </div>

        <UnconfirmedList
          lines={missed}
          note="点数と所見には入れていません。"
        />

        <ResultMethodDetails>
          <p>{RESULT_ESTIMATE_SENTENCE}</p>
          <p>{metaLine}</p>
          <p>{FINDING_CARD_TEXTS.roleDeclaration}</p>
          {store.source === "manual" ? (
            <p>
              この点数と順位は、入力された星と口コミ数から計算しています。Googleが返した順位でも、公開情報の写しでもありません。
            </p>
          ) : (
            <p>
              星評価・口コミ数・返信・新しさ・プロフィールなど、公開情報を項目ごとに採点しています。Googleの評価は丸め処理・反映タイミングがあるため、目標までの件数は目安です。
            </p>
          )}
          {autoCompetitors ? (
            <p>
              周辺の店は、1回の検索が返した中から口コミ数の多い順に最大10件を出しています。エリア全体の順位ではありません。半径は設計上の目安です。
            </p>
          ) : null}
          {result.areaScopeText ? <p>{result.areaScopeText}</p> : null}
          {result.placesAttributed ? (
            <p>
              点数は、その場で受け取った星・口コミ数・公開プロフィールから計算しています。この計算を続けてよいかは、書面の確認が終わるまで未確定です。
            </p>
          ) : null}
          {area ? (
            <p>
              周辺のお店の店名・星・口コミ数は、上の一覧に出しています。地図のタイルには載せていません。
            </p>
          ) : null}
        </ResultMethodDetails>

        <div data-result-section="disclaimer">
          <Disclaimer />
        </div>

        <OtherMenus monitoringPaused suggestHref={suggestHref} />
        <ResultNextCta {...ctaProps} placement="sticky" />
      </div>
    </ResultActionProvider>
  );
}
