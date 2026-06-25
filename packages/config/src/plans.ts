/**
 * 総合改善パッケージ（月額サブスク）の単一情報源。
 *
 * コンセプト（reverse-engineering 元: removal「レビューブースト」）:
 *   「消す＝手段／評判を上げる＝ゴール」。削除に頼らず、★評価・サジェスト・
 *   検索結果まで含めたネット評判を総合的に改善し「選ばれ続けるお店」をつくる。
 *
 * 重要（非弁・Google規約の遵守）:
 *   - 口コミ削除は「代行」しない。AIは申請の"ヒント"を提供し、申請は事業者本人。
 *   - 法的対応が必要な事案は提携弁護士の窓口へ。
 *   - やらせレビュー・口コミ購入は行わない。口コミ獲得は「実客が自分で書く」導線で支援。
 *   - サジェスト/逆SEO/削除は結果を保証しない旨を必ず明記。
 */

/** パッケージに含まれる提供内容（1枚のカード） */
export interface PackageItem {
  key: string;
  icon: string;
  title: string;
  /** 小さなタグ（例: 契約中無料／上位プラン） */
  tag?: string;
  /** タグの配色トークン */
  tagTone?: "ai" | "law" | "free" | "opt" | "all" | "star";
  desc: string;
  /** 契約期間中ずっと無料提供（リボン表示） */
  freeBadge?: boolean;
}

export const PACKAGE_ITEMS: PackageItem[] = [
  {
    key: "ai-measure",
    icon: "🤖",
    title: "AI 口コミ対策サポート",
    tag: "申請はご自身で",
    tagTone: "ai",
    desc: "ガイドライン違反の可能性がある口コミの見分け方や、削除申請フォームの書き方をAIが具体的にアドバイス。申請はご自身で行えるよう最後までサポートします（削除はGoogleの判断によります）。",
  },
  {
    key: "lawyer",
    icon: "⚖️",
    title: "提携弁護士の窓口",
    tag: "法的対応はプロへ",
    tagTone: "law",
    desc: "悪質な誹謗中傷や権利侵害など、法的対応が必要なケースは提携弁護士の窓口へおつなぎ。専門家による対応で安心です。",
  },
  {
    key: "review-consul",
    icon: "⭐",
    title: "口コミ獲得・評判改善コンサル（MEO含む）",
    tag: "★を増やす仕組み",
    tagTone: "star",
    desc: "満足したお客様を自然にレビュー投稿へ導く導線づくりと、Googleビジネスプロフィールの最適化（MEO）。★が積み上がり続ける状態をつくります。",
  },
  {
    key: "review-tool",
    icon: "📲",
    title: "口コミ作成ツール／NFCカード",
    tag: "タップで完成",
    tagTone: "all",
    desc: "来店客が質問にタップで答えるだけで自然な口コミ文章が完成→そのままGoogleへ。投稿は本人・編集自由なので安心。NFCカードならかざすだけで起動します。",
  },
  {
    key: "web",
    icon: "🌐",
    title: "公式WEBサイト",
    tag: "契約中ずっと提供",
    tagTone: "free",
    freeBadge: true,
    desc: "店舗の魅力を伝える公式サイトを制作・運用。口コミへの導線も設計します。制作費はかからず、契約期間中ずっとご利用いただけます。",
  },
  {
    key: "line",
    icon: "💬",
    title: "公式LINE ＋ マーケ導線",
    tag: "契約中ずっと提供",
    tagTone: "free",
    freeBadge: true,
    desc: "公式LINEを構築し、登録→来店→口コミ依頼までの集客導線を設計・運用。不満は口コミになる前にLINEで拾い、低評価を未然に防ぎます。",
  },
  {
    key: "app",
    icon: "📱",
    title: "店舗アプリ（iOS / Android）",
    tag: "契約中ずっと提供",
    tagTone: "free",
    freeBadge: true,
    desc: "再来店を促す自社アプリを提供。ポイントや通知でリピーターを囲い込みます。ストア公開申請から運用まで代行します。",
  },
  {
    key: "suggest",
    icon: "🔍",
    title: "サジェスト対策",
    tag: "上位プラン",
    tagTone: "opt",
    desc: "「店名＋ネガティブな言葉」のような検索候補（サジェスト）の改善に取り組みます。結果を保証するものではありません。",
  },
  {
    key: "reverse-seo",
    icon: "📉",
    title: "逆SEO 押し下げパック",
    tag: "上位プラン",
    tagTone: "opt",
    desc: "ネガティブな記事が検索上位に出る場合に、ポジティブな情報を充実させて相対的に押し下げます。結果を保証するものではありません。",
  },
  {
    key: "ai-concierge",
    icon: "💡",
    title: "契約者専用 AIサポート",
    tag: "全プラン共通・24時間",
    tagTone: "all",
    desc: "「この口コミどう返す？」「次の一手は？」——AIチャットがいつでも即回答。専門知識がなくても、迷ったらすぐ相談できます。",
  },
];

