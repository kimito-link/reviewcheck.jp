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

/**
 * LINE相談の初回メッセージ定型文（LINE導線 P0-3）。
 *
 * 設計原則（DESIGN-line-funnel-2026-07-02.md §1-2）: lin.ee URL にパラメータは載らない
 * ので、診断結果の文脈（店名・スコア）は「ユーザーがコピペで持ち込む」形にする。
 * CTA クリック時にこの文をクリップボードへコピーし、LINE のトークに貼って送ってもらう。
 *
 * 表示・コピーは信頼できない入力として扱い、店名は前後空白を除いて差し込む。
 * @param storeName 店舗名（表示専用）。空なら店名なしの文面にフォールバック。
 * @param score 診断スコア（0-100想定）。有限数でなければスコア無しの文面にする。
 */
export function buildLineConsultMessage(
  storeName?: string | null,
  score?: number | null,
): string {
  const name = storeName?.trim();
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const scoreLabel = hasScore ? `／スコア${Math.round(score as number)}点` : "";
  const head = name ? `【口コミ診断の続き】${name}${scoreLabel}。` : "【口コミ診断の続き】";
  return `${head}診断結果について見立てをお願いします。`;
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
  freeConsult: {
    key: "freeConsult",
    label: "15分の無料相談で改善策を聞く",
    href: "/contact/?topic=consult",
    emphasis: "cta",
  },
  monitoring: {
    key: "monitoring",
    // 継続監視サブスク（自販機型・月額）の本番申込ページへ。
    // 診断→継続監視の「橋」。plan=reviewcheck で口コミ監視プランを初期選択。
    // tier=bamboo で竹を初期選択、from=check で「診断の続き」着地を発火、
    // utm_* で診断経由の成約を測定できるようにする（partnership 側 P0-1/P0-4）。
    // ref=RVCHK は「ハウスパートナー方式」（P1-2）。診断→直販の成約を運営者自身の
    // 代理店行(referralCode=RVCHK)に紐付け、partnership の webhook が契約・監視対象を
    // 自動作成できるようにする（ref 無しだと通知のみで DB に残らない・発見A）。
    // 報酬式は不変。RVCHK 宛の報酬行は支払確定で選ばない運用ルールで除外する（コード側ガード不要）。
    // store（店舗名）・score・url は ReportView 側でクエリ連結する。
    label: "月次モニタリングを始める",
    href: "https://partner.reverse-re-birth-hack.com/monitor?plan=reviewcheck&tier=bamboo&ref=RVCHK&from=check&utm_source=reviewcheck&utm_medium=report&utm_campaign=monitoring",
    emphasis: "cta",
  },
  suggest: {
    key: "suggest",
    label: "サジェスト（検索候補）対策を相談する",
    href: "/contact/?topic=suggest",
    emphasis: "cta",
  },
  shareReport: {
    key: "shareReport",
    label: "診断結果を共有する",
    href: "#share",
    emphasis: "default",
  },
};
