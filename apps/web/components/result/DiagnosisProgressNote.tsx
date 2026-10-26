"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { progressLabel, type DiagnosisAppId } from "@reviewcheck/core";
import {
  diagnosisProgressServerSnapshot,
  diagnosisProgressSnapshot,
  rememberDiagnosis,
  subscribeDiagnosisProgress,
} from "@/lib/diagnosisProgress";
import { useEmbedHidden } from "../diagnosis/useEmbedHidden";

/**
 * 6つの診断のうち、この端末で確かめた数。サーバには送らない。
 */
export function DiagnosisProgressNote({
  appId,
  className = "",
}: {
  appId: DiagnosisAppId;
  className?: string;
}) {
  const embedHidden = useEmbedHidden();
  const [ready, setReady] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribeDiagnosisProgress,
    diagnosisProgressSnapshot,
    diagnosisProgressServerSnapshot,
  );

  useEffect(() => {
    const embed = new URLSearchParams(window.location.search).get("embed") === "1";
    if (!embed) rememberDiagnosis(appId);
    setReady(true);
  }, [appId]);

  if (!ready || embedHidden) return null;
  const count = snapshot ? snapshot.split(",").filter(Boolean).length : 0;
  return (
    <p
      data-diagnosis-progress=""
      className={`mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-800 ${className}`.trim()}
    >
      <span className="block">{progressLabel(count)}</span>
      <span className="mt-0.5 block text-slate-700">数は、この端末の中だけです。</span>
    </p>
  );
}
