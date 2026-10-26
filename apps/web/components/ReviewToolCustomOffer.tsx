"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { SITE } from "@reviewcheck/config";

/**
 * 口コミツールの体験のあとに置く、お店ごとのカスタム提案。
 * 満足・不満で投稿の道を分けない。検索候補の操作や金額は置かない。
 */

const DRAFT_NOTICE =
  "この文章はたたき台です。ご自身の言葉に直してから投稿してください。";

const STORE_VOICE_EXAMPLE =
  "貴重なご意見ありがとうございます。いただいたご意見は、改善点として店内の会議の議題にさせていただきます。お店に直接伝えたいことがあれば、公式LINEからもどうぞ。";

const PACKAGE_ITEMS: { title: string; body: string }[] = [
  {
    title: "口コミ作成ツール",
    body: "基本はボタンで選ぶ質問（クローズドクエスチョン）です。自由に書きたい方は、どの質問でも自由入力を選べます。飲食ならラーメンや餃子、美容室ならシャンプーやヘアカラー、クリニックなら診療メニューをボタンで選び、選んだ言葉が下書きに入ります。QRコードからも同じページを開けます。満足・不満にかかわらず、全員が同じように口コミ投稿まで進みます。",
  },
  {
    title: "AI口コミ対策サポート",
    body: "ガイドライン違反の可能性がある口コミの見分け方と、削除申請の書き方をAIが助言します。申請はお店ご自身で行います。当社が代わりに申請することはありません。削除される保証はありません。",
  },
  {
    title: "提携弁護士の窓口",
    body: "権利侵害など、法的な対応が必要なときは、提携する弁護士の窓口におつなぎします。",
  },
  {
    title: "口コミ獲得・評判改善コンサル",
    body: "Googleビジネスプロフィールの最適化（MEO）を含め、口コミまでの導線を一緒に整えます。投稿の案内は、満足・不満にかかわらず全員に同じ道を残します。",
  },
  {
    title: "公式WEBサイト",
    body: "店舗の内容を伝える公式サイトを、月額パッケージの中で制作・運用します。口コミページへの案内も置けます。",
  },
  {
    title: "公式LINE＋集客導線",
    body: "登録、来店、再来店、口コミ依頼までの流れと、予約・リピート・分析の役割を、業種に合わせて設計します。",
  },
  {
    title: "店舗アプリ（iOS / Android）",
    body: "お知らせや再来店の案内を届ける店舗アプリを、月額パッケージに含めて用意します。対象はiOSとAndroidです。",
  },
  {
    title: "契約者専用AIサポート",
    body: "口コミへの返信文案など、運用中の質問をAIと一緒に整理します。月額パッケージに含まれます。",
  },
  {
    title: "NFC口コミカード",
    body: "お店専用ページのURLを、Kimito-LinkのNFC搭載グッズに書き込んで置けます。かざすと、そのページが開きます。",
  },
];

const LINE_BRANCHES: { title: string; body: string }[] = [
  {
    title: "集客・新規",
    body: "登録の案内と、公式サイトや店舗アプリからの連携",
  },
  {
    title: "予約・問い合わせ",
    body: "予約の受付、自動応答、来店前のリマインド",
  },
  {
    title: "リピート",
    body: "来店の周期に合わせた案内",
  },
  {
    title: "口コミ",
    body: "来店後に口コミを依頼します。満足・不満で投稿の道は分けません",
  },
  {
    title: "ファン化",
    body: "限定の情報と、興味に分けた配信",
  },
  {
    title: "分析",
    body: "反応を見て、配信の内容を見直します",
  },
];

const LINE_STEPS = ["登録", "来店", "再来店", "口コミ依頼"] as const;

type HearingId = "clinic" | "estate" | "food";

