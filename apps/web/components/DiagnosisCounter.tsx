"use client";

import { useEffect, useState } from "react";

/**
 * 小さい数字は逆効果のため、閾値到達まで非表示（石川氏の指摘対応）。
 * 500件を超えてはじめて「累計診断件数」を信頼シグナルとして表示する。
 */
const SHOW_DIAGNOSIS_COUNT_THRESHOLD = 500;

/**
 * 累計診断件数を表示するバッジ。
 * 件数は /api/diagnosis-count から取得（診断件数は /report/[id] がステートレスなため、
 * 診断API側で Redis カウンタをインクリメントして集計している。詳細は lib/diagnosisCounter.ts）。
 * 閾値未満・取得失敗時は何も描画しない。
 */
export function DiagnosisCounter({ className = "" }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/diagnosis-count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (!cancelled && typeof data?.count === "number") {
          setCount(data.count);
        }
      })
      .catch(() => {
        // 取得失敗時は非表示のまま（fail-open）。
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null || count < SHOW_DIAGNOSIS_COUNT_THRESHOLD) {
    return null;
  }

  return (
    <p
      className={`flex items-center gap-1.5 text-xs font-medium sm:text-sm ${className}`}
    >
      <span className="text-base leading-none text-amber-300" aria-hidden="true">
        ✓
      </span>
      累計診断件数 {count.toLocaleString("ja-JP")}件
    </p>
  );
}
