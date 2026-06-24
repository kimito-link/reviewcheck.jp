import type { DiagnosisInput } from "../types/index";

/**
 * 診断結果ページ /report/[id]/ の id を、診断入力からステートレスに生成・復元する。
 * DB不要・共有URL可。id は base64url(JSON(診断入力))。
 * （結果そのものはレポートページ側で診断ロジックを再実行して描画する設計）
 */
export function encodeReportId(input: DiagnosisInput): string {
  const json = JSON.stringify(compact(input));
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = base64Encode(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeReportId(id: string): DiagnosisInput | null {
  try {
    let b64 = id.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = base64Decode(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as DiagnosisInput;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.store ||
      typeof parsed.store.rating !== "number"
    ) {
      return null;
    }
    if (!Array.isArray(parsed.competitors)) parsed.competitors = [];
    return parsed;
  } catch {
    return null;
  }
}

/** undefined を落として id を短くする */
function compact(input: DiagnosisInput): DiagnosisInput {
  return JSON.parse(JSON.stringify(input)) as DiagnosisInput;
}

function base64Encode(bin: string): string {
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bin, "binary").toString("base64");
}

function base64Decode(b64: string): string {
  if (typeof atob === "function") return atob(b64);
  return Buffer.from(b64, "base64").toString("binary");
}
