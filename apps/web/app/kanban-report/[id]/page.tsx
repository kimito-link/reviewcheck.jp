import type { Metadata } from "next";
import Link from "next/link";
import {
  decodeKanbanReportId,
  composeAiCheckScore,
  filterAiAnswer,
  scoreSearch,
  KANBAN_FACTOR_APPLIES,
  KANBAN_CATEGORIES,
  KANBAN_DISCARD_PATTERNS,
  KANBAN_EXTRA_NEGATIVE_PATTERNS,
  type AiCheckFactorInput,
} from "@reviewcheck/core";
import { SITE } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { AiReportView, type AiReportData } from "@/components/AiReportView";
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
  const input = decodeKanbanReportId(id);
  const name = input?.name ?? "看板名";
  return buildMetadata({
    title: `「${name}」のAI第一印象診断結果｜看板名のネットの見られ方`,
    description: `「${name}」がAIやネットにどう見られているかを実測した簡易レポート。公開情報に基づく見え方の現状の目安です。`,
    path: `/kanban-report/${id}/`,
    ogType: "article",
  });
}

/** ai-probe API を看板名カテゴリ付きで叩く（失敗は null＝按分）。 */
async function fetchKanbanProbe(
  base: string,
  name: string,
  category: string,
  area?: string,
): Promise<{ score: number | null; describeAnswer: string | null; model: string } | null> {
  try {
    const u = new URL("/api/ai-probe", base);
    u.searchParams.set("store", name);
    u.searchParams.set("kanban", category);
    if (area) u.searchParams.set("area", area);
    const res = await fetch(u.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** suggest API（検索の見え方・公式サイト特定＝ソフトゲート判定に使う）。失敗は null。 */
async function fetchSuggest(
  base: string,
  name: string,
): Promise<{ negativeCount: number; hasOfficialSite: boolean } | null> {
  try {
    const u = new URL("/api/suggest", base);
    u.searchParams.set("q", name);
    const res = await fetch(u.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { negatives?: unknown[] };
    const negativeCount = Array.isArray(data.negatives) ? data.negatives.length : 0;
    // suggest が返れば検索での存在は確認できたとみなす（公式サイト特定の近似・ソフトゲート）。
    return { negativeCount, hasOfficialSite: true };
  } catch {
    return null;
  }
}

export default async function KanbanReportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const input = decodeKanbanReportId(id);

  if (!input) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">レポートが見つかりませんでした</h1>
        <p className="mt-2 text-slate-600">もう一度診断してください。</p>
        <Link href="/kanban-check/" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700">
          看板名のAI第一印象診断へ
        </Link>
      </Container>
    );
  }

  const { name, category, area } = input;
  const base = SITE.baseUrl;
  const applies = KANBAN_FACTOR_APPLIES[category];

  const [probe, suggest] = await Promise.all([
    fetchKanbanProbe(base, name, category, area),
    fetchSuggest(base, name),
  ]);

  // 公式プレゼンスのソフトゲート（設計 §1-2）: 確認できた時だけAI回答カードを表示。
  const officialPresence = suggest?.hasOfficialSite ?? false;

  const searchScore =
    applies.search && suggest
      ? scoreSearch(suggest.negativeCount, suggest.hasOfficialSite, true)
      : null;
  const negativeSuggestCount = suggest?.negativeCount ?? 0;

  // カテゴリ別ファクター適用マトリクスで対象外(null)を決める（按分で吸収）。
  const factors: AiCheckFactorInput[] = [
    {
      key: "aiVisibility",
      score: applies.aiVisibility ? probe?.score ?? null : null,
      note:
        probe?.score != null && probe.score > 0
          ? "AIに認識されている傾向があります"
          : "AIにまだ十分認識されていない傾向があります",
    },
    // 口コミは入口では公開データ未取得＝対象外→按分（医療は本実装時に外形のみ）。
    { key: "reviews", score: null },
    {
      key: "search",
      score: searchScore,
      note:
        searchScore != null
          ? negativeSuggestCount > 0
            ? "検索候補に気になる語がある傾向です"
            : "検索候補は概ね良好な傾向です"
          : undefined,
    },
    { key: "siteHealth", score: null },
    { key: "impersonation", score: null },
  ];

  const score = composeAiCheckScore(factors);

  // AI回答の表示前フィルタ（3クラス化・discard＝センシティブ属性はどこにも出さない・地雷#2）。
  // 公式プレゼンス未確認なら AI回答カードは出さない（ソフトゲート）。
  let aiSafeHead: string | null = null;
  let aiRedactedCount = 0;
  if (officialPresence && probe?.describeAnswer) {
    const filtered = filterAiAnswer(probe.describeAnswer, name, {
      discardPatterns: KANBAN_DISCARD_PATTERNS,
      extraNegativePatterns: KANBAN_EXTRA_NEGATIVE_PATTERNS[category],
    });
    aiSafeHead = filtered.safeSentences[0] ?? null;
    aiRedactedCount =
      filtered.redactedCount + Math.max(0, filtered.safeSentences.length - 1);
  }

  const now = new Date();
  const probedAtLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  const categoryLabel = KANBAN_CATEGORIES.find((c) => c.key === category)?.label ?? "";

  const data: AiReportData = {
    score,
    storeName: name,
    aiSafeHead,
    aiRedactedCount,
    negativeSuggestCount,
    probedAtLabel,
    probedModel: probe?.model ?? "AI",
    shareUrl: `${SITE.baseUrl}/kanban-report/${id}/`,
    variant: "kanban",
  };

  return (
    <Container className="py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "看板名のAI第一印象診断", path: "/kanban-check/" },
          { name: "診断結果", path: `/kanban-report/${id}/` },
        ])}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        「{name}」のAI第一印象診断結果
      </h1>
      <p className="mt-2 text-slate-600">
        {categoryLabel ? `${categoryLabel}の` : ""}看板名が、AIやネットでどう見られているかを実測した簡易レポートです（数値は見え方の現状の目安）。
      </p>
      {!officialPresence ? (
        <p className="mt-2 text-sm text-slate-500">
          公式情報が確認できなかったため、AI回答の表示は控えています。公式サイト・公式SNSをお持ちの場合はURLを添えてLINEでご相談ください。
        </p>
      ) : null}
      <div className="mt-8">
        <AiReportView {...data} />
      </div>
    </Container>
  );
}
