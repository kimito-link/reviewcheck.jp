import type { DiagnosisInput } from "../types/index";

/**
 * 古い共有ID。base64url(JSON(診断入力))。
 * 新しい共有は encodePlaceReportId を使う。この関数は、AI診断など
 * Googleの店舗データを載せない既存のIDと、古いリンクの読み取りに残す。
 * 口コミ診断の画面は、ここから復元した星・店名・座標を表示に使わない。
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

const PLACE_REPORT_PREFIX = "p1.";

/**
 * 口コミ診断の共有ID。place ID だけを載せる。
 * 店名・星・口コミ数・座標・電話は入れない。
 */
export function encodePlaceReportId(placeId: string): string {
  const id = placeId.trim();
  const json = JSON.stringify({ placeId: id });
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = base64Encode(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${PLACE_REPORT_PREFIX}${b64}`;
}

export type ReportReference =
  | { kind: "place"; placeId: string }
  | { kind: "legacy-place"; placeId: string }
  | { kind: "legacy-no-place" };

/**
 * 共有IDから、取り直すための place ID だけを読む。
 * 古いIDに星や店名が入っていても、戻り値には載せない。
 */
export function readReportReference(id: string): ReportReference | null {
  if (id.startsWith(PLACE_REPORT_PREFIX)) {
    return readPlacePayload(id.slice(PLACE_REPORT_PREFIX.length));
  }
  const legacy = decodeReportId(id);
  if (!legacy) return null;
  const placeId = legacy.store.placeId?.trim();
  if (placeId) return { kind: "legacy-place", placeId };
  return { kind: "legacy-no-place" };
}

function readPlacePayload(encoded: string): ReportReference | null {
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = base64Decode(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 1 || keys[0] !== "placeId") return null;
    if (typeof record.placeId !== "string") return null;
    const placeId = record.placeId.trim();
    if (!placeId || placeId.length > 512) return null;
    return { kind: "place", placeId };
  } catch {
    return null;
  }
}