/** プランの機能行 */
export interface PlanFeature {
  text: string;
  /** 下位プランの内容を「すべて含む」見出し行 */
  head?: boolean;
}

export interface Plan {
  key: string;
  name: string;
  /** 対象者の一言 */
  audience: string;
  /** 価格（表示用） */
  price: string;
  /** 「万円」など単位 */
  priceUnit?: string;
  /** 「／月〜」など */
  per?: string;
  priceNote?: string;
  features: PlanFeature[];
  /** いちばん推すプラン */
  featured?: boolean;
  ribbon?: string;
  /** /contact/?topic= に渡すキー */
  topic: string;
  /**
   * Stripe Checkout（その場決済）の設定。
   * 設定があるプランは「カードで申し込む」ボタンを出す。
   * amountJpy は実際に請求する金額（税込）。Pro 等の見積りプランは未設定。
   */
  checkout?: {
    amountJpy: number;
    interval: "month";
  };
}

export const PLANS: Plan[] = [
  {
    key: "light",
    name: "Light",
    audience: "まずは評判改善と集客基盤から始めたい方へ。",
    price: "3",
    priceUnit: "万円",
    per: "／月〜",
    priceNote: "税別・契約期間中",
    topic: "plan-light",
    checkout: { amountJpy: 33000, interval: "month" },
    features: [
      { text: "契約者専用 AIサポート（24時間）" },
      { text: "口コミ獲得・評判改善コンサル" },
      { text: "Googleビジネスプロフィール最適化（MEO）" },
      { text: "口コミ作成ツール（タップで投稿）" },
      { text: "公式WEBサイト（契約中 無料提供）" },
      { text: "公式LINE ＋ マーケ導線（契約中 無料提供）" },
      { text: "★評価・口コミ数の月次レポート" },
    ],
  },
  {
    key: "standard",
    name: "Standard",
    audience: "悪い口コミ対策と集客を、まとめて強化したい方へ。",
    price: "6",
    priceUnit: "万円",
    per: "／月〜",
    priceNote: "税別・契約期間中",
    featured: true,
    ribbon: "いちばん選ばれています",
    topic: "plan-standard",
    checkout: { amountJpy: 66000, interval: "month" },
    features: [
      { text: "Lightの内容すべて", head: true },
      { text: "AI 口コミ対策サポート（申請はご自身で）" },
      { text: "店舗アプリ iOS / Android（契約中 無料提供）" },
      { text: "NFC口コミカード" },
      { text: "LINEマーケ導線の運用代行" },
      { text: "提携弁護士の窓口ご案内" },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    audience: "ネット上の評判リスクをまるごと防衛したい方へ。",
    price: "要お見積り",
    priceNote: "税別・契約期間中",
    topic: "plan-pro",
    features: [
      { text: "Standardの内容すべて", head: true },
      { text: "サジェスト対策" },
      { text: "逆SEO 押し下げパック" },
      { text: "提携弁護士の優先窓口" },
      { text: "専任担当による手厚いサポート" },
    ],
  },
];

export const PLANS_NOTE =
  "金額は目安です（税別）。店舗数・口コミの状況により最適なプランをご提案します。口コミ削除・サジェスト改善・検索順位はGoogle等の判断や仕様によるもので、結果を保証するものではありません。当社は削除申請を代行せず、ご自身の申請をAI等で支援します。やらせレビュー・口コミ購入は行いません。";

/** プラン選択時の連絡トピック（ContactForm と対応） */
export const PLAN_TOPIC_LABELS: Record<string, string> = {
  "plan-light": "Lightプランのお申し込み・ご相談",
  "plan-standard": "Standardプランのお申し込み・ご相談",
  "plan-pro": "Proプランのお申し込み・ご相談",
  "plan-free-diagnosis": "無料の評判診断",
};