const HEARINGS: {
  id: HearingId;
  label: string;
  steps: { title: string; body: string }[];
  note: string;
}[] = [
  {
    id: "clinic",
    label: "クリニック・歯科",
    steps: [
      {
        title: "状況を聞く",
        body: "「気になるのは？」虫歯、矯正、ホワイトニング、定期検診から伺います。",
      },
      {
        title: "時期と希望を聞く",
        body: "いつから気になるか、どのくらいのペースで通いたいかを聞きます。",
      },
      {
        title: "料金の前に価値を伝える",
        body: "治療の流れ、通院の回数、痛みへの配慮を先に説明します。",
      },
      {
        title: "希望日を聞いて予約を提案する",
        body: "来たい日を聞き、空いている枠を案内します。",
      },
    ],
    note: "受診後の口コミ案内は、感じ方にかかわらず同じ投稿の道です。気になる点は、公式LINEでも受け取れます。",
  },
  {
    id: "estate",
    label: "不動産",
    steps: [
      {
        title: "状況を聞く",
        body: "賃貸、購入、売却、投資のどれかを伺います。",
      },
      {
        title: "条件を聞く",
        body: "エリア、間取り、時期を聞きます。",
      },
      {
        title: "物件の前に価値を伝える",
        body: "物件を出す前に、周辺の相場とサポートの範囲を説明します。",
      },
      {
        title: "内見の希望日を聞く",
        body: "見に行きたい日を聞き、条件に近い物件を案内します。",
      },
    ],
    note: "口コミの案内は、契約の前後で出し分けません。検討中の方にも、投稿の道は同じです。",
  },
  {
    id: "food",
    label: "飲食",
    steps: [
      {
        title: "来店と登録",
        body: "来店時に公式LINEへの登録を案内し、利用シーンを伺います。",
      },
      {
        title: "好みを聞く",
        body: "好きなメニュー、人数、目的（会食や家族など）を聞きます。",
      },
      {
        title: "案内の前に価値を伝える",
        body: "こだわりや季節の品を、次の来店の案内より先に伝えます。",
      },
      {
        title: "次の来店を提案する",
        body: "来店の周期に合わせて、次の案内を出します。",
      },
    ],
    note: "口コミ投稿の道は全員同じです。不満寄りの声は公式LINEでも受け取り、店内の会議の議題にする運用までご提案します。文面はお店ごとに変えられ、すべての意見が議題になるとはお約束しません。",
  },
];

type DemoIndustry = "food" | "salon" | "clinic";
type Mood = "good" | "mid" | "concern";

const DEMO_INDUSTRIES: {
  id: DemoIndustry;
  label: string;
  menus: string[];
  sentence: (menu: string) => string;
}[] = [
  {
    id: "food",
    label: "飲食店",
    menus: ["ラーメン", "餃子", "定食"],
    sentence: (menu) => `${menu}を注文しました。`,
  },
  {
    id: "salon",
    label: "美容室",
    menus: ["シャンプー", "ヘアカラー", "カット"],
    sentence: (menu) => `${menu}を利用しました。`,
  },
  {
    id: "clinic",
    label: "クリニック",
    menus: ["虫歯の治療", "矯正相談", "ホワイトニング", "定期検診"],
    sentence: (menu) => `${menu}で伺いました。`,
  },
];

const MOODS: { id: Mood; label: string; sentence: string }[] = [
  {
    id: "good",
    label: "とても良かった",
    sentence: "対応も良く、また利用したいと思いました。",
  },
  {
    id: "mid",
    label: "ふつう",
    sentence: "全体としてはふつうの印象でした。",
  },
  {
    id: "concern",
    label: "改善してほしい点がある",
    sentence: "改善してほしい点がありました。",
  },
];

const buttonClass =
  "min-h-12 rounded-xl border-2 px-4 py-2 text-base font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800";

function choiceClass(selected: boolean): string {
  return selected
    ? `${buttonClass} border-slate-900 bg-slate-900 text-white`
    : `${buttonClass} border-slate-700 bg-white text-slate-900`;
}

function ExternalAnchor({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className="font-bold text-blue-800 underline decoration-2 underline-offset-4"
    >
      {children}
      {external ? "（別のサイト）" : null}
    </a>
  );
}

function buildDraft(industry: DemoIndustry, menu: string, mood: Mood): string {
  const preset = DEMO_INDUSTRIES.find((item) => item.id === industry);
  const moodLine = MOODS.find((item) => item.id === mood);
  const name = menu.trim() || "自由に書いたメニュー";
  return `${preset?.sentence(name) ?? ""}${moodLine?.sentence ?? ""}`;
}

