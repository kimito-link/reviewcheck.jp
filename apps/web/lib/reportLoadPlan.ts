import { readReportReference } from "@reviewcheck/core";

export type ReportLoadPlan =
  | { fetch: false; reason: "invalid" | "preview" | "no-place" }
  | { fetch: true; placeId: string };

/**
 * 共有ページが Places を呼ぶかどうか。
 * プレビューと、place ID の無い古いリンクは呼ばない。
 * 呼ぶときも place ID だけを渡す。古いIDに入っていた星や店名は使わない。
 */
export function reportLoadPlan(id: string, preview: boolean): ReportLoadPlan {
  const ref = readReportReference(id);
  if (!ref) return { fetch: false, reason: "invalid" };
  if (preview) return { fetch: false, reason: "preview" };
  if (ref.kind === "legacy-no-place") return { fetch: false, reason: "no-place" };
  return { fetch: true, placeId: ref.placeId };
}
