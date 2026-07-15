/**
 * 診断結果「医者の物語」レイヤー（所見カード）の純粋データ＋関数。
 * 設計: reviewcheck.jp/docs/DESIGN-report-doctor-story-2026-07-08.md（§C-1〜C-5）。
 *
 * 測定済み事実の組合せに辞書引きで「名前」を付ける（決定的・LLM不使用）。
 * 全表示文字列はこのファイルが正本で、UI 層（FindingCard）は文字列リテラルを持たない。
 * reviewAnalysis（最大5件サンプルの簡易分析）は誤検知防止のため条件に一切使わない。
 * 名付けられない中間状態は null（非表示）に落とす fail-closed。
 */

import type { DiagnosisResult, ScoreFactor } from "../types/index";

/** 所見の識別子。K1〜K5 は優先順位順（上から評価し最初のマッチが主所見）。K6 は良好時専用。 */
export type ReviewFindingKey = "K1" | "K2" | "K3" | "K4" | "K5" | "K6";

/** 所見1件（全フィールド辞書由来・現在形のみ・未来断定なし）。 */
export interface ReviewFinding {
  key: ReviewFindingKey;
  /** 所見名（例:「星の比較差」）。判定語でなく状態の名前。 */
  name: string;
  /** 所見文（実測値の差し込みのみ）。 */
  finding: string;
  /** 構造説明文（現在形。原因と予後を兼ねる）。 */
  structure: string;
  /** 今日できる無料セルフケア（売り込みなし・テキストのみ）。 */
  selfCare: string;
  /** 副所見として出す事実チップ（判定語なし）。K6 は主所見専用のため null。 */
  chip: string | null;
}

/** selectReviewFindings の戻り値。主所見1つ＋事実チップ最大2件。 */
export interface ReviewFindingSelection {
  primary: ReviewFinding;
  /** 主所見以外にマッチした所見の事実チップ（優先順・最大2件）。 */
  secondary: string[];
}

/** 所見辞書の1エントリ（条件式＋表示文字列ビルダー）。 */
export interface ReviewFindingDef {
  key: ReviewFindingKey;
  matches: (result: DiagnosisResult) => boolean;
  build: (result: DiagnosisResult) => ReviewFinding;
}

/**
 * 所見辞書 K1〜K5（優先順位順の正本・設計 §C-1/C-2）。
 * 優先順位の根拠: 来店検討者の閲覧ファネル（一覧で見える質→量→詳細で見える対応→鮮度）。
 * 条件の undefined / null は常に「不成立」（未確認を欠陥と誤認しない）。
 */
