"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  areaFromAddress,
  buildAiHearingMessage,
  resolveAiHearingHref,
  selectResultCta,
} from "@reviewcheck/config";
import { LineConsultCta } from "../LineConsultCta";
import { useIncludeShop } from "./ResultActionContext";

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
  ruleVersion,
  shopName,
  category,
  address,
  monitoringHref,
  shopToggle = false,
  placement = "block",
}: ResultNextCtaProps) {
  const copy = selectResultCta(score);
  const { includeShop, setIncludeShop } = useIncludeShop();
  const isLine = copy.kind !== "monitoring";
  const message = buildAiHearingMessage({
    score,
    ruleVersion,
    shopName: includeShop ? shopName : undefined,
    category,
    area: areaFromAddress(address),
  });
  const { href } = resolveAiHearingHref(message);

  const action = isLine ? (
    <LineConsultCta
      text={copy.label}
      message={message}
      href={href}
      fullWidth={placement === "block"}
      size={placement === "block" ? "lg" : "default"}
    />
  ) : (
    <a
      href={monitoringHref}
      target="_blank"
      rel="noopener noreferrer"
      data-destination={monitoringHref}
      className={`inline-flex items-center justify-center rounded-lg bg-blue-700 font-bold text-white shadow-sm transition hover:bg-blue-800 ${
        placement === "block"
          ? "w-full px-7 py-4 text-base"
          : "px-4 py-2.5 text-base"
      }`}
    >
      {copy.label}
    </a>
  );

  if (placement === "sticky") {
    return <StickyBar headline={copy.headline} action={action} />;
  }

  return (
    <div data-cta-kind={copy.kind}>
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        {copy.headline}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-slate-800">{copy.body}</p>
      {shopToggle && isLine ? (
        <label className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-slate-800">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0"
            checked={includeShop}
            onChange={(e) => setIncludeShop(e.target.checked)}
          />
          <span>
            店名もメッセージに含める（選んだときだけ送信します。送るのは点数・採点ルール・業種・エリアと、選んだ場合の店名だけです）
          </span>
        </label>
      ) : null}
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
