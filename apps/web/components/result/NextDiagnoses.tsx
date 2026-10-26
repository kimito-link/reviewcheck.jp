"use client";

import { rankNextDiagnoses, type DiagnosisRankContext } from "@reviewcheck/core";
import { rememberDiagnosis } from "@/lib/diagnosisProgress";
import { DiagnosisLink } from "../diagnosis/DiagnosisLink";
import { useEmbedHidden } from "../diagnosis/useEmbedHidden";

/**
 * 一次CTAの直下に置く、次の診断。ボタンにはせず、文字リンクだけにする。
 */
export function NextDiagnoses({ context }: { context: DiagnosisRankContext }) {
  const hidden = useEmbedHidden();
  if (hidden) return null;
  const apps = rankNextDiagnoses(context);
  return (
    <section
      data-result-section="next-diagnoses"
      aria-labelledby="next-diagnoses-heading"
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 sm:p-5"
    >
      <h2
        id="next-diagnoses-heading"
        className="text-base font-bold text-slate-800"
      >
        次に試すとよい診断
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">
        いまの結果に近いものから並べています。
      </p>
      <ol className="mt-3 space-y-3">
        {apps.map((app) => (
          <li
            key={app.id}
            className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
          >
            <DiagnosisLink
              url={app.webUrl}
              className="text-base font-bold text-blue-800 decoration-blue-800 hover:text-blue-950 focus-visible:outline-blue-800"
              onOpen={() => rememberDiagnosis(app.id)}
            >
              {app.name}
            </DiagnosisLink>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{app.value}</p>
            {app.patentNote ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{app.patentNote}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
