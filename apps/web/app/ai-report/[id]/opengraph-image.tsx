import { ImageResponse } from "next/og";
import { decodeReportId } from "@reviewcheck/core";

/**
 * AI第一印象診断 結果ページの動的OG画像（設計 P1-1）。
 * SNSシェア時のカードに「店名＋AIに聞いてみた」を出してシェアの絵にする。
 * スコアは metadata 時点で非同期計算するとカードが不安定になるため出さず、
 * ブランドと自分事化（店名）で拡散のフックを作る（実スコアは結果ページ本体で表示）。
 */
export const runtime = "edge";
export const alt = "お店のAI第一印象診断";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const input = decodeReportId(id);
  const store = input?.store.name ?? "あなたのお店";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#065f46,#059669)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 30,
            background: "rgba(255,255,255,0.18)",
            border: "2px solid rgba(255,255,255,0.4)",
            borderRadius: 999,
            padding: "8px 28px",
            marginBottom: 40,
          }}
        >
          AIに聞いてみた
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, textAlign: "center", lineHeight: 1.3 }}>
          「{store}」の
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, textAlign: "center", lineHeight: 1.3 }}>
          AI第一印象診断
        </div>
        <div style={{ fontSize: 30, marginTop: 40, opacity: 0.92 }}>
          あなたのお店は、AIにどう見られている？
        </div>
        <div style={{ fontSize: 26, marginTop: 24, opacity: 0.8 }}>
          reviewcheck.jp
        </div>
      </div>
    ),
    { ...size },
  );
}
