import { CTAS } from "@reviewcheck/config";
import { CtaButton } from "./CtaButton";

/**
 * 診断後の相談導線（テーマ別）。
 *
 * 石川氏の指摘C（CTA過多→絞る）に対応し、代表的な3テーマに絞った。
 * 主CTAは結果の「所見→直すと得られること→このままだと失うこと」の後に1つだけ置く。ここは
 * 「具体的なテーマで相談したい人」向けの補助に徹する。返信方針・詳細レポート等の
 * 細かいテーマは、相談時にLINE/フォームで個別に拾う運用にして画面の選択肢を減らす。
 */
export function ConsultCtaGrid() {
  const order = [CTAS.improvement, CTAS.meo, CTAS.badReview];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {order.map((cta) => (
        <CtaButton key={cta.key} cta={cta} full />
      ))}
    </div>
  );
}
