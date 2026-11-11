import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { AiCheckForm } from "@/components/AiCheckForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "お店のAI第一印象｜AIにどう見られているかを確認する",
  description:
    "店名を入れると、AIに聞いたときの見え方を確認します。この確認に費用はかかりません。順位や点数が上がることは約束しません。",
  path: "/ai-check/",
});

export default function AiCheckPage() {
  return (
    <Container className="py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "AI第一印象診断", path: "/ai-check/" },
        ])}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        お店のAI第一印象診断
      </h1>
      <p className="mt-2 text-slate-600">
        あなたのお店、AIに聞くとどう答えられているでしょうか。店名を入れるだけで、
        AI・検索・口コミ・サイトの「見られ方」を確認します。この確認に費用はかかりません。
      </p>
      <div className="mt-8 max-w-md">
        <AiCheckForm />
      </div>
    </Container>
  );
}
