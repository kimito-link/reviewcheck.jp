import {
  areaScopeText,
  diagnose,
  fetchCompetitors,
  fetchStore,
  getEnabledProviders,
  guardMessage,
  MAX_COMPETITORS,
  PLACES_COST_YEN,
  withPublicPoint,
  type Competitor,
  type DiagnosisResult,
} from "@reviewcheck/core";
import { guardPlacesCall } from "@/lib/costGuard";

export type SharedPlaceLoad =
  | { ok: true; result: DiagnosisResult }
  | { ok: false; message: string };

/**
 * 共有リンクを開いた人の画面用。応答は返すが、Redis には書かない。
 * 店舗の取得と周辺の取得は、それぞれ既存の回数と予算の関所を通る。
 */
export async function loadSharedPlace(
  request: Request,
  placeId: string,
): Promise<SharedPlaceLoad> {
  const placesEnabled = getEnabledProviders().length > 0;
  if (placesEnabled) {
    const storeGuard = await guardPlacesCall(request, "diagnose", PLACES_COST_YEN.store);
    if (!storeGuard.ok) {
      return { ok: false, message: guardMessage(storeGuard.reason, "store") };
    }
  }

  const fetched = await fetchStore({ placeId }, { allowMock: false });
  if (!fetched.store || fetched.store.source !== "places") {
    return {
      ok: false,
      message: "いまは店舗の公開情報を取り直せませんでした。店舗名から、もう一度診断してください。",
    };
  }

  let competitors: Competitor[] = [];
  let searchedPeers = false;
  if (fetched.context && placesEnabled) {
    const peerGuard = await guardPlacesCall(
      request,
      "diagnose",
      PLACES_COST_YEN.competitors,
    );
    if (peerGuard.ok) {
      searchedPeers = true;
      competitors = await fetchCompetitors(fetched.context, {
        limit: MAX_COMPETITORS,
      }).catch(() => []);
    }
  }

  const store = withPublicPoint(fetched.store, fetched.context);
  const result = diagnose(
    { store, competitors },
    { providers: fetched.providers },
  );
  result.placesAttributed = true;
  if (searchedPeers) {
    result.areaScopeText = areaScopeText({
      primaryType: fetched.context?.primaryType,
      shown: competitors.length,
    });
  }
  return { ok: true, result };
}
