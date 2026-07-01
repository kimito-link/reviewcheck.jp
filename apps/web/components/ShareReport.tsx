"use client";

import { useState } from "react";

/**
 * 診断結果の共有 + SNSシェア。
 * 会議(LTV最大化)フェーズ3: ネガの拡散でなく「私はチェックした」という
 * ポジティブな自己開示としてシェアさせる（紹介・自然流入の起点）。
 */
export function ShareReport({
  url,
  storeName,
  score,
}: {
  url: string;
  storeName?: string;
  score?: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  // ポジティブな自己開示のシェア文（不安の拡散にしない）。
  const name = storeName ? `「${storeName}」` : "うちのお店";
  const scorePart =
    typeof score === "number" ? `選ばれやすさスコアは${score}点でした。` : "";
  const shareText = `${name}のGoogle口コミを無料でチェックしてみました。${scorePart}あなたのお店もどうぞ→`;

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(url)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
    url,
  )}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url,
  )}`;

  return (
    <section
      id="share"
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-base font-bold text-slate-900">診断結果をシェア・保存</h2>
      <p className="mt-1 text-sm text-slate-500">
        「チェックしてみた」をシェアして、知り合いのお店にも教えてあげましょう。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
        >
          Xでシェア
        </a>
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:brightness-95"
        >
          LINEで送る
        </a>
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-bold text-white hover:brightness-95"
        >
          Facebook
        </a>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          {copied ? "コピーしました" : "URLをコピー"}
        </button>
      </div>
    </section>
  );
}
