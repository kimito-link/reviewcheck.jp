"use client";

import { useState, useEffect } from "react";
import {
  type AiCheckScore,
  type AiCheckFactorKey,
  buildAiCheckLineMessage,
  buildAiCheckMonitorUrl,
  buildKanbanLineMessage,
  buildKanbanMonitorUrl,
  withViaParam,
} from "@reviewcheck/core";
import { lineChannelForTopic } from "@reviewcheck/config";
import { ResultHook, ResultMethodDetails, UnconfirmedList } from "./result/ResultReading";

const FACTOR_LABEL: Record<AiCheckFactorKey, string> = {
  aiVisibility: "AIからの見え方",
  reviews: "口コミ評価",
  search: "検索の見え方",
  siteHealth: "サイトの健康",
  impersonation: "情報のばらつき・なりすまし兆候",
};

const BAND_LABEL: Record<AiCheckScore["band"], string> = {
  excellent: "AI優等生",
  almost: "あと一歩",
  growth: "伸びしろ大",
};

/** SVG円グラフ（総合スコア）。色は帯の判定に使わない。 */
function ScoreRing({ total }: { total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (total / 100) * c;
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#1a365d"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="66" textAnchor="middle" fontSize="34" fontWeight="800" fill="#0f172a">
        {total}
      </text>
      <text x="70" y="92" textAnchor="middle" fontSize="16" fill="#1e293b">
        / 100
      </text>
    </svg>
  );
}

export interface AiReportData {
  score: AiCheckScore;
  storeName: string;
  /** 表示前フィルタ済みのAI回答の先頭文。無ければ null。 */
  aiSafeHead: string | null;
  /** ぼかす（LINEへ回す）残り文の数。 */
  aiRedactedCount: number;
  /** ネガ系サジェスト検出件数（数だけ見せ、語はぼかす）。 */
  negativeSuggestCount: number;
  /** AI回答の実測日時（例: 2026-07-02）とモデル名。 */
  probedAtLabel: string;
  probedModel: string;
  /** アフィリ紹介コード（?ref= 由来）。 */
  refCode?: string;
  /** 共有URL（絶対）。 */
  shareUrl: string;
  /** 診断の種類（store=既存お店版・kanban=看板名版）。既定 store で後方互換。 */
  variant?: "store" | "kanban";
}

/** ぼかし表示（内容は伏せ、存在だけ見せる）。 */
function Blur({ children }: { children: React.ReactNode }) {
  return (
    <span className="select-none rounded bg-slate-200 px-2 py-0.5 text-base text-slate-200 blur-[3px]">
      {children}
    </span>
  );
}

function LineSendButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-6 py-3.5 text-base font-bold text-slate-950 shadow-sm transition hover:brightness-95"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.6 7.4 8.5 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6h0c1.5-1.6 2.2-3.3 2.2-5C22.6 6.6 18 3 12 3z" />
      </svg>
      {label}
    </button>
  );
}

