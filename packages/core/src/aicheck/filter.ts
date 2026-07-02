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
}

/**
 * AI回答を表示前フィルタにかける。安全な文のみ safeSentences に残す。
 * 呼び出し側は safeSentences[0] だけ表示し、それ以降とredactedCountはぼかす（§2-3 の線引き）。
 */
export function filterAiAnswer(text: string, selfName: string): FilteredAiAnswer {
  const sentences = splitSentences(text);
  const safe: string[] = [];
  let redacted = 0;
  for (const s of sentences) {
    if (isSafeForPublic(s, selfName)) safe.push(s);
    else redacted++;
  }
  return { safeSentences: safe, redactedCount: redacted };
}
