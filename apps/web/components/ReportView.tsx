import type { DiagnosisResult } from "@reviewcheck/core";
import Link from "next/link";
import { CTAS, buildLineConsultMessage } from "@reviewcheck/config";
import { ScoreMeter, ScoreBadge, StarRating, StatCompare } from "@reviewcheck/ui";
import { Disclaimer } from "./Disclaimer";
import { ConsultCtaGrid } from "./CtaGrid";
import { LineCtaButton } from "./LineCtaButton";
import { LineConsultCta } from "./LineConsultCta";
import { ShareReport } from "./ShareReport";
import { OpportunityLoss } from "./OpportunityLoss";
import { StickyConsultCta } from "./StickyConsultCta";
import { SuggestSection } from "./SuggestSection";
import { ReverseHackPromo } from "./ReverseHackPromo";
import { CrossSellGrid } from "./CrossSellGrid";
import { ReviewInsights } from "./ReviewInsights";

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

  // 相談・モニタリング導線に店舗名を引き継ぎ、お問い合わせフォームを自動入力する
  const storeQuery = !isMock ? (store.mapsUrl || store.name || "") : "";
  // 継続監視の「橋」(partnership /monitor)へは store と url を混ぜず分離して渡す（地雷#4）。
  // store=店名（H1 に差し込む・表示専用）、url=公開マップURL（対象URL欄プレフィル）、score=診断スコア。
  // それぞれ encodeURIComponent し、着地側は React 既定エスケープで表示する。
  const monitoringParams = new URLSearchParams();
  if (!isMock) {
    if (store.name) monitoringParams.set("store", store.name);
    if (store.mapsUrl) monitoringParams.set("url", store.mapsUrl);
    if (Number.isFinite(result.score)) {
      monitoringParams.set("score", String(Math.round(result.score)));
    }
  }
  const monitoringExtra = monitoringParams.toString();
  const monitoringHref = monitoringExtra
    ? `${CTAS.monitoring.href}&${monitoringExtra}`
    : CTAS.monitoring.href;

  // LINE相談CTAでコピーさせる初回メッセージ定型文（LINE導線 P0-3）。
  // isMock（デモ表示）では実在の店名を出さず、店名なしの汎用文にする。
  const lineConsultMessage = buildLineConsultMessage(
    isMock ? "" : store.name,
    isMock ? null : result.score,
  );

  // スコア帯に応じた「次の一手」レコメンド（転換率＝LTV向上の主訴求）
  const nextStep =
    result.score < 60
      ? {
          tone: "urgent" as const,
          headline: "競合に差をつけられています。今が立て直しのタイミングです。",
          line: "口コミ数・星評価の差は、放置するほど広がります。月額パッケージで“口コミが自然に増える仕組み”を入れるのが最短の近道です。",
        }
      : result.score < 80
        ? {
            tone: "boost" as const,
            headline: "あと一歩で「選ばれる」状態。仕組み化で一気に伸ばせます。",
            line: "獲得導線（タップ式ツール・QR・LINE）と返信運用を整えれば、今の評価を加速できます。",
          }
          : {
            tone: "keep" as const,
            headline: "良い状態です。あとは“競合に抜かれない”仕組みづくり。",
            line: "継続的な口コミ獲得とモニタリングで、選ばれ続けるお店をキープしましょう。",
          };

  // 診断結果から、弱点に直結する機能ページへ誘導する「次の一手」を出し分ける
  const reviewAnalysis = result.reviewAnalysis;
  const fewReviews =
    reviewBehind > 0 ||
    (comparison != null && store.reviewCount < comparison.avgReviewCount);
  const lowRating = ratingBehind > 0 || store.rating < 4.2;
  const hasNegativeReviews =
    (reviewAnalysis?.negativeCount ?? 0) > 0 ||
    (reviewAnalysis?.flaggedKeywords?.length ?? 0) > 0;
  const profileFactorWeak = result.factors.some(
    (f) =>
      f.status !== "good" &&
      /プロフィール|写真|情報|営業時間|カテゴリ|ウェブ|電話/.test(f.title),
  );

  type NextAction = {
    key: string;
    icon: string;
    title: string;
    desc: string;
    href: string;
    label: string;
    weight: number;
  };
  const nextActions: NextAction[] = [];
  if (fewReviews) {
    nextActions.push({
      key: "reviews",
      icon: "✍️",
      title: "口コミの件数を増やす",
      desc: "競合より口コミが少なめ。来店客にタップ式ツールで“正規の口コミ”を依頼するのが最短です。",
      href: "/review-tool/",
      label: "口コミ作成ツールを使う",
      weight: 1,
    });
  }
  if (lowRating) {
    nextActions.push({
      key: "rating",
      icon: "⭐",
      title: "星評価を底上げする",
      desc: "評価が伸び悩み中。獲得導線の設計と運用改善で、平均★を引き上げます。",
      href: "/review-improvement/",
      label: "口コミ改善を見る",
      weight: 2,
    });
  }
  if (hasNegativeReviews) {
    nextActions.push({
      key: "reply",
      icon: "💬",
      title: "低評価に丁寧に返信する",
      desc: "気になる口コミが見られます。誠実な返信は、検討中のお客様の安心につながります。",
      href: "/review-reply/",
      label: "返信サポートを見る",
      weight: 2,
    });
  }
  if (profileFactorWeak) {
    nextActions.push({
      key: "meo",
      icon: "🗺️",
      title: "プロフィールを充実させる（MEO）",
      desc: "写真・営業時間・カテゴリなどを整えると、地図での見え方が変わります。",
      href: "/meo/",
      label: "MEO対策を見る",
      weight: 3,
    });
  }
  // サジェスト（検索の評判）は結果に含まれないため、確認導線を常設する
  nextActions.push({
    key: "suggest",
    icon: "🔍",
    title: "検索の評判（サジェスト）を確認",
    desc: "店名の検索候補に悪い言葉が出ていないかをチェックできます。",
    href: storeQuery
      ? `/suggest-check/?store=${encodeURIComponent(storeQuery)}`
      : "/suggest-check/",
    label: "サジェスト診断を開く",
    weight: 4,
  });
  const topActions = [...nextActions]
    .sort((a, b) => a.weight - b.weight)
    .slice(0, 4);

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
                  <span className="ml-0.5 text-xs font-medium text-slate-500">
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

      {/* 評判の土台＝サイトが安全に動いていること（IT窓口への横導線） */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              口コミの“土台”は、サイトが安全に動いていること
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              改ざん・マルウェア・更新放置はせっかくの集客を台無しにします。気になる方は、サイトの安全性も無料でご相談ください（運営：リバースハック）。
            </p>
          </div>
          <Link
            href="/security-diagnosis/"
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-400 hover:text-blue-700"
          >
            サイトの安全性を見る
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* 競合比較 */}
      {comparison ? (
        <section>
          <h2 className="mb-3 text-xl font-extrabold text-slate-900 sm:text-2xl">
            競合との比較
          </h2>
          <p className="mb-3 text-sm text-slate-600">
            近隣の同業店と、あなたのお店の星評価・口コミ数を並べました。
            「いま、お客様にどう見えているか」の客観的な位置づけです。
          </p>
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
                        <span className="ml-0.5 text-xs text-slate-500">件</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {autoCompetitors ? (
                <p className="mt-2 text-xs text-slate-500">
                  ※
                  周辺の同業種から口コミ数の多い順に自動抽出した目安です。対象は手動でも調整できます。
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* マップ口コミの中身分析（代表口コミが取得できた場合のみ） */}
      {result.reviewAnalysis ? (
        <ReviewInsights analysis={result.reviewAnalysis} />
      ) : null}

      {/* Google検索での見られ方（サジェスト）。実店舗のみ。 */}
      {!isMock && store.name ? (
        <SuggestSection
          storeName={store.name}
          storeQuery={storeQuery || undefined}
        />
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

      {/* 診断結果から選んだ「次の一手」：競合・口コミ・サジェストまで一通り見たうえで、
          弱点に直結する機能ページへ誘導する。石川氏の指摘（診断結果→競合→できる打ち手の流れ）に対応し、
          結果を見せ切ってから打ち手を提示する位置に配置。 */}
      {topActions.length > 0 ? (
        <section className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
              次の一手
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              この結果から、いま効く打ち手はこちら
            </h2>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            上の診断結果（競合との差・口コミの中身・検索での見られ方）をふまえ、
            効果が出やすい順に並べています。気になるものから始めてください。
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topActions.map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-xl">
                    {a.icon}
                  </span>
                  <span className="font-bold text-slate-900">{a.title}</span>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {a.desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                  {a.label}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* 主CTA：診断結果と打ち手を見せたうえで「迷ったらまず無料相談」へ。
          石川氏の指摘（結果を見ずに相談へ進むのは違和感）に対応し、結果の後ろへ配置。
          成果は断定せず「相談だけでOK」を明示する。 */}
      {!isMock ? (
        <section className="rounded-2xl border-2 border-[#06C755]/40 bg-[#06C755]/5 p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            診断結果の「次の一歩」を、無料で聞く
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
            「何から始めればいいか分からない」で大丈夫です。診断結果を見ながら、
            あなたのお店に合った進め方を一緒に整理します。
            <strong className="text-slate-900">相談だけでOK・売り込みはしません。</strong>
          </p>
          <div className="mt-4 max-w-sm">
            {/* topic 省略＝口コミ・評判の窓口LINEへ（IT系は別CTAで出し分け済み）。
                クリックで店名・スコア入りの相談文をコピーしてLINEへ（LINE導線 P0-3）。 */}
            <LineConsultCta
              text="診断結果の“次の一歩”を無料で聞く"
              message={lineConsultMessage}
              fullWidth
              size="lg"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            ※ 口コミの件数・星評価・検索順位などの成果は、Googleの判断に依存するため保証はできません。正当な方法での改善をご提案します。
          </p>
        </section>
      ) : null}

      {/* あと何件で追いつけるか */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          あと何件で目標に近づける？
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          いまの星評価から
          <strong className="text-slate-900">「目標の星評価」</strong>
          に届くには、高評価の口コミがあと何件くらい必要かの目安です。
          目標は
          {simulation.targetBasis === "competitor"
            ? "近隣の競合平均"
            : simulation.targetBasis === "custom"
              ? "あなたが指定した値"
              : "おすすめの基準値"}
          を採用しています。
        </p>
        <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span>
            現在 星 <strong className="text-slate-900">{simulation.currentRating}</strong>
            ・口コミ <strong className="text-slate-900">{simulation.currentReviewCount}</strong> 件
          </span>
          <span aria-hidden>→</span>
          <span>
            目標 星 <strong className="text-slate-900">{simulation.targetRating}</strong>
            {simulation.targetBasis === "competitor"
              ? "（競合平均）"
              : simulation.targetBasis === "custom"
                ? "（指定）"
                : "（推奨）"}
          </span>
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
        <p className="mt-3 text-xs text-slate-500">
          ※ Googleの評価は丸め処理・反映タイミングがあるため、件数・期間はあくまで目安です。
        </p>
      </section>

      {/* 選ばれやすさスコアの内訳 */}
      <section>
        <h2 className="mb-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
          選ばれやすさスコアの内訳
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-slate-600">
          「選ばれやすさ」とは、
          <strong className="text-slate-900">Googleマップやネット検索でお店を見つけた来店検討中のお客様に、
          来店先として選ばれやすいか</strong>
          という意味です。星評価・口コミ数・返信状況・プロフィールの充実度など、
          来店を後押しする要素を項目ごとに採点しています。
        </p>
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
        <h2 className="mb-3 text-xl font-extrabold text-slate-900 sm:text-2xl">
          改善のポイント
        </h2>
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
            <a
              href={monitoringHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {CTAS.monitoring.label}
            </a>
          </div>
        </div>
      </section>

      {/* 総合改善パッケージへの購入導線（本命アップセル） */}
      <section className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
              無料ツール
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              口コミを増やす一歩目を、今すぐ
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            来店されたお客様が
            <strong className="text-slate-900">タップで答えるだけ</strong>
            で、自然な口コミの下書きが完成。コピーしてGoogleに貼るだけです。やらせ・サクラは一切なし、ご本人の率直な感想を正しく集めます。
          </p>
          <div className="mt-4">
            <Link
              href="/review-tool/"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              口コミ作成ツールを試す →
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
              総合パッケージ
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              口コミも検索も、まるごと改善するなら
            </h2>
          </div>
          <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3">
            <p className="text-sm font-bold text-slate-900">
              {nextStep.headline}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {nextStep.line}
            </p>
          </div>

          {/* A1（LINE導線 P0-3）: スコア低帯＝感情ピーク直後に「まずスクショを送るだけ」の
              無料相談の出口を1つ足す。交換条件（スクショ→見立て1点）を明示して警戒を下げる。
              isMock・スコア60以上では出さない（回帰の守り＝直帯の表示は変えない）。 */}
          {!isMock && result.score < 60 ? (
            <div className="mt-3 rounded-xl border border-[#06C755]/40 bg-[#06C755]/5 p-3">
              <p className="text-sm font-bold text-slate-900">
                いきなり契約はまだ、という方へ。
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                診断結果のスクショを送るだけで、
                <strong className="text-slate-900">「最初に直すべき1点」</strong>
                を専門家が無料で返信します。相談だけでOK・売り込みはしません。
              </p>
              <div className="mt-3 max-w-sm">
                <LineConsultCta
                  text="この診断結果を専門家に見てもらう（無料）"
                  message={lineConsultMessage}
                  fullWidth
                  size="lg"
                />
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            「消す」より「上げる」。AI口コミ対策・提携弁護士の窓口・口コミ獲得ツール・公式WEB/LINE/アプリまで、
            <strong className="text-slate-900">月額パッケージ</strong>
            で「選ばれ続けるお店」をつくります。WEB・LINE・アプリは契約中ずっと無料提供。
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/plans/"
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
            >
              総合パッケージ・料金を見る
            </Link>
            <Link
              href="/plans/#pricing"
              className="inline-flex items-center justify-center rounded-xl border border-amber-400 bg-white px-5 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
            >
              3つの料金プランを比較
            </Link>
          </div>
        </div>
      </section>

      {shareUrl ? (
        <ShareReport url={shareUrl} storeName={store.name} score={result.score} />
      ) : null}

      {/* 再接触（リスト取得）：今すぐ動かない人向けに「あとで受け取る」入口。
          石川氏の指摘E（離脱後に再接触できるようLINE/メールでリストを取る）に対応。
          友だち追加でこちらから最新情報・改善のヒントを届けられるようにする。 */}
      {!isMock ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">
                診断結果をLINEに保存して、あとで続きから話す
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                この結果ページは保存されません。スクショを1枚送っておくと、気になったときに
                専門家と続きから話せます。月1回、口コミ・MEOの実務ヒントもお届けします
                （不要なら通知オフでOK）。
              </p>
            </div>
            <div className="shrink-0">
              {/* クリックで相談文をコピーしてLINEへ（LINE導線 P0-3・A4）。 */}
              <LineConsultCta
                text="診断結果をLINEに保存する"
                message={lineConsultMessage}
              />
            </div>
          </div>
        </section>
      ) : null}

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

      {/* クロスセル：関連サービス（MEO/HP/SNS/サジェスト/返信）への紹介導線 */}
      <CrossSellGrid />

      {/* 二次導線：同チーム「リバースハック WEB健康診断」へ（本命CTAの後ろに配置） */}
      <ReverseHackPromo />

      <Disclaimer />

      <StickyConsultCta storeName={storeQuery || undefined} />
    </div>
  );
}
