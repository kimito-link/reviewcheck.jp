/**
 * OSINT「事実の鏡」公開情報ビューの純粋データ＋関数。
 * 設計: reviewcheck.jp/docs/DESIGN-osint-fact-mirror-framework-2026-07-03.md。
 *
 * 「自分には点数を、他人には鏡を」。第三者が企業・法人の公開情報を見るモード。
 * スコア・評価色・判定文言を一切持たず、事実＋出典＋取得日時と Pointer Map だけを映す。
 * ここは全部 定数表＋純粋関数。LLM に判断・要約・採点をさせない（測定器のみ）。
 */

/** 対象タイプ（「個人」は存在しない＝構造的宣言・設計 §3 第1層）。 */
export type OsintTargetType = "corporation" | "brand";

export const OSINT_TARGET_TYPES: { key: OsintTargetType; label: string }[] = [
  { key: "corporation", label: "企業・法人" },
  { key: "brand", label: "店舗・サービス・ブランド" },
];

export function isOsintTargetType(v: string): v is OsintTargetType {
  return OSINT_TARGET_TYPES.some((t) => t.key === v);
}

/** 観測された事実1件（FactCard の必須フィールド・欠けたら描画拒否・設計 §2-1）。 */
export interface OsintFact {
  /** 出典名＋種別＋URL（必須）。 */
  source: { name: string; kind: string; url?: string };
  /** 取得日時 ISO文字列（必須・retrievedAt 無しは表示しない）。 */
  retrievedAt: string;
  /** 観測文（辞書テンプレ由来・判定語を含まない）。 */
  observation: string;
}

/** 情報の所在1件（Pointer Map・設計 §4-2）。 */
export interface OsintPointer {
  /** 情報源名。 */
  name: string;
  /** そこで何が確認できるか。 */
  whatCanBeConfirmed: string;
  /** アクセス方法（URL・検索方法）。 */
  howToAccess: string;
}

/**
 * FactCard が描画可能か（必須フィールドが揃っているか）を検証する。
 * source.name / retrievedAt / observation のどれか欠けたら false（表示側は描画拒否）。
 */
export function isRenderableFact(fact: Partial<OsintFact> | null | undefined): fact is OsintFact {
  if (!fact) return false;
  if (!fact.source || !fact.source.name || !fact.source.kind) return false;
  if (!fact.retrievedAt) return false;
  if (!fact.observation) return false;
  return true;
}

/**
 * OSINTビューの禁句リスト（画面・シェア・エクスポート全文にCI適用・設計 §2-2）。
 * 「判定に読める語」を全排除する。この語を含む表示文字列があれば実装ミス＝CIで弾く。
 */
export const OSINT_BANNED_WORDS: RegExp[] = [
  // 「判定は含みません」等の否定・免責文脈は許容し、判定を"下す"表現だけを弾く。
  /危険度|リスク評価|評価結果|診断結果/,
  /スコア|[0-9]+点|[0-9]+%|偏差|順位|ランク/,
  /対策(?:して|しま)|改善(?:して|しま)|を推奨|をおすすめ|要注意/,
  /問題(?:あり|なし)|良好|警告(?!表示)|疑いがあ|可能性が高い|と示唆/,
  /と判断(?:でき|され)|と考えられ|べきです|に該当(?:します|する)/,
];

/** 表示文字列が禁句を含まないか（含めば false＝実装が辞書を通っていない）。 */
export function isBannedFree(text: string): boolean {
  return !OSINT_BANNED_WORDS.some((re) => re.test(text));
}

/**
 * 観測文テンプレ辞書（全表示文字列は辞書経由・自由文ゼロ・設計 §2-2）。
 * それぞれ禁句を含まない中立記述。テンプレに値を差し込むだけ。
 */
