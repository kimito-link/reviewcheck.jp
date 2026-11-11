import { readReportReference } from "@reviewcheck/core";

export type ReportLoadPlan =
  | { fetch: false; reason: "invalid" | "no-place" | "link-only"; placeId?: string };

/**
 * 共有ページは Place ID から地図リンクと相談へ進むだけ。
 * 人でもボットでも Places は呼ばない。費用も、店名・星の保存も発生しない。
 */
export function reportLoadPlan(id: string, _preview = false): ReportLoadPlan {
  const ref = readReportReference(id);
  if (!ref) return { fetch: false, reason: "invalid" };
  if (ref.kind === "legacy-no-place") return { fetch: false, reason: "no-place" };
  return { fetch: false, reason: "link-only", placeId: ref.placeId };
}
