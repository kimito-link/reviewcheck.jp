"use client";

import type { DiagnosisResult } from "@reviewcheck/core";
import { FINDING_CARD_TEXTS } from "@reviewcheck/core";
import { buildAreaComparison } from "@reviewcheck/core/areaMap";
import { Disclaimer } from "../Disclaimer";
import { ShareReport } from "../ShareReport";
import { SharerLineConsult } from "../SharerLineConsult";
import { DiagnosisPerks } from "./DiagnosisPerks";
import { GoogleMapsCredit } from "./GoogleMapsCredit";
import { OtherMenus } from "./OtherMenus";
import { AreaCompare } from "./AreaCompare";
import { UnconfirmedList } from "./ResultReading";
import { supportOffersForPlaces } from "@/lib/supportOffers";
import { collectUnconfirmedLines, formatDiagnosedAtJst } from "@/lib/resultCopy";
import { postFunnel } from "@/lib/postFunnel";

/**
 * Google から取った結果の通常画面。
 * 独自点数・順位・その履歴は、相談の理由にしない。
 */
export function PlacesFactsView({
  result,
  shareUrl,
  refLine,
}: {
  result: DiagnosisResult;
  shareUrl?: string;
  refLine?: string;
}) {
  const store = result.input.store;
  const competitors = result.input.competitors ?? [];
  const offers = supportOffersForPlaces(store);
  const area = buildAreaComparison(store, competitors);
  const missed = collectUnconfirmedLines(result);
  const when = formatDiagnosedAtJst(result.diagnosedAt);

  return (
    <div className="space-y-8 pb-28">
      <section
        id="result-score"
        data-result-section="result"
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
        {result.placesAttributed ? <GoogleMapsCredit /> : null}
        <p className="mt-3 text-base leading-relaxed text-slate-800">
          取得時刻 {when}（日本時間）。未確認の項目は、不足や減点としては扱っていません。
        </p>
      </section>

      {area ? (
        <AreaCompare
          area={area}
          attributeToGoogle={result.placesAttributed === true}
          scopeText={result.areaScopeText}
          showGap={false}
          lead="この検索が返したお店の、公開されている星と口コミ数です。第何位かは出していません。エリア全体の順位でもありません。"
        />
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

      <DiagnosisPerks result={result} cohort={null} />

      {shareUrl ? (
        <div data-result-section="share" className="space-y-4">
          <ShareReport url={shareUrl} ruleVersion={result.ruleVersion} factsOnly refLine={refLine} />
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
        {result.areaScopeText ? <p>{result.areaScopeText}</p> : null}
        <p>{FINDING_CARD_TEXTS.roleDeclaration}</p>
        <p>ブラウザでこのページを開いたことは、購入でも売上でもありません。</p>
      </section>

      <div data-result-section="disclaimer">
        <Disclaimer />
      </div>

      <OtherMenus suggestHref="/suggest-check/" monitoringPaused />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg">
          <a
            href={offers[0]?.href ?? "/contact/?topic=consult"}
            onClick={() => postFunnel("cta", "consult")}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-3 text-base font-bold text-white"
          >
            15分の無料相談ページを開く
          </a>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <dt className="text-sm font-bold text-slate-700">{label}</dt>
      <dd className="mt-1 break-all text-base font-bold text-slate-900">{value}</dd>
    </div>
  );
}
