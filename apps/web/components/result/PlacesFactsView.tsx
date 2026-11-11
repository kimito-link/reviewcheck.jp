"use client";

import { FINDING_CARD_TEXTS } from "@reviewcheck/core";
import { CONSULT_OPEN_LABEL } from "@reviewcheck/config";
import { Disclaimer } from "../Disclaimer";
import { ShareReport } from "../ShareReport";
import { SharerLineConsult } from "../SharerLineConsult";
import { DiagnosisPerks } from "./DiagnosisPerks";
import { GoogleMapsCredit } from "./GoogleMapsCredit";
import { OtherMenus } from "./OtherMenus";
import { UnconfirmedList } from "./ResultReading";
import { supportOffersForPlaces } from "@/lib/supportOffers";
import { formatDiagnosedAtJst } from "@/lib/resultCopy";
import { postFunnel } from "@/lib/postFunnel";
import { StickyConsult, stickyConsultPadding } from "./StickyConsult";
import type { PublicFacts, PublicPeer } from "@/lib/placesPublic";

/**
 * Google から取った結果の通常画面。
 * 独自点数・順位・その履歴は、相談の理由にしない。
 */
export function PlacesFactsView({
  facts,
  shareUrl,
  refLine,
}: {
  facts: PublicFacts;
  shareUrl?: string;
  refLine?: string;
}) {
  const store = facts.input.store;
  const competitors = facts.input.competitors ?? [];
  const offers = supportOffersForPlaces(store);
  const rows = publicRows(store, competitors);
  const missed = unconfirmedFromStore(store);
  const when = formatDiagnosedAtJst(facts.diagnosedAt);

  return (
    <div className="space-y-8" style={stickyConsultPadding()}>
      <section
        id="result-score"
        data-result-section="result"
        data-sticky-protect=""
        className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <p className="text-base font-bold text-slate-900">今回取得できた公開情報</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{store.name || "店舗"}</h1>
        {store.category || store.address ? (
          <p className="mt-1 text-base text-slate-800">
            {[store.category, store.address].filter(Boolean).join("｜")}
          </p>
        ) : null}
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact label="星" value={store.rating.toFixed(1)} />
          <Fact label="口コミ" value={`${store.reviewCount}件`} />
          <Fact label="電話" value={store.phone?.trim() || "公開情報に無し"} />
          <Fact label="ウェブサイト" value={store.website?.trim() || "公開情報に無し"} />
          <Fact
            label="営業時間"
            value={store.hasOpeningHours ? "公開情報にあり" : "公開情報に無し"}
          />
          <Fact label="写真" value="今回は取得していません" />
          <Fact label="返信" value="今回は取得していません" />
          <Fact label="最新口コミの日付" value="今回は取得していません" />
        </dl>
        {store.mapsUrl ? (
          <a
            href={store.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-base font-bold text-blue-800 underline decoration-blue-800 underline-offset-2"
          >
            Googleマップで開く
          </a>
        ) : null}
        {facts.placesAttributed ? <GoogleMapsCredit /> : null}
        <p className="mt-3 text-base leading-relaxed text-slate-800">
          取得時刻 {when}（日本時間）。未確認の項目は、不足や減点としては扱っていません。
        </p>
      </section>

      {facts.sample ? (
        <p className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-base leading-relaxed text-slate-900">
          これはサンプルです。架空の数値で、Googleへは問い合わせていません。
        </p>
      ) : null}

      {rows.length > 0 ? (
        <section
          data-result-section="area-map"
          data-sticky-protect=""
          className="rounded-2xl border border-slate-200 bg-white p-5 text-base text-slate-900 shadow-sm sm:p-6"
        >
          <h2 className="text-xl font-extrabold text-slate-900">この検索で比べたお店</h2>
          <p className="mt-2 leading-relaxed text-slate-800">
            公開されている星と口コミ数です。順位は付けていません。
          </p>
          {facts.areaScopeText ? (
            <p className="mt-2 leading-relaxed text-slate-800">{facts.areaScopeText}</p>
          ) : null}
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-bold">{row.name}</p>
                {row.subject ? <p className="font-bold">診断したお店</p> : <p>周辺のお店</p>}
                <p className="mt-1">
                  星 {row.rating.toFixed(1)}／口コミ {row.reviewCount}件
                  {typeof row.distanceMeters === "number"
                    ? `／${row.distanceMeters}m`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
          {facts.placesAttributed ? <GoogleMapsCredit /> : null}
        </section>
      ) : null}

      <section
        id="result-next-step"
        data-result-section="cta"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-xl font-extrabold text-slate-900">任意の支援</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-800">
          相談は任意です。月次の自動巡回は、新規では受けていません。金額は既存メニューの表示です。
        </p>
        <ul className="mt-4 space-y-3">
          {offers.map((offer) => (
            <li key={offer.key} className="rounded-xl border border-slate-200 p-4">
              <a
                href={offer.href}
                data-funnel={`cta:${offer.key}`}
                onClick={() => postFunnel("cta", offer.key)}
                className="text-base font-bold text-blue-800 underline decoration-blue-800 underline-offset-2"
              >
                {offer.label}
              </a>
              <p className="mt-1 text-base font-bold text-slate-900">{offer.price}</p>
              <p className="mt-1 text-base leading-relaxed text-slate-800">{offer.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <DiagnosisPerks
        result={{
          input: { store, competitors: [] },
          diagnosedAt: facts.diagnosedAt,
        }}
        cohort={null}
      />

      {shareUrl ? (
        <div data-result-section="share" className="space-y-4">
          <ShareReport url={shareUrl} factsOnly refLine={refLine} />
          <SharerLineConsult refLine={refLine} />
        </div>
      ) : null}

      <UnconfirmedList
        lines={missed}
        note="未確認の項目は、販売の理由にしていません。"
      />

      <section data-result-section="method" className="text-base leading-relaxed text-slate-800">
        <p>店名の検索は Place ID だけを受け取り、口コミ本文は取っていません。</p>
        <p>
          半径は業種ごとの設計上の仮定です。調査で確定した商圏ではありません。半径を自動で広げて再検索はしていません。
        </p>
        {facts.areaScopeText ? <p>{facts.areaScopeText}</p> : null}
        <p>{FINDING_CARD_TEXTS.roleDeclaration}</p>
        <p>ブラウザでこのページを開いたことは、購入でも売上でもありません。</p>
      </section>

      <div data-result-section="disclaimer">
        <Disclaimer />
      </div>

      <OtherMenus suggestHref="/suggest-check/" monitoringPaused />

      <StickyConsult>
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg">
          <a
            href={offers[0]?.href ?? "/contact/?topic=consult"}
            onClick={() => postFunnel("cta", "consult")}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-3 text-base font-bold text-white"
          >
            {CONSULT_OPEN_LABEL}
          </a>
        </div>
      </StickyConsult>
    </div>
  );
}

function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const radius = 6371000;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function unconfirmedFromStore(store: PublicFacts["input"]["store"]): string[] {
  const lines: string[] = [];
  if (typeof store.hasPhotos !== "boolean") lines.push("写真：今回は取得していません。点数には入れていません。");
  if (typeof store.hasOwnerReplies !== "boolean") {
    lines.push("返信：今回は取得していません。点数には入れていません。");
  }
  if (typeof store.daysSinceLastReview !== "number") {
    lines.push("最新口コミの日付：今回は取得していません。点数には入れていません。");
  }
  return lines;
}

function publicRows(store: PublicFacts["input"]["store"], peers: PublicPeer[]) {
  const origin =
    typeof store.lat === "number" && typeof store.lng === "number"
      ? { lat: store.lat, lng: store.lng }
      : null;
  const rows = [
    {
      id: store.placeId || "subject",
      name: store.name || "診断したお店",
      rating: store.rating,
      reviewCount: store.reviewCount,
      subject: true,
      distanceMeters: undefined as number | undefined,
    },
    ...peers.map((peer, index) => {
      const point =
        typeof peer.lat === "number" && typeof peer.lng === "number"
          ? { lat: peer.lat, lng: peer.lng }
          : null;
      const distance =
        origin && point ? Math.round(metersBetween(origin, point)) : undefined;
      return {
        id: peer.placeId || `peer-${index}`,
        name: peer.name || "周辺のお店",
        rating: peer.rating,
        reviewCount: peer.reviewCount,
        subject: false,
        distanceMeters: distance,
      };
    }),
  ];
  return rows;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <dt className="text-sm font-bold text-slate-700">{label}</dt>
      <dd className="mt-1 break-all text-base font-bold text-slate-900">{value}</dd>
    </div>
  );
}
