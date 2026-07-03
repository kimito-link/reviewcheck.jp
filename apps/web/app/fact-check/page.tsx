import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { FactCheckForm } from "@/components/FactCheckForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "公開情報ビュー｜企業・法人の公開情報を、そのまま映す",
  description:
    "法人名・サービス名を入れると、外部から観測できる公開情報とその所在を、判定せずそのまま表示します。取引先確認・コンプライアンス確認の記録づくりに。見える化だけ、結論はあなたの手で。",
  path: "/fact-check/",
});

export default function FactCheckPage() {
  return (
    <Container className="py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "公開情報ビュー", path: "/fact-check/" },
        ])}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        公開情報ビュー
      </h1>
      <p className="mt-2 text-slate-600">
        企業・法人・サービスについて、外部から観測できる公開情報と、その所在をそのまま映します。
        良し悪しの判定や将来の予測は行いません。<b>見える化だけ、結論はあなたの手で。</b>
      </p>
      <div className="mt-8 max-w-md">
        <FactCheckForm />
      </div>
    </Container>
  );
}
