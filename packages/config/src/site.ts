/**
 * サイト全体の定数（単一情報源）。
 * ドメインは www なし・https 統一。URL は末尾スラッシュ付きで統一する。
 * ※ ドメイン／サービス名はここだけ変えれば全体に反映される（後から変更しやすい構成）。
 */
export const SITE = {
  name: "口コミチェック.jp",
  nameEn: "Review Check Site",
  domain: "reviewcheck.jp",
  baseUrl: "https://reviewcheck.jp",
  locale: "ja_JP",
  defaultTitle:
    "口コミチェック.jp｜あなたの店舗は、選ばれるお店ですか？Google口コミを無料診断",
  defaultDescription:
    "店舗名またはGoogleマップURLを入れるだけ。Google口コミの星評価・口コミ数・競合との差を見える化。あと何件・何点の高評価口コミで競合に近づけるかを無料で診断します。口コミ改善・レビュー返信・MEO対策・悪評対策のご相談も可能です。",
  /** 検索意図に沿った口コミ・MEO特化キーワード（meta keywords / 内部最適化の指針） */
  keywords: [
    "Google口コミ",
    "Google口コミ 増やす",
    "Google口コミ 改善",
    "Google口コミ 対策",
    "Googleレビュー",
    "Googleレビュー 増やす",
    "Googleマップ 口コミ",
    "Googleビジネスプロフィール 口コミ",
    "MEO対策",
    "MEO 口コミ",
    "店舗 口コミ 改善",
    "口コミ 集客",
    "悪い口コミ 対策",
    "低評価口コミ 対策",
    "口コミ返信",
    "Google口コミ 診断",
    "Google口コミ 競合比較",
    "選ばれるお店",
  ],
  ogImage: "/icons/icon-512.png",
  twitter: "@reversehackrepu",
  /** 相談・申し込みの問い合わせ先（後で実フォーム/メールに差し替え） */
  contactUrl: "/contact/",
  /** 問い合わせメール（後で実アドレスに差し替え） */
  contactEmail: "support@reviewcheck.jp",
  /**
   * LINE公式アカウント（最重要のコンバージョン導線）。
   * 運営「リバースハック」の相談LINE。
   */
  line: {
    url: "https://lin.ee/58NU9sq",
    label: "LINEで相談する",
  },
  /** ヒーロー直下・CTA付近に出す信頼シグナル（運営：リバースハック） */
  trustSignals: [
    "簡易診断は無料",
    "Googleポリシー準拠の正当な改善のみ",
    "やらせ・口コミ購入は一切なし",
    "店舗・クリニック・飲食店の実績多数",
    "LINEで専門家がアドバイス",
  ],
  /** 運営ブランド（reverse-Re:birth hack） */
  organization: {
    name: "リバースハック",
    nameEn: "ReverseHack",
    legalName: "リバースハック（reverse-Re:birth hack）",
    url: "https://reviewcheck.jp",
    logo: "https://reviewcheck.jp/icons/icon-512.png",
    slogan: "不利な状態を、選ばれる状態へ。口コミ・MEO改善ブランド。",
    description:
      "リバースハック（reverse-Re:birth hack）は、Google口コミ・MEO・店舗レビューの改善を支援し、店舗・クリニック・飲食店が「選ばれるお店」になることをサポートするブランドです。",
  },
} as const;

/**
 * 特定商取引法に基づく表記（オンライン決済を行う場合は法的に必須）。
 * 事業者情報は姉妹サービスと同一法人（株式会社ベストトラスト＝Stripe名義 best-trust.biz）の
 * 確定済み表記を使用。価格・解約条件は本サービス（口コミ・MEO総合改善の月額）向けに調整。
 */
export const COMMERCE = {
  seller: "株式会社ベストトラスト",
  manager: "小林 孝至",
  address: "〒394-0083 長野県岡谷市長地柴宮2-5-65",
  phone:
    "0266-55-4993（※ご相談・お見積り・解約は、記録を残すため極力LINEよりお願いします）",
  email: "info@best-trust.biz",
  salesUrl: SITE.baseUrl,
  priceNote:
    "各プランに表示の金額（税込・月額）。Light 33,000円／月、Standard 66,000円／月。Proは内容に応じて個別にお見積り。詳しくは /plans をご確認ください。",
  extraFees:
    "プラン料金以外の費用は原則かかりません。インターネット接続料・通信費等はお客様のご負担です。別途ライセンス料（外部サービス等）が必要な場合は、お客様の実費負担となります。",
  paymentMethods: "クレジットカード決済（Stripe）",
  paymentTiming:
    "月額サブスクリプションです。初回はお申し込み時に課金し、翌月以降は毎月同日に自動更新・自動課金されます。",
  deliveryTiming:
    "お申し込み・決済確認後、順次。初期ヒアリングを経て、口コミ・MEO・評判改善の基盤づくり（公式WEB・LINE・アプリ等）を開始します。月額の役務は契約期間中、継続して提供します。",
  cancellation:
    "解約はお問い合わせフォームまたはLINE（https://lin.ee/58NU9sq）よりお申し出ください。お申し出を確認した月の手続き完了をもって、翌月以降の請求を停止します。役務・デジタル提供の性質上、提供済み期間分の返金はいたしかねます。提供物に重大な不備があった場合は、契約・サポートの範囲で対応します。なお、検索順位・口コミ件数・星評価等の成果は検索エンジン等の判断に依存するため保証の対象外です。",
} as const;

/**
 * 必ず全診断結果・各ページに表示する免責文。
 * 検索順位・来店数・口コミ増加・星評価の改善を保証しないための共通注意文。
 */
export const DISCLAIMER =
  "この診断はGoogleマップ等の公開情報や入力情報をもとにした簡易診断です。検索順位・来店数・口コミ増加・星評価の改善を保証するものではありません。当サービスは、不正な口コミ投稿・口コミ購入・やらせレビュー・競合への低評価工作などは一切行わず、実際の顧客体験にもとづいた正当な口コミ獲得導線・返信改善・店舗情報改善のみを支援します。表示される数値（あと何件・何点 等）はGoogleの丸め処理や反映タイミングがあるため、あくまで目安です。";

/** 正当性ポリシー（フォーム・診断結果に併記する短い宣言） */
export const POLICY_NOTE =
  "口コミの購入・偽レビュー・競合への低評価などの違反行為は行いません。Googleのポリシーに違反しない正当な口コミ改善を前提とします。";
