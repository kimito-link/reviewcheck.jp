/**
 * アフィリエイター紹介コード（?ref=RH-XXXX）の永続化。
 *
 * DiagnoseForm は着地直後の window.location.search から ref を読めるが、
 * それは「同一セッションで診断→結果表示まで一気に進む」場合のみ有効。
 * 共有された /report/[id]/ リンクを後から踏む・タブを閉じて後日再訪する等、
 * 遷移を挟むと ?ref= はURLに残らず失われる（設計 DESIGN-affiliate-program-2026-07-06.md P0-A）。
 *
 * そこで localStorage に TTL 30日・last-click（新しい ref が来たら上書き）で保持し、
 * URL に ref が無いページでも「直近に踏んだ紹介コード」を復元できるようにする。
 * 金額や契約内容には影響しない（webhook側の帰属解決に使われるだけ）ため、
 * 改ざんされても実害は「他人の紹介を横取り」止まり（実装者への地雷マップ参照）。
 */

const STORAGE_KEY = "rc_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REF_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

interface StoredRef {
  code: string;
  savedAt: number;
}

function isValidRefCode(code: string): boolean {
  return REF_PATTERN.test(code);
}

/**
 * URL の ?ref= を読み、妥当なら localStorage に保存する（last-click で上書き）。
 * 呼び出し側の一番外側（着地ページ）で1回呼べばよい。
 */
export function captureRefFromLocation(): void {
  if (typeof window === "undefined") return;
  const raw = new URLSearchParams(window.location.search).get("ref")?.trim();
  if (!raw || !isValidRefCode(raw)) return;
  const entry: StoredRef = { code: raw, savedAt: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage 不可（プライベートモード等）は静かに諦める。ref無し=RVCHK維持で安全側。
  }
}

/**
 * 保存済みの ref を読む。TTL切れ・不正値・未保存は null。
 */
export function readStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRef>;
    if (typeof parsed.code !== "string" || typeof parsed.savedAt !== "number") return null;
    if (!isValidRefCode(parsed.code)) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed.code;
  } catch {
    return null;
  }
}

/**
 * 着地時のURLの ref を最優先し、無ければ保存済みの ref にフォールバックする。
 * DiagnoseForm・/report/[id]/ の双方で同じ優先順位を使う。
 */
export function resolveRefCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  captureRefFromLocation();
  return readStoredRef() ?? undefined;
}
