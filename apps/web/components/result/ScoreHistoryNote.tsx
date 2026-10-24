"use client";

import { useEffect, useState } from "react";
import {
  SCORE_HISTORY_FIRST,
  parseStoredScore,
  planScoreHistory,
  scoreHistoryKey,
} from "@/lib/scoreHistory";

/**
 * 前回との比較。localStorage の1件だけを読み書きし、通信はしない。
 */
export function ScoreHistoryNote({
  shopName,
  score,
  ruleVersion,
  diagnosedAt,
  enabled,
}: {
  shopName: string;
  score: number;
  ruleVersion: string;
  diagnosedAt: string;
  /** 取得時刻が共有URLに無いときは保存しない（見るたびに時刻が変わるため） */
  enabled: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMessage(SCORE_HISTORY_FIRST);
      return;
    }
    const key = scoreHistoryKey(shopName);
    let prev = null;
    try {
      prev = parseStoredScore(window.localStorage.getItem(key));
    } catch {
      prev = null;
    }
    const plan = planScoreHistory(prev, {
      score,
      date: diagnosedAt,
      ruleVersion,
    });
    if (plan.store) {
      try {
        window.localStorage.setItem(key, JSON.stringify(plan.store));
      } catch {
        /* 保存できない端末でも表示は続ける */
      }
    }
    setMessage(plan.message);
  }, [shopName, score, ruleVersion, diagnosedAt, enabled]);

  if (!message) return null;
  return (
    <p
      className="mt-3 text-sm font-medium leading-relaxed text-slate-800"
      data-score-history=""
    >
      {message}
    </p>
  );
}
