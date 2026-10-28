"use client";

import { useState, useEffect } from "react";
import {
  type OsintFact,
  type OsintPointer,
  buildOsintMonitorUrl,
  OSINT_DISCLAIMER,
  buildExport,
  type ExportVariant,
} from "@reviewcheck/core";
import { lineChannelForTopic } from "@reviewcheck/config";
import { ResultHook, ResultMethodDetails, UnconfirmedList } from "./result/ResultReading";


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
      <p className="text-base text-slate-900">{fact.observation}</p>
      <p className="mt-2 text-base text-slate-800">
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

/**
 * アクセス方法の中の URL だけをリンクにする。
 * ★2026-08-19: 検索URLを出すようにしたが、素だと文字列のままで押せなかった。
 *   ★リンク先は自前で組み立てた検索URLのみ（http/https 以外は無視）。
 *     外部から与えられた文字列をそのまま href にしない。
 */
function linkifyAccess(text: string) {
  const parts = text.split(/(https?:\/\/[^\s（）]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a
        key={i}
        href={p}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base text-blue-800 underline decoration-blue-800 underline-offset-2 break-all"
      >
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/** PointerCard: 情報の所在1件。 */
function PointerCard({ pointer }: { pointer: OsintPointer }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-base font-bold text-slate-900">{pointer.name}</p>
      <p className="mt-1 text-base text-slate-800">確認できること：{pointer.whatCanBeConfirmed}</p>
      <p className="mt-1 text-base text-slate-800">アクセス方法：{linkifyAccess(pointer.howToAccess)}</p>
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

  const missed = retrievalFailures.map(
    (row) => `${row.source}：情報は取得されませんでした（${row.attemptedAt} 試行）。`,
  );
  const lineLabel = "確認すべき情報源の整理を相談";

  return (
    <div className="space-y-6">
      <section data-result-section="result" className="space-y-3">
        <h2 className="text-xl font-extrabold text-slate-900">取得された公開情報</h2>
        <div className="space-y-2">
          {facts.map((f, i) => (
            <FactCard key={i} fact={f} />
          ))}
          {facts.length === 0 ? (
            <p className="text-base text-slate-800">表示できる公開情報はありませんでした。</p>
          ) : null}
        </div>
        <ResultHook>この記録を残したときと、入っていない情報は、次に続きます。</ResultHook>
      </section>

      <section
        data-result-section="gains"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-extrabold text-slate-900">直すと得られること</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-800">
          観測できた公開情報は、上の文面のまま残せます。相手へ渡す文章は、このあとの外部送付用レポートです。
        </p>
        <div className="mt-4">
          <ResultHook>記録に入っていないものは、次のとおりです。</ResultHook>
        </div>
      </section>

      <section
        data-result-section="losses"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-extrabold text-slate-900">このままだと失うこと</h2>
        <p className="mt-2 text-base leading-relaxed text-slate-800">
          取得できなかった情報源の中身は、この記録にありません。判断に使うときは、その情報源を直接見る必要があります。
        </p>
        <div className="mt-4">
          <ResultHook>次の一歩はひとつです。</ResultHook>
        </div>
      </section>

      <section
        data-result-section="cta"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <button
          type="button"
          onClick={onLine}
          className="inline-flex w-full items-center justify-center rounded-lg bg-[#06C755] px-4 py-3 text-base font-bold text-slate-950 hover:brightness-95"
        >
          {lineLabel}
        </button>
      </section>

      <section
        data-result-section="export"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-extrabold text-slate-900">確認記録の出力</h2>
        <div className="mb-3 mt-3 flex flex-wrap gap-2" role="group" aria-label="出力の種類">
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
                  ? "rounded-full bg-slate-800 px-3 py-2 text-base font-bold text-white"
                  : "rounded-full border border-slate-500 bg-white px-3 py-2 text-base text-slate-900 hover:bg-slate-50"
              }
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-base text-slate-800">
          {variant === "external"
            ? "このまま相手へお送りいただけます。社内向けの記載は含まれません。"
            : "この文章はレポートには含まれません。相手へ送るのは「外部送付用レポート」です。"}
        </p>
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg bg-slate-800 px-5 py-3 text-base font-bold text-white hover:bg-slate-900"
        >
          コピーする
        </button>
        {copied ? <p className="mt-2 text-base text-slate-800">コピーしました。</p> : null}
        <textarea
          readOnly
          value={exportText}
          onFocus={(e) => e.currentTarget.select()}
          rows={8}
          className="mt-3 w-full resize-none rounded-md border border-slate-500 bg-slate-50 p-3 text-base text-slate-900"
        />
        <div className="mt-4">
          <ResultHook>読み終えたところの次の一歩は、この次です。</ResultHook>
        </div>
      </section>

      <section
        data-result-section="cta-repeat"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <button
          type="button"
          onClick={onLine}
          className="inline-flex w-full items-center justify-center rounded-lg bg-[#06C755] px-4 py-3 text-base font-bold text-slate-950 hover:brightness-95"
        >
          {lineLabel}
        </button>
      </section>

      <UnconfirmedList lines={missed} note="上の公開情報には入れていません。" />

      <ResultMethodDetails>
        <p>外部から観測できる公開情報と、その所在をそのまま並べています。可否の判定はしていません。</p>
        {pointers.length > 0 ? (
          <div className="space-y-2">
            <p className="font-bold text-slate-900">確認に使える情報源</p>
            {pointers.map((p, i) => (
              <PointerCard key={i} pointer={p} />
            ))}
          </div>
        ) : (
          <p>情報源の所在一覧は、コンプライアンス確認を選んだときに出します。</p>
        )}
        <p>
          公開情報の変化は、
          <a
            href={monitorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-blue-800 underline decoration-blue-800 underline-offset-2"
          >
            月次の記録ページ
          </a>
          で追えます。
        </p>
      </ResultMethodDetails>

      <p data-result-section="disclaimer" className="text-base leading-relaxed text-slate-800">
        {OSINT_DISCLAIMER}
      </p>
    </div>
  );
}
