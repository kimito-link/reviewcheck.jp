"use client";

import { useEffect, useState } from "react";
import { lineConsultHref } from "@/lib/refLine";
import { useEmbedHidden } from "./diagnosis/useEmbedHidden";

/**
 * 共有URLの ref_line を、受け取った人向けの控えめな連絡先として出す。
 * 主CTAとは別。緑はここのボタンだけに使う。
 */
export function SharerLineConsult({ refLine }: { refLine?: string }) {
  const embedHidden = useEmbedHidden();
  const [href, setHref] = useState<string | null>(() => lineConsultHref(refLine, ""));

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("ref_line");
    const raw = refLine || fromUrl || "";
    setHref(lineConsultHref(raw, navigator.userAgent));
  }, [refLine]);

  if (embedHidden || !href) return null;

  return (
    <section
      data-sharer-line-consult=""
      aria-label="共有した人への連絡"
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5"
    >
      <p className="text-sm leading-relaxed text-slate-800">
        この結果を共有した人の公式LINEです。
      </p>
      <div className="mt-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center justify-center rounded-lg bg-[#06C755] px-3 py-2 text-sm font-bold text-slate-950 hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        >
          共有した人に相談する（LINE）
        </a>
      </div>
    </section>
  );
}
