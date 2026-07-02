import { NextRequest, NextResponse } from "next/server";
import {
  buildProbePrompt,
  composeAiVisibilityScore,
  sanitizeStoreName,
} from "@reviewcheck/core";

/**
 * AIプローブAPI（設計 P0-1）。LLM を「回答サンプルの測定器」として使い、
 * 項目1「AIからの見え方」(満点25) のスコアと、表示用のAI回答例を返す。
 *
 * 景表法: LLMは採点しない。回答に自店が登場/正しく説明されたかの「事実」だけを
 * core の scoreRecommendProbe/scoreDescribeProbe で判定する。
 * 障害時（キー未設定・API失敗・タイムアウト）は score:null を返し、呼び出し側は按分する。
 * インジェクション対策: プロンプト生成は core 側で <data> 区切り＋sanitize 済み。
 */

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// 安価・高速なモデル（Groq 無料枠）。キーが無ければ probe はスキップ→按分。
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 9000;

async function askLlm(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const store = sanitizeStoreName(sp.get("store") ?? "");
  const area = sp.get("area") ?? undefined;
  const category = sp.get("category") ?? undefined;

  if (!store) {
    return NextResponse.json(
      { score: null, recommendAnswer: null, describeAnswer: null },
      { status: 200 },
    );
  }

  // 2プローブを並列取得（片方失敗でも他方で採点・両方失敗なら score:null＝按分）。
  const [recommendAnswer, describeAnswer] = await Promise.all([
    askLlm(buildProbePrompt("recommend", { store, area, category })),
    askLlm(buildProbePrompt("describe", { store, area, category })),
  ]);

  const score = composeAiVisibilityScore(recommendAnswer, describeAnswer, store);

  return NextResponse.json(
    {
      score, // number(0..25) | null（按分）
      // 表示用の生回答（フィルタは表示側 filterAiAnswer で行う）。日時とモデルは表示側で付す。
      recommendAnswer,
      describeAnswer,
      model: MODEL,
    },
    {
      status: 200,
      // 同一店の再診断はエッジ/ブラウザキャッシュで24h吸収（体験の一貫性＆コスト対策・地雷#10）。
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    },
  );
}
