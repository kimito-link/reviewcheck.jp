"use client";

import { useEffect, useState } from "react";
import type { Competitor, DiagnosisResult, NearbyStore } from "@reviewcheck/core";
import { encodeReportId } from "@reviewcheck/core";
import { SITE, POLICY_NOTE } from "@reviewcheck/config";
import { ReportView } from "./ReportView";

interface CompetitorRow {
  name: string;
  rating: string;
  reviewCount: string;
}

/** 明示的に渡す店舗クエリ（現在地候補のワンタップ診断など） */
interface PlaceQuery {
  placeId?: string;
  text?: string;
  mapsUrl?: string;
}

const MAX_ROWS = 5;
const emptyRow = (): CompetitorRow => ({ name: "", rating: "", reviewCount: "" });

export function DiagnoseForm({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rating, setRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [ownerReplies, setOwnerReplies] = useState<"" | "yes" | "no">("");
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([emptyRow()]);
  const [targetRating, setTargetRating] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  // 現在地からの店舗候補（摩擦ゼロの入口）
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyStore[] | null>(null);
  const [areaHint, setAreaHint] = useState<string | null>(null);

  // /check/#competitors で来たら詳細を開く
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#competitors") {
      setAdvancedOpen(true);
    }
  }, []);

  function updateCompetitor(i: number, patch: Partial<CompetitorRow>) {
    setCompetitors((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function addCompetitor() {
    setCompetitors((rows) =>
      rows.length >= MAX_ROWS ? rows : [...rows, emptyRow()],
    );
  }
  function removeCompetitor(i: number) {
    setCompetitors((rows) => rows.filter((_, idx) => idx !== i));
  }

  // 現在地から周辺店舗候補を取得（入力ゼロ）。地図URLを貼る/打つ摩擦を消す。
  function findNearby() {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("この端末では位置情報を利用できません。店舗名で検索してください。");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/nearby?lat=${latitude}&lng=${longitude}`,
            { cache: "no-store" },
          );
          const data = await res.json();
          const stores: NearbyStore[] = Array.isArray(data?.stores)
            ? data.stores
            : [];
          setNearby(stores);
          setAreaHint(typeof data?.areaHint === "string" ? data.areaHint : null);
          if (stores.length === 0) {
            setGeoError(
              "周辺の店舗候補が見つかりませんでした。店舗名やGoogleマップURLで検索してください。",
            );
          }
        } catch {
          setGeoError("周辺店舗の取得に失敗しました。店舗名で検索してください。");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setGeoError(
          "位置情報の取得が許可されませんでした。店舗名やGoogleマップURLで検索してください。",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  // 現在地候補をワンタップで診断（入力不要）
  function diagnoseNearby(store: NearbyStore) {
    setQuery(store.name ?? "");
    setNearby(null);
    void run(false, { placeId: store.placeId, text: store.name });
  }

  function buildPayload(demo = false, place?: PlaceQuery) {
    // 追体験用デモ：順位・競合比較・あと何件・到達期間がすべて出るサンプルを固定で渡す
    if (demo) {
      return {
        demo: true,
        query: { text: "サンプル整体院（デモ）" },
        store: { rating: 4.0, reviewCount: 45, hasOwnerReplies: false },
        competitors: [
          { name: "競合A整体院", rating: 4.7, reviewCount: 320 },
          { name: "競合B整骨院", rating: 4.6, reviewCount: 210 },
          { name: "競合Cカイロ", rating: 4.5, reviewCount: 160 },
          { name: "競合D整体", rating: 4.4, reviewCount: 120 },
        ] as Competitor[],
        targetRating: undefined,
      };
    }

    const comps: Competitor[] = competitors
      .filter((r) => r.rating.trim() !== "" || r.reviewCount.trim() !== "")
      .map((r) => ({
        name: r.name.trim() || undefined,
        rating: Number(r.rating) || 0,
        reviewCount: Number(r.reviewCount) || 0,
      }))
      .filter((c) => c.rating > 0);

    const storeOverride: Record<string, unknown> = {};
    if (rating.trim() !== "") storeOverride.rating = Number(rating);
    if (reviewCount.trim() !== "") storeOverride.reviewCount = Number(reviewCount);
    if (ownerReplies === "yes") storeOverride.hasOwnerReplies = true;
    if (ownerReplies === "no") storeOverride.hasOwnerReplies = false;

    const q = query.trim();
    const isUrl = /^https?:\/\//i.test(q);
    // 現在地候補など、明示的に渡された店舗（placeId）があれば最優先で使う
    const queryField = place
      ? { placeId: place.placeId, text: place.text, mapsUrl: place.mapsUrl }
      : { text: isUrl ? undefined : q, mapsUrl: isUrl ? q : undefined };
    return {
      demo,
      query: demo ? { text: "サンプル整体院（デモ）" } : queryField,
      store: Object.keys(storeOverride).length ? storeOverride : undefined,
      competitors: comps,
      targetRating: targetRating.trim() !== "" ? Number(targetRating) : undefined,
    };
  }

  async function run(demo = false, place?: PlaceQuery) {
    setError(null);
    setNotice(null);
    setResult(null);
    if (!demo && !place && !query.trim() && rating.trim() === "") {
      setError("店舗名またはGoogleマップURLを入力してください（または「デモで試す」）。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(demo, place)),
      });
      const data = await res.json();
      // 実データが取得できない場合：架空の数値は出さず、実数値の入力を促す
      if (data?.needsManualInput) {
        setAdvancedOpen(true);
        setNotice(
          data.message ??
            "正確に診断するため、Googleマップに表示されている星評価と口コミ数を入力してください。",
        );
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "診断に失敗しました。");
      } else {
        setResult(data as DiagnosisResult);
      }
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = result
    ? `${SITE.baseUrl}/report/${encodeReportId(result.input)}/`
    : undefined;

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(false);
        }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label htmlFor="store-query" className="block text-sm font-bold text-slate-900">
          店舗名 または GoogleマップURL
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="store-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder="例：〇〇整体院 / https://maps.app.goo.gl/..."
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "診断中…" : "無料で診断する"}
          </button>
        </div>

        {/* 摩擦ゼロの入口：入力せず現在地からワンタップで診断 */}
        {!result ? (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-500">または</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={findNearby}
              disabled={geoLoading || loading}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-60 sm:w-auto"
            >
              <span aria-hidden>📍</span>
              {geoLoading ? "現在地を確認中…" : "現在地からお店を探す（入力不要）"}
            </button>

            {geoError ? (
              <p className="mt-2 text-xs text-amber-700">{geoError}</p>
            ) : null}

            {nearby && nearby.length > 0 ? (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <p className="text-xs font-bold text-slate-700">
                  現在地周辺{areaHint ? `（${areaHint}付近）` : ""}のお店
                  <span className="ml-1 font-normal text-slate-500">
                    ／ タップで診断
                  </span>
                </p>
                <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
                  {nearby.map((s) => (
                    <li key={s.placeId}>
                      <button
                        type="button"
                        onClick={() => diagnoseNearby(s)}
                        disabled={loading}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-900">
                            {s.name ?? "店舗"}
                          </span>
                          {s.category ? (
                            <span className="block truncate text-xs text-slate-500">
                              {s.category}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          {typeof s.rating === "number" ? (
                            <span className="text-xs font-bold text-slate-700">
                              ★{s.rating.toFixed(1)}
                            </span>
                          ) : null}
                          {typeof s.reviewCount === "number" ? (
                            <span className="font-mono text-xs text-slate-500">
                              {s.reviewCount}件
                            </span>
                          ) : null}
                          <span className="text-blue-600" aria-hidden>
                            ›
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-slate-500">
                  ※ 位置情報はお店候補の表示にのみ使用し、保存しません。
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 追体験：入力前に結果イメージを体験してもらい、入力ハードルを下げる */}
        {!result ? (
          <div className="mt-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  入力せずに、まず結果サンプルを体験
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  サンプル店舗で「順位・あと何件・追いつくまでの目安」が
                  どう表示されるか30秒で確認できます。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void run(true)}
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-blue-600 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white disabled:opacity-60"
              >
                ▶ サンプル結果を見る
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {advancedOpen ? "詳細を閉じる" : "実際の数値・競合を入力（任意）"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}

        {notice ? (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p>{notice}</p>
            {/^https?:\/\//i.test(query.trim()) ? (
              <a
                href={query.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block font-bold text-blue-700 hover:underline"
              >
                Googleマップで数値を確認する →
              </a>
            ) : null}
            <p className="mt-1 text-xs text-blue-700">
              下の「星評価」「口コミ数」に入力して「この条件で再診断する」を押してください。
            </p>
          </div>
        ) : null}

        {advancedOpen ? (
          <div className="mt-5 space-y-6 border-t border-slate-100 pt-5">
            {/* 自店舗の実数値 */}
            <div>
              <p className="text-sm font-bold text-slate-900">
                自店舗の実際の数値（任意・取得値を上書き）
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="星評価（1.0〜5.0）">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="例：4.1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </Field>
                <Field label="口コミ数">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={reviewCount}
                    onChange={(e) => setReviewCount(e.target.value)}
                    placeholder="例：50"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </Field>
                <Field label="口コミへの返信">
                  <select
                    value={ownerReplies}
                    onChange={(e) =>
                      setOwnerReplies(e.target.value as "" | "yes" | "no")
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">未確認</option>
                    <option value="yes">返信している</option>
                    <option value="no">返信していない</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* 競合 */}
            <div id="competitors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">
                  競合店舗（最大{MAX_ROWS}件）
                </p>
                <button
                  type="button"
                  onClick={addCompetitor}
                  disabled={competitors.length >= MAX_ROWS}
                  className="rounded-lg border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  ＋ 競合を追加
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {competitors.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateCompetitor(i, { name: e.target.value })}
                      placeholder="競合名（任意）"
                      className="col-span-5 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={row.rating}
                      onChange={(e) => updateCompetitor(i, { rating: e.target.value })}
                      placeholder="星"
                      className="col-span-3 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={row.reviewCount}
                      onChange={(e) =>
                        updateCompetitor(i, { reviewCount: e.target.value })
                      }
                      placeholder="口コミ数"
                      className="col-span-3 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCompetitor(i)}
                      aria-label="削除"
                      className="col-span-1 text-slate-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 目標 */}
            <div className="max-w-xs">
              <Field label="目標の星評価（任意・未指定なら競合平均）">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={targetRating}
                  onChange={(e) => setTargetRating(e.target.value)}
                  placeholder="例：4.5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => void run(false)}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              この条件で再診断する
            </button>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-slate-500">{POLICY_NOTE}</p>
      </form>

      {loading ? <LoadingCard /> : null}
      {result ? <ReportView result={result} shareUrl={shareUrl} /> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function LoadingCard() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      <p className="text-sm font-medium text-slate-600">
        口コミの状態を診断しています…
      </p>
      <p className="text-xs text-slate-500">
        星評価・口コミ数・競合との差・選ばれやすさスコアを計算中
      </p>
    </div>
  );
}
