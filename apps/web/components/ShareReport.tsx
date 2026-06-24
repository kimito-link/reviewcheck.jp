"use client";

import { useState } from "react";

/** 診断結果の共有URLをコピー */
export function ShareReport({ url }: { url: string }) {
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

  return (
    <section
      id="share"
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-base font-bold text-slate-900">診断結果を共有・保存</h2>
      <p className="mt-1 text-sm text-slate-500">
        このURLを開くと、同じ入力で診断結果を再表示できます。
      </p>
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
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
        >
          {copied ? "コピーしました" : "URLをコピー"}
        </button>
      </div>
    </section>
  );
}
