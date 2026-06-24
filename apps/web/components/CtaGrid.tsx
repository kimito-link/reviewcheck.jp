import { CTAS } from "@reviewcheck/config";
import { CtaButton } from "./CtaButton";

/** 診断後の相談導線（口コミ改善・返信・MEO・悪評対策・詳細レポート・月額） */
export function ConsultCtaGrid() {
  const order = [
    CTAS.improvement,
    CTAS.meo,
    CTAS.reviewReply,
    CTAS.badReview,
    CTAS.detailReport,
    CTAS.monthly,
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {order.map((cta) => (
        <CtaButton key={cta.key} cta={cta} full />
      ))}
    </div>
  );
}
