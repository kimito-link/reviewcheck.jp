import type { SelectabilityBand } from "@reviewcheck/core";

const RING: Record<SelectabilityBand, string> = {
  good: "text-emerald-500",
  fair: "text-amber-500",
  weak: "text-orange-500",
  poor: "text-red-500",
};

/** 0〜100の選ばれやすさスコアの円形メーター（SVG・依存なし） */
export function ScoreMeter({
  score,
  band,
}: {
  score: number;
  band: SelectabilityBand;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative inline-flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-200"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={RING[band]}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold text-slate-900">{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  );
}