export const OSINT_OBSERVATION_TEMPLATES = {
  /** AI言及の有無（逐語は出さない・設計 §2-4）。 */
  aiMentioned: (name: string, model: string, at: string) =>
    `AIの回答（${model}・${at}取得）に「${name}」への言及が確認されました。`,
  aiNotMentioned: (name: string, model: string, at: string) =>
    `AIの回答（${model}・${at}取得）に「${name}」への言及は確認されませんでした。`,
  /** サジェスト件数（具体語は弁護士確認まで出さない・設計 §2-4）。 */
  suggestCount: (n: number, at: string) =>
    `検索候補（オートコンプリート・${at}取得）が${n}件確認されました。これはアルゴリズムが生成する候補であり事実の主張ではありません。`,
  /** サイト外形（合否・推奨に変換しない）。 */
  httpsConfirmed: (at: string) => `HTTPS対応が確認されました（${at}取得）。`,
  httpsNotConfirmed: (at: string) => `HTTPS対応は確認されませんでした（${at}取得）。`,
  /** 公式サイト特定。 */
  officialSiteFound: (at: string) => `公式と見られるサイトの所在が確認されました（${at}取得）。`,
  officialSiteNotFound: (at: string) => `公式と見られるサイトは確認されませんでした（${at}取得）。`,
} as const;

/**
 * Pointer Map 初期カタログ（企業コンプラ確認向け・設計 §4-2）。
 * すべて「確認できる場所の案内」＝当社が照会結果を断定しない。URLは陳腐化するので運用更新（§8-4）。
 */
export const OSINT_POINTER_CATALOG: OsintPointer[] = [
  {
    name: "官報（インターネット版官報）",
    whatCanBeConfirmed: "決算公告・破産・清算・合併等の公告の有無",
    howToAccess: "官報の検索ページで法人名を検索",
  },
  {
    name: "法人登記（登記情報提供サービス／法務局）",
    whatCanBeConfirmed: "商号・本店所在地・役員等の登記事項",
    howToAccess: "登記情報提供サービス、または法務局窓口",
  },
  {
    name: "各省庁の行政処分公表ページ",
    whatCanBeConfirmed: "監督官庁による行政処分の公表の有無",
    howToAccess: "所管省庁の公表ページで事業者名を検索",
  },
  {
    name: "業界団体の会員名簿",
    whatCanBeConfirmed: "業界団体への登録・加盟状況",
    howToAccess: "該当業界団体の公式サイトの会員一覧",
  },
  {
    name: "国税庁 法人番号公表サイト",
    whatCanBeConfirmed: "法人番号・商号・所在地の基本情報",
    howToAccess: "法人番号公表サイトで商号を検索",
  },
];

/** 免責の定型文（確認記録エクスポートに必ず含める・設計 §4-3）。 */
export const OSINT_DISCLAIMER =
  "本記録は、外部から観測できる公開情報と、その所在を提示するものです。対象の良し悪し・信用・危険性の判定は含みません。掲載情報から何を結論するかは、ご利用者の判断と責任に委ねられます。";

// ---- stateless レポートID（/fact-view/[id]）----

export interface OsintReportInput {
  /** 対象名（法人名・屋号・サービス名）。 */
  name: string;
  /** 対象タイプ。 */
  targetType: OsintTargetType;
  /** コンプラ確認カテゴリ（Pointer Map を出すか）。 */
  compliance?: boolean;
}

function osintB64UrlEncode(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function osintB64UrlDecode(id: string): string {
  let b64 = id.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeOsintReportId(input: OsintReportInput): string {
  const payload = {
    v: 1 as const,
    n: input.name,
    t: input.targetType,
    ...(input.compliance ? { comp: 1 } : {}),
  };
  return osintB64UrlEncode(JSON.stringify(payload));
}

export function decodeOsintReportId(id: string): OsintReportInput | null {
  try {
    const parsed = JSON.parse(osintB64UrlDecode(id)) as {
      v?: number;
      n?: string;
      t?: string;
      comp?: number;
    };
    if (!parsed || parsed.v !== 1) return null;
    if (!parsed.n || typeof parsed.n !== "string") return null;
    if (!parsed.t || !isOsintTargetType(parsed.t)) return null;
    return {
      name: parsed.n,
      targetType: parsed.t,
      ...(parsed.comp ? { compliance: true } : {}),
    };
  } catch {
    return null;
  }
}
