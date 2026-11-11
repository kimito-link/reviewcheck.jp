/**
 * 消していない記録の一覧。この関数は削除しない。
 * 本番の Redis / KV / ブラウザ履歴を消す手順は、別の承認がいる。
 */

export const RETENTION_NOT_DELETED = [
  "rc:store:v1:*",
  "rc:comp:v1:*",
  "rc:comp:v2:*",
  "rc:nearby:v1:*",
  "rc:cohort:v1:*",
  "mc:snapshot:*",
  "monitor target records",
  "browser localStorage rc:last:*",
  "extension storage that already has older entries",
  "legacy share URLs still held by browsers and request logs",
] as const;

export function retentionCleanupPlan(): {
  executable: false;
  reason: string;
  patterns: readonly string[];
} {
  return {
    executable: false,
    reason:
      "本番データの削除は未承認です。この計画はキー名を示すだけで、接続も削除もしません。",
    patterns: RETENTION_NOT_DELETED,
  };
}
