/**
 * 前回点数の比較。この端末の localStorage だけに1件ずつ残す。サーバには送らない。
 * キー: rc:last:<店名の短いハッシュ>
 * 値: { score, date, ruleVersion }
 */

export interface StoredScore {
  score: number;
  date: string;
  ruleVersion: string;
  /**
   * ひとつ前の診断。同じ1件の中にだけ置き、再表示や開発時の二重実行でも
   * 前回比を失わない。店名は入れない。サーバには送らない。
   */
  prev?: Pick<StoredScore, "score" | "date" | "ruleVersion"> | null;
}

export const SCORE_HISTORY_FIRST =
  "次回、この数字と比べられます（この端末にだけ保存）";

export const SCORE_HISTORY_MISMATCH =
  "採点ルールが更新されたため比較できません";

/** 店名から短い安定ハッシュ。値そのものには店名を入れない。 */
export function shortShopHash(shopName: string): string {
  const s = shopName.trim() || "（店名なし）";
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h, 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export function scoreHistoryKey(shopName: string): string {
  return `rc:last:${shortShopHash(shopName)}`;
}

export function formatMdJst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${month}/${day}`;
}

export function formatSignedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "±0";
}

function isSnapshot(
  v: Partial<StoredScore> | null | undefined,
): v is Pick<StoredScore, "score" | "date" | "ruleVersion"> {
  return (
    !!v &&
    typeof v.score === "number" &&
    Number.isFinite(v.score) &&
    typeof v.date === "string" &&
    typeof v.ruleVersion === "string"
  );
}

export function parseStoredScore(raw: string | null): StoredScore | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredScore>;
    const prevCandidate = v.prev;
    if (!isSnapshot(v)) return null;
    const prev = isSnapshot(prevCandidate) ? prevCandidate : null;
    return {
      score: v.score,
      date: v.date,
      ruleVersion: v.ruleVersion,
      ...(prev ? { prev } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * 保存済みの1件と、今回の診断を比べる。
 * 同じ取得時刻の再表示（リロードや Strict Mode の二重実行）では上書きしない。
 * 返す store が null のときは localStorage を書き換えない。
 */
function snapshot(
  s: Pick<StoredScore, "score" | "date" | "ruleVersion">,
): Pick<StoredScore, "score" | "date" | "ruleVersion"> {
  return { score: s.score, date: s.date, ruleVersion: s.ruleVersion };
}

function diffMessage(
  prior: Pick<StoredScore, "score" | "date">,
  current: Pick<StoredScore, "score">,
): string {
  const delta = Math.round(current.score) - Math.round(prior.score);
  return `前回（${formatMdJst(prior.date)}）${Math.round(prior.score)}点 → 今回${Math.round(current.score)}点（${formatSignedDelta(delta)}）`;
}

export function planScoreHistory(
  prev: StoredScore | null,
  current: StoredScore,
): { message: string; store: StoredScore | null } {
  const currentSnap = snapshot(current);
  if (
    prev &&
    prev.score === current.score &&
    prev.date === current.date &&
    prev.ruleVersion === current.ruleVersion
  ) {
    if (prev.prev && prev.prev.ruleVersion !== current.ruleVersion) {
      return { message: SCORE_HISTORY_MISMATCH, store: null };
    }
    if (prev.prev) {
      return { message: diffMessage(prev.prev, current), store: null };
    }
    return { message: SCORE_HISTORY_FIRST, store: null };
  }
  if (!prev) {
    return { message: SCORE_HISTORY_FIRST, store: currentSnap };
  }
  if (prev.ruleVersion !== current.ruleVersion) {
    return {
      message: SCORE_HISTORY_MISMATCH,
      store: { ...currentSnap, prev: snapshot(prev) },
    };
  }
  return {
    message: diffMessage(prev, current),
    store: { ...currentSnap, prev: snapshot(prev) },
  };
}
