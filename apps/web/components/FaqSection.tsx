import type { FaqItem } from "@reviewcheck/config";

/** FAQ表示（構造化データは呼び出し側で faqJsonLd を別途出力する） */
export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((f, i) => (
        <details key={i} className="group p-5">
          <summary className="cursor-pointer list-none font-bold text-slate-900 marker:hidden">
            <span className="mr-2 text-blue-600">Q.</span>
            {f.question}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            <span className="mr-2 font-bold text-slate-400">A.</span>
            {f.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
