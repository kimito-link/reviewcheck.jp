"use client";

import { useState, useEffect } from "react";
import {
  type OsintFact,
  type OsintPointer,
  buildOsintMonitorUrl,
  OSINT_DISCLAIMER,
} from "@reviewcheck/core";
import { lineChannelForTopic } from "@reviewcheck/config";
import { buildExport, type ExportVariant } from "../lib/exportVariants";

/**
 * 公開情報ビュー（OSINT）の表示（設計 §2）。
 * スコア・評価色・判定文言を一切持たない別レンダリング木。
 * このファイルは score 系コンポーネント（円グラフ・帯・称号）を import しない
 * ＝判定要素を物理的に混入不能にする（依存関係テストで恒久担保・地雷#2）。
 * 表示部品はホワイトリスト（FactCard/PointerCard/RetrievalNote/ExportBlock）のみ。
 */

export interface FactViewData {
  targetName: string;
  /** 観測された事実（必須フィールドの揃ったものだけ渡す）。 */
  facts: OsintFact[];
  /** 取得できなかった項目（RetrievalNote）。 */
  retrievalFailures: { source: string; attemptedAt: string }[];
  /** コンプラ確認カテゴリなら Pointer Map を出す。 */
  pointers: OsintPointer[];
  refCode?: string;
}

/** FactCard: 観測事実1件。中立グレーのみ・判定色なし。 */
function FactCard({ fact }: { fact: OsintFact }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-800">{fact.observation}</p>
      <p className="mt-2 text-xs text-slate-500">
        出典：{fact.source.name}（{fact.source.kind}）
        {fact.source.url ? (
          <>
            {" ・ "}
            <a href={fact.source.url} target="_blank" rel="noopener noreferrer" className="underline">
              リンク
            </a>
          </>
        ) : null}
        {" ・ 取得日時："}
        {fact.retrievedAt}
      </p>
    </div>
  );
}

/** PointerCard: 情報の所在1件。 */
function PointerCard({ pointer }: { pointer: OsintPointer }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">{pointer.name}</p>
      <p className="mt-1 text-xs text-slate-600">確認できること：{pointer.whatCanBeConfirmed}</p>
      <p className="mt-0.5 text-xs text-slate-600">アクセス方法：{pointer.howToAccess}</p>
    </div>
  );
}

/** RetrievalNote: 取得できなかった旨の中立表示。 */
function RetrievalNote({ source, attemptedAt }: { source: string; attemptedAt: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">
        {source}：情報は取得されませんでした（{attemptedAt} 試行）。
      </p>
    </div>
  );
}

export function FactView(data: FactViewData) {
  const { targetName, facts, retrievalFailures, pointers, refCode } = data;
  const [urlRef, setUrlRef] = useState<string | undefined>(refCode);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (raw && /^[A-Za-z0-9_-]{1,32}$/.test(raw)) setUrlRef(raw);
  }, []);

  const monitorUrl = buildOsintMonitorUrl({ refCode: urlRef });
  const lineChannel = lineChannelForTopic();

  // ★出力区分（2026-08-17）。外部送付用レポートに内部向けの文章が混ざったまま
  //   送付された事故への対策。従来は出力が1種類しかなく、手元で足した文が
  //   そのまま外へ出る構造だった。**既定は必ず外部送付用**。
  const [variant, setVariant] = useState<ExportVariant>("external");
  const exportInput = {
    targetName,
    facts: facts.map((f) => ({
      observation: f.observation,
      sourceName: f.source.name,
      retrievedAt: f.retrievedAt,
    })),
    failures: retrievalFailures.map((r) => ({ source: r.source, attemptedAt: r.attemptedAt })),
    // 基準日。取得日時から起こすのではなく「この記録を出した日」を明示する。
    baseDate: new Date().toISOString().slice(0, 10),
  };
  const exportText = buildExport(variant, exportInput, urlRef);

  const onExport = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportText);
        setCopied(true);
      }
    } catch {
      /* コピー失敗時は下のテキストエリアから手動コピー */
    }
  };

  const lineMessage = `【公開情報ビューの続き】${targetName} について、確認すべき情報源の整理をお願いします。`;
  const onLine = () => {
    try {
      navigator.clipboard?.writeText(lineMessage);
    } catch {
      /* noop */
    }
    if (typeof window !== "undefined") {
      window.open(lineChannel.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-6">
      {/* ① 取得された公開情報 */}
      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">取得された公開情報</h2>
        <div className="space-y-2">
          {facts.map((f, i) => (
            <FactCard key={i} fact={f} />
          ))}
          {retrievalFailures.map((r, i) => (
            <RetrievalNote key={`n${i}`} source={r.source} attemptedAt={r.attemptedAt} />
          ))}
          {facts.length === 0 && retrievalFailures.length === 0 ? (
            <p className="text-sm text-slate-500">表示できる公開情報はありませんでした。</p>
          ) : null}
        </div>
      </section>

      {/* ② Pointer Map（コンプラ確認カテゴリのみ） */}
      {pointers.length > 0 ? (
        <section>
          <h2 className="mb-1 text-base font-bold text-slate-900">確認すべき情報源（所在の地図）</h2>
          <p className="mb-3 text-xs text-slate-500">
            以下は、確認を行う際に参照できる公開情報源の一覧です。当社が照会結果を判定するものではありません。
          </p>
          <div className="space-y-2">
            {pointers.map((p, i) => (
              <PointerCard key={i} pointer={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ExportBlock: 出力区分を選んでコピーする。★既定は「外部送付用」。 */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-base font-bold text-slate-900">確認記録の出力</h2>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="出力の種類">
          {([
            { v: "external", label: "外部送付用レポート" },
            { v: "internal", label: "社内確認用" },
            { v: "message", label: "送付メッセージ" },
            { v: "referral", label: "紹介用短文" },
          ] as const).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => { setVariant(o.v); setCopied(false); }}
              aria-pressed={variant === o.v}
              className={
                variant === o.v
                  ? "rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-white"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              }
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* ★外部へ出してよいのは1区分だけ、と毎回わかるようにする。
            事故は「どれが外部用か画面から判断できなかった」ことでも起きる。 */}
        <p className="mb-3 text-xs text-slate-500">
          {variant === "external"
            ? "このまま相手へお送りいただけます。社内向けの記載は含まれません。"
            : "この文章はレポートには含まれません。相手へ送るのは「外部送付用レポート」です。"}
        </p>
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-900"
        >
          コピーする
        </button>
        {copied ? <p className="mt-2 text-xs text-slate-500">コピーしました。</p> : null}
        <textarea
          readOnly
          value={exportText}
          onFocus={(e) => e.currentTarget.select()}
          rows={8}
          className="mt-3 w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700"
        />
      </section>

      {/* 従CTA: LINE（論点整理のみ）＋ 月次記録 */}
      <section className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onLine}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
        >
          確認すべき情報源の整理を相談
        </button>
        <a
          href={monitorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-800 hover:bg-slate-50"
        >
          この対象の公開情報の変化を毎月記録
        </a>
      </section>

      <p className="text-xs text-slate-400">{OSINT_DISCLAIMER}</p>
    </div>
  );
}
