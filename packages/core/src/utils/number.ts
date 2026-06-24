/** value を min〜max に丸める */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 小数第1位で四捨五入（星評価の表示用） */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Googleの星評価表示と同じく小数第1位までに整える（0.0〜5.0） */
export function normalizeRating(value: number): number {
  return round1(clamp(value, 0, 5));
}

/** 非負整数に整える（口コミ数用） */
export function toCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}
