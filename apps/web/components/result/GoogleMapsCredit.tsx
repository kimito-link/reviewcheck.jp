/**
 * Places の応答を出した面の出典。
 * 文言は公式のテキスト表記。ロゴ画像は、改変せず置けるファイルが無いので使わない。
 * 手入力やサンプルには出さない。
 */
export function GoogleMapsCredit({
  lead = "店名・星・口コミ数の出典",
}: {
  lead?: string;
}) {
  return (
    <p className="mt-3 text-base leading-relaxed text-slate-800" data-places-attribution="">
      {lead}{" "}
      <span translate="no" className="gmp-attribution">
        Google Maps
      </span>
    </p>
  );
}
