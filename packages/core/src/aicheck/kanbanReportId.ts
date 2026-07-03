/**
 * 看板名診断レポート /kanban-report/[id] の id を stateless に生成・復元する。
 * 既存 encodeReportId（DiagnosisInput 専用）を汚さないため、看板名版は専用 encode を持つ
 * （後方互換・既存 ai-report を1文字も触らない・設計 §5 の「別ルート」流儀）。
 */

import type { KanbanCategory } from "./kanban";
import { isKanbanCategory } from "./kanban";

export interface KanbanReportInput {
  /** 看板名（院名・屋号・芸名）。 */
  name: string;
  /** カテゴリ（憲法・全出し分けを決める）。 */
  category: KanbanCategory;
  /** 地域（医療は必須・同名施設の混同を切る）。 */
  area?: string;
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(id: string): string {
  let b64 = id.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeKanbanReportId(input: KanbanReportInput): string {
  const payload = {
    v: 1 as const,
    n: input.name,
    c: input.category,
    ...(input.area ? { a: input.area } : {}),
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeKanbanReportId(id: string): KanbanReportInput | null {
  try {
    const parsed = JSON.parse(fromBase64Url(id)) as {
      v?: number;
      n?: string;
      c?: string;
      a?: string;
    };
    if (!parsed || parsed.v !== 1) return null;
    if (!parsed.n || typeof parsed.n !== "string") return null;
    if (!parsed.c || !isKanbanCategory(parsed.c)) return null;
    return {
      name: parsed.n,
      category: parsed.c,
      ...(parsed.a ? { area: parsed.a } : {}),
    };
  } catch {
    return null;
  }
}
