/**
 * CTA（行動喚起）文言と遷移先の単一情報源。
 * 相談系はすべて /contact/ に集約（後でフォーム/チャット/LINEに差し替え可能）。
 */
export interface Cta {
  key: string;
  label: string;
  href: string;
  /** 主要CTAの強調用 */
  emphasis?: "primary" | "cta" | "default";
}

export const CTAS: Record<string, Cta> = {
  freeCheck: {
    key: "freeCheck",
    label: "無料で口コミ診断する",
    href: "/check/",
    emphasis: "primary",
  },
  compare: {
    key: "compare",
    label: "競合と比較する",
    href: "/check/#competitors",
    emphasis: "primary",
  },
  improvement: {
    key: "improvement",
    label: "口コミ改善を相談する",
    href: "/contact/?topic=improvement",
    emphasis: "cta",
  },
  meo: {
    key: "meo",
    label: "MEO対策を相談する",
    href: "/contact/?topic=meo",
    emphasis: "cta",
  },
  reviewReply: {
    key: "reviewReply",
    label: "口コミ返信方針を相談する",
    href: "/contact/?topic=review-reply",
    emphasis: "default",
  },
  badReview: {
    key: "badReview",
    label: "悪い口コミ対策を相談する",
    href: "/contact/?topic=bad-review",
    emphasis: "default",
  },
  detailReport: {
    key: "detailReport",
    label: "詳細レポートを依頼する",
    href: "/contact/?topic=report",
    emphasis: "default",
  },
  profile: {
    key: "profile",
    label: "Googleビジネスプロフィール改善を相談する",
    href: "/contact/?topic=profile",
    emphasis: "default",
  },
  monthly: {
    key: "monthly",
    label: "月額サポートを相談する",
    href: "/contact/?topic=monthly",
    emphasis: "default",
  },
  shareReport: {
    key: "shareReport",
    label: "診断結果を共有する",
    href: "#share",
    emphasis: "default",
  },
};
