import { DISCLAIMER, POLICY_NOTE } from "@reviewcheck/config";

/** 必須の免責文＋ポリシー宣言ボックス。診断結果・各ページに表示する。 */
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ${className}`}
    >
      <p>
        <strong className="font-bold">ご注意：</strong>
        {DISCLAIMER}
      </p>
      <p className="mt-2 font-bold">{POLICY_NOTE}</p>
    </div>
  );
}
