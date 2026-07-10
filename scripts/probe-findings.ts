/**
 * 所見辞書（packages/core/src/findings）の probe。
 * 実行: npx tsx scripts/probe-findings.ts （テストランナー無し環境の検証慣習）
 * 設計: docs/DESIGN-report-doctor-story-2026-07-08.md §D-5・§E 受入基準2。
 *
 * (a) 辞書・固定文の全文字列（代表値差し込み込み）が禁句照合を通ること
 * (b) selectReviewFindings の境界値・複合・fail-closed 挙動が期待表と全一致すること
 * 辞書オブジェクトを直接走査するので、所見を追記すれば (a) は自動で対象に入る。
 */

import type {
  CompetitorComparison,
  DiagnosisResult,
  SelectabilityBand,
  StoreInput,
} from "../packages/core/src/types/index";
import {
  buildThreadMapMaterials,
  FINDING_CARD_TEXTS,
  isFindingBannedFree,
  REVIEW_FINDING_DEFS,
  REVIEW_FINDING_GOOD_DEF,
  selectReviewFindings,
  THREAD_MAP_TEXTS,
} from "../packages/core/src/findings/index";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failures++;
    console.error(`  NG  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeResult(over: {
  store?: Partial<StoreInput>;
  comparison?: Partial<CompetitorComparison> | null;
  band?: SelectabilityBand;
  score?: number;
}): DiagnosisResult {
  const store: StoreInput = {
    rating: 4.0,
    reviewCount: 30,
    source: "places",
    ...over.store,
  };
  const comparison: CompetitorComparison | null =
    over.comparison === undefined || over.comparison === null
      ? null
      : {
          avgRating: 4.0,
          // store 既定 30件と揃え、K3（母数差）が意図せず同時成立しないようにする
          avgReviewCount: 30,
          ratingDiff: 0,
          reviewCountDiff: 0,
          ratingRank: 1,
          reviewCountRank: 1,
          total: 5,
          ...over.comparison,
        };
  return {
    input: { store, competitors: [] },
    diagnosedAt: "2026-07-08T00:00:00.000Z",
    score: over.score ?? 60,
    band: over.band ?? "fair",
    summary: "",
    factors: [],
    comparison,
    simulation: {
      currentRating: store.rating,
      currentReviewCount: store.reviewCount,
      targetRating: 4.5,
      targetBasis: "preset",
      scenarios: [],
    },
    improvements: [],
    disclaimer: "",
    providers: [],
  };
}

// ---------------------------------------------------------------
console.log("== (a) 禁句照合（辞書・固定文の全文字列） ==");

// 全所見の build が通る代表値（差し込み済みの実文字列を禁句照合にかける）
const richResult = makeResult({
  store: {
    reviewCount: 12,
    lowRatingRatio: 0.35,
    hasOwnerReplies: false,
    daysSinceLastReview: 365,
  },
  comparison: { avgRating: 4.2, avgReviewCount: 48, ratingDiff: -0.5, total: 6 },
  band: "weak",
});

for (const def of [...REVIEW_FINDING_DEFS, REVIEW_FINDING_GOOD_DEF]) {
  const f = def.build(richResult);
  const fields: [string, string | null][] = [
    ["name", f.name],
    ["finding", f.finding],
    ["structure", f.structure],
    ["selfCare", f.selfCare],
    ["chip", f.chip],
  ];
  for (const [field, text] of fields) {
    if (text == null) continue;
    check(
      `${f.key}.${field} 禁句なし`,
      isFindingBannedFree(text),
      `違反文字列: ${text}`,
    );
  }
}
for (const [key, text] of Object.entries(FINDING_CARD_TEXTS)) {
  check(`FINDING_CARD_TEXTS.${key} 禁句なし`, isFindingBannedFree(text), text);
}
for (const [key, text] of Object.entries(THREAD_MAP_TEXTS)) {
  check(`THREAD_MAP_TEXTS.${key} 禁句なし`, isFindingBannedFree(text), text);
}

// ---------------------------------------------------------------
console.log("== (b) selectReviewFindings の期待表 ==");

type Expect =
  | { kind: "null" }
  | { kind: "finding"; primary: string; chips: string[] };

const cases: { label: string; result: DiagnosisResult; expect: Expect }[] = [
  {
    label: "mock は非表示",
    result: makeResult({
      store: { source: "mock", hasOwnerReplies: false },
    }),
    expect: { kind: "null" },
  },
  {
    label: "口コミ0件は非表示",
    result: makeResult({ store: { reviewCount: 0, hasOwnerReplies: false } }),
    expect: { kind: "null" },
  },
  {
    label: "score 非数は非表示",
    result: makeResult({ store: { hasOwnerReplies: false }, score: NaN }),
    expect: { kind: "null" },
  },
  {
    label: "全欠損×band fair は K0（非表示）",
    result: makeResult({ band: "fair" }),
    expect: { kind: "null" },
  },
  {
    label: "全欠損×band weak は K0（非表示）",
    result: makeResult({ band: "weak" }),
    expect: { kind: "null" },
  },
  {
    label: "全欠損×band good は K6",
    result: makeResult({ band: "good" }),
    expect: { kind: "finding", primary: "K6", chips: [] },
  },
  {
    label: "K1 境界: ratingDiff -0.3 は成立",
    result: makeResult({ comparison: { ratingDiff: -0.3 } }),
    expect: { kind: "finding", primary: "K1", chips: [] },
  },
  {
    label: "K1 境界: ratingDiff -0.29 は不成立→K0",
    result: makeResult({ comparison: { ratingDiff: -0.29 } }),
    expect: { kind: "null" },
  },
  {
    label: "K1 ガード: total 2 では不成立",
    result: makeResult({ comparison: { ratingDiff: -0.5, total: 2 } }),
    expect: { kind: "null" },
  },
  {
    label: "K2 境界: ratio 0.21×10件 は成立",
    result: makeResult({
      store: { lowRatingRatio: 0.21, reviewCount: 10 },
    }),
    expect: { kind: "finding", primary: "K2", chips: [] },
  },
  {
    label: "K2 境界: ratio 0.21×9件 は不成立",
    result: makeResult({ store: { lowRatingRatio: 0.21, reviewCount: 9 } }),
    expect: { kind: "null" },
  },
  {
    label: "K2 境界: ratio 0.2 ちょうどは不成立",
    result: makeResult({ store: { lowRatingRatio: 0.2, reviewCount: 30 } }),
    expect: { kind: "null" },
  },
  {
    label: "K3 境界: 平均10件×6件 は成立",
    result: makeResult({
      store: { reviewCount: 6 },
      comparison: { avgReviewCount: 10 },
    }),
    expect: { kind: "finding", primary: "K3", chips: [] },
  },
  {
    label: "K3 境界: 平均10件×7件（=0.7倍ちょうど）は不成立",
    result: makeResult({
      store: { reviewCount: 7 },
      comparison: { avgReviewCount: 10 },
    }),
    expect: { kind: "null" },
  },
  {
    label: "K3 ガード: 競合平均9件では不成立",
    result: makeResult({
      store: { reviewCount: 3 },
      comparison: { avgReviewCount: 9 },
    }),
    expect: { kind: "null" },
  },
  {
    label: "K4: hasOwnerReplies false で成立",
    result: makeResult({ store: { hasOwnerReplies: false } }),
    expect: { kind: "finding", primary: "K4", chips: [] },
  },
  {
    label: "K4: hasOwnerReplies undefined は不成立（未確認≠空白）",
    result: makeResult({ store: { hasOwnerReplies: undefined } }),
    expect: { kind: "null" },
  },
  {
    label: "K5 境界: 180日で成立",
    result: makeResult({ store: { daysSinceLastReview: 180 } }),
    expect: { kind: "finding", primary: "K5", chips: [] },
  },
  {
    label: "K5 境界: 179日は不成立",
    result: makeResult({ store: { daysSinceLastReview: 179 } }),
    expect: { kind: "null" },
  },
  {
    label: "複合 K3+K4: 主所見 K3・チップ K4",
    result: makeResult({
      store: { reviewCount: 6, hasOwnerReplies: false },
      comparison: { avgReviewCount: 10 },
    }),
    expect: {
      kind: "finding",
      primary: "K3",
      chips: ["お店からの返信: 確認できず"],
    },
  },
  {
    label: "複合 K1+K2+K4+K5: 主所見 K1・チップは優先順で最大2件",
    result: makeResult({
      store: {
        reviewCount: 20,
        lowRatingRatio: 0.3,
        hasOwnerReplies: false,
        daysSinceLastReview: 200,
      },
      // avgReviewCount 20（store 20件と同数）で K3 は不成立に保つ
      comparison: { ratingDiff: -0.5, avgReviewCount: 20 },
    }),
    expect: {
      kind: "finding",
      primary: "K1",
      chips: ["低評価の比率: 約30%", "お店からの返信: 確認できず"],
    },
  },
  {
    label: "band good でも K1〜K5 マッチが優先（K6 に化けない）",
    result: makeResult({ store: { hasOwnerReplies: false }, band: "good" }),
    expect: { kind: "finding", primary: "K4", chips: [] },
  },
];

for (const c of cases) {
  const got = selectReviewFindings(c.result);
  if (c.expect.kind === "null") {
    check(c.label, got === null, `got: ${JSON.stringify(got)}`);
  } else {
    const okPrimary = got?.primary.key === c.expect.primary;
    const okChips =
      JSON.stringify(got?.secondary ?? null) === JSON.stringify(c.expect.chips);
    check(
      c.label,
      Boolean(got) && okPrimary && okChips,
      `got: ${got ? `${got.primary.key} chips=${JSON.stringify(got.secondary)}` : "null"}`,
    );
  }
}

// ---------------------------------------------------------------
console.log("== (c) buildThreadMapMaterials の色写像（設計§C-4） ==");

const factor = (
  id: string,
  status: "good" | "warn" | "bad" | "info",
  estimated = false,
) => ({
  id,
  title: "",
  status,
  message: "",
  points: 0,
  max: 10,
  estimated,
});

{
  // status そのまま写像（good/warn/bad）
  const m = buildThreadMapMaterials([
    factor("ratingQuality", "bad"),
    factor("reviewVolume", "warn"),
    factor("ownerReplies", "good"),
    factor("freshness", "bad"),
  ]);
  check(
    "実測 status がそのまま写像される",
    JSON.stringify(m.map((x) => [x.id, x.tone, x.note])) ===
      JSON.stringify([
        ["ratingQuality", "bad", null],
        ["reviewVolume", "warn", null],
        ["ownerReplies", "good", null],
        ["freshness", "bad", null],
      ]),
    JSON.stringify(m),
  );
}
{
  // estimated / info はニュートラル＋未確認（推定値に色を付けない）
  const m = buildThreadMapMaterials([
    factor("ratingQuality", "good"),
    factor("reviewVolume", "good"),
    factor("ownerReplies", "info", true),
    factor("freshness", "good", true),
  ]);
  check(
    "estimated / info はニュートラル＋未確認",
    m[2]!.tone === "neutral" &&
      m[2]!.note === THREAD_MAP_TEXTS.noteUnverified &&
      m[3]!.tone === "neutral" &&
      m[3]!.note === THREAD_MAP_TEXTS.noteUnverified,
    JSON.stringify(m),
  );
}
{
  // factor 欠損はニュートラル＋未測定（空配列・null 安全）
  const empty = buildThreadMapMaterials([]);
  const nullish = buildThreadMapMaterials(null);
  check(
    "factor 欠損はニュートラル＋未測定（4ノード維持）",
    empty.length === 4 &&
      empty.every(
        (x) => x.tone === "neutral" && x.note === THREAD_MAP_TEXTS.noteUnmeasured,
      ) &&
      nullish.length === 4,
    JSON.stringify(empty),
  );
}

// ---------------------------------------------------------------
if (failures > 0) {
  console.error(`\nprobe-findings: ${failures} 件失敗`);
  process.exit(1);
}
console.log("\nprobe-findings: 全件一致（禁句0・期待表一致）");
