"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SCORE_RULE_VERSION } from "@reviewcheck/core";
import { buildShareText } from "@/lib/resultCopy";
import {
  SHARER_LINE_STORAGE_KEY,
  sanitizeRefLine,
  withRefLine,
} from "@/lib/refLine";
import { useEmbedHidden } from "./diagnosis/useEmbedHidden";

/**
 * 診断結果の共有 + SNSシェア。
 * 会議(LTV最大化)フェーズ3: ネガの拡散でなく「私はチェックした」という
 * ポジティブな自己開示としてシェアさせる（紹介・自然流入の起点）。
 */
export function ShareReport({
  url,
  storeName,
  score,
  ruleVersion = SCORE_RULE_VERSION,
  refLine,
}: {
  url: string;
  storeName?: string;
  score?: number;
  ruleVersion?: string;
  /** 開いているページに付いている ref_line。自分の保存が無いとき、転送で残す。 */
  refLine?: string;
}) {
  const embedHidden = useEmbedHidden();
  const [copied, setCopied] = useState(false);
  const [lineInput, setLineInput] = useState("");
  const [savedLine, setSavedLine] = useState<string | null>(null);
  const [detached, setDetached] = useState(false);
  const [lineMessage, setLineMessage] = useState<"saved" | "invalid" | "cleared" | null>(
    null,
  );

  useEffect(() => {
    const stored = sanitizeRefLine(window.localStorage.getItem(SHARER_LINE_STORAGE_KEY));
    if (!stored) {
      window.localStorage.removeItem(SHARER_LINE_STORAGE_KEY);
      return;
    }
    setSavedLine(stored);
    setLineInput(stored);
  }, []);

  const pageLine = sanitizeRefLine(refLine);
  const attached = embedHidden || detached ? null : savedLine || pageLine;
  const shareTarget = withRefLine(url, attached);
  const shareText = buildShareText({ score, storeName, ruleVersion });

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  function saveLine(event: FormEvent) {
    event.preventDefault();
    const safe = sanitizeRefLine(lineInput);
    if (!safe) {
      setLineMessage("invalid");
      return;
    }
    window.localStorage.setItem(SHARER_LINE_STORAGE_KEY, safe);
    setSavedLine(safe);
    setLineInput(safe);
    setDetached(false);
    setLineMessage("saved");
  }

  function clearLine() {
    window.localStorage.removeItem(SHARER_LINE_STORAGE_KEY);
    setSavedLine(null);
    setLineInput("");
    setDetached(true);
    setLineMessage("cleared");
  }

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(shareTarget)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
    shareTarget,
  )}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareTarget,
  )}`;

  return (
    <section
      id="share"
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-base font-bold text-slate-900">診断結果をシェア・保存</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">
        「チェックしてみた」をシェアして、知り合いのお店にも教えてあげましょう。
      </p>

      {embedHidden ? null : (
        <form onSubmit={saveLine} data-sharer-line-setting="" className="mt-4">
          <label htmlFor="sharer-line-url" className="block text-sm font-bold text-slate-900">
            自分の公式LINEのURL
          </label>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            共有するリンクに載せます。この端末だけに保存します。
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="sharer-line-url"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={500}
              value={lineInput}
              onChange={(event) => setLineInput(event.target.value)}
              placeholder="https://lin.ee/…"
              className="w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-700 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              このURLを共有に使う
            </button>
          </div>
          {savedLine || (pageLine && !detached) ? (
            <button
              type="button"
              onClick={clearLine}
              className="mt-2 text-sm font-bold text-slate-800 underline underline-offset-2"
            >
              共有URLから外す
            </button>
          ) : null}
          {lineMessage === "saved" ? (
            <p className="mt-2 text-sm font-medium text-slate-800" role="status">
              共有URLに載せています。
            </p>
          ) : null}
          {lineMessage === "cleared" ? (
            <p className="mt-2 text-sm font-medium text-slate-800" role="status">
              共有URLから外しました。
            </p>
          ) : null}
          {lineMessage === "invalid" ? (
            <p className="mt-2 text-sm font-medium text-red-900" role="alert">
              保存できません。https://lin.ee/ または https://line.me/ で始まるURLだけ使えます。
            </p>
          ) : null}
        </form>
      )}

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
          className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-slate-950 hover:brightness-95"
        >
          LINEで送る
        </a>
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#0b57b5] px-4 py-2 text-sm font-bold text-white hover:brightness-95"
        >
          Facebook
        </a>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={shareTarget}
          aria-label="共有URL"
          className="flex-1 rounded-lg border border-slate-500 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-slate-700 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
        >
          {copied ? "コピーしました" : "URLをコピー"}
        </button>
      </div>
    </section>
  );
}
