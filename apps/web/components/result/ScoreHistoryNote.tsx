"use client";

import { useEffect } from "react";
import { forgetLocalScoreKeys } from "../ForgetLocalScores";

/**
 * 以前はこの端末の前回点数を読んで差分を出していた。
 * いまは読まず、残っていればこのブラウザから消す。サーバは触らない。
 */
export function ScoreHistoryNote() {
  useEffect(() => {
    forgetLocalScoreKeys();
  }, []);

  return (
    <p className="text-sm leading-relaxed text-slate-700">
      このブラウザに残っていた前回の点数は、次回このサイトを開いたときに消します。サーバには送っていません。
    </p>
  );
}
