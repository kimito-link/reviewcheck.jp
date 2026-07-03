/**
 * AI回答の表示前フィルタと、無料/ぼかしの線引き（純粋関数）。
 * 設計 §2-3 / 地雷#2（AI回答の再配信リスク）。
 *
 * AIが競合店や第三者に言及した文・事実断定のネガ記述を無料画面にそのまま出すと、
 * 「他人の名誉毀損をうちのサイトが再配信した」ことになる。表示前に危険な文を除外し、
 * 安全な文だけを無料表示に回す。除外された分は「ぼかし側（LINEで人間が確認してから）」へ。
 */

/**
 * AI回答テキストを文単位に分割する（日本語の句点・改行・！？で区切る素朴な分割）。
 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[。！？\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 事実断定のネガ記述に含まれがちな語（この語を含む文は無料表示しない）。 */
const NEGATIVE_ASSERTION_PATTERNS: RegExp[] = [
  /潰れ|閉店|倒産|廃業/,
  /最悪|ひどい|最低|詐欺|危険な店|ぼったくり/,
  /評判が悪い|悪評|クレーム|炎上/,
  /行かない方がいい|おすすめしない|避けるべき/,
];

/**
 * 文に自店以外の固有名詞（競合店名等）が含まれる可能性を素朴に判定する。
 * 完全な固有名詞抽出はできないので、保守的に「自店名を含まないのに『店』『社』等の
 * 事業体を指す語＋鉤括弧/引用が出る文」を疑わしいとみなす。安全側（疑わしきは除外）。
 * @param sentence 判定対象の文
 * @param selfName 自店名（trim 済み想定）。空なら自店判定できないので保守的に全除外側へ。
 */
export function mentionsOtherEntity(sentence: string, selfName: string): boolean {
  const name = selfName.trim();
  // 「」『』で囲まれた固有名詞が、自店名と異なる形で出てくる文は疑う。
  const quoted = sentence.match(/[「『]([^」』]{1,40})[」』]/g) ?? [];
  for (const q of quoted) {
    const inner = q.replace(/[「『」』]/g, "").trim();
    if (inner && name && !inner.includes(name) && !name.includes(inner)) {
      return true;
    }
    if (inner && !name) return true; // 自店名不明なら引用固有名詞は全て疑う
  }
  return false;
}

/**
 * 文が無料画面に安全に出せるか（危険なら false）。
 * - 事実断定のネガ記述を含む → 危険
 * - 自店以外の固有名詞への言及の疑い → 危険
 */
export function isSafeForPublic(sentence: string, selfName: string): boolean {
  if (NEGATIVE_ASSERTION_PATTERNS.some((re) => re.test(sentence))) return false;
  if (mentionsOtherEntity(sentence, selfName)) return false;
  return true;
}

export interface FilteredAiAnswer {
  /** 無料画面に安全に出せる文（先頭のみ表示・残りはぼかし対象）。 */
  safeSentences: string[];
  /** 除外された文の数（「続きは見立てで」の量的ヒントに使う。中身は出さない）。 */
  redactedCount: number;
  /**
   * どこにも出さない（LINEにも渡さない・件数も分離）discard された文の数（看板名診断 §2-3）。
   * センシティブ属性を含む文＝人間が確認しても使ってはいけないので、出力経路そのものを断つ。
   * opts.discardPatterns を渡さない既存呼び出しでは常に 0（後方互換）。
   */
  discardedCount: number;
}

/**
 * 表示前フィルタのオプション（看板名診断 §2-3 の3クラス化・後方互換）。
 * 省略時は既存の store 版と完全一致（discardPatterns/negativePatterns を追加しない）。
 */
export interface FilterOptions {
  /**
   * この語を含む文は discard（safe にも redacted 開示側にも入れず・件数も分離）。
   * 例（看板名 医療/芸能のセンシティブ属性）: 病歴・傷病名・思想・信条・宗教・性的指向・人種・出自。
   */
  discardPatterns?: RegExp[];
  /**
   * カテゴリ別のネガ断定語を既定に追加する（redacted 側へ寄せる）。
   * 例: 医療=誤診/医療過誤/訴訟、芸能=逮捕/炎上/文春。既定 NEGATIVE_ASSERTION_PATTERNS は不変。
   */
  extraNegativePatterns?: RegExp[];
}

/**
 * AI回答を表示前フィルタにかける。
 * 適用順: discard判定 → redacted判定(既存+extra) → safe（設計 §2-3）。
 * opts 省略時は store 版と完全一致（discardedCount は常に 0）。
 */
export function filterAiAnswer(
  text: string,
  selfName: string,
  opts?: FilterOptions,
): FilteredAiAnswer {
  const sentences = splitSentences(text);
  const discardPatterns = opts?.discardPatterns ?? [];
  const extraNegatives = opts?.extraNegativePatterns ?? [];
  const safe: string[] = [];
  let redacted = 0;
  let discarded = 0;
  for (const s of sentences) {
    // discard（出力経路を断つ）を最優先で判定。
    if (discardPatterns.some((re) => re.test(s))) {
      discarded++;
      continue;
    }
    // 既存の安全判定＋カテゴリ別ネガ語（extra）を redacted 側へ。
    if (isSafeForPublic(s, selfName) && !extraNegatives.some((re) => re.test(s))) {
      safe.push(s);
    } else {
      redacted++;
    }
  }
  return { safeSentences: safe, redactedCount: redacted, discardedCount: discarded };
}
