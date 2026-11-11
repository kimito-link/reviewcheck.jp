import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * 共有カード。店名・点数・座標は描かない。
 * この画像を作るために Places は呼ばない。
 */
export const runtime = "nodejs";
export const alt = "口コミ診断の共有｜口コミチェック.jp";
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

export default async function Image() {
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
        <div style={{ fontSize: 36, fontWeight: 700 }}>口コミチェック.jp</div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 28 }}>口コミ診断の共有</div>
        <div style={{ fontSize: 28, marginTop: 28, color: "#334155" }}>
          このページは店舗を取り直しません
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