export const REVIEW_FINDING_DEFS: ReviewFindingDef[] = [
  {
    // K1「星の比較差」: 一覧画面で最初に比較される数字の差
    key: "K1",
    matches: (r) =>
      r.comparison != null &&
      r.comparison.total >= 3 &&
      Number.isFinite(r.comparison.ratingDiff) &&
      r.comparison.ratingDiff <= -0.3,
    build: (r) => {
      const c = r.comparison!;
      const gap = Math.abs(c.ratingDiff).toFixed(1);
      return {
        key: "K1",
        name: "星の比較差",
        finding: `星評価が、周辺${c.total}店の平均（星${c.avgRating.toFixed(1)}）より ${gap} ポイント低い状態です。詳しくは下の「競合との比較」に並べてあります。`,
        structure:
          "Googleマップの検索一覧では、店名のすぐ隣に星の数字が表示されます。いま近くでお店を探している人は、この数字であなたのお店と周辺のお店を同じ画面で見比べています。",
        selfCare:
          "来店されたお客様への「よろしければ率直な感想をGoogleの口コミでお聞かせください」の一言は、今日の営業から始められます。謝礼と引き換えの依頼や高評価の指定は、Googleのポリシーで認められていません。",
        chip: `星評価: 周辺平均との差 −${gap}`,
      };
    },
  },
  {
    // K2「低評価の目立つ構成」: 母数10件未満では比率を語らない
    key: "K2",
    matches: (r) =>
      typeof r.input.store.lowRatingRatio === "number" &&
      r.input.store.lowRatingRatio > 0.2 &&
      r.input.store.reviewCount >= 10,
    build: (r) => {
      const pct = Math.round((r.input.store.lowRatingRatio ?? 0) * 100);
      return {
        key: "K2",
        name: "低評価の目立つ構成",
        finding: `口コミ全体のうち、低評価（星1〜2）が約${pct}% を占めています。内訳は下の「選ばれやすさスコアの内訳」にあります。`,
        structure:
          "口コミ一覧を開いた人の画面には、高評価と低評価が同じ場所に並びます。低評価の隣にお店からの返信があるかどうかまで、そのまま表示されています。",
        selfCare:
          "低評価の口コミのうち直近の1件に、事実関係の確認とお詫び・その後の改善内容を簡潔に書いた返信を用意するところから始められます。感情的な反論の返信は、検討中のお客様にも読まれます。",
        chip: `低評価の比率: 約${pct}%`,
      };
    },
  },
  {
    // K3「口コミの母数差」: 競合平均が2桁未満のときは比率が暴れるため不成立
    key: "K3",
    matches: (r) =>
      r.comparison != null &&
      r.comparison.avgReviewCount >= 10 &&
      r.input.store.reviewCount < r.comparison.avgReviewCount * 0.7,
    build: (r) => {
      const c = r.comparison!;
      const avg = Math.round(c.avgReviewCount);
      const count = r.input.store.reviewCount;
      return {
        key: "K3",
        name: "口コミの母数差",
        finding: `口コミ数が${count}件で、周辺${c.total}店の平均${avg}件を下回っている状態です。差の内訳は下の「競合との比較」にあります。`,
        structure:
          "口コミ数は「どれだけの人が実際に利用したか」の目安として読まれます。星が同じくらいの2つのお店が並んだとき、件数の多いほうの評価がより確からしく見える構造です。",
        selfCare:
          "感想を書いてもらう入口（会計時のひと言・レジ横のQR・LINEでのご案内など）を1つだけ決めて、全スタッフで同じ案内をするところから始められます。",
        chip: `口コミ数: 周辺平均${avg}件に対し${count}件`,
      };
    },
  },
  {
    // K4「返信の空白」: undefined（未確認）は不成立＝空白と誤認しない
    key: "K4",
    matches: (r) => r.input.store.hasOwnerReplies === false,
    build: () => ({
      key: "K4",
      name: "返信の空白",
      finding: "口コミに対するお店からの返信が確認できませんでした。",
      structure:
        "口コミを読む人は、お店からの返信も同じ画面で読んでいます。返信がない画面では、口コミに書かれた内容だけが、お店側の言葉が添えられないまま表示されています。",
      selfCare:
        "直近の口コミ2〜3件に、内容に触れた短い返信（お礼＋ひと言）を書くところから始められます。全件でなくて構いません。",
      chip: "お店からの返信: 確認できず",
    }),
  },
  {
    // K5「更新の止まった口コミ欄」
    key: "K5",
    matches: (r) =>
      typeof r.input.store.daysSinceLastReview === "number" &&
      r.input.store.daysSinceLastReview >= 180,
    build: (r) => {
      const d = r.input.store.daysSinceLastReview ?? 0;
      return {
        key: "K5",
        name: "更新の止まった口コミ欄",
        finding: `最新の口コミから${d}日が経過しています。`,
        structure: `いま口コミ一覧を開いた人の画面では、${d}日前の投稿が「いちばん新しい情報」として表示されています。お店の現在の様子は、この画面にはまだ映っていません。`,
        selfCare:
          "最近ご利用のお客様に、率直な感想を1件お願いしてみるところから始められます。投稿日は口コミ1件ごとに表示され、並び替えで新しい順に確認できる項目です。",
        chip: `最新の口コミ: ${d}日前`,
      };
    },
  },
];

/**
 * K6「現状維持の構造」（K1〜K5 すべて不成立かつ band === "good" のときだけ主所見になる）。
 * 副チップには決してならない（chip: null）。
 */
export const REVIEW_FINDING_GOOD_DEF: ReviewFindingDef = {
  key: "K6",
  matches: (r) => r.band === "good",
  build: () => ({
    key: "K6",
    name: "現状維持の構造",
    finding:
      "今回測定した範囲（星評価・口コミ数・返信・鮮度）では、来店検討の場面で不利に働きやすい大きな注目点は確認されませんでした。",
    structure:
      "この見え方は、あなたのお店の数字と周辺のお店の数字の相対関係でできています。周辺の数字は毎月動くため、この画面は今日の時点の写真です。",
    selfCare:
      "月に一度、自分のお店をGoogleマップで「お客様として」検索して開き、星・件数・最新口コミの3点を見る習慣で、この状態の変化に自分で気づけます。",
    chip: null,
  }),
};

