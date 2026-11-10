import { CTAS, PRICING } from "@reviewcheck/config";

export interface MeasuredProfile {
  phone?: string | null;
  website?: string | null;
  hasOpeningHours?: boolean;
}

export interface SupportOffer {
  key: "consult" | "improvement" | "meo";
  href: string;
  label: string;
  price: string;
  detail: string;
}

function priceOf(key: string): string {
  const plan = PRICING.find((item) => item.key === key);
  if (!plan) return "金額は相談時に案内します";
  return plan.priceNote ? `${plan.price}（${plan.priceNote}・目安）` : plan.price;
}

/** フィールドに含めて取得した項目だけ。写真は対象外。 */
export function measuredProfileGaps(store: MeasuredProfile): string[] {
  const gaps: string[] = [];
  if (!store.phone?.trim()) gaps.push("電話");
  if (!store.website?.trim()) gaps.push("ウェブサイト");
  if (store.hasOpeningHours === false) gaps.push("営業時間");
  return gaps;
}

/**
 * 既存メニューだけ。監視の新規申込は入れない。
 * リンクに店名・点数・Place ID は付けない。
 */
export function supportOffersForPlaces(store: MeasuredProfile): SupportOffer[] {
  const offers: SupportOffer[] = [
    {
      key: "consult",
      href: CTAS.freeConsult.href,
      label: CTAS.freeConsult.label,
      price: "初回15分は、サイトの既存表記どおり無料です。1時間あたりの料金と見積りの日数は、この料金表にはありません。",
      detail:
        "公開されている星と口コミ数を材料に、任意で次の一手を相談できます。このボタンは相談ページへの到達です。購入の確定ではありません。",
    },
    {
      key: "improvement",
      href: CTAS.improvement.href,
      label: CTAS.improvement.label,
      price: priceOf("review-improvement"),
      detail:
        "来店した人に、自分で書いてもらう口コミの頼み方を相談する既存メニューです。返信や写真が未確認であることを、購入の理由にはしていません。",
    },
  ];
  const gaps = measuredProfileGaps(store);
  if (gaps.length > 0) {
    offers.push({
      key: "meo",
      href: CTAS.profile.href,
      label: CTAS.profile.label,
      price: priceOf("meo"),
      detail: `公開情報に無かった項目は ${gaps.join("、")} です。写真は取得していないので、未登録とは書いていません。`,
    });
  }
  return offers;
}
