import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { DiagnoseForm } from "@/components/DiagnoseForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { softwareApplicationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "無料で口コミ診断｜店舗名・GoogleマップURLで星評価と競合差をチェック",
  description:
    "店舗名またはGoogleマップURLを入力して、Google口コミの星評価・口コミ数・競合との差・選ばれやすさスコアを無料で診断。あと何件の高評価口コミで競合に追いつけるかが分かります。",
  path: "/check/",
});

export default function CheckPage() {
  return (
    <Container className="py-12">
      <JsonLd
        data={[
          softwareApplicationJsonLd(),
          breadcrumbJsonLd([
            { name: "トップ", path: "/" },
            { name: "口コミ診断", path: "/check/" },
          ]),
        ]}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        無料で口コミ診断
      </h1>
      <p className="mt-2 text-slate-600">
        店舗名またはGoogleマップURLを入れるだけ。星評価・口コミ数・競合との差・「あと何件で追いつけるか」を診断します。
      </p>
      <div className="mt-8">
        {/* 免責文は DiagnoseForm 内で出す（結果表示時は ReportView 内の Disclaimer に一本化し、二重表示を防ぐ）。 */}
        <DiagnoseForm />
      </div>
    </Container>
  );
}
