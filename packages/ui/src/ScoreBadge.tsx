import type { SelectabilityBand } from "@reviewcheck/core";

const LABEL: Record<SelectabilityBand, string> = {
  good: "選ばれやすい",
  fair: "改善余地あり",
  weak: "やや不利",
  poor: "要対策",
};

const CLASS: Record<SelectabilityBand, string> = {
  good: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  fair: "bg-amber-100 text-amber-800 ring-amber-600/20",
  weak: "bg-orange-100 text-orange-800 ring-orange-600/20",
  poor: "bg-red-100 text-red-800 ring-red-600/20",
};

export function ScoreBadge({ band }: { band: SelectabilityBand }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ring-inset ${CLASS[band]}`}
    >
      選ばれやすさ：{LABEL[band]}
    </span>
  );
}
