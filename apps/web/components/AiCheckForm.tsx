"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { encodeReportId } from "@reviewcheck/core";

/**
 * AI第一印象診断の入力フォーム（設計 P0-2）。
 * 店名（＋任意で地域）を受け取り、ステートレスに /ai-report/[id] へ遷移する。
 * ?ref= は結果ページ側で window.location から拾って伝搬する（DiagnoseForm と同流儀）。
 * 個人名らしき単独入力でも「店舗・会社名で」を案内（センシティブ属性の入口を塞ぐ・地雷#4）。
 */
export function AiCheckForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const store = name.trim();
    if (!store) {
      setErr("店舗名・会社名を入力してください。");
      return;
    }
    // 診断はステートレス。最小の DiagnosisInput を組んで encode（結果ページで各項目を再計算）。
    const id = encodeReportId({
      store: {
        name: store,
        // AI診断は口コミ数値を持たない入口なので中立値で入れる（結果ページで公開データを取得）。
        rating: 0,
        reviewCount: 0,
        source: "manual",
        ...(area.trim() ? { address: area.trim() } : {}),
      },
      competitors: [],
    });
    router.push(`/ai-report/${id}/`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="ai-store" className="mb-1 block text-sm font-medium text-slate-800">
          店舗名・会社名 <span className="text-red-500">*</span>
        </label>
        <input
          id="ai-store"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：鮨 まさ"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label htmlFor="ai-area" className="mb-1 block text-sm font-medium text-slate-800">
          地域（任意・精度が上がります）
        </label>
        <input
          id="ai-area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="例：東京都渋谷区"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}
      <button
        type="submit"
        className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        無料でAI第一印象を診断する
      </button>
      <p className="text-xs text-slate-500">
        ※ 公開情報とAIへの質問をもとにした簡易診断です。ログインやパスワードは不要です。
        個人名ではなく、店舗名・会社名でお試しください。
      </p>
    </form>
  );
}
