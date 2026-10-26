"use client";

import { DIAGNOSIS_APPS, type DiagnosisApp } from "@reviewcheck/core";
import { rememberDiagnosis } from "@/lib/diagnosisProgress";
import { DiagnosisLink } from "./diagnosis/DiagnosisLink";
import { useEmbedHidden } from "./diagnosis/useEmbedHidden";

const badgeClass =
  "inline-flex min-h-11 items-center rounded-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-100 decoration-slate-100 hover:text-white focus-visible:outline-amber-200";

function badges(app: DiagnosisApp): { key: string; label: string; url: string }[] {
  return [
    { key: "web", label: "Web", url: app.webUrl },
    ...app.stores.map((store) => ({
      key: store.kind,
      label: store.label,
      url: store.url,
    })),
  ];
}

/**
 * フッターの診断一覧。公開中の場所だけをバッジで示す。評価数は出さない。
 */
export function DiagnosisAppsFooter() {
  const hidden = useEmbedHidden();
  if (hidden) return null;
  return (
    <div data-diagnosis-apps="" className="mt-10 border-t border-white/10 pt-8">
    <section aria-labelledby="diagnosis-apps-heading">
      <h3 id="diagnosis-apps-heading" className="text-sm font-bold text-white">
        公開中の診断
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-200">
        同じ運営の診断です。公開中の場所から開けます。
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DIAGNOSIS_APPS.filter((app) => app.group === "network").map((app) => (
          <li
            key={app.id}
            className="rounded-xl border border-white/15 bg-white/5 p-4"
          >
            <DiagnosisLink
              url={app.webUrl}
              className="text-base font-bold text-slate-100 decoration-slate-100 hover:text-white focus-visible:outline-amber-200"
              onOpen={() => rememberDiagnosis(app.id)}
            >
              {app.name}
            </DiagnosisLink>
            <p className="mt-1 text-sm leading-relaxed text-slate-200">{app.value}</p>
            {app.patentNote ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-200">{app.patentNote}</p>
            ) : null}
            <ul className="mt-3 flex flex-wrap gap-2">
              {badges(app).map((badge) => (
                <li key={badge.key}>
                  <DiagnosisLink
                    url={badge.url}
                    className={badgeClass}
                    onOpen={() => rememberDiagnosis(app.id)}
                  >
                    公開中 {badge.label}
                  </DiagnosisLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="diagnosis-site-heading" className="mt-8">
      <h3 id="diagnosis-site-heading" className="text-sm font-bold text-white">
        口コミチェック.jpの診断
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-200">
        このサイトの中で開ける診断です。
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DIAGNOSIS_APPS.filter((app) => app.group === "reviewcheck").map((app) => (
          <li
            key={app.id}
            className="rounded-xl border border-white/15 bg-white/5 p-4"
          >
            <DiagnosisLink
              url={app.webUrl}
              className="text-base font-bold text-slate-100 decoration-slate-100 hover:text-white focus-visible:outline-amber-200"
              onOpen={() => rememberDiagnosis(app.id)}
            >
              {app.name}
            </DiagnosisLink>
            <p className="mt-1 text-sm leading-relaxed text-slate-200">{app.value}</p>
          </li>
        ))}
      </ul>
    </section>
    </div>
  );
}
