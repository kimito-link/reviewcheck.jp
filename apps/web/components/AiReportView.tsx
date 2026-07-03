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

const FACTOR_LABEL: Record<AiCheckFactorKey, string> = {
  aiVisibility: "AIからの見え方",
  reviews: "口コミ評価",
  search: "検索の見え方",
  siteHealth: "サイトの健康",
  impersonation: "情報のばらつき・なりすまし兆候",
};

const BAND_LABEL: Record<AiCheckScore["band"], { title: string; cls: string }> = {
  excellent: { title: "AI優等生", cls: "text-emerald-600" },
  almost: { title: "あと一歩", cls: "text-amber-600" },
  growth: { title: "伸びしろ大", cls: "text-blue-600" },
};

/** SVG円グラフ（総合スコア）。フラット・CSS変数不使用でブランド色。 */
function ScoreRing({ total }: { total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (total / 100) * c;
  const color =
    total >= 80 ? "#059669" : total >= 55 ? "#d97706" : "#2563eb";
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="66" textAnchor="middle" fontSize="34" fontWeight="800" fill="#0f172a">
        {total}
      </text>
      <text x="70" y="90" textAnchor="middle" fontSize="12" fill="#64748b">
        / 100
      </text>
    </svg>
  );
}

export interface AiReportData {
  score: AiCheckScore;
  storeName: string;
  /** 表示前フィルタ済み・安全なAI回答の先頭文（無料で見せる1文）。無ければ null。 */
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
    <span className="select-none rounded bg-slate-200 px-2 py-0.5 text-slate-200 blur-[3px]">
      {children}
    </span>
  );
}

/** AI診断結果ビュー（クライアント・CTAのコピー挙動を含む）。 */
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
  // アフィリ紹介コードは client 側で ?ref= から拾って /monitor へ伝搬（DiagnoseForm と同流儀）。
  const [urlRef, setUrlRef] = useState<string | undefined>(refCode);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (raw && /^[A-Za-z0-9_-]{1,32}$/.test(raw)) setUrlRef(raw);
  }, []);

  const band = BAND_LABEL[score.band];
  // 看板名版は from=kanban の導線・定型文に切り替える（既定 store は from=aidiag のまま）。
  const lineMessage =
    variant === "kanban"
      ? buildKanbanLineMessage(storeName, score.total)
      : buildAiCheckLineMessage(storeName, score.total);
  const monitorUrl =
    variant === "kanban"
      ? buildKanbanMonitorUrl({ refCode: urlRef, storeName })
      : buildAiCheckMonitorUrl({ refCode: urlRef, storeName });
  const lineChannel = lineChannelForTopic(); // 既定＝風評窓口（設計 §2-4）
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

  return (
    <div className="space-y-6">
      {/* 総合スコア */}
      <section className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <ScoreRing total={score.total} />
        <p className={`mt-2 text-lg font-extrabold ${band.cls}`}>{band.title}</p>
        <p className="mt-1 text-sm text-slate-500">
          「{storeName}」のAI・ネット第一印象スコア（見え方の現状の目安です）
        </p>
      </section>

      {/* 項目バー */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">項目別スコア</h2>
        <div className="space-y-3">
          {score.factors.map((f) => (
            <div key={f.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">{FACTOR_LABEL[f.key]}</span>
                <span className="text-slate-500">
                  {f.excluded ? "対象外" : `${f.score} / ${f.max}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                {!f.excluded && (
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${((f.score ?? 0) / f.max) * 100}%` }}
                  />
                )}
              </div>
              {f.note ? <p className="mt-1 text-xs text-slate-500">{f.note}</p> : null}
            </div>
          ))}
        </div>
      </section>

      {/* AI回答の実測カード（バズの主砲＋ぼかし） */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
            AIに聞いてみた
          </span>
          <span className="text-xs text-slate-500">
            {probedAtLabel}時点・{probedModel} の回答例
          </span>
        </div>
        {aiSafeHead ? (
          <p className="text-sm leading-relaxed text-slate-800">
            {aiSafeHead}
            {aiRedactedCount > 0 ? (
              <>
                {" "}
                <Blur>この続きにあと{aiRedactedCount}文の指摘があります</Blur>
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-slate-800">
            現時点のAIは「{storeName}」を十分に認識していない傾向があります。
            AIに正しく見つけてもらう余地が大きい状態です。
          </p>
        )}
        {negativeSuggestCount > 0 ? (
          <p className="mt-2 text-sm text-slate-700">
            検索の候補に気になるキーワードが <b>{negativeSuggestCount}件</b> 見つかりました（
            <Blur>具体的な語は見立てでお伝えします</Blur>）。
          </p>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">
          ※ AIやネットの見え方は日々・毎月変わる傾向があります。これは◯月時点の測定結果の目安です。
        </p>
      </section>

      {/* LINE CTA（感情ピーク・定型文コピー） */}
      <section className="rounded-2xl border-2 border-[#06C755]/40 bg-[#06C755]/5 p-5">
        <p className="mb-1 text-base font-bold text-slate-900">
          ぼかし部分の「最初の1点」を、無料で見てもらう
        </p>
        <p className="mb-3 text-sm text-slate-700">
          この診断結果のスクショをLINEで送ると、まず直すべき1点を専門家が無料でお返しします。
          相談だけでOK・売り込みはしません。
        </p>
        <button
          type="button"
          onClick={onLineCta}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#05b34d]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
            <path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.6 7.4 8.5 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6h0c1.5-1.6 2.2-3.3 2.2-5C22.6 6.6 18 3 12 3z" />
          </svg>
          この診断結果を専門家に見てもらう（無料）
        </button>
        {copyState === "copied" ? (
          <p className="mt-2 text-xs text-slate-500" role="status">
            相談文をコピーしました。LINEのトークに貼り付けて送ってください。
          </p>
        ) : null}
        {copyState === "failed" ? (
          <div className="mt-2 text-xs text-slate-600">
            <p className="mb-1">以下の文をコピーして、LINEのトークに貼り付けて送ってください。</p>
            <textarea
              readOnly
              value={lineMessage}
              onFocus={(e) => e.currentTarget.select()}
              rows={2}
              className="w-full resize-none rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
            />
          </div>
        ) : null}
      </section>

      {/* 監視直行CTA（従） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
        <p className="mb-3 text-sm text-slate-700">
          この「見られ方」は毎月変わる傾向があります。毎月チェックして変化に気づける状態にしませんか。
        </p>
        <a
          href={monitorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
        >
          この見られ方を毎月見張る（監視プランを見る）
        </a>
      </section>

      {/* シェア */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
        <p className="mb-3 text-sm font-bold text-slate-900">
          「うちの店をAIに聞いてみた」を友だちにも
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => share("x")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            Xでシェア
          </button>
          <button type="button" onClick={() => share("line")} className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white">
            LINEでシェア
          </button>
          <button type="button" onClick={() => share("fb")} className="rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white">
            Facebook
          </button>
        </div>
      </section>
    </div>
  );
}
