/**
 * 自店舗と競合平均の数値を並べて差を見せる小さな比較バー。
 * diff は「自店舗 - 競合平均」。プラスは優位（緑）、マイナスは不利（赤）。
 */
export function StatCompare({
  label,
  mine,
  rivalAvg,
  diff,
  unit = "",
}: {
  label: string;
  mine: string | number;
  rivalAvg: string | number;
  diff: number;
  unit?: string;
}) {
  const positive = diff >= 0;
  const diffText = `${positive ? "+" : ""}${diff}${unit}`;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-slate-400">自店舗</p>
          <p className="text-xl font-extrabold text-slate-900">
            {mine}
            <span className="ml-0.5 text-xs font-medium text-slate-400">
              {unit}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">競合平均</p>
          <p className="text-base font-bold text-slate-500">
            {rivalAvg}
            <span className="ml-0.5 text-xs font-medium text-slate-400">
              {unit}
            </span>
          </p>
        </div>
      </div>
      <p
        className={`mt-2 text-right text-sm font-bold ${
          positive ? "text-emerald-600" : "text-red-600"
        }`}
      >
        差：{diffText}
      </p>
    </div>
  );
}
