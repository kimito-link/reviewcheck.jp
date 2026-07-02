"use client";

import { useState } from "react";
import { lineChannelForTopic } from "@reviewcheck/config";

interface LineConsultCtaProps {
  /** ボタン文言 */
  text: string;
  /** クリック時にクリップボードへコピーする初回メッセージ定型文（buildLineConsultMessage の結果） */
  message: string;
  /** 相談トピック（未指定＝風評・口コミ窓口）。窓口の出し分けは lineChannelForTopic に委譲。 */
  topic?: string;
  fullWidth?: boolean;
  size?: "default" | "lg";
  className?: string;
}

/**
 * LINE相談CTA（定型文コピー付き・LINE導線 P0-3）。
 *
 * 素の <a> の LineCtaButton とは別物（地雷#11: 共通化しない）。こちらは
 * クリック時に初回メッセージ定型文をクリップボードへコピーし、その後 LINE を開く。
 * lin.ee URL にパラメータは載らない制約への対処＝文脈をユーザーにコピペで運ばせる（設計 §1-2）。
 *
 * クリップボードは失敗前提で設計（http圏・iOS権限・WebView）。失敗時はボタン直下に
 * 定型文をテキスト表示するフォールバックを出し、いちばん熱いユーザーを空メッセージで
 * 着地させない（設計 地雷#9）。コピー成否に関わらず LINE への遷移は止めない。
 */
export function LineConsultCta({
  text,
  message,
  topic,
  fullWidth = false,
  size = "default",
  className = "",
}: LineConsultCtaProps) {
  const channel = lineChannelForTopic(topic);
  // "idle" | "copied" | "failed"
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const sizeCls =
    size === "lg" ? "px-7 py-4 text-base" : "px-5 py-3 text-sm sm:text-base";

  const handleClick = async () => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(message);
        setCopyState("copied");
      } else {
        setCopyState("failed");
      }
    } catch {
      // 権限なし・非セキュアコンテキスト等。フォールバック表示に切り替える。
      setCopyState("failed");
    }
    // コピー成否に関わらず LINE を開く（遷移はブロックしない）。
    if (typeof window !== "undefined") {
      window.open(channel.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={fullWidth ? "w-full" : ""}>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#06C755] font-bold text-white shadow-sm transition hover:bg-[#05b34d] ${sizeCls} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
          <path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.6 7.4 8.5 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6h0c1.5-1.6 2.2-3.3 2.2-5C22.6 6.6 18 3 12 3z" />
        </svg>
        {text}
      </button>

      {copyState === "copied" ? (
        <p className="mt-2 text-xs text-slate-500" role="status">
          相談文をコピーしました。LINEのトークに貼り付けて送ってください。
        </p>
      ) : null}

      {copyState === "failed" ? (
        <div className="mt-2 text-xs text-slate-600">
          <p className="mb-1">以下の文をコピーして、LINEのトークに貼り付けて送ってください。</p>
          <textarea
            readOnly
            value={message}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
            rows={2}
          />
        </div>
      ) : null}
    </div>
  );
}
