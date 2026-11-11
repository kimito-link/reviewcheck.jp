"use client";

import { useEffect, useMemo, useState } from "react";
import type { DiagnosisResult } from "@reviewcheck/core";
import type { CohortPublic } from "@/lib/cohort/public";
import { buildRecheckIcs } from "@/lib/perk/ics";
import {
  buildDiagnosisReport,
  reportToHtml,
  type DiagnosisReportDocument,
} from "@/lib/perk/reportDocument";
import { parseStoredScore, scoreHistoryKey, type StoredScore } from "@/lib/scoreHistory";

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const buttonClass =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg px-4 py-3 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-2 sm:w-auto";

/**
 * 診断を受けた人への特典。レポートも予定も、この端末の中だけで作る。
 */
export function DiagnosisPerks({
  result,
  cohort,
}: {
  result: DiagnosisResult;
  cohort: CohortPublic | null;
}) {
  const [open, setOpen] = useState(false);
  const [previous, setPrevious] = useState<StoredScore | null>(null);
  const shopName = result.input.store.name ?? "";

  useEffect(() => {
    try {
      setPrevious(parseStoredScore(window.localStorage.getItem(scoreHistoryKey(shopName))));
    } catch {
      setPrevious(null);
    }
  }, [shopName, result.score, result.ruleVersion, result.diagnosedAt]);

  const doc = useMemo(
    () => buildDiagnosisReport({ result, previous, cohort }),
    [result, previous, cohort],
  );

  function saveReport() {
    downloadText("reviewcheck-report.html", reportToHtml(doc), "text/html;charset=utf-8");
  }

  function saveIcs() {
    downloadText(
      "reviewcheck-recheck.ics",
      buildRecheckIcs(result.diagnosedAt),
      "text/calendar;charset=utf-8",
    );
  }

  function printReport() {
    setOpen(true);
    window.setTimeout(() => window.print(), 50);
  }

  return (
    <section
      id="diagnosis-perks"
      data-result-section="perks"
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 text-base text-slate-900 shadow-sm sm:p-6"
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #diagnosis-report-print, #diagnosis-report-print * { visibility: visible !important; }
          #diagnosis-report-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        診断を受けた人への特典
      </h2>
      <p className="mt-2 text-base leading-relaxed text-slate-800">
        この端末の中だけで作れます。メールやLINEの登録は要りません。
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-base leading-relaxed text-slate-800">
        <li>人に渡せるレポート（この端末に保存、または印刷してPDFにできます）</li>
        <li>1か月後の再点検を、カレンダーに入れられます</li>
      </ul>
      <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={saveReport}
          className={`${buttonClass} bg-blue-800 text-white hover:bg-blue-900`}
        >
          レポートを保存
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${buttonClass} border border-slate-400 bg-white text-slate-900 hover:bg-slate-50`}
        >
          レポートを表示して印刷
        </button>
        <button
          type="button"
          onClick={printReport}
          className={`${buttonClass} border border-slate-400 bg-white text-slate-900 hover:bg-slate-50`}
        >
          印刷（PDF）
        </button>
        <button
          type="button"
          onClick={saveIcs}
          className={`${buttonClass} border border-slate-400 bg-white text-slate-900 hover:bg-slate-50`}
        >
          1か月後の再点検を保存
        </button>
      </div>
      {open ? <ReportSheet doc={doc} /> : null}
    </section>
  );
}

export function ReportSheet({ doc }: { doc: DiagnosisReportDocument }) {
  return (
    <article
      id="diagnosis-report-print"
      data-report-preview=""
      className="mt-4 rounded-xl border border-slate-300 bg-white p-4 text-base leading-relaxed text-slate-900 sm:p-6"
    >
      <h3 className="text-xl font-extrabold text-slate-900">口コミ診断レポート</h3>
      <p className="mt-2 text-base font-bold leading-relaxed text-slate-900">
        {doc.lead}
      </p>
      {doc.blocks.map((block) => (
        <section key={block.heading} className="mt-4">
          <h4 className="text-lg font-bold text-slate-900">{block.heading}</h4>
          {block.paragraphs.map((paragraph, index) => (
            <p key={`${block.heading}-${index}`} className="mt-1 text-base leading-relaxed text-slate-900">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
