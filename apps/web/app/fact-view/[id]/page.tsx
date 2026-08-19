import type { Metadata } from "next";
import Link from "next/link";
import {
  decodeOsintReportId,
  OSINT_OBSERVATION_TEMPLATES,
  OSINT_POINTER_CATALOG,
  OSINT_POINTER_CATALOG_HANDLE,
  isRenderableFact,
  type OsintFact,
} from "@reviewcheck/core";
import { SITE } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { FactView, type FactViewData } from "@/components/FactView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const input = decodeOsintReportId(id);
  const name = input?.name ?? "対象";
  return buildMetadata({
    title: `「${name}」の公開情報ビュー`,
    description: `「${name}」について外部から観測できる公開情報と、その所在の記録です。判定は含みません。`,
    path: `/fact-view/${id}/`,
    ogType: "article",
  });
}

/** AIプローブ（言及の有無のみ・逐語は出さない・設計 §2-4）。失敗は null。 */
async function fetchMention(base: string, name: string): Promise<{ mentioned: boolean; model: string } | null> {
  try {
    const u = new URL("/api/ai-probe", base);
    u.searchParams.set("store", name);
    const res = await fetch(u.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { describeAnswer: string | null; model: string };
    // 逐語は使わず「言及があったか」の事実だけ導く（名前が回答に含まれるか）。
    const mentioned = Boolean(data.describeAnswer && data.describeAnswer.includes(name));
    return { mentioned, model: data.model ?? "AI" };
  } catch {
    return null;
  }
}

/** suggest（検索候補の件数・公式サイトの存在）。失敗は null。 */
async function fetchSuggest(base: string, name: string): Promise<{ count: number } | null> {
  try {
    const u = new URL("/api/suggest", base);
    u.searchParams.set("q", name);
    const res = await fetch(u.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { suggestions?: unknown[] };
    return { count: Array.isArray(data.suggestions) ? data.suggestions.length : 0 };
  } catch {
    return null;
  }
}

export default async function FactViewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const input = decodeOsintReportId(id);

  if (!input) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">記録が見つかりませんでした</h1>
        <Link href="/fact-check/" className="mt-6 inline-flex rounded-xl bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-900">
          公開情報ビューへ
        </Link>
      </Container>
    );
  }

  const { name, targetType, compliance } = input;
  const base = SITE.baseUrl;
  const at = new Date().toISOString().slice(0, 10);

  const [mention, suggest] = await Promise.all([
    fetchMention(base, name),
    fetchSuggest(base, name),
  ]);

  // 全表示文字列は観測文テンプレ辞書経由（自由文ゼロ・禁句を含まない・設計 §2-2）。
  const facts: OsintFact[] = [];
  const retrievalFailures: { source: string; attemptedAt: string }[] = [];

  if (mention) {
    facts.push({
      source: { name: "AIアシスタントの回答", kind: "AI" },
      retrievedAt: at,
      observation: mention.mentioned
        ? OSINT_OBSERVATION_TEMPLATES.aiMentioned(name, mention.model, at)
        : OSINT_OBSERVATION_TEMPLATES.aiNotMentioned(name, mention.model, at),
    });
  } else {
    retrievalFailures.push({ source: "AIアシスタントの回答", attemptedAt: at });
  }

  if (suggest) {
    facts.push({
      source: { name: "検索オートコンプリート", kind: "検索候補" },
      retrievedAt: at,
      observation: OSINT_OBSERVATION_TEMPLATES.suggestCount(suggest.count, at),
    });
  } else {
    retrievalFailures.push({ source: "検索オートコンプリート", attemptedAt: at });
  }

  // 必須フィールドの揃った Fact だけを渡す（isRenderableFact で二重チェック）。
  const safeFacts = facts.filter(isRenderableFact);

  const data: FactViewData = {
    targetName: name,
    facts: safeFacts,
    retrievalFailures,
    // ★対象タイプで Pointer Map を出し分ける（2026-08-19）。
    //   corporation … 官報・法人登記・行政処分など（コンプラ確認カテゴリのみ）
    //   brand       … 活動ネーム（インフルエンサー・配信者）向け。掲示板/検索候補/SNS
    //   ★brand 側は compliance フラグに関係なく出す。活動ネームの利用者は
    //     「コンプラ確認」を選ばないため、compliance 条件だと永久に出ない。
    pointers:
      targetType === "brand"
        ? OSINT_POINTER_CATALOG_HANDLE
        : compliance
          ? OSINT_POINTER_CATALOG
          : [],
  };

  return (
    <Container className="py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "公開情報ビュー", path: "/fact-check/" },
          { name: "確認記録", path: `/fact-view/${id}/` },
        ])}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        「{name}」の公開情報
      </h1>
      <p className="mt-2 text-slate-600">
        外部から観測できる公開情報と、その所在の記録です（取得日時つき）。判定は含みません。
      </p>
      <div className="mt-8">
        <FactView {...data} />
      </div>
    </Container>
  );
}
