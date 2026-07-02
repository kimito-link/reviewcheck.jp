import type { Metadata } from "next";
import Link from "next/link";
import {
  decodeReportId,
  composeAiCheckScore,
  filterAiAnswer,
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
  const input = decodeReportId(id);
  const name = input?.store.name ?? "お店";
  return buildMetadata({
    title: `「${name}」のAI第一印象診断結果｜AI・ネットの見られ方スコア`,
    description: `「${name}」がAIやネットにどう見られているかを実測した簡易レポート（AI・検索・口コミ・サイトの見え方スコア）。数値は見え方の現状の目安です。`,
    path: `/ai-report/${id}/`,
    ogType: "article",
  });
}

/** 内部の ai-probe API を叩く（失敗は null＝按分）。 */
async function fetchAiProbe(
  base: string,
  store: string,
  area?: string,
): Promise<{ score: number | null; recommendAnswer: string | null; describeAnswer: string | null; model: string } | null> {
  try {
    const u = new URL("/api/ai-probe", base);
    u.searchParams.set("store", store);
    if (area) u.searchParams.set("area", area);
    const res = await fetch(u.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** web-health API でサイト健康スコア(0..20)を得る。URL不明・失敗は null＝按分。 */
async function fetchSiteHealth(url: string): Promise<{ score: number; note: string } | null> {
  try {
    const u = new URL("https://app.web-health-check.link/api/site-health");
    u.searchParams.set("url", url);
    const res = await fetch(u.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      issues?: string[];
      warnings?: string[];
      goodPoints?: string[];
    };
    const good = data.goodPoints?.length ?? 0;
    const warn = data.warnings?.length ?? 0;
    const issue = data.issues?.length ?? 0;
    // 良点で加点・警告/問題で減点し 0..20 にクランプ（決定的ルール）。
    const raw = 20 - issue * 6 - warn * 2 + Math.min(good, 4) * 0;
    const score = Math.max(0, Math.min(20, raw + Math.min(good, 4) * 2 - 8));
    const note =
      issue > 0
        ? "サイトに改善余地の傾向があります"
        : warn > 0
          ? "軽微な改善余地の傾向があります"
          : "基本的な項目は整っている傾向です";
    return { score: Math.max(0, Math.min(20, score)), note };
  } catch {
    return null;
  }
}

export default async function AiReportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const input = decodeReportId(id);

  if (!input || !input.store.name) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">レポートが見つかりませんでした</h1>
        <p className="mt-2 text-slate-600">もう一度診断してください。</p>
        <Link href="/ai-check/" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700">
          AI第一印象診断へ
        </Link>
      </Container>
    );
  }

  const storeName = input.store.name;
  const area = input.store.address;
  const base = SITE.baseUrl;

  // 各項目を取得（失敗した項目は「対象外(null)」＝按分で吸収・設計 地雷#8）。
  const probe = await fetchAiProbe(base, storeName, area);
  // サイトURLが入力にあれば site-health を取る（AI診断の入口は店名主体なので多くは対象外）。
  const siteUrl = input.store.mapsUrl && /^https?:\/\//.test(input.store.mapsUrl) ? input.store.mapsUrl : null;
  const site = siteUrl ? await fetchSiteHealth(siteUrl) : null;

  const factors: AiCheckFactorInput[] = [
    {
      key: "aiVisibility",
      score: probe?.score ?? null,
      note:
        probe?.score != null && probe.score > 0
          ? "AIに認識されている傾向があります"
          : "AIにまだ十分認識されていない傾向があります",
    },
    // 口コミ・検索・なりすましは P0 では店名のみ入口のため対象外→按分（P1で本実装・設計 §4 P1-5）。
    { key: "reviews", score: null },
    { key: "search", score: null },
    { key: "siteHealth", score: site?.score ?? null, note: site?.note },
    { key: "impersonation", score: null },
  ];

  const score = composeAiCheckScore(factors);

  // AI回答の表示前フィルタ（自店以外の固有名詞・断定ネガ文を除外・地雷#2）。
  const describe = probe?.describeAnswer ?? "";
  const filtered = filterAiAnswer(describe, storeName);
  const aiSafeHead = filtered.safeSentences[0] ?? null;
  const aiRedactedCount =
    filtered.redactedCount + Math.max(0, filtered.safeSentences.length - 1);

  const now = new Date();
  const probedAtLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  const data: AiReportData = {
    score,
    storeName,
    aiSafeHead,
    aiRedactedCount,
    negativeSuggestCount: 0, // P0 は未実装（P1-5 でサジェスト本実装）
    probedAtLabel,
    probedModel: probe?.model ?? "AI",
    shareUrl: `${SITE.baseUrl}/ai-report/${id}/`,
  };

  return (
    <Container className="py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "AI第一印象診断", path: "/ai-check/" },
          { name: "診断結果", path: `/ai-report/${id}/` },
        ])}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        「{storeName}」のAI第一印象診断結果
      </h1>
      <p className="mt-2 text-slate-600">
        AIやネットでの「見られ方」を実測した簡易レポートです（数値は見え方の現状の目安）。
      </p>
      <div className="mt-8">
        <AiReportView {...data} />
      </div>
    </Container>
  );
}
