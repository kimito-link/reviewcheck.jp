/**
 * クロスセル（関連サービス・紹介）導線。
 *
 * 方針（上村案「入口無料→MEO・HP制作・SNS等へ広げて紹介手数料」）:
 * - 口コミ診断を入口に、運営（リバースハック／株式会社ベストトラスト）が扱う
 *   関連サービスへ自然に送客する。
 * - すべて相談ベース（/contact?topic=）または既存ページへ。やらせ等は含めない。
 */
export interface CrossSellItem {
  key: string;
  emoji: string;
  title: string;
  /** 一言の便益 */
  desc: string;
  href: string;
  /** 新しいタブで開く（外部サイト） */
  external?: boolean;
}

export const CROSS_SELL: CrossSellItem[] = [
  {
    key: "meo",
    emoji: "📍",
    title: "MEO対策",
    desc: "Googleマップで上位表示・来店を増やす。プロフィール最適化と運用。",
    href: "/meo/",
  },
  {
    key: "suggest",
    emoji: "🔎",
    title: "サジェスト対策",
    desc: "検索候補のネガティブワードを抑制し、第一印象を守る。",
    href: "/contact/?topic=suggest",
  },
  {
    key: "web",
    emoji: "🌐",
    title: "ホームページ制作・改善",
    desc: "来店前に見られる公式サイトを、信頼される見た目と導線に。",
    href: "/contact/?topic=web",
  },
  {
    key: "sns",
    emoji: "📣",
    title: "SNS運用・集客",
    desc: "Instagram・LINE等で来店動機をつくり、口コミと相乗効果を。",
    href: "/contact/?topic=sns",
  },
  {
    key: "review-reply",
    emoji: "💬",
    title: "口コミ返信サポート",
    desc: "低評価にも炎上せず信頼を高める返信方針・テンプレートを作成。",
    href: "/review-reply/",
  },
  {
    key: "site-health",
    emoji: "🩺",
    title: "WEBサイト健康診断",
    desc: "サイトのセキュリティ・表示速度・SEOをURLだけで無料チェック。",
    href: "https://web-health-check.link",
    external: true,
  },
];
