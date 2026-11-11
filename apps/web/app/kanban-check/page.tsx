import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { KanbanCheckForm } from "@/components/KanbanCheckForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "院名・屋号・芸名のAI第一印象診断｜あなたの看板はAIにどう見られている？",
  description:
    "クリニック・事務所・お店・芸名など、事業で掲げる看板名を入れるだけ。AIに聞いたときあなたの看板が出てくるか、どう説明されるかを実測。公開情報に基づく見え方を無料で診断します。",
  path: "/kanban-check/",
});

export default function KanbanCheckPage() {
  return (
    <Container className="py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "看板名のAI第一印象診断", path: "/kanban-check/" },
        ])}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        院名・屋号・芸名のAI第一印象診断
      </h1>
      <p className="mt-2 text-slate-600">
        あなたの院名・お店・事務所・芸名を、AIに聞くとどう答えられているでしょうか。
        事業で掲げる看板名を入れるだけで、AI・検索・サイトの「見られ方」を無料でチェックします。
      </p>
      <div className="mt-8 max-w-md">
        <KanbanCheckForm />
      </div>
    </Container>
  );
}
