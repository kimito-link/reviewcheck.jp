"use client";

import { useMemo, useState } from "react";
import {
  REVIEW_TOOL_PRESETS,
  GOOGLE_WRITE_REVIEW_URL,
  REVIEW_TOOL_DISCLAIMER,
  type RTPreset,
  type RTOption,
} from "@reviewcheck/config";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(src: T[]): T[] {
  const arr = [...src];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildReview(
  storeName: string,
  preset: RTPreset,
  chosen: string[],
): string {
  const body = chosen.join("");
  const name = storeName.trim() || "こちらのお店";
  const templates = [
    `${name}を${preset.verb}。${body}`,
    `${name}についてのご感想です。${body}`,
    `${body}（${name}）`,
  ];
  return pick(templates).trim();
}

type Step = "config" | "start" | "q" | "done";

export function ReviewToolApp({
  initialStore = "",
  initialIndustry = "general",
  initialReviewUrl = "",
  lockConfig = false,
}: {
  initialStore?: string;
  initialIndustry?: string;
  initialReviewUrl?: string;
  /** true の場合は設定画面を出さず、すぐツールを開始（店舗配布リンク用） */
  lockConfig?: boolean;
}) {
  const [store, setStore] = useState(initialStore);
  const [presetId, setPresetId] = useState(initialIndustry);
  const [reviewUrl, setReviewUrl] = useState(initialReviewUrl);
  const [step, setStep] = useState<Step>(
    lockConfig || initialStore ? "start" : "config",
  );
  const [qIndex, setQIndex] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [shuffled, setShuffled] = useState<RTOption[]>([]);
  const [tapped, setTapped] = useState<string | null>(null);
  const [review, setReview] = useState("");
  const [copied, setCopied] = useState(false);

  const preset = useMemo(
    () =>
      REVIEW_TOOL_PRESETS.find((p) => p.id === presetId) ??
      REVIEW_TOOL_PRESETS[0],
    [presetId],
  );
  const accent = preset.color;
  const total = preset.questions.length;
  const finalUrl = reviewUrl.trim() || GOOGLE_WRITE_REVIEW_URL;

  function begin() {
    setStep("q");
    setQIndex(0);
    setChosen([]);
    setLabels([]);
    setTapped(null);
    setReview("");
    setCopied(false);
    setShuffled(shuffle(preset.questions[0].options));
  }

  function handleTap(opt: RTOption) {
    if (tapped) return;
    setTapped(opt.label);
    window.setTimeout(() => {
      const nextChosen = [...chosen, pick(opt.variants)];
      const nextLabels = [...labels, opt.label];
      if (qIndex < total - 1) {
        const next = qIndex + 1;
        setChosen(nextChosen);
        setLabels(nextLabels);
        setQIndex(next);
        setTapped(null);
        setShuffled(shuffle(preset.questions[next].options));
      } else {
        setChosen(nextChosen);
        setLabels(nextLabels);
        setTapped(null);
        setReview(buildReview(store, preset, nextChosen));
        setStep("done");
      }
    }, 260);
  }

  function copyAndOpen() {
    const text = review;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => window.open(finalUrl, "_blank"), 400);
  }

  // ---- 設定画面（店舗が自分用リンクを作る） ----
  if (step === "config") {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            お店に合わせて設定
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            来店されたお客様に、このページをQR等で開いてもらうだけ。タップで口コミの下書きが完成します。
          </p>
          <label className="mt-5 block text-sm font-bold text-slate-700">
            店舗名
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="例：○○クリニック"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="mt-4 block text-sm font-bold text-slate-700">
            業種
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500"
            >
              {REVIEW_TOOL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold text-slate-700">
            Googleクチコミ投稿URL（任意）
            <input
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              placeholder="店舗の「クチコミを書く」リンク"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
            <span className="mt-1 block text-xs text-slate-400">
              未入力の場合はGoogleのクチコミ投稿画面を開きます。
            </span>
          </label>
          <button
            type="button"
            onClick={() => setStep("start")}
            className="mt-6 w-full rounded-xl px-5 py-3.5 text-base font-bold text-white shadow transition hover:opacity-90"
            style={{ background: accent }}
          >
            プレビューする →
          </button>
        </div>
      </div>
    );
  }

  // ---- スタート画面 ----
  if (step === "start") {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <div
          className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl text-4xl"
          style={{ background: accent, boxShadow: `0 12px 32px ${accent}40` }}
        >
          {preset.emoji}
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Customer Review
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          {store.trim() || "ご来店ありがとうございました"}
        </h1>
        <p className="mt-2 text-base text-slate-500">
          ボタンをタップするだけで口コミが完成します
        </p>
        <div className="mt-8 flex justify-center gap-7 text-center">
          <div>
            <div className="text-2xl">👆</div>
            <div className="mt-1 text-xs text-slate-500">タップのみ</div>
          </div>
          <div>
            <div className="text-2xl">📋</div>
            <div className="mt-1 text-xs text-slate-500">全{total}問</div>
          </div>
          <div>
            <div className="text-2xl">⏱</div>
            <div className="mt-1 text-xs text-slate-500">約1分</div>
          </div>
        </div>
        <button
          type="button"
          onClick={begin}
          className="mt-8 w-full rounded-2xl px-5 py-5 text-xl font-extrabold text-white shadow-lg transition hover:opacity-90"
          style={{ background: accent, boxShadow: `0 10px 28px ${accent}50` }}
        >
          はじめる →
        </button>
        {!lockConfig ? (
          <button
            type="button"
            onClick={() => setStep("config")}
            className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            設定を変更する
          </button>
        ) : null}
      </div>
    );
  }

  // ---- 質問画面 ----
  if (step === "q") {
    const q = preset.questions[qIndex];
    const dots = "●".repeat(qIndex + 1) + "○".repeat(total - qIndex - 1);
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              質問 {qIndex + 1} / {total}
            </span>
            <span className="text-xs font-bold" style={{ color: accent }}>
              {dots}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full transition-all"
              style={{
                background: accent,
                width: `${((qIndex + 1) / total) * 100}%`,
              }}
            />
          </div>
        </div>
        <h2 className="my-7 whitespace-pre-line text-center text-2xl font-extrabold leading-snug text-slate-900">
          {q.text}
        </h2>
        <div className="flex flex-col gap-3">
          {shuffled.map((opt, idx) => {
            const active = tapped === opt.label;
            return (
              <button
                key={`${opt.label}-${idx}`}
                type="button"
                onClick={() => handleTap(opt)}
                className="w-full rounded-2xl border-2 px-4 py-5 text-lg font-semibold transition"
                style={{
                  background: active ? accent : "#fff",
                  color: active ? "#fff" : "#1e293b",
                  borderColor: active ? accent : "#d0e4ee",
                  boxShadow: active
                    ? `0 8px 24px ${accent}45`
                    : "0 2px 10px rgba(37,99,235,0.08)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- 完成画面 ----
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="mt-2 text-xl font-extrabold text-slate-900">
          口コミ文章ができました
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          コピーしてGoogleに貼り付けてください
        </p>
      </div>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {labels.map((l, i) => (
          <span
            key={`${l}-${i}`}
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: `${accent}15`, color: accent }}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="mb-3 rounded-2xl border-2 bg-white p-5 text-[17px] leading-loose text-slate-800 shadow-sm" style={{ borderColor: "#d0e4ee" }}>
        {review}
      </div>
      <button
        type="button"
        onClick={copyAndOpen}
        className="mb-3 w-full rounded-2xl px-5 py-5 text-lg font-extrabold text-white shadow-lg transition"
        style={{
          background: copied ? "#16a34a" : accent,
          boxShadow: copied ? "0 10px 28px #16a34a50" : `0 10px 28px ${accent}50`,
        }}
      >
        {copied ? "✓ コピー済み！Googleが開きます" : "📋 コピーしてGoogleへ進む"}
      </button>
      <div
        className="mb-4 rounded-xl px-4 py-3 text-center text-sm leading-relaxed"
        style={{ background: `${accent}10`, color: accent }}
      >
        ボタンを押すと文章がコピーされ、Googleのページが開きます。あとは貼り付けるだけ。
      </div>
      <p className="mb-4 text-center text-xs leading-relaxed text-slate-400">
        {REVIEW_TOOL_DISCLAIMER}
      </p>
      <button
        type="button"
        onClick={begin}
        className="w-full py-3 text-sm font-medium text-slate-400 hover:text-slate-600"
      >
        最初からやり直す
      </button>
    </div>
  );
}
