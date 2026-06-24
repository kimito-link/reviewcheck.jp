/** 星評価を★で視覚化（小数対応・SVGクリップなし簡易版）。 */
export function StarRating({
  rating,
  size = "md",
  showValue = true,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}) {
  const sizeCls =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const full = Math.floor(rating);
  const frac = rating - full;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex ${sizeCls} leading-none`} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = i < full ? 1 : i === full ? frac : 0;
          return (
            <span key={i} className="relative inline-block text-slate-300">
              ★
              <span
                className="absolute left-0 top-0 overflow-hidden text-amber-500"
                style={{ width: `${Math.round(fill * 100)}%` }}
              >
                ★
              </span>
            </span>
          );
        })}
      </span>
      {showValue ? (
        <span className="font-mono text-sm font-bold text-slate-700">
          {rating.toFixed(1)}
        </span>
      ) : null}
    </span>
  );
}
