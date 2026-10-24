import type { CohortPublic } from "@/lib/cohort/public";

/**
 * 同じ業種・地域の集計。件数がしきい値未満のときは何も出さない。
 */
export function CohortCompareNote({
  cohort,
}: {
  cohort: CohortPublic | null;
}) {
  if (!cohort?.show) return null;
  return (
    <div
      data-cohort-compare=""
      className="mt-3 space-y-1 text-base leading-relaxed text-slate-900"
    >
      <p className="font-bold">
        {`近所の同じ業種（${cohort.categoryLabel}・${cohort.regionLabel}）の中で上位${cohort.topPercent}%`}
      </p>
      <p>同業種の平均{cohort.averageScore}点</p>
      <p>
        星の平均 {cohort.averageRating.toFixed(1)}／口コミ件数の平均{" "}
        {cohort.averageReviewCount}件
        {typeof cohort.replyShare === "number"
          ? `／返信ありの割合 ${Math.round(cohort.replyShare * 100)}%`
          : ""}
      </p>
      <p>
        同じ業種・地域の診断{cohort.sampleCount}
        件を集計した推定です。断定ではありません。
      </p>
    </div>
  );
}
