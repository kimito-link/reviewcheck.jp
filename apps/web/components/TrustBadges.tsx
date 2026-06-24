import { SITE } from "@reviewcheck/config";

interface TrustBadgesProps {
  /** ダーク面に置くとき true（文字色を反転） */
  onDark?: boolean;
  className?: string;
}

/** 実績・方針・第三者評価を並べた信頼シグナル。ヒーロー直下やCTA付近に置く。 */
export function TrustBadges({ onDark = false, className = "" }: TrustBadgesProps) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium sm:text-sm ${
        onDark ? "text-slate-200" : "text-slate-600"
      } ${className}`}
    >
      {SITE.trustSignals.map((t) => (
        <li key={t} className="inline-flex items-center gap-1.5">
          <span
            className={`text-base leading-none ${
              onDark ? "text-amber-300" : "text-amber-500"
            }`}
            aria-hidden="true"
          >
            ✓
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}
