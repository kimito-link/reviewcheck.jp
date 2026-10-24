import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  diagnose,
  decodeReportId,
  SCORE_RULE_VERSION,
} from "@reviewcheck/core";

/**
 * 共有カード。点数をいちばん大きく出す。
 * サイトアイコンではなく、この結果専用の画像。
 */
export const runtime = "nodejs";
export const alt = "選ばれやすさの目安｜口コミチェック.jp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_URL =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@5.2.8/japanese-700-normal.ttf";

async function loadFont(): Promise<ArrayBuffer> {
  const local = path.join(process.cwd(), "assets/fonts/NotoSansJP-Bold.ttf");
  try {
    const buf = await readFile(local);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } catch {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error("font");
    return res.arrayBuffer();
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const input = decodeReportId(id);
  let scoreLabel = "—/100";
  let shop = "口コミ診断";
  if (input) {
    try {
      const result = diagnose(input, {
        providers: input.store.source === "places" ? ["google-places"] : [],
      });
      scoreLabel = `${result.score}/100`;
      shop = result.input.store.name?.trim() || "店舗";
    } catch {
      shop = input.store.name?.trim() || shop;
    }
  }
  if (shop.length > 28) shop = `${shop.slice(0, 28)}…`;

  let font: ArrayBuffer | null = null;
  try {
    font = await loadFont();
  } catch {
    font = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          background: "#F8FAFC",
          color: "#0F172A",
          padding: "64px 72px",
          fontFamily: font ? "Noto Sans JP" : "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 148,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          {scoreLabel}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {shop}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 32,
            color: "#334155",
          }}
        >
          {`目安・採点ルール v${SCORE_RULE_VERSION}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 28,
            color: "#1A365D",
            fontWeight: 700,
          }}
        >
          reviewcheck.jp
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Noto Sans JP", data: font, weight: 700, style: "normal" }]
        : undefined,
    },
  );
}
