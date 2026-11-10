"use client";

import { useEffect, useState, type ReactNode } from "react";
import { diagnosisHref, isExternalDiagnosisUrl } from "@reviewcheck/core";

/**
 * 診断へのリンク。自サイトはパスのまま、外部は LINE アプリ内ブラウザのときだけ
 * openExternalBrowser=1 を足す。計測用のリダイレクトは使わない。
 * 色は呼び出し側が渡す（暗いフッターと明るい結果画面で分ける）。
 */
export function DiagnosisLink({
  url,
  className = "",
  children,
  onOpen,
}: {
  url: string;
  className?: string;
  children: ReactNode;
  onOpen?: () => void;
}) {
  const [href, setHref] = useState(() => diagnosisHref(url, ""));
  useEffect(() => {
    setHref(diagnosisHref(url, navigator.userAgent));
  }, [url]);
  const external = isExternalDiagnosisUrl(url);
  return (
    <a
      href={href}
      className={`underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`.trim()}
      onClick={onOpen}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  );
}
