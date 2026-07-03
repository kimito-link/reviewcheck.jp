"use client";

import { useState, useEffect } from "react";
import {
  type OsintFact,
  type OsintPointer,
  buildOsintMonitorUrl,
  OSINT_DISCLAIMER,
} from "@reviewcheck/core";
import { lineChannelForTopic } from "@reviewcheck/config";

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

  // ExportBlock 用の確認記録テキスト（免責を必ず含む）。
  const exportText = [
    `【公開情報の確認記録】${targetName}`,
    ...facts.map((f) => `・${f.observation}（出典：${f.source.name}／取得：${f.retrievedAt}）`),
    ...retrievalFailures.map((r) => `・${r.source}：取得されませんでした（${r.attemptedAt}）`),
    "",
    OSINT_DISCLAIMER,
  ].join("\n");

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

      {/* ExportBlock */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-900"
        >
          確認記録をコピー（エクスポート）
        </button>
        {copied ? <p className="mt-2 text-xs text-slate-500">確認記録をコピーしました。</p> : null}
        <textarea
          readOnly
          value={exportText}
          onFocus={(e) => e.currentTarget.select()}
          rows={4}
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
