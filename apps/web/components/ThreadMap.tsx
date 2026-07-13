import type { ScoreFactor } from "@reviewcheck/core";
import { buildThreadMapMaterials, THREAD_MAP_TEXTS } from "@reviewcheck/core";

/**
 * 一本の糸マップ（「医者の物語」レイヤー P1・表示専用）。
 * 設計: docs/DESIGN-report-doctor-story-2026-07-08.md §C-4。
 *
 * 色は factors の status の写像のみ（core の buildThreadMapMaterials が正本）で、
 * スコア内訳と矛盾しない。実測していないノード（人の行動・仕組み・結果）は常にニュートラル。
 * 外部チャートライブラリ禁止＝flex+CSS のみ。文字列はすべて core の辞書由来。
 */

const TONE_CLS: Record<string, { box: string; dot: string }> = {
  good: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    dot: "bg-emerald-500",
  },
  warn: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    dot: "bg-amber-500",
  },
  bad: { box: "border-red-200 bg-red-50 text-red-900", dot: "bg-red-500" },
  neutral: {
    box: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-300",
  },
};

/** 実測不能ステージ（常にニュートラル）の箱。note があれば1行の補足を添える。 */
function NeutralStage({ label, note }: { label: string; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {note ? (
        <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{note}</p>
      ) : null}
    </div>
  );
}

/** 段をつなぐ糸（細い中立線・色を持たせない）。 */
function Thread() {
  return (
    <div aria-hidden className="mx-auto h-4 w-px bg-slate-300" />
  );
}

export function ThreadMap({ factors }: { factors: ScoreFactor[] }) {
  const materials = buildThreadMapMaterials(factors);
  const t = THREAD_MAP_TEXTS;

  return (
    <div className="mt-2">
      <NeutralStage label={t.stageSeeker} note={t.stageSeekerNote} />
      <Thread />
      <NeutralStage label={t.stageCompare} note={t.stageCompareNote} />
      <Thread />
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-center text-xs font-medium text-slate-500">
          {t.stageMaterials}
        </p>
        <p className="mt-0.5 text-center text-[10px] leading-snug text-slate-400">
          {t.stageMaterialsNote}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {materials.map((m) => {
            const cls = TONE_CLS[m.tone] ?? TONE_CLS.neutral;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium ${cls.box}`}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${cls.dot}`}
                />
                <span>{m.label}</span>
                {m.note ? (
                  <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                    {m.note}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <Thread />
      <NeutralStage label={t.stageOutcome} note={t.stageOutcomeNote} />
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.caption}</p>
    </div>
  );
}
