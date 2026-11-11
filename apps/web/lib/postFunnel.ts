"use client";

import type { FunnelSlot } from "./funnelEvents";

/** ブラウザからの到達。失敗しても画面は止めない。売上としては数えない。 */
export function postFunnel(
  event: "diagnosis_start" | "cta" | "apply",
  slot?: FunnelSlot,
): void {
  const body = slot ? { event, slot } : { event };
  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
