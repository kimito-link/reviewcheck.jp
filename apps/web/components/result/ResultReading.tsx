import type { ReactNode } from "react";

/** ブロックの最後に置く、次を読みたくなる一文。 */
export function ResultHook({ children }: { children: ReactNode }) {
  return (
    <p className="text-base font-medium leading-relaxed text-slate-900">{children}</p>
  );
}

/**
 * 確認の範囲・方法。閉じた details が既定。
 * 結果の先頭には出さない。
 */
export function ResultMethodDetails({ children }: { children: ReactNode }) {
  return (
    <details
      data-result-section="method"
      className="rounded-2xl border border-slate-200 bg-white p-5 text-base text-slate-900 sm:p-6"
    >
      <summary className="cursor-pointer text-base font-bold text-slate-900 underline decoration-slate-900 underline-offset-2">
        この診断の確かめ方
      </summary>
      <div className="mt-3 space-y-2 text-base leading-relaxed text-slate-800">
        {children}
      </div>
    </details>
  );
}

/** 測れなかった項目。結果の末尾に短く出す。 */
export function UnconfirmedList({
  lines,
  note = "上の結果には入れていません。",
}: {
  lines: string[];
  note?: string;
}) {
  if (lines.length === 0) return null;
  return (
    <section
      data-result-section="unconfirmed"
      className="rounded-2xl border border-slate-200 bg-white p-5 text-base text-slate-900 sm:p-6"
    >
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        今回は確認できなかった項目
      </h2>
      <p className="mt-2 text-base leading-relaxed text-slate-800">{note}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-base leading-relaxed text-slate-800">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
