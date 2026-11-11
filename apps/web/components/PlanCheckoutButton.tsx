"use client";

import { useState } from "react";
import { resolveRefCode } from "@/lib/affiliateRef";

/**
 * プランの申し込みボタン。
 * - 決済対象プラン（purchasable）: Stripe Checkout を開始。鍵未設定なら相談フォームへ。
 * - 非対象（Pro 等）: 相談フォームへ遷移。
 */
export function PlanCheckoutButton({
  planKey,
  topic,
  purchasable,
  featured,
}: {
  planKey: string;
  topic: string;
  purchasable: boolean;
  featured?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cls = `mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold transition ${
    featured
      ? "bg-amber-500 text-white shadow hover:bg-amber-600"
      : "border-2 border-blue-600 bg-white text-blue-700 hover:bg-blue-50"
  } disabled:opacity-60`;

  const contactHref = `/contact/?topic=${topic}`;

  if (!purchasable) {
    return (
      <a href={contactHref} className={cls}>
        見積り・相談する
      </a>
    );
  }

  async function startCheckout() {
    setError(null);
    setLoading(true);
    try {
      // 総合PKGは admin.ts の手動 createContract 運用のため、ref は自動計上せず
      // 運営者通知に含めるだけに留める（P1-4: 軽実装の範囲。設計書DESIGN-affiliate-program-2026-07-06.md）。
      const ref = resolveRefCode();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, ref }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      // 鍵未設定（準備中）など → 相談フォームへ誘導
      if (data?.needsConfig) {
        window.location.href = contactHref;
        return;
      }
      setError(data?.error ?? "決済を開始できませんでした。");
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <a
        href={contactHref}
        className={cls}
      >
        まず相談する（無料）
      </a>
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:opacity-60"
      >
        {loading ? "決済ページへ移動中…" : "カードでそのまま申し込む"}
      </button>
      {error ? (
        <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
      ) : null}
    </>
  );
}
