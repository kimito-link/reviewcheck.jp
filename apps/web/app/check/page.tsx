import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { DiagnoseForm } from "@/components/DiagnoseForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { softwareApplicationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "口コミの公開情報を見る",
  description:
    "店舗名またはGoogleマップURLから、公開されている星と口コミ数を表示します。点数と順位は出しません。この診断に費用はかかりません。",
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
        口コミの公開情報を見る
      </h1>
      <p className="mt-2 text-slate-600">
        店舗名またはGoogleマップURLを入れるだけ。取得できた星と口コミ数を、出典つきで表示します。点数と順位は出しません。この診断に費用はかかりません。
      </p>
      <div className="mt-8">
        {/* 免責文は DiagnoseForm 内で出す（結果表示時は ReportView 内の Disclaimer に一本化し、二重表示を防ぐ）。 */}
        <DiagnoseForm />
      </div>
    </Container>
  );
}
