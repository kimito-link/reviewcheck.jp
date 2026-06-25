export interface NavLink {
  label: string;
  href: string;
}

/** ヘッダー・主要導線 */
export const MAIN_NAV: NavLink[] = [
  { label: "口コミ診断", href: "/check/" },
  { label: "口コミ作成ツール", href: "/review-tool/" },
  { label: "口コミ改善", href: "/review-improvement/" },
  { label: "MEO対策", href: "/meo/" },
  { label: "総合パッケージ・料金", href: "/plans/" },
];

/** トップから内部リンクする主要ページ（内部リンク設計） */
export const INTERNAL_LINKS: NavLink[] = [
  { label: "口コミ診断", href: "/check/" },
  { label: "Google口コミ診断", href: "/google-review-check/" },
  { label: "口コミ改善", href: "/review-improvement/" },
  { label: "MEO対策", href: "/meo/" },
  { label: "口コミ返信サポート", href: "/review-reply/" },
  { label: "悪い口コミ対策", href: "/bad-review-measures/" },
  { label: "競合口コミ比較", href: "/competitor-review-comparison/" },
  { label: "総合改善パッケージ・料金", href: "/plans/" },
  { label: "改善を相談する", href: "/contact/?topic=improvement" },
];

/** フッターにも同じ主要ページへのリンクを設置 */
export const FOOTER_LINKS: { heading: string; links: NavLink[] }[] = [
  {
    heading: "診断ツール",
    links: [
      { label: "口コミ診断", href: "/check/" },
      { label: "はじめての方へ（追体験）", href: "/walkthrough/" },
      { label: "口コミ作成ツール", href: "/review-tool/" },
      { label: "Google口コミ診断", href: "/google-review-check/" },
      { label: "競合口コミ比較", href: "/competitor-review-comparison/" },
    ],
  },
  {
    heading: "改善・対策",
    links: [
      { label: "口コミ改善", href: "/review-improvement/" },
      { label: "MEO対策", href: "/meo/" },
      { label: "口コミ返信サポート", href: "/review-reply/" },
      { label: "悪い口コミ対策", href: "/bad-review-measures/" },
    ],
  },
  {
    heading: "相談・お申し込み",
    links: [
      { label: "総合改善パッケージ・料金", href: "/plans/" },
      { label: "口コミ改善を相談する", href: "/contact/?topic=improvement" },
      { label: "MEO対策を相談する", href: "/contact/?topic=meo" },
      { label: "詳細レポートを依頼する", href: "/contact/?topic=report" },
    ],
  },
  {
    heading: "サイト情報",
    links: [
      { label: "プライバシーポリシー", href: "/privacy/" },
      { label: "利用規約", href: "/terms/" },
      { label: "特定商取引法に基づく表記", href: "/commerce-disclosure/" },
    ],
  },
];