/** AI診断結果ビュー（クライアント・CTAのコピー挙動を含む）。看板名版も同じ並び。 */
export function AiReportView(props: AiReportData) {
  const {
    score,
    storeName,
    aiSafeHead,
    aiRedactedCount,
    negativeSuggestCount,
    probedAtLabel,
    probedModel,
    refCode,
    shareUrl,
    variant = "store",
  } = props;
  const [urlRef, setUrlRef] = useState<string | undefined>(refCode);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (raw && /^[A-Za-z0-9_-]{1,32}$/.test(raw)) setUrlRef(raw);
  }, []);

  const bandTitle = BAND_LABEL[score.band];
  const lineMessage =
    variant === "kanban"
      ? buildKanbanLineMessage(storeName, score.total)
      : buildAiCheckLineMessage(storeName, score.total);
  const monitorUrl =
    variant === "kanban"
      ? buildKanbanMonitorUrl({ refCode: urlRef, storeName })
      : buildAiCheckMonitorUrl({ refCode: urlRef, storeName });
  const lineChannel = lineChannelForTopic();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const onLineCta = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lineMessage);
        setCopyState("copied");
      } else setCopyState("failed");
    } catch {
      setCopyState("failed");
    }
    if (typeof window !== "undefined") {
      window.open(lineChannel.url, "_blank", "noopener,noreferrer");
    }
  };

  const shareText = `うちの店をAIに聞いてみたら…第一印象スコアは${score.total}点でした。あなたのお店は？→`;
  const share = (via: "x" | "line" | "fb") => {
    const url = withViaParam(shareUrl, via);
    const enc = encodeURIComponent(url);
    const t = encodeURIComponent(shareText);
    const dest =
      via === "x"
        ? `https://twitter.com/intent/tweet?text=${t}&url=${enc}`
        : via === "line"
          ? `https://social-plugins.line.me/lineit/share?url=${enc}&text=${t}`
          : `https://www.facebook.com/sharer/sharer.php?u=${enc}`;
    window.open(dest, "_blank", "noopener,noreferrer");
  };

  const measured = score.factors.filter((factor) => !factor.excluded);
  const missed = score.factors
    .filter((factor) => factor.excluded)
    .map((factor) => {
      const note = factor.note ? ` ${factor.note}` : "";
      return `${FACTOR_LABEL[factor.key]}：今回の採点には入れていません。${note}`.trim();
    });
  const room = measured.filter((factor) => (factor.score ?? 0) < factor.max);
  const gain = room.length
    ? `${room.map((factor) => FACTOR_LABEL[factor.key]).join("、")}の点数を上げると、AIや検索が参照する材料が増えます。`
    : "いま取れている項目の点数を保つと、同じ説明が返りやすくなります。";
  const gainMore =
    aiRedactedCount > 0 ? "ぼかしている続きは、LINEで見立てとして受け取れます。" : "";
  const ctaLabel = "この診断結果をLINEで送る";

  return (
    <div className="space-y-6">
      <section
        data-result-section="result"
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col items-center text-center">
          <ScoreRing total={score.total} />
          <p className="mt-2 text-xl font-extrabold text-slate-900">{bandTitle}</p>
          <p className="mt-1 text-base text-slate-800">
            「{storeName}」のAI・ネット第一印象スコア（見え方の現状の目安です）
          </p>
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900">項目別スコア</h2>
          <div className="mt-3 space-y-3">
            {measured.map((f) => (
              <div key={f.key}>
                <div className="mb-1 flex items-center justify-between gap-3 text-base">
                  <span className="font-medium text-slate-900">{FACTOR_LABEL[f.key]}</span>
                  <span className="font-bold text-slate-900">
                    {f.score} / {f.max}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-700"
                    style={{ width: `${((f.score ?? 0) / f.max) * 100}%` }}
                  />
                </div>
                {f.note ? <p className="mt-1 text-base text-slate-800">{f.note}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">AIに聞いた回答</h2>
          {aiSafeHead ? (
            <p className="mt-2 text-base leading-relaxed text-slate-900">
              {aiSafeHead}
              {aiRedactedCount > 0 ? (
                <>
                  {" "}
                  <Blur>この続きにあと{aiRedactedCount}文の指摘があります</Blur>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-base leading-relaxed text-slate-900">
              現時点のAIは「{storeName}」を十分に認識していない傾向があります。
              AIに正しく見つけてもらう余地が大きい状態です。
            </p>
          )}
          {negativeSuggestCount > 0 ? (
            <p className="mt-2 text-base text-slate-800">
              検索の候補に気になるキーワードが <b>{negativeSuggestCount}件</b> 見つかりました（
              <Blur>具体的な語は見立てでお伝えします</Blur>）。
            </p>
          ) : null}
        </div>
        <ResultHook>この点数を動かしたときに見える変化は、次に続きます。</ResultHook>
      </section>

      <section
        data-result-section="gains"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-extrabold text-slate-900">直すと得られること</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-800">
          {gain}
          {gainMore ? ` ${gainMore}` : ""}
        </p>
        <div className="mt-4">
          <ResultHook>このままの見え方が残る場合は、次のとおりです。</ResultHook>
        </div>
      </section>

      <section
        data-result-section="losses"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-extrabold text-slate-900">このままだと失うこと</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-800">
          この点数と、取得できた回答は、測定した時点の記録です。材料が同じままだと、次に聞かれたときの説明も近くなります。
        </p>
        <div className="mt-4">
          <ResultHook>次の一歩はひとつです。</ResultHook>
        </div>
      </section>

      <section
        data-result-section="cta"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-extrabold text-slate-900">見立てをLINEで受け取る</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-800">
          ぼかしている続きと、まず直す1点は、決まった質問のあとに自動で返します。人が最初に返信することは想定していません。
        </p>
        <div className="mt-4">
          <LineSendButton label={ctaLabel} onClick={onLineCta} />
        </div>
        <CopyState copyState={copyState} lineMessage={lineMessage} />
      </section>

      <section
        data-result-section="share"
        className="rounded-2xl border border-slate-200 bg-white p-5 text-center sm:p-6"
      >
        <p className="mb-3 text-base font-bold text-slate-900">
          「うちの店をAIに聞いてみた」を渡す
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => share("x")} className="rounded-lg bg-slate-900 px-4 py-2 text-base font-bold text-white">
            Xでシェア
          </button>
          <button type="button" onClick={() => share("line")} className="rounded-lg bg-[#06C755] px-4 py-2 text-base font-bold text-slate-950">
            LINEでシェア
          </button>
          <button type="button" onClick={() => share("fb")} className="rounded-lg bg-[#0b57b5] px-4 py-2 text-base font-bold text-white">
            Facebook
          </button>
        </div>
        <div className="mt-4 text-left">
          <ResultHook>読み終えたところの次の一歩は、この次です。</ResultHook>
        </div>
      </section>

      <section
        data-result-section="cta-repeat"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <LineSendButton label={ctaLabel} onClick={onLineCta} />
        <CopyState copyState={copyState} lineMessage={lineMessage} />
      </section>

      <UnconfirmedList lines={missed} note="点数には入れていません。" />

      <ResultMethodDetails>
        <p>
          {probedAtLabel}時点・{probedModel} の回答例です。AIやネットの見え方は日によって変わります。
        </p>
        <p>点数は、取得できた項目だけで正規化した目安です。対象外の項目は点数に入れていません。</p>
        <p>
          見られ方の変化は、
          <a
            href={monitorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-blue-800 underline decoration-blue-800 underline-offset-2"
          >
            月次モニタリングのページ
          </a>
          で追えます。
        </p>
      </ResultMethodDetails>
    </div>
  );
}

function CopyState({
  copyState,
  lineMessage,
}: {
  copyState: "idle" | "copied" | "failed";
  lineMessage: string;
}) {
  if (copyState === "copied") {
    return (
      <p className="mt-2 text-base text-slate-800" role="status">
        相談文をコピーしました。LINEのトークに貼り付けて送ってください。
      </p>
    );
  }
  if (copyState === "failed") {
    return (
      <div className="mt-2 text-base text-slate-800">
        <p className="mb-1">以下の文をコピーして、LINEのトークに貼り付けて送ってください。</p>
        <textarea
          readOnly
          value={lineMessage}
          onFocus={(e) => e.currentTarget.select()}
          rows={2}
          className="w-full resize-none rounded-md border border-slate-500 bg-white p-2 text-base text-slate-900"
        />
      </div>
    );
  }
  return null;
}
