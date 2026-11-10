"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { buildLineConsultMessage, selectResultCta } from "@reviewcheck/config";
import { postFunnel } from "@/lib/postFunnel";
import { LineConsultCta } from "../LineConsultCta";

interface ResultNextCtaProps {
  score: number;
  ruleVersion: string;
  shopName?: string;
  category?: string;
  address?: string;
  monitoringHref: string;
  /** 最初のCTAだけ、店名を含めるチェックを出す */
  shopToggle?: boolean;
  placement?: "block" | "sticky";
}

/**
 * 点数で決まる、ただ1つの次の一歩。
 * LINEのボタンだけブランドの緑を使う。パネル自体は緑にしない。
 */
export function ResultNextCta({
  score,
  placement = "block",
}: ResultNextCtaProps) {
  const copy = selectResultCta(score);
  const paused = copy.kind === "monitoring";
  const isLine = !paused;
  const headline = paused ? "月次の自動巡回は、いま新規では受けていません" : copy.headline;
  const body = paused
    ? "既存の決済・解約・返金は、この画面では変更しません。相談は、初回15分の既存メニューです。購入の確定ではありません。"
    : copy.body;
  const message = buildLineConsultMessage();

  const action = isLine ? (
    <div onClick={() => postFunnel("cta", "consult")}>
      <LineConsultCta
        text={copy.label}
        message={message}
        fullWidth={placement === "block"}
        size={placement === "block" ? "lg" : "default"}
      />
    </div>
  ) : (
    <a
      href="/contact/?topic=consult"
      data-funnel="cta:consult"
      onClick={() => postFunnel("cta", "consult")}
      className={`inline-flex items-center justify-center rounded-lg bg-blue-700 font-bold text-white shadow-sm transition hover:bg-blue-800 ${
        placement === "block"
          ? "w-full px-7 py-4 text-base"
          : "px-4 py-2.5 text-base"
      }`}
    >
      15分の無料相談ページを開く
    </a>
  );

  if (placement === "sticky") {
    return <StickyBar headline={headline} action={action} />;
  }

  return (
    <div data-cta-kind={paused ? "consult-paused-monitor" : copy.kind}>
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        {headline}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-slate-800">{body}</p>
      <p className="mt-2 text-base leading-relaxed text-slate-800">
        送る文面に、店名と点数は入れません。
      </p>
      <div className="mt-4 max-w-xl">{action}</div>
    </div>
  );
}

function StickyBar({
  headline,
  action,
}: {
  headline: string;
  action: ReactNode;
}) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto relative mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 pr-10 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:pr-3">
        <p className="min-w-0 flex-1 text-base font-bold leading-snug text-slate-900">
          {headline}
        </p>
        <div className="shrink-0">{action}</div>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="閉じる"
          className="absolute right-4 top-2 rounded-lg p-1 text-slate-500 hover:text-slate-700 sm:static"
        >
          ×
        </button>
      </div>
    </div>
  );
}
