import { createHash } from "node:crypto";

/**
 * URL から安定した監視対象IDを生成する。
 * 同じURLは常に同じIDになり、保存キーとして使える。ドメイン非依存。
 *
 * ブランド固有の「診断結果 → MonitorSnapshot」変換は monitor には置かない
 * （各ブランドの結果型に依存するため）。各ブランドが Scanner として注入する。
 */
export function stableTargetId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}