export function ReviewToolCustomOffer() {
  const [hearing, setHearing] = useState<HearingId>("clinic");
  const [industry, setIndustry] = useState<DemoIndustry>("food");
  const [menu, setMenu] = useState("ラーメン");
  const [freeMode, setFreeMode] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [mood, setMood] = useState<Mood>("concern");
  const [edited, setEdited] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [copyState, setCopyState] = useState<{
    key: string;
    status: "copied" | "failed";
  } | null>(null);
  const [lineHintKey, setLineHintKey] = useState<string | null>(null);

  const hearingItem =
    HEARINGS.find((item) => item.id === hearing) ?? HEARINGS[0];
  const industryItem =
    DEMO_INDUSTRIES.find((item) => item.id === industry) ?? DEMO_INDUSTRIES[0];
  const menuLabel = freeMode ? freeText : menu;
  const selectionKey = `${industry}|${freeMode ? "free" : "btn"}|${menuLabel}|${mood}`;
  const draft = buildDraft(industry, menuLabel, mood);
  const reviewText = editKey === selectionKey && edited !== null ? edited : draft;
  const copyStatus = copyState?.key === selectionKey ? copyState.status : null;
  const showLineHint = lineHintKey === selectionKey;
  const concerned = mood === "concern";

  function selectIndustry(next: DemoIndustry) {
    const preset = DEMO_INDUSTRIES.find((item) => item.id === next);
    setIndustry(next);
    setMenu(preset?.menus[0] ?? "");
    setFreeMode(false);
  }

  async function copyReview() {
    try {
      await navigator.clipboard.writeText(reviewText);
      setCopyState({ key: selectionKey, status: "copied" });
    } catch {
      setCopyState({ key: selectionKey, status: "failed" });
    }
  }

  return (
    <section
      id="custom-offer"
      aria-labelledby="custom-offer-heading"
      className="mx-auto mt-12 min-w-0 max-w-5xl scroll-mt-24 rounded-2xl border-2 border-slate-300 bg-white p-4 text-base leading-relaxed text-slate-900 sm:p-8"
    >
      <p className="font-bold text-blue-800">お店ごとのカスタム</p>
      <h2
        id="custom-offer-heading"
        className="mt-2 text-2xl font-extrabold leading-snug sm:text-3xl"
      >
        このような仕組みを、お店ごとに独自カスタムで作ります
      </h2>
      <p className="mt-4">
        上の画面は、いま公開している共通の体験です。ここから下は、業種と店舗に合わせて質問・文面・導線を組み直す提案です。星の数や来店数がどれだけ変わるかは、お店によって異なります。
      </p>
      <p className="mt-3">
        画面のまとめ方は、
        <ExternalAnchor href="https://removal-seven.vercel.app/">
          制作例
        </ExternalAnchor>
        の設計図と、業種ごとの会話例を短くしたものです。
      </p>

      <h3 className="mt-10 text-xl font-bold">月額パッケージに含まれるもの</h3>
      <p className="mt-3">
        ここに挙げた項目は、月額パッケージに含まれます。金額はこのページには書いていません。
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PACKAGE_ITEMS.map((item) => (
          <li
            key={item.title}
            className="min-w-0 rounded-xl border-2 border-slate-300 p-4"
          >
            <h4 className="text-lg font-bold">{item.title}</h4>
            <p className="mt-2">{item.body}</p>
            {item.title === "NFC口コミカード" ? (
              <p className="mt-2">
                商品ページは、下の
                <ExternalAnchor href="#nfc-goods">
                  セットで使うと便利
                </ExternalAnchor>
                にまとめています。
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <h3 className="mt-10 text-xl font-bold">公式LINEの設計図</h3>
      <p className="mt-3">
        配信を一通ずつ足すのではなく、役割を分けた設計図にしてから運用します。口コミの依頼は、この流れの中で全員に同じ投稿の道を残します。
      </p>
      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINE_STEPS.map((step, index) => (
          <li
            key={step}
            className="rounded-xl border-2 border-slate-300 p-4"
          >
            <p className="font-bold">
              {index + 1}. {step}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-xl border-2 border-slate-700 p-4">
        <p className="font-bold">中心：お店の公式LINE</p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LINE_BRANCHES.map((branch) => (
            <li key={branch.title} className="min-w-0">
              <p className="font-bold">{branch.title}</p>
              <p className="mt-1">{branch.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <h3 className="mt-10 text-xl font-bold">業種別の会話例</h3>
      <p className="mt-3">
        いきなり料金や申し込みの話から入らず、状況を聞いて価値を伝えてから提案する設計例です。文面はお店ごとに変えます。
      </p>
      <div
        role="tablist"
        aria-label="業種別の会話例"
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        {HEARINGS.map((item) => {
          const selected = item.id === hearing;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`hearing-tab-${item.id}`}
              aria-selected={selected}
              aria-controls="hearing-panel"
              className={choiceClass(selected)}
              onClick={() => setHearing(item.id)}
            >
              {item.label}
              {selected ? "（表示中）" : ""}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id="hearing-panel"
        aria-labelledby={`hearing-tab-${hearingItem.id}`}
        className="mt-4 rounded-xl border-2 border-slate-300 p-4"
      >
        <ol className="list-decimal space-y-3 pl-6">
          {hearingItem.steps.map((step) => (
            <li key={step.title}>
              <span className="font-bold">{step.title}。</span>
              {step.body}
            </li>
          ))}
        </ol>
        <p className="mt-4">{hearingItem.note}</p>
      </div>

      <h3 className="mt-10 text-xl font-bold">口コミ作成ツールの質問と完成画面</h3>
      <p className="mt-3">
        カスタムでは、基本をボタンで選ぶ質問にします。自由に書きたい方は、どの質問でも自由入力を選べます。下の画面例では、メニューの質問に自由入力を置いています。どの回答でも完成画面まで進み、口コミ投稿の流れは変えません。
      </p>
      <p className="mt-3">
        不満寄りの回答があっても、「口コミを投稿する」ボタンは満足のときと同じ大きさ・同じ位置に残します。公式LINEは、並べて選べるもう一つの道です。両方行うこともできます。不満の声もお店に届くので、改善につなげられます。届いた声を会議の議題にする運用までご提案します。お礼の文面はお店ごとに変えられる例で、すべての意見が議題になるとはお約束しません。
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0">
          <p className="font-bold" id="demo-industry-label">
            業種の例
          </p>
          <div
            role="group"
            aria-labelledby="demo-industry-label"
            className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          >
            {DEMO_INDUSTRIES.map((item) => {
              const selected = item.id === industry;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  className={choiceClass(selected)}
                  onClick={() => selectIndustry(item.id)}
                >
                  {item.label}
                  {selected ? "（選択中）" : ""}
                </button>
              );
            })}
          </div>

          <p className="mt-6 font-bold" id="demo-menu-label">
            利用したメニュー（ボタンで選ぶ質問）
          </p>
          <div
            role="group"
            aria-labelledby="demo-menu-label"
            className="mt-2 flex flex-col gap-2"
          >
            {industryItem.menus.map((item) => {
              const selected = !freeMode && menu === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  className={`${choiceClass(selected)} w-full text-left`}
                  onClick={() => {
                    setFreeMode(false);
                    setMenu(item);
                  }}
                >
                  {item}
                  {selected ? "（選択中）" : ""}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={freeMode}
              className={`${choiceClass(freeMode)} w-full text-left`}
              onClick={() => setFreeMode(true)}
            >
              自由に書く
              {freeMode ? "（選択中）" : ""}
            </button>
          </div>
          {freeMode ? (
            <label className="mt-3 block font-bold" htmlFor="custom-free-menu">
              自由入力（この内容が口コミ文に入ります）
              <input
                id="custom-free-menu"
                value={freeText}
                onChange={(event) => setFreeText(event.target.value)}
                placeholder="例：辛味噌ラーメン"
                className="mt-2 w-full rounded-xl border-2 border-slate-700 bg-white px-3 py-3 text-base text-slate-900"
              />
            </label>
          ) : null}

          <p className="mt-6 font-bold" id="demo-mood-label">
            今日の印象（ボタンで選ぶ質問）
          </p>
          <div
            role="group"
            aria-labelledby="demo-mood-label"
            className="mt-2 flex flex-col gap-2"
          >
            {MOODS.map((item) => {
              const selected = mood === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  className={`${choiceClass(selected)} w-full text-left`}
                  onClick={() => setMood(item.id)}
                >
                  {item.label}
                  {selected ? "（選択中）" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-bold">完成画面の例（スマホの枠）</p>
          <div
            data-phone-frame
            className="mt-2 w-full rounded-[2rem] border-4 border-slate-900 bg-white p-3 sm:p-4"
          >
            <div
              className="mx-auto mb-3 h-2 w-16 rounded-full bg-slate-900"
              aria-hidden="true"
            />
            <div className="rounded-2xl border-2 border-slate-300 p-3 sm:p-4">
              <p className="font-bold">
                {`選んだメニュー「${menuLabel.trim() || "自由に書いたメニュー"}」は、下の文章に入っています。`}
              </p>
              <label
                htmlFor="custom-review-draft"
                className="mt-4 block font-bold"
              >
                {DRAFT_NOTICE}
              </label>
              <textarea
                id="custom-review-draft"
                value={reviewText}
                rows={5}
                onChange={(event) => {
                  setEdited(event.target.value);
                  setEditKey(selectionKey);
                }}
                className="mt-2 w-full rounded-xl border-2 border-slate-700 bg-white p-3 text-base leading-relaxed text-slate-900"
              />
              <p className="mt-3 font-bold">
                投稿は任意です。謝礼・特典はありません。やらせやサクラの投稿は受け付けません。
              </p>
              {concerned ? (
                <div className="mt-4 rounded-xl border-2 border-slate-700 p-3">
                  <p className="font-bold">お店からのお礼文の例</p>
                  <p className="mt-2">{STORE_VOICE_EXAMPLE}</p>
                  <p className="mt-2">
                    スーパーの「お客様の声」に近い書き方の例です。お店ごとに文面を変えられます。
                  </p>
                </div>
              ) : (
                <p className="mt-4">
                  満足寄りの例では、お礼文と公式LINEのボタンは出していません。下の「口コミを投稿する」ボタンの大きさと位置は、不満寄りのときと同じです。
                </p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={copyReview}
                  className="flex min-h-16 w-full flex-col items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-center text-base font-bold text-white underline decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                >
                  <span>口コミを投稿する</span>
                  <span className="font-normal">編集してからコピー</span>
                </button>
                {concerned ? (
                  <button
                    type="button"
                    onClick={() => setLineHintKey(selectionKey)}
                    className="flex min-h-16 w-full flex-col items-center justify-center rounded-xl bg-[#06C755] px-4 py-3 text-center text-base font-bold text-slate-900 underline decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    <span>お店に直接伝える</span>
                    <span className="font-normal">お店の公式LINEへ</span>
                  </button>
                ) : null}
              </div>
              <p className="mt-3">
                {concerned
                  ? "投稿も、お店への直接の連絡も、どちらも選べます。両方行うこともできます。"
                  : "この例の投稿ボタンは、不満寄りのときと同じ幅です。"}
              </p>
              {copyStatus === "copied" ? (
                <p className="mt-3 font-bold" role="status">
                  コピーしました。ご自身の言葉に直した文を、Googleの口コミへ貼り付けてください。この画面から投稿先へは自動で移動しません。
                </p>
              ) : null}
              {copyStatus === "failed" ? (
                <p className="mt-3 font-bold" role="status">
                  コピーできませんでした。文章欄の文字を選択してコピーしてください。
                </p>
              ) : null}
              {showLineHint ? (
                <p className="mt-3" role="status">
                  これは配置の例です。導入時はお店の公式LINEを開きます。口コミの投稿と、両方選べます。
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <h3 id="nfc-goods" className="mt-10 scroll-mt-24 text-xl font-bold">
        セットで使うと便利
      </h3>
      <p className="mt-3">
        口コミ作成ツールと、Kimito-LinkのNFC搭載グッズをセットで使う流れです。次の相談ボタンとは別に、用意の一例として案内します。
      </p>
      <ol className="mt-4 list-decimal space-y-3 pl-6">
        <li>口コミ作成ツールで、お店専用の口コミページを作ります。</li>
        <li>
          そのページのURLを、NFC搭載グッズに書き込みます。書き込みには、NFC
          Toolsなどのアプリを使います。
        </li>
        <li>
          プラスチックカードはテーブルや会計周りに、アクリルスタンドはレジに置きます。お客様がスマホをかざすと、ページが開きます。
        </li>
      </ol>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>リンク先は後から変更できます。</li>
        <li>読み取る側にアプリは不要です。かざすとブラウザが開きます。</li>
        <li>NFC対応のiPhone 7以降、およびAndroidで使えます。</li>
      </ul>
      <ul className="mt-4 space-y-3">
        <li>
          <ExternalAnchor href="https://kimito-link.com/products/plastic-card/">
            プラスチックカード（NFC搭載）
          </ExternalAnchor>
        </li>
        <li>
          <ExternalAnchor href="https://kimito-link.com/products/acrylic-stand/">
            アクリルスタンド（NFC搭載）
          </ExternalAnchor>
          。レジ向けの同シリーズです。
        </li>
        <li>
          価格は商品ページと
          <ExternalAnchor href="https://kimito-link.com/utilized-multiple-ways/price-list/">
            価格表
          </ExternalAnchor>
          にあります。このページには金額を書いていません。
        </li>
      </ul>

      <h3 className="mt-10 text-xl font-bold">次の一歩</h3>
      <p className="mt-3">
        お店専用の質問、公式LINE、サイト、アプリ、NFCの組み合わせは、LINEで相談できます。
      </p>
      <p className="mt-4">
        <a
          href={SITE.line.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-[#06C755] px-5 py-3 text-center text-base font-bold text-slate-900 underline decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:w-auto sm:px-8"
        >
          この仕組みについてLINEで相談する
          <span className="sr-only">（別のサイトで開きます）</span>
        </a>
      </p>
    </section>
  );
}
