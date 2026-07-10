import type { DiagnosisResult } from "@reviewcheck/core";
import {
  FINDING_CARD_TEXTS,
  selectReviewFindings,
  THREAD_MAP_TEXTS,
} from "@reviewcheck/core";
import { ThreadMap } from "./ThreadMap";

/**
 * 診断結果の所見カード（「医者の物語」レイヤー・診断書の表紙）。
 * 設計: docs/DESIGN-report-doctor-story-2026-07-08.md §C-3。
 *
 * 表示文字列はすべて core の findings 辞書由来（ここに文字列リテラルを足さない）。
 * selectReviewFindings が null（mock・口コミ0件・名付けられない中間状態）なら何も描かない。
 * 保健指導②③はテキストのみ＝新CTAを作らず、既存のLINE主CTA・月次モニタリングへ位置の言及で橋を架ける。
 */
export function FindingCard({ result }: { result: DiagnosisResult }) {
  const selection = selectReviewFindings(result);
  if (!selection) return null;
  const { primary, secondary } = selection;
  const t = FINDING_CARD_TEXTS;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-bold text-white">
          {t.badge}
        </span>
        <span className="text-sm font-bold text-slate-700">{t.badgeSub}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        {t.roleDeclaration}
      </p>

      <h2 className="mt-3 text-lg font-bold text-slate-900 sm:text-xl">
        {t.findingLabel}: {primary.name}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        {primary.finding} {primary.structure}
      </p>

      {secondary.length > 0 ? (
        <div className="mt-2.5">
          <p className="text-xs font-bold text-slate-500">{t.chipsHeading}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {secondary.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* 一本の糸マップ（P1・設計§C-4）。既定は折りたたみ＝カード高さに影響させない。 */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">
          {THREAD_MAP_TEXTS.summary}
        </summary>
        <div className="mt-2 rounded-xl bg-slate-50 p-3">
          <ThreadMap factors={result.factors} />
        </div>
      </details>

      {/* モバイルのカード高さ上限（設計§E-5: 375pxで480px以下）のため既定は折りたたみ。
          治療②の実体（LINE主CTA）はカード直下に常時表示されているため導線は途切れない。 */}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">
          {t.nextSummary}
        </summary>
        <div className="mt-2 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-900">{t.nextHeading}</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
            <li>
              <strong className="text-slate-900">{t.step1Label}:</strong>{" "}
              {primary.selfCare}
            </li>
            <li>
              <strong className="text-slate-900">{t.step2Label}:</strong>{" "}
              {t.step2Text}
            </li>
            <li>
              <strong className="text-slate-900">{t.step3Label}:</strong>{" "}
              {t.step3Text}
            </li>
          </ul>
        </div>
      </details>
    </section>
  );
}
