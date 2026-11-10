"use client";

import {
  areaMedianMessage,
  formatDistanceMeters,
  type AreaComparison,
  type AreaPlace,
} from "@reviewcheck/core/areaMap";
import { useEmbedHidden } from "../diagnosis/useEmbedHidden";
import { GoogleMapsCredit } from "./GoogleMapsCredit";
import { ResultHook } from "./ResultReading";

/**
 * 順位の直下に置く、エリアの根拠。
 * 店の位置は地図タイルに載せず、一覧だけで比べる。
 * ?embed=1 では、あとから足したブロックと同じく出さない。
 */
export function AreaCompare({
  area,
  attributeToGoogle = false,
  scopeText,
}: {
  area: AreaComparison;
  /** Places の応答そのものを並べているときだけ出典を出す。 */
  attributeToGoogle?: boolean;
  scopeText?: string;
}) {
  const hidden = useEmbedHidden();
  if (hidden || area.places.length === 0) return null;

  return (
    <section
      data-result-section="area-map"
      className="rounded-2xl border border-slate-200 bg-white p-5 text-base text-slate-900 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        この検索で比べたお店
      </h2>
      <p className="mt-2 text-base leading-relaxed text-slate-800">
        上の順位は、この検索が返したお店の口コミ数です。エリア全体の順位ではありません。
      </p>
      {scopeText ? (
        <p className="mt-2 text-base leading-relaxed text-slate-800">{scopeText}</p>
      ) : null}
      <div className="mt-4">
        <AreaPlaceCards places={area.places} />
        <AreaPlaceTable places={area.places} />
      </div>
      {attributeToGoogle ? <GoogleMapsCredit /> : null}
      <p className="mt-4 text-base leading-relaxed text-slate-800">
        {areaMedianMessage(area)}{" "}
        <a
          href="#result-next-step"
          className="font-bold text-blue-800 underline decoration-blue-800 underline-offset-2"
        >
          次の一歩を見る
        </a>
      </p>
      <div className="mt-3">
        <ResultHook>主な所見は、この次です。</ResultHook>
      </div>
    </section>
  );
}

function AreaPlaceCards({ places }: { places: AreaPlace[] }) {
  return (
    <ol className="space-y-3 sm:hidden" data-area-map-list="cards" aria-label="この検索で比べたお店">
      {places.map((place) => (
        <li
          key={place.id}
          data-area-role={place.isSubject ? "subject" : "peer"}
          className={`rounded-xl border border-slate-200 p-4 ${
            place.isSubject ? "bg-slate-50" : "bg-white"
          }`}
        >
          <p className="text-base font-bold text-slate-900">{place.name}</p>
          {place.isSubject ? (
            <p className="mt-1 text-base font-bold text-slate-900">診断したお店</p>
          ) : (
            <p className="mt-1 text-base text-slate-800">周辺のお店</p>
          )}
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            <Fact term="順位" value={`第${place.reviewCountRank}位`} />
            <Fact term="星" value={place.rating.toFixed(1)} />
            <Fact term="口コミ数" value={`${place.reviewCount}件`} />
            <Fact term="距離" value={distanceLabel(place)} />
          </dl>
          <p className="mt-2 text-base">
            <MapsLink url={place.mapsUrl} />
          </p>
        </li>
      ))}
    </ol>
  );
}

function AreaPlaceTable({ places }: { places: AreaPlace[] }) {
  return (
    <div className="hidden overflow-x-auto sm:block" data-area-map-list="table">
      <table className="w-full border-collapse text-left text-base">
        <caption className="sr-only">この検索で比べたお店</caption>
        <thead>
          <tr className="border-b border-slate-300 text-slate-900">
            <th scope="col" className="px-2 py-2 font-bold">順位</th>
            <th scope="col" className="px-2 py-2 font-bold">店名</th>
            <th scope="col" className="px-2 py-2 font-bold">星</th>
            <th scope="col" className="px-2 py-2 font-bold">口コミ数</th>
            <th scope="col" className="px-2 py-2 font-bold">距離</th>
            <th scope="col" className="px-2 py-2 font-bold">Googleマップ</th>
          </tr>
        </thead>
        <tbody>
          {places.map((place) => (
            <tr
              key={place.id}
              data-area-role={place.isSubject ? "subject" : "peer"}
              className={`border-b border-slate-200 ${
                place.isSubject ? "bg-slate-50" : "bg-white"
              }`}
            >
              <td className="px-2 py-3 font-bold text-slate-900">
                第{place.reviewCountRank}位
              </td>
              <td className="px-2 py-3 text-slate-900">
                <span className="font-bold">{place.name}</span>
                {place.isSubject ? (
                  <span className="mt-0.5 block font-bold">診断したお店</span>
                ) : (
                  <span className="mt-0.5 block text-slate-800">周辺のお店</span>
                )}
              </td>
              <td className="px-2 py-3 font-bold text-slate-900">
                {place.rating.toFixed(1)}
              </td>
              <td className="px-2 py-3 text-slate-900">{place.reviewCount}件</td>
              <td className="px-2 py-3 text-slate-900">{distanceLabel(place)}</td>
              <td className="px-2 py-3">
                <MapsLink url={place.mapsUrl} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-base text-slate-800">{term}</dt>
      <dd className="text-base font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function MapsLink({ url }: { url?: string }) {
  const href = safeHttpUrl(url);
  if (!href) return <span className="text-slate-800">未取得</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-blue-800 underline decoration-blue-800 underline-offset-2"
    >
      Googleマップで開く
    </a>
  );
}

function distanceLabel(place: AreaPlace): string {
  if (place.isSubject) return "基準";
  return formatDistanceMeters(place.distanceMeters) ?? "未取得";
}

function safeHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}
