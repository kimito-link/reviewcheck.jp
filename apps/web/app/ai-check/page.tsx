import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { AiCheckForm } from "@/components/AiCheckForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "お店のAI第一印象診断｜あなたの店はAIにどう見られている？無料チェック",
  description:
    "店名を入れるだけ。AIに聞いたときあなたのお店が出てくるか、どう説明されるかを実測。口コミ・検索・サイトの見え方も含めてAI・ネット第一印象スコアを無料で診断します。",
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
        AI・検索・口コミ・サイトの「見られ方」を無料でチェックします。
      </p>
      <div className="mt-8 max-w-md">
        <AiCheckForm />
      </div>
    </Container>
  );
}
