import type { SelectabilityBand } from "@reviewcheck/core";

const RING: Record<SelectabilityBand, string> = {
  good: "text-emerald-500",
  fair: "text-amber-500",
  weak: "text-orange-500",
  poor: "text-red-500",
};

const SIZE = {
  md: {
    box: "h-36 w-36",
    svg: "h-36 w-36",
    score: "text-3xl",
    unit: "text-base",
  },
  lg: {
    box: "h-52 w-52",
    svg: "h-52 w-52",
    score: "text-[60px] leading-none sm:text-[72px]",
    unit: "text-base",
  },
} as const;

/** 0〜100の選ばれやすさスコアの円形メーター（SVG・依存なし） */
export function ScoreMeter({
  score,
  band,
  size = "md",
}: {
  score: number;
  band: SelectabilityBand;
  /** lg は結果画面の第一表示用（数字 60〜72px） */
  size?: keyof typeof SIZE;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone = SIZE[size];
  return (
    <div
      className={`relative inline-flex items-center justify-center ${tone.box}`}
    >
      <svg className={`${tone.svg} -rotate-90`} viewBox="0 0 120 120">
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
        <span className={`font-extrabold text-slate-900 ${tone.score}`}>
          {score}
        </span>
        <span className={`text-slate-800 ${tone.unit}`}>/ 100</span>
      </div>
    </div>
  );
}