/**
 * 主所見1つ＋事実チップ最大2件を決定的に選ぶ（設計 §C-2）。
 *
 * 表示前ゲート（1つでも欠けたらレイヤー全体非表示＝null）:
 * mock（デモ）／口コミ0件／score 非数。
 * K1〜K5 全不成立のとき band === "good" なら K6、それ以外は null（K0=非表示）。
 * 名付けられない中間状態に無理に名前を付けない fail-closed。
 */
export function selectReviewFindings(
  result: DiagnosisResult,
): ReviewFindingSelection | null {
  const store = result?.input?.store;
  if (!store) return null;
  if (store.source === "mock") return null;
  if (!(store.reviewCount >= 1)) return null;
  if (!Number.isFinite(result.score)) return null;

  const matched = REVIEW_FINDING_DEFS.filter((d) => d.matches(result));
  if (matched.length === 0) {
    if (REVIEW_FINDING_GOOD_DEF.matches(result)) {
      return { primary: REVIEW_FINDING_GOOD_DEF.build(result), secondary: [] };
    }
    return null;
  }

  const [first, ...rest] = matched;
  if (!first) return null;
  const secondary = rest
    .map((d) => d.build(result).chip)
    .filter((chip): chip is string => Boolean(chip))
    .slice(0, 2);
  return { primary: first.build(result), secondary };
}

/**
 * 所見レイヤーの禁句リスト（設計 §C-5・osint の isBannedFree と同じ仕組みの自己文脈版）。
 * 断定・確率・恐怖・幻の統計・未来断定を機械排除する。
 * osint の禁句とは対象が違う: ここは店主が自店を診断する自己文脈なので
 * 「スコア」「診断結果」「改善」は使用可。
 * 「〜します」型の未来断定は機械判別できないため辞書追記時のレビュー規約（現在形のみ）で守る。
 */
export const REVIEW_FINDING_BANNED_WORDS: RegExp[] = [
  /必ず|絶対|確実に/,
  /[0-9]+(?:\.[0-9]+)?%の(確率|可能性)/,
  /危険|手遅れ|重症|末期|致命/,
  /倒産|廃業|潰れ/,
  /売上が(減|落ち|下が)|客足が(減|遠のく)|失客/,
  /業界平均|一般的に[0-9]|統計(?:上|的)に/,
  /でしょう|かもしれません|恐れがあります|リスクがあります/,
  /放置する(と|ほど)|今すぐ|お早めに/,
];

/** 表示文字列が禁句を含まないか（含めば false＝辞書かレビュー規約の違反）。 */
export function isFindingBannedFree(text: string): boolean {
  return !REVIEW_FINDING_BANNED_WORDS.some((re) => re.test(text));
}

/**
 * 所見カードの固定表示文字列（設計 §C-3）。UI 層はここ以外の文字列を持たない。
 * 治療②③はテキストのみ（新CTA・新リンクを作らない。既存CTAへの位置の言及だけで橋を架ける）。
 */
export const FINDING_CARD_TEXTS = {
  /** バッジ */
  badge: "所見",
  badgeSub: "上のスコアの読み方",
  /** 役割宣言（既存の販促文言との話法の棲み分けを宣言する） */
  roleDeclaration:
    "この所見は、いまの数字が来店検討中のお客様にどう見えているかの構造の解説です。星評価・口コミ数・返信状況などの組み合わせから、あてはまる説明を選んで表示しています（未来の予測は含みません）。",
  /** 事実チップの見出し */
  chipsHeading: "あわせて確認された事実",
  /** 保健指導3段階（nextSummary=折りたたみ閉時の1行・nextHeading=開いた中のリード） */
  nextSummary: "次にできることを見る（3つ）",
  nextHeading: "次にできること（3つのうち、気になるものだけで構いません）",
  step1Label: "① 今日できること（無料）",
  step2Label: "② 専門家の見立てを受け取る（無料）",
  step2Text:
    "この画面のスクショを、すぐ下の緑のボタンからLINEで送ると、この所見について「最初に見るべき1点」の返答が受け取れます。",
  step3Label: "③ 経過観察（毎月）",
  step3Text:
    "この測定は今日の時点の写真です。数字の変化を毎月自動で測るのは、ページ下部の「月次モニタリング」の役割です。",
} as const;

