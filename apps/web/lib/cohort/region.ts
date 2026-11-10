/**
 * 住所から、集計キーに使う地域だけを取る。
 * 市区町村まで取れればそこまで。取れなければ都道府県。
 * 番地・建物名・郵便番号は返さない。
 */

const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;

export interface CohortRegion {
  prefecture: string;
  /** 市区町村。政令市は最初の「市」まで（区は入れない）。東京都のように市が無いときは区。 */
  municipality: string | null;
  /** 表示とキーに使うラベル。例: 長野県岡谷市 / 長野県 */
  label: string;
}

export function normalizeAddressForRegion(address: string): string {
  return address
    .normalize("NFKC")
    .replace(/日本、?/g, "")
    .replace(/〒?\d{3}-?\d{4}/g, "")
    .replace(/\s+/g, "");
}

export function parseCohortRegion(
  address: string | undefined | null,
): CohortRegion | null {
  if (!address) return null;
  const s = normalizeAddressForRegion(address);
  if (!s) return null;

  let found: { pref: string; index: number } | null = null;
  for (const pref of PREFECTURES) {
    const index = s.indexOf(pref);
    if (index >= 0 && (found === null || index < found.index)) {
      found = { pref, index };
    }
  }
  if (!found) return null;

  const rest = s.slice(found.index + found.pref.length);
  const muniMatch = rest.match(/^(.{1,12}?[市区町村])/);
  const municipality = muniMatch?.[1] ?? null;
  const label = municipality ? `${found.pref}${municipality}` : found.pref;
  if (label.length > 24) return null;
  return { prefecture: found.pref, municipality, label };
}
