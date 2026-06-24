"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SITE } from "@reviewcheck/config";

const TOPICS: Record<string, string> = {
  improvement: "Google口コミ改善のご相談",
  meo: "MEO対策のご相談",
  "review-reply": "口コミ返信方針作成のご相談",
  "bad-review": "悪評・低評価口コミ対応のご相談",
  report: "詳細レポートのご依頼",
  profile: "Googleビジネスプロフィール改善のご相談",
  monthly: "月額MEO・口コミ改善サポートのご相談",
};

export function ContactForm() {
  const params = useSearchParams();
  const topicKey = params.get("topic") ?? "";
  const topicLabel = TOPICS[topicKey] ?? "お問い合わせ";

  const [store, setStore] = useState("");
  const [message, setMessage] = useState("");

  const mailto = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(
    `【${topicLabel}】${SITE.name}`,
  )}&body=${encodeURIComponent(
    `■ご相談内容: ${topicLabel}\n■店舗名 / GoogleマップURL: ${store}\n\n■詳細:\n${message}\n`,
  )}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-bold text-blue-700">{topicLabel}</p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-900">
            店舗名 または GoogleマップURL
          </label>
          <input
            type="text"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="例：〇〇クリニック / https://maps.app.goo.gl/..."
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-900">
            状況・ご相談内容
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="業種・エリア・現在のお悩み（口コミ数が少ない／低評価がある／返信できていない 等）をご記入ください。"
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <a
          href={mailto}
          className="inline-flex w-full items-center justify-center rounded-xl bg-cta px-6 py-3.5 text-base font-bold text-white hover:bg-cta-strong"
        >
          メールで相談する
        </a>
        <p className="text-xs text-slate-400">
          ボタンを押すとメールソフトが開きます。LINEでのご相談も歓迎です（画面右下・ヘッダーのLINEボタン）。直接 {SITE.contactEmail} 宛にご連絡いただいても構いません。
        </p>
      </div>
    </div>
  );
}
