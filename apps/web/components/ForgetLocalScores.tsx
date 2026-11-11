"use client";

import { useEffect } from "react";

/** このブラウザに残っている前回点数だけを消す。サーバの記録は触らない。 */
export function ForgetLocalScores() {
  useEffect(() => {
    forgetLocalScoreKeys();
  }, []);
  return null;
}

export function forgetLocalScoreKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("rc:last:")) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
    return keys;
  } catch {
    return [];
  }
}
