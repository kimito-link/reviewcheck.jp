import {
  fetchStore,
  fetchCompetitors,
  diagnose,
} from "@reviewcheck/core";
import type { DiagnosisResult, SelectabilityBand } from "@reviewcheck/core";
import type {
  MonitorSnapshot,
  MonitorTarget,
  Scanner,
  VerdictLevel,
} from "@reviewcheck/monitor";

/**
 * reviewcheck 用の Scanner アダプタ。
 *
 * 監視対象は「店舗（Google Place）」。MonitorTarget.url に **placeId** を格納し
 * （URLでなく汎用識別子として使う）、定期的に評判データを取得→診断→指紋化する。
 *
 * malwarecheck（外形GET）と diagnose（構造化入力）はドメインが違うが、
 * monitor がドメイン非依存（Scanner を注入される）になったので、ここで
 * DiagnosisResult を共通の MonitorSnapshot に正規化すれば同じ監視エンジンに乗る。
 */

/**
 * 「選ばれやすさ」帯を、監視共通の VerdictLevel（安全←→危険）に対応づける。
 * 評判が良い=clean、悪い=infected の語彙へ寄せる（差分検知ロジックを再利用するため）。
 */
function bandToVerdict(band: SelectabilityBand): VerdictLevel {
  switch (band) {
    case "good":
      return "clean";
    case "fair":
      return "vulnerable";
    case "weak":
      return "suspected";
    case "poor":
      return "infected";
  }
}

/** DiagnosisResult を差分比較できる軽量な指紋（MonitorSnapshot）に変換する。 */
export function diagnosisToSnapshot(
  result: DiagnosisResult,
  targetId: string,
  placeId: string,
): MonitorSnapshot {
  // 悪化検知の素材: 低評価の改善ポイント（high/medium）と各スコア要素の不調を problemIds に。
  const problemIds = [
    ...result.improvements
      .filter((i) => i.priority === "high" || i.priority === "medium")
      .map((i) => `improve:${i.id}`),
    ...result.factors
      .filter((f) => f.status !== "good")
      .map((f) => `factor:${f.id}`),
  ].sort();

  return {
    targetId,
    // url 欄は監視対象の識別子。reviewcheck では placeId を入れる。
    url: placeId,
    scannedAt: result.diagnosedAt,
    verdictLevel: bandToVerdict(result.band),
    score: result.score,
    // 評判監視に「マルウェア名」は無いので空。
    malwareNames: [],
    // 露出系も無い。評判固有の問題は problemIds に集約する。
    exposureIds: [],
    problemIds,
    // 店舗データが取得できなければ「到達不可」とみなす。
    unreachable: result.input.store.source === "manual" && result.score === 0,
  };
}

/**
 * reviewcheck の Scanner。target.url(=placeId) の店舗を診断し、指紋化する。
 * 店舗データが取れないときは diagnose せず unreachable な snapshot を返す。
 */
export function createReviewcheckScanner(): Scanner<DiagnosisResult | null> {
  return async (target: MonitorTarget) => {
    const placeId = target.url;
    const fetched = await fetchStore({ placeId }, { allowMock: false });

    if (!fetched.store) {
      // 取得不可。空の診断は作らず、到達不可スナップショットだけ返す。
      const snapshot: MonitorSnapshot = {
        targetId: target.id,
        url: placeId,
        scannedAt: new Date().toISOString(),
        verdictLevel: "clean",
        score: 0,
        malwareNames: [],
        exposureIds: [],
        problemIds: [],
        unreachable: true,
      };
      return { scan: null, snapshot };
    }

    const competitors = await fetchCompetitors(fetched.context, {
      limit: 5,
    }).catch(() => []);

    const result = diagnose(
      { store: fetched.store, competitors },
      { providers: fetched.providers },
    );
    const snapshot = diagnosisToSnapshot(result, target.id, placeId);
    return { scan: result, snapshot };
  };
}
