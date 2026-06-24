export interface PricePlan {
  key: string;
  name: string;
  price: string;
  priceNote?: string;
  description: string;
}

/**
 * 価格導線（初期版）。金額は税込目安。内容により変動する旨を明記する。
 */
export const PRICING: PricePlan[] = [
  {
    key: "free-check",
    name: "簡易診断",
    price: "無料",
    description:
      "店舗名またはGoogleマップURLを入れるだけ。星評価・口コミ数・競合との差・選ばれやすさスコア・「あと何件で追いつけるか」を診断します。",
  },
  {
    key: "detail-report",
    name: "詳細レポート",
    price: "11,000円〜",
    priceNote: "税込",
    description:
      "競合分析・口コミ傾向・改善優先度をまとめた詳細レポート。返信文の方針や獲得導線の設計案も含みます。",
  },
  {
    key: "review-reply",
    name: "口コミ返信方針作成",
    price: "22,000円〜",
    priceNote: "税込",
    description:
      "低評価・悪評を含む口コミへの返信方針とテンプレートを作成。炎上を避け、信頼を高める返信を設計します。",
  },
  {
    key: "review-improvement",
    name: "Google口コミ改善相談",
    price: "33,000円〜",
    priceNote: "税込",
    description:
      "正当な口コミ獲得導線の設計、依頼タイミング・声かけ・QR・サンクスページなど、星評価と口コミ数を伸ばす施策をご提案します。",
  },
  {
    key: "bad-review",
    name: "悪評・低評価口コミ対応相談",
    price: "33,000円〜",
    priceNote: "税込",
    description:
      "低評価・悪評への対応方針、削除可否の見極め（規約違反の通報など正当な範囲）、再発防止の運用づくりをサポートします。",
  },
  {
    key: "meo",
    name: "MEO改善",
    price: "55,000円〜",
    priceNote: "税込",
    description:
      "Googleビジネスプロフィールの最適化、写真・投稿・カテゴリ・キーワード設計など、Googleマップで選ばれる店舗づくりを支援します。",
  },
  {
    key: "monthly",
    name: "月額MEO・口コミ改善サポート",
    price: "要相談",
    description:
      "毎月のモニタリング（競合の口コミ動向・順位の変化）と改善提案・返信運用を継続。放置で競合に抜かれないよう伴走します。",
  },
];

export const PRICING_NOTE =
  "金額は目安です。店舗数・エリア・競合状況・対応範囲により変動します。簡易診断は無料でご利用いただけます。";
