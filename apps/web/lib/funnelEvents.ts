/**
 * 匿名の到達カウント。購入・売上・粗利ではない。
 * 店名・点数・Place ID・メールは受け付けない。
 */

export const FUNNEL_EVENTS = ["diagnosis_start", "diagnosis_complete", "cta", "apply"] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export const FUNNEL_SLOTS = [
  "consult",
  "improvement",
  "meo",
  "profile",
  "review-reply",
  "report",
  "bad-review",
  "suggest",
  "plan-light",
  "plan-standard",
  "plan-pro",
] as const;

export type FunnelSlot = (typeof FUNNEL_SLOTS)[number];

const EVENT_SET = new Set<string>(FUNNEL_EVENTS);
const SLOT_SET = new Set<string>(FUNNEL_SLOTS);

export interface FunnelAccept {
  event: FunnelEventName;
  slot?: FunnelSlot;
}

export function acceptFunnelBody(input: unknown): FunnelAccept | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => key !== "event" && key !== "slot")) return null;
  if (typeof record.event !== "string" || !EVENT_SET.has(record.event)) return null;
  const event = record.event as FunnelEventName;
  if (event === "diagnosis_start" || event === "diagnosis_complete") {
    if ("slot" in record) return null;
    return { event };
  }
  if (typeof record.slot !== "string" || !SLOT_SET.has(record.slot)) return null;
  if (record.slot === "monitoring") return null;
  return { event, slot: record.slot as FunnelSlot };
}

export function funnelStorageKey(accepted: FunnelAccept): string {
  return accepted.slot
    ? `rc:funnel:v1:${accepted.event}:${accepted.slot}`
    : `rc:funnel:v1:${accepted.event}`;
}
