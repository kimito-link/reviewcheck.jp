import type { MonitorEvent, MonitorSnapshot, VerdictLevel } from "./types";

/** verdict を「安全←→危険」の数値順序に置く（大きいほど危険）。 */
const VERDICT_RANK: Record<VerdictLevel, number> = {
  clean: 0,
  vulnerable: 1,
  suspected: 2,
  infected: 3,
};

/** スコアがこの幅を超えて下落したら「悪化」とみなす。 */
const SCORE_DROP_THRESHOLD = 15;

/** a にあって b にない要素（差集合）。 */
function added(current: string[], previous: string[]): string[] {
  const prev = new Set(previous);
  return current.filter((x) => !prev.has(x));
}

/**
 * 前回スナップショットと今回スナップショットを比較し、
 * 通知に値する変化（イベント）を重大度順に返す。
 *
 * 設計方針:
 * - 「悪化」を見逃さないことを最優先にする（顧客の被害を防ぐのが価値）。
 * - 断定はしない。「痕跡を検出」「疑い」「露出」など事実ベースの表現に留める。
 * - 改善（recovered）も拾い、安心材料として通知できるようにする。
 */
export function diffSnapshots(
  current: MonitorSnapshot,
  previous: MonitorSnapshot | null,
): MonitorEvent[] {
  if (!previous) {
    return [
      {
        type: "first-scan",
        severe:
          current.verdictLevel === "infected" ||
          current.verdictLevel === "suspected",
        message: "監視を開始しました。これが基準となる初回の診断結果です。",
      },
    ];
  }

  const events: MonitorEvent[] = [];

  // --- 到達不可になった ---
  if (current.unreachable && !previous.unreachable) {
    events.push({
      type: "went-unreachable",
      severe: true,
      message:
        "前回は到達できたサイトに、今回は到達できませんでした。停止・隔離・DNSの問題などの可能性があります。",
    });
  }

  // --- 新たに感染痕跡を検出 ---
  if (current.verdictLevel === "infected" && previous.verdictLevel !== "infected") {
    events.push({
      type: "newly-infected",
      severe: true,
      message:
        "前回は見られなかった、既知マルウェア・改ざんの痕跡を新たに検出しました。感染・改ざんの疑いが濃厚です。",
    });
  } else if (
    current.verdictLevel === "suspected" &&
    VERDICT_RANK[previous.verdictLevel] < VERDICT_RANK.suspected
  ) {
    // --- 新たに改ざんの疑い ---
    events.push({
      type: "newly-suspected",
      severe: true,
      message:
        "前回は見られなかった、改ざん・感染を示唆する兆候を新たに検出しました。",
    });
  }

  // --- 新しいマルウェア名が増えた ---
  const newMalware = added(current.malwareNames, previous.malwareNames);
  if (newMalware.length > 0) {
    events.push({
      type: "new-malware",
      severe: true,
      message: `新たに検出された既知マルウェア・改ざんの痕跡があります（${newMalware.length}件）。`,
      details: newMalware,
    });
  }

  // --- 新しい機密ファイル露出/設定露出 ---
  const newExposure = added(current.exposureIds, previous.exposureIds);
  if (newExposure.length > 0) {
    const hasSecret = newExposure.some((id) => id.startsWith("exposed-secret"));
    events.push({
      type: "new-exposure",
      severe: hasSecret,
      message: hasSecret
        ? "本来公開してはいけない機密ファイルが、新たに外部から読み取れる状態になっています。認証情報の漏えいの恐れがあります。"
        : "外部から狙われやすい設定の露出が、新たに見つかりました。",
      details: newExposure,
    });
  }

  // --- 判定の悪化（上で個別に拾っていない悪化を補足） ---
  const worsened =
    VERDICT_RANK[current.verdictLevel] > VERDICT_RANK[previous.verdictLevel];
  const alreadyFlagged = events.some(
    (e) => e.type === "newly-infected" || e.type === "newly-suspected",
  );
  if (worsened && !alreadyFlagged) {
    events.push({
      type: "verdict-worsened",
      severe: current.verdictLevel !== "vulnerable",
      message: `総合判定が前回より悪化しました（${previous.verdictLevel} → ${current.verdictLevel}）。`,
    });
  }

  // --- スコアの大幅下落（悪化を上で拾えていない場合の早期サイン） ---
  const scoreDrop = previous.score - current.score;
  if (scoreDrop >= SCORE_DROP_THRESHOLD && events.length === 0) {
    events.push({
      type: "score-dropped",
      severe: false,
      message: `安全スコアが前回より ${scoreDrop} ポイント下がりました（${previous.score} → ${current.score}）。新たな弱点が生じた可能性があります。`,
    });
  }

  // --- 改善（悪化イベントが何も無いときだけ通知） ---
  if (events.length === 0) {
    const improvedVerdict =
      VERDICT_RANK[current.verdictLevel] < VERDICT_RANK[previous.verdictLevel];
    const resolvedProblems = added(previous.problemIds, current.problemIds);
    const cameBackOnline = !current.unreachable && previous.unreachable;
    if (improvedVerdict || resolvedProblems.length > 0 || cameBackOnline) {
      events.push({
        type: "recovered",
        severe: false,
        message: improvedVerdict
          ? `総合判定が改善しました（${previous.verdictLevel} → ${current.verdictLevel}）。`
          : cameBackOnline
            ? "サイトへの到達が回復しました。"
            : "前回見つかっていた弱点の一部が解消されました。",
        details: resolvedProblems.length > 0 ? resolvedProblems : undefined,
      });
    }
  }

  if (events.length === 0) {
    events.push({
      type: "no-change",
      severe: false,
      message: "前回から重要な変化は見つかりませんでした。",
    });
  }

  return events;
}
