"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  OSINT_TARGET_TYPES,
  type OsintTargetType,
  encodeOsintReportId,
  looksLikePersonalName,
} from "@reviewcheck/core";

/**
 * 公開情報ビュー（OSINT）の入口フォーム（設計 §3 の5層防御）。
 * 対象タイプは法人・ブランドのみ（「個人」の選択肢が存在しない）・個人名入力欄なし・
 * 利用目的チェック必須・免責常時表示。第三者が他者を見るモードなので判定要素は一切ない。
 */
export function FactCheckForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<OsintTargetType | "">("");
  const [compliance, setCompliance] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = name.trim();
    if (!n) {
      setErr("法人名・屋号・サービス名を入力してください。");
      return;
    }
    if (!targetType) {
      setErr("対象の種類を選択してください。");
      return;
    }
    // 個人名らしき入力は受け流す（一般私人の詮索ツール化を構造で防ぐ・地雷#5）。
    if (looksLikePersonalName(n)) {
      setErr("個人のお名前は入力できません。法人名・屋号・サービス名でご利用ください。");
      return;
    }
    if (!agreed) {
      setErr("利用目的の確認が必要です。");
      return;
    }
    const id = encodeOsintReportId({
      name: n,
      targetType,
      ...(compliance ? { compliance: true } : {}),
    });
    router.push(`/fact-view/${id}/`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="f-name" className="mb-1 block text-sm font-medium text-slate-800">
          法人名・屋号・サービス名 <span className="text-red-500">*</span>
        </label>
        <input
          id="f-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：株式会社◯◯／◯◯サービス"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          個人のお名前は入力できません。法人名・屋号・サービス名でご利用ください。
        </p>
      </div>

      <div>
        <label htmlFor="f-type" className="mb-1 block text-sm font-medium text-slate-800">
          対象の種類 <span className="text-red-500">*</span>
        </label>
        <select
          id="f-type"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as OsintTargetType | "")}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="">選択してください</option>
          {OSINT_TARGET_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={compliance}
          onChange={(e) => setCompliance(e.target.checked)}
          className="mt-0.5"
        />
        <span>コンプライアンス確認（取引先・与信などの確認）として利用する（確認すべき情報源の一覧も表示します）</span>
      </label>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          本ビューを、取引先確認・コンプライアンス確認・市場調査など事業上の正当な目的で利用します。
          個人の私生活の調査には利用しません。
        </span>
      </label>

      {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}

      <button
        type="submit"
        className="w-full rounded-xl bg-slate-800 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-slate-900"
      >
        公開情報を確認する
      </button>

      <p className="text-xs text-slate-500">
        本ビューは、対象の良し悪し・信用・危険性を評価するものではありません。
        外部から観測できる公開情報と、その所在を提示するものです。
        掲載情報から何を結論するかは、ご利用者の判断と責任に委ねられます。
      </p>
    </form>
  );
}
