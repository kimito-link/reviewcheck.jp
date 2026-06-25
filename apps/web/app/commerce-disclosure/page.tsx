import type { Metadata } from "next";
import { COMMERCE, SITE } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "特定商取引法に基づく表記",
  description:
    "口コミチェック.jp 総合改善パッケージの特定商取引法に基づく表記です。",
  path: "/commerce-disclosure/",
});

const ROWS: { label: string; value: string }[] = [
  { label: "販売事業者", value: COMMERCE.seller },
  { label: "運営統括責任者", value: COMMERCE.manager },
  { label: "所在地", value: COMMERCE.address },
  { label: "電話番号", value: COMMERCE.phone },
  { label: "メールアドレス", value: COMMERCE.email },
  { label: "販売URL", value: COMMERCE.salesUrl },
  { label: "販売価格", value: COMMERCE.priceNote },
  { label: "商品代金以外の必要料金", value: COMMERCE.extraFees },
  { label: "お支払い方法", value: COMMERCE.paymentMethods },
  { label: "お支払い時期", value: COMMERCE.paymentTiming },
  { label: "役務の提供時期", value: COMMERCE.deliveryTiming },
  { label: "解約・返金について", value: COMMERCE.cancellation },
];

export default function CommerceDisclosurePage() {
  return (
    <Container className="py-12">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        特定商取引法に基づく表記
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {SITE.name} の総合改善パッケージ（月額）に関する表記です。
      </p>
      <dl className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 gap-1 p-4 sm:grid-cols-[12rem_1fr] sm:gap-4"
          >
            <dt className="text-sm font-bold text-slate-900">{row.label}</dt>
            <dd className="text-sm leading-relaxed text-slate-600">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}
