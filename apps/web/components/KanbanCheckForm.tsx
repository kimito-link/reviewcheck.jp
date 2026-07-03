"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KANBAN_CATEGORIES,
  type KanbanCategory,
  encodeKanbanReportId,
  isBlacklisted,
  looksLikePersonalName,
} from "@reviewcheck/core";

/**
 * 看板名のAI第一印象診断 入力フォーム（設計 §1 の5層防御）。
 * 第1層: 主キー=看板名・人名欄なし。第2層: カテゴリ必須（個人/趣味なし）。
 * 第3層: 同意チェック必須。第4層: 免責常時表示。第5層: ブラックリスト照合。
 */
export function KanbanCheckForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<KanbanCategory | "">("");
  const [area, setArea] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const requiresArea = category === "medical";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = name.trim();
    if (!n) {
      setErr("院名・店名・事務所名・屋号・芸名を入力してください。");
      return;
    }
    if (!category) {
      setErr("カテゴリを選択してください。");
      return;
    }
    if (isBlacklisted(n)) {
      // 第5層: 理由は表示しない（リスト自体が名誉毀損にならないため・地雷#8）。
      setErr("この名前は診断対象外です。事業上の看板名でお試しください。");
      return;
    }
    // 第1/2層: 芸能カテゴリ以外で個人名らしき入力は受け流す（人名診断への転落防止）。
    if (category !== "entertainment" && looksLikePersonalName(n)) {
      setErr("個人のお名前は診断できません。法人名・屋号・サービス名でお試しください。");
      return;
    }
    if (requiresArea && !area.trim()) {
      setErr("医療機関は、同名の別施設と区別するため地域の入力が必要です。");
      return;
    }
    if (!agreed) {
      setErr("同意のチェックが必要です。");
      return;
    }
    const id = encodeKanbanReportId({
      name: n,
      category,
      ...(area.trim() ? { area: area.trim() } : {}),
    });
    router.push(`/kanban-report/${id}/`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="k-name" className="mb-1 block text-sm font-medium text-slate-800">
          院名・店名・事務所名・屋号・芸名 <span className="text-red-500">*</span>
        </label>
        <input
          id="k-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：◯◯クリニック／◯◯法律事務所／◯◯（芸名）"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="mt-1 text-xs text-red-600">
          ご本人・他人の本名（個人名）は入力しないでください。事業・公的活動で掲げている名前に限ります。
        </p>
      </div>

      <div>
        <label htmlFor="k-cat" className="mb-1 block text-sm font-medium text-slate-800">
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <select
          id="k-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value as KanbanCategory | "")}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">選択してください</option>
          {KANBAN_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="k-area" className="mb-1 block text-sm font-medium text-slate-800">
          地域{requiresArea ? <span className="text-red-500"> *</span> : "（任意・精度が上がります）"}
        </label>
        <input
          id="k-area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="例：東京都渋谷区"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          この看板名は、私本人（または私が代理権を持つ本人・所属事務所）が事業・公的活動のために
          公開して使用している名前です。公開情報に基づくネット上の見え方の測定に同意します。
        </span>
      </label>

      {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}

      <button
        type="submit"
        className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        無料で看板名のAI第一印象を診断する
      </button>

      <p className="text-xs text-slate-500">
        本診断は、個人の私生活・人格・信用を評価するものではありません。公開情報に基づき、
        事業活動上の看板名の露出状況とトーンの傾向を客観的に測定するものです。
        ログインやパスワードは不要です。
      </p>
    </form>
  );
}
