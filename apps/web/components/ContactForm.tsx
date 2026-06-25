"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SITE, PLAN_TOPIC_LABELS } from "@reviewcheck/config";

const TOPICS: Record<string, string> = {
  improvement: "Google口コミ改善のご相談",
  meo: "MEO対策のご相談",
  "review-reply": "口コミ返信方針作成のご相談",
  "bad-review": "悪評・低評価口コミ対応のご相談",
  report: "詳細レポートのご依頼",
  profile: "Googleビジネスプロフィール改善のご相談",
  monthly: "月額MEO・口コミ改善サポートのご相談",
  consult: "15分の無料相談",
  monitoring: "月次モニタリングのお申し込み",
  suggest: "サジェスト（検索候補）対策のご相談",
  // 総合改善パッケージ（プラン）の申し込み・相談
  ...PLAN_TOPIC_LABELS,
};

export function ContactForm() {
  const params = useSearchParams();
  const topicKey = params.get("topic") ?? "";
  const topicLabel = TOPICS[topicKey] ?? "お問い合わせ";
  const isMonitoring = topicKey === "monitoring";
  const isApply = isMonitoring || topicKey.startsWith("plan-");

  const [store, setStore] = useState(params.get("store") ?? "");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const mailto = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(
    `【${topicLabel}】${SITE.name}`,
  )}&body=${encodeURIComponent(
    `■ご相談内容: ${topicLabel}\n■店舗名 / GoogleマップURL: ${store}\n■ご連絡先メール: ${email}\n\n■詳細:\n${message}\n`,
  )}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-bold text-blue-700">{topicLabel}</p>
      {isMonitoring ? (
        <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800">
          毎月、あなたと競合の口コミ数・星評価・順位の変化を自動でレポートし、抜かれそうなときにお知らせします。お申し込み内容を確認後、開始方法をご連絡します。
        </p>
      ) : null}
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
            ご連絡先メール
            {isMonitoring ? (
              <span className="ml-1 text-xs font-normal text-emerald-700">
                （レポートの送付先）
              </span>
            ) : (
              <span className="ml-1 text-xs font-normal text-slate-500">
                （任意）
              </span>
            )}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例：owner@example.com"
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
          {isApply ? "この内容で申し込む" : "メールで相談する"}
        </a>
        <p className="text-xs text-slate-500">
          ボタンを押すとメールソフトが開きます。LINEでのご相談も歓迎です（画面右下・ヘッダーのLINEボタン）。直接 {SITE.contactEmail} 宛にご連絡いただいても構いません。
        </p>
      </div>
    </div>
  );
}