/* ------------------------------------------------------------------ */
/* 一本の糸マップ（P1・設計 §C-4）                                       */
/* ------------------------------------------------------------------ */

/**
 * 糸マップのノード色。factors の status をそのまま写像し、
 * #score-breakdown のスコア内訳と絶対に矛盾させない（独自再判定をしない）。
 * neutral は「実測していない」の意味（色を付けない＝診断できるふりをしない）。
 */
export type ThreadMapTone = "good" | "warn" | "bad" | "neutral";

/** 糸マップ第3段「参照される材料」の1ノード。 */
export interface ThreadMapMaterial {
  id: "ratingQuality" | "reviewVolume" | "ownerReplies" | "freshness";
  label: string;
  tone: ThreadMapTone;
  /** neutral のときの理由ラベル（未確認/未測定）。色付きノードでは null。 */
  note: string | null;
}

/** 糸マップの固定表示文字列（設計 §C-4。UI 層はここ以外の文字列を持たない）。 */
export const THREAD_MAP_TEXTS = {
  /** FindingCard 内の折りたたみ見出し */
  summary: "この見え方ができる仕組みを図で見る",
  /** 図の添え文（実測とそれ以外の切り分けの宣言） */
  caption:
    "色が付いているのは、今回実際に測れた項目です。グレーの項目は、今回は測っていません。",
  /** 4段のステージ名（第1・2・4段は実測不能＝常にニュートラル） */
  stageSeeker: "近くでお店を探す人",
  stageCompare: "Googleマップで候補を比較",
  stageMaterials: "参照される材料",
  stageOutcome: "候補に残る・外れる",
  /** 4段それぞれの短い説明（石川さんFB: 枠だけでは仕組みが伝わらない） */
  stageSeekerNote: "近くの同業種を検索・地図アプリで探す段階",
  stageCompareNote: "表示された候補を一覧で見比べる段階",
  stageMaterialsNote: "比較の材料になる、公開されている情報",
  stageOutcomeNote: "材料を見て、選ばれる・見送られるが決まる段階",
  /** 材料ノードのラベル */
  materialRating: "星評価",
  materialVolume: "口コミ数",
  materialReplies: "お店の返信",
  materialFreshness: "最新口コミ",
  /** neutral の理由ラベル */
  noteUnverified: "未確認",
  noteUnmeasured: "未測定",
} as const;

/** 材料ノードの定義順（表示順の正本）。 */
const THREAD_MAP_MATERIAL_DEFS: {
  id: ThreadMapMaterial["id"];
  label: string;
}[] = [
  { id: "ratingQuality", label: THREAD_MAP_TEXTS.materialRating },
  { id: "reviewVolume", label: THREAD_MAP_TEXTS.materialVolume },
  { id: "ownerReplies", label: THREAD_MAP_TEXTS.materialReplies },
  { id: "freshness", label: THREAD_MAP_TEXTS.materialFreshness },
];

/**
 * factors から糸マップ第3段の材料ノード4つを組み立てる（設計 §C-4 の色付け対応表）。
 * - status good→good / warn→warn / bad→bad（そのまま写像）
 * - status "info" または estimated===true → neutral＋「未確認」（推定値に色を付けない）
 * - factor 自体が無い → neutral＋「未測定」
 */
export function buildThreadMapMaterials(
  factors: ScoreFactor[] | null | undefined,
): ThreadMapMaterial[] {
  const list = Array.isArray(factors) ? factors : [];
  return THREAD_MAP_MATERIAL_DEFS.map(({ id, label }) => {
    const f = list.find((x) => x.id === id);
    if (!f) {
      return { id, label, tone: "neutral" as const, note: THREAD_MAP_TEXTS.noteUnmeasured };
    }
    if (f.estimated === true || f.status === "info") {
      return { id, label, tone: "neutral" as const, note: THREAD_MAP_TEXTS.noteUnverified };
    }
    if (f.status === "good" || f.status === "warn" || f.status === "bad") {
      return { id, label, tone: f.status, note: null };
    }
    // 未知の status は色を付けない（fail-closed）
    return { id, label, tone: "neutral" as const, note: THREAD_MAP_TEXTS.noteUnverified };
  });
}
