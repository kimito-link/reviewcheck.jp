/**
 * 業種ごとの検索半径。調査で確定した商圏ではなく、1回の周辺検索に渡す設計上の仮定。
 * 半径を自動で広げて再検索はしない。利用者が半径を選び直す操作は、別の明示的な1回になる。
 */

export const NEARBY_SAMPLE_CAP = 20;
/** 返った20件に診断したお店が含まれると、周辺は最大19件。 */
export const PEERS_IF_SELF_INCLUDED = 19;
/** 画面に残す周辺店の上限。APIの20件より少なく、点数と相談の前に長くしすぎない。 */
export const RETAINED_COMPETITOR_LIMIT = 10;

const DEFAULT_RADIUS_METERS = 1500;

/** primaryType（Placesの英語キー）→ メートル。表示名では判定しない。 */
const RADIUS_BY_PRIMARY_TYPE: Record<string, number> = {
  cafe: 800,
  bakery: 800,
  meal_takeaway: 800,
  restaurant: 1500,
  hair_care: 3000,
  beauty_salon: 3000,
  dentist: 3000,
  gym: 3000,
  store: 5000,
  supermarket: 5000,
  lodging: 10000,
  tourist_attraction: 10000,
};

export interface CatchmentAssumption {
  radiusMeters: number;
  /** 仮定表に primaryType が一致したときだけ true。無いときは同じ業種とは言わない。 */
  categoryMatched: boolean;
}

export function catchmentAssumption(primaryType: string | undefined): CatchmentAssumption {
  if (primaryType && Object.prototype.hasOwnProperty.call(RADIUS_BY_PRIMARY_TYPE, primaryType)) {
    return {
      radiusMeters: RADIUS_BY_PRIMARY_TYPE[primaryType] as number,
      categoryMatched: true,
    };
  }
  return { radiusMeters: DEFAULT_RADIUS_METERS, categoryMatched: false };
}

/** 一覧のそばに出す説明。エリア全体の順位とは書かない。 */
export function areaScopeText(input: {
  primaryType?: string;
  shown: number;
}): string {
  const assumed = catchmentAssumption(input.primaryType);
  const radius = assumed.categoryMatched
    ? `半径${assumed.radiusMeters}mは、取得した業種に対する設計上の目安です。`
    : `半径${assumed.radiusMeters}mは、業種が特定できないときの設計上の目安です。同じ業種とは限りません。`;
  const shown = Math.max(0, Math.min(input.shown, RETAINED_COMPETITOR_LIMIT));
  return `${radius}検索が返すのは最大${NEARBY_SAMPLE_CAP}件で、診断したお店が含まれると周辺は最大${PEERS_IF_SELF_INCLUDED}件です。画面にはそのうち${shown}件までを出しています。エリア全体の順位ではありません。`;
}
