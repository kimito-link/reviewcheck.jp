import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@reviewcheck/config";

export const metadata: Metadata = buildMetadata({
  title: "口コミ改善 追体験｜無料診断から「選ばれるお店」まで（実画面つき）",
  description:
    "店舗名やGoogleマップURLを入れるだけ。無料診断 → 結果の見方 → 口コミの増やし方 → 返信・MEO → 継続まで、実際の画面つきで①→⑤の順に追体験できます。会員登録不要・30秒で結果。",
  path: "/walkthrough/",
});

type Who = "read" | "you" | "auto" | "opt";

const WHO_BADGE: Record<Who, { label: string; cls: string }> = {
  read: { label: "読むだけ", cls: "bg-slate-100 text-slate-600" },
  you: { label: "あなた", cls: "bg-amber-100 text-amber-800" },
  auto: { label: "ツールが自動", cls: "bg-emerald-100 text-emerald-700" },
  opt: { label: "お任せOK", cls: "bg-blue-100 text-blue-700" },
};

const USE_TIPS = [
  "下の地図の ① から順番に進める（はじめは「準備」を読むだけ）",
  "各ステップの「今やること」を読んで、実際の画面を操作する",
  "スクショの上に、その画面の見どころ・URLをまとめています",
];

interface Guide {
  emoji: string;
  name: string;
  role: string;
  ring: string;
  bg: string;
}

const HACK: Guide = {
  emoji: "🦈",
  name: "ハック",
  role: "リバースハックのナビ",
  ring: "ring-blue-200",
  bg: "bg-blue-50",
};
const OWNER: Guide = {
  emoji: "🧑‍🍳",
  name: "先輩オーナー",
  role: "口コミを増やしたお店",
  ring: "ring-amber-200",
  bg: "bg-amber-50",
};

interface Shot {
  src: string;
  alt: string;
  caption: string;
}

interface StepAction {
  href: string;
  label: string;
  primary?: boolean;
}

interface Note {
  guide: Guide;
  text: string;
}

interface Step {
  num: string;
  id: string;
  who: Who;
  title: string;
  sub: string;
  nowDo: string;
  mini: string[];
  shot?: Shot;
  caution?: string;
  actions?: StepAction[];
  notes?: Note[];
  next?: string;
}

const ROADMAP: { num: string; label: string; id: string; tone: Who }[] = [
  { num: "準", label: "準備（読むだけ）", id: "step-0", tone: "read" },
  { num: "①", label: "無料で診断", id: "step-1", tone: "you" },
  { num: "②", label: "結果の見方", id: "step-2", tone: "you" },
  { num: "③", label: "口コミを増やす", id: "step-3", tone: "you" },
  { num: "④", label: "返信・MEOで底上げ", id: "step-4", tone: "opt" },
  { num: "⑤", label: "続ける（自動化）", id: "step-5", tone: "opt" },
];

const STEPS: Step[] = [
  {
    num: "準",
    id: "step-0",
    who: "read",
    title: "準備するもの",
    sub: "用意するのは、たったひとつ。会員登録もログインも要りません。",
    nowDo: "「お店の名前」か「GoogleマップのURL」のどちらかを用意するだけ。なければ、サンプルでも体験できます。",
    mini: [
      "お店の名前（例：◯◯整体院 △△店）",
      "またはGoogleマップのURL（地図でお店を開く →「共有」→「リンクをコピー」）",
      "迷ったら、まずは①の「サンプル結果を見る」でOK",
    ],
    notes: [
      {
        guide: HACK,
        text: "https://maps.app.goo.gl/... の短いリンクでも大丈夫。会員登録なしで、だいたい30秒で結果が出るよ。",
      },
    ],
    next: "準備ができたら → ① 無料で診断",
  },
  {
    num: "①",
    id: "step-1",
    who: "you",
    title: "無料で口コミ診断する",
    sub: "店舗名かGoogleマップURLを入れて、ボタンを押すだけ。",
    nowDo: "入力欄に「店舗名」か「GoogleマップURL」を入れて「無料で診断する」を押す。入力せずに体験したいときは「サンプル結果を見る」。",
    mini: [
      "入力欄に店舗名 または GoogleマップURLを入れる",
      "「無料で診断する」を押す（30秒ほどで結果が出ます）",
      "外出先なら「現在地からお店を探す」でも検索できます",
    ],
    shot: {
      src: "/walkthrough/step1-form.jpeg",
      alt: "口コミ診断の入力フォーム",
      caption: "この画面：/check/（無料で口コミ診断）",
    },
    actions: [{ href: "/check/", label: "★ 無料で診断する", primary: true }],
    notes: [
      {
        guide: HACK,
        text: "ECサイトや会社サイトのURLだと、お店が特定できないんだ。「お店の名前＋地名」か、GoogleマップのURLを入れてね。",
      },
    ],
    next: "結果が出たら → ② 結果の見方",
  },
  {
    num: "②",
    id: "step-2",
    who: "you",
    title: "結果の見方（スコア・順位・あと何件）",
    sub: "「今どのくらい選ばれているか」と「あと何件で追いつくか」が分かります。",
    nowDo: "「選ばれやすさスコア」「周辺◯店中の順位」「あと何件・何ヶ月で競合平均に追いつくか」の3つを見てください。",
    mini: [
      "選ばれやすさスコア（0〜100）— お店の現在地",
      "周辺◯店中の順位 — 口コミ数・星評価それぞれの立ち位置",
      "あと何件・あと何ヶ月 — 競合平均に追いつくまでの目安",
    ],
    shot: {
      src: "/walkthrough/step2-result.jpeg",
      alt: "口コミ診断の結果画面（スコア・順位・あと何件）",
      caption: "この画面：診断結果（サンプル）",
    },
    notes: [
      {
        guide: OWNER,
        text: "「あと◯件」が数字で見えると、毎月のゴールがハッキリします。私は『月5件』を目標にしました。",
      },
      {
        guide: HACK,
        text: "数値はGoogleの丸めや反映タイミングがあるから、あくまで“目安”だよ。方向性をつかむのに使ってね。",
      },
    ],
    next: "差が分かったら → ③ 口コミを増やす",
  },
  {
    num: "③",
    id: "step-3",
    who: "you",
    title: "口コミを“正しく”増やす",
    sub: "やらせ・購入はナシ。満足したお客様が、自分の言葉で書きやすくする仕組みです。",
    nowDo: "「口コミ作成ツール」で店舗名・業種を設定し、表示されたページのQR・リンクをお客様に渡すだけ。お客様はタップで下書きを作り、コピーしてGoogleに貼り付けます。",
    mini: [
      "口コミ作成ツールで店舗名・業種を設定する",
      "出てきたQR・リンクを、レジ横・名刺・LINEでお客様に渡す",
      "お客様はタップで下書き完成 → コピーしてGoogleに投稿",
    ],
    shot: {
      src: "/walkthrough/step3-tool.jpeg",
      alt: "タップ式の口コミ作成ツール",
      caption: "この画面：/review-tool/（口コミ作成ツール）",
    },
    caution:
      "口コミの購入・やらせ投稿・競合への低評価は行いません。実際に来店されたお客様の率直な感想を、書きやすくするためのツールです。",
    actions: [
      { href: "/review-tool/", label: "口コミ作成ツールを使う", primary: true },
    ],
    notes: [
      {
        guide: HACK,
        text: "QRはレジ横ポップやNFCカードにすると、その場でサッと書いてもらえる。タイミングが命だよ。",
      },
    ],
    next: "集まり始めたら → ④ 返信・MEOで底上げ",
  },
  {
    num: "④",
    id: "step-4",
    who: "opt",
    title: "返信とMEOで底上げする",
    sub: "口コミに返信し、プロフィールを整える。ここで“信頼感”がぐっと上がります。",
    nowDo: "届いた口コミに返信し、Googleビジネスプロフィール（写真・営業時間・カテゴリ）を整えます。悪い口コミやサジェストが気になる場合は、専用ページで対策を確認。",
    mini: [
      "口コミに返信する（良い口コミにも、低評価にも誠実に）",
      "写真・営業時間・カテゴリなどプロフィールを充実させる（MEO）",
      "悪い口コミ・サジェストが気になるときは対策ページへ",
    ],
    actions: [
      { href: "/review-reply/", label: "口コミ返信サポート" },
      { href: "/meo/", label: "MEO対策" },
      { href: "/bad-review-measures/", label: "悪い口コミ対策" },
    ],
    notes: [
      {
        guide: OWNER,
        text: "返信があるお店は、検討中の人に「ちゃんと見てくれてる」と伝わります。星だけより安心されました。",
      },
    ],
    next: "土台ができたら → ⑤ 続ける（自動化）",
  },
  {
    num: "⑤",
    id: "step-5",
    who: "opt",
    title: "続ける（総合パッケージで自動化）",
    sub: "ひとりで全部は大変。仕組み化して、毎月の成果をレポートで受け取れます。",
    nowDo: "口コミ獲得の導線・WEB/LINE/アプリ・AIや弁護士の窓口までまとめた月額パッケージで自動化。毎月の完了レポートで成果を確認できます。",
    mini: [
      "WEB・LINE・アプリ＋口コミ獲得導線をまるごと用意",
      "毎月の完了レポートで、実施した施策と成果が見える",
      "カードでそのまま申込（月額・自動更新／いつでも解約可）",
    ],
    shot: {
      src: "/walkthrough/step5-plans.jpeg",
      alt: "総合改善パッケージ・料金プラン",
      caption: "この画面：/plans/（総合改善パッケージ・料金）",
    },
    actions: [
      { href: "/plans/", label: "総合パッケージ・料金を見る", primary: true },
    ],
    notes: [
      {
        guide: HACK,
        text: "いきなり契約じゃなくて大丈夫。まず①の無料診断 → ご納得いただいてからのスタートだよ。",
      },
    ],
    next: "ここまでで、追体験は完了。あとは①から実際にやってみよう。",
  },
];

const TROUBLE: { symptom: string; fix: string }[] = [
  {
    symptom: "「準備中です」「お店が見つからない」と出る",
    fix: "①へ：ECサイト等のURLは特定できません。「店舗名＋地名」か、GoogleマップのURLで再検索を。",
  },
  {
    symptom: "競合があまり表示されない",
    fix: "郊外・地方では周辺店舗が少ないことがあります。地名やカテゴリを変えて再診断してみてください。",
  },
  {
    symptom: "スコアが思ったより低い",
    fix: "②③へ：「あと何件」と「改善ポイント」を確認し、まず③の口コミ作成ツールから着手します。",
  },
  {
    symptom: "口コミがなかなか増えない",
    fix: "③へ：QR・リンクをレジ横・名刺・LINEに常設。④の返信で信頼感も底上げします。",
  },
  {
    symptom: "何から手をつければいいか分からない",
    fix: "⑤へ：無料診断 → プランのご提案で、お店に合った優先順位を整理します。",
  },
];

function GuideNote({ guide, text }: Note) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl ${guide.bg} p-4 ring-1 ${guide.ring}`}>
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl shadow-sm"
        aria-hidden
      >
        {guide.emoji}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">
          {guide.name}
          <span className="ml-1 font-normal text-slate-400">／{guide.role}</span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">{text}</p>
      </div>
    </div>
  );
}

export default function WalkthroughPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "口コミ改善 追体験｜無料診断から「選ばれるお店」まで",
    description:
      "無料診断から結果の見方、口コミの増やし方、返信・MEO、継続までを①→⑤の順で進める手順。",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.nowDo,
      url: `${SITE.baseUrl}/walkthrough/#${s.id}`,
    })),
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "トップ", path: "/" },
            { name: "追体験", path: "/walkthrough/" },
          ]),
          howToJsonLd,
        ]}
      />

      {/* ファーストビュー */}
      <section className="relative overflow-hidden bg-navy-gradient py-14 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label justify-center text-amber-300 before:bg-amber-300">
              Walkthrough
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-4xl">
              はじめての方へ。
              <span className="text-amber-300">「選ばれるお店」になるまで</span>
              を、
              <br className="hidden sm:block" />
              実際の画面つきで追体験。
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
              ハックと先輩オーナーが、
              <strong className="text-white">上から ① → ② → ③ …</strong>
              の順でご案内します。
              <br className="hidden sm:block" />
              無料診断 → 結果の見方 → 口コミの増やし方 → 返信・MEO → 継続まで。会員登録は不要です。
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="#step-1"
                className="inline-flex rounded-lg bg-white px-6 py-3.5 text-base font-bold text-blue-800 transition hover:bg-blue-50"
              >
                ① から追体験を始める
              </Link>
              <Link
                href="/check/"
                className="inline-flex rounded-lg bg-white/10 px-6 py-3.5 text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                先に無料で診断する
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* このページの使い方 */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border-2 border-blue-200 bg-white p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-blue-800 sm:text-lg">
              📖 このページの使い方（3つだけ）
            </h2>
            <ol className="mt-3 space-y-2">
              {USE_TIPS.map((t, i) => (
                <li key={t} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700 sm:text-base">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* ロードマップ */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ROADMAP.map((r) => (
              <a
                key={r.id}
                href={`#${r.id}`}
                className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 font-bold text-slate-800 transition hover:border-blue-400 hover:shadow-md"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                    r.tone === "read"
                      ? "bg-slate-400 text-white"
                      : r.tone === "opt"
                        ? "bg-blue-500 text-white"
                        : "bg-amber-500 text-white"
                  }`}
                >
                  {r.num}
                </span>
                <span className="text-sm leading-snug">{r.label}</span>
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* ステップ本体 */}
      <section className="bg-white py-8 sm:py-12">
        <Container>
          <div className="mx-auto max-w-3xl space-y-8">
            {STEPS.map((step) => {
              const badge = WHO_BADGE[step.who];
              return (
                <article
                  key={step.id}
                  id={step.id}
                  className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                >
                  {/* 見出し */}
                  <div className="flex items-start gap-4">
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-extrabold text-white ${
                        step.who === "read"
                          ? "bg-slate-400"
                          : step.who === "opt"
                            ? "bg-blue-500"
                            : "bg-amber-500"
                      }`}
                    >
                      {step.num}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-extrabold leading-tight text-slate-900 sm:text-xl">
                          {step.title}
                        </h2>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        {step.sub}
                      </p>
                    </div>
                  </div>

                  {/* 今やること */}
                  <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5">
                    <span className="block text-xs font-extrabold tracking-wider text-amber-700">
                      今やること
                    </span>
                    <p className="mt-1.5 text-sm font-bold leading-relaxed text-slate-800 sm:text-base">
                      {step.nowDo}
                    </p>
                  </div>

                  {/* ミニステップ */}
                  <ol className="mt-5 space-y-3">
                    {step.mini.map((m, i) => (
                      <li key={m} className="flex items-start gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-slate-700">{m}</span>
                      </li>
                    ))}
                  </ol>

                  {/* 実画面 */}
                  {step.shot ? (
                    <figure className="mt-5">
                      <figcaption className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        <span aria-hidden>📷</span>
                        {step.shot.caption}
                      </figcaption>
                      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                        <Image
                          src={step.shot.src}
                          alt={step.shot.alt}
                          width={1024}
                          height={1089}
                          sizes="(max-width: 768px) 100vw, 700px"
                          className="h-auto w-full"
                        />
                      </div>
                    </figure>
                  ) : null}

                  {/* 注意 */}
                  {step.caution ? (
                    <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">
                      <strong className="font-bold">ルール：</strong>
                      {step.caution}
                    </p>
                  ) : null}

                  {/* アクション */}
                  {step.actions ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {step.actions.map((a) => (
                        <Link
                          key={a.href}
                          href={a.href}
                          className={`inline-flex min-h-12 items-center rounded-xl px-5 py-3 text-sm font-bold transition ${
                            a.primary
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border-2 border-slate-200 bg-white text-slate-700 hover:border-blue-400"
                          }`}
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {/* ナビゲーターの一言 */}
                  {step.notes ? (
                    <div className="mt-5 space-y-3">
                      {step.notes.map((n) => (
                        <GuideNote key={n.guide.name + n.text} {...n} />
                      ))}
                    </div>
                  ) : null}

                  {/* 次へ */}
                  {step.next ? (
                    <div className="mt-5 rounded-xl bg-blue-50 p-3.5 text-center text-sm font-bold text-blue-800">
                      {step.next}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* つまずいたら */}
      <Section title="つまずいたら" tone="muted">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="border-b border-slate-200 p-3 font-bold">症状</th>
                <th className="border-b border-slate-200 p-3 font-bold">対処</th>
              </tr>
            </thead>
            <tbody>
              {TROUBLE.map((t) => (
                <tr key={t.symptom} className="align-top">
                  <td className="border-b border-slate-100 p-3 font-bold text-slate-800">
                    {t.symptom}
                  </td>
                  <td className="border-b border-slate-100 p-3 leading-relaxed text-slate-600">
                    {t.fix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 最終CTA */}
      <section className="bg-navy-gradient py-14 sm:py-18">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">
              追体験はここまで。
              <br className="hidden sm:block" />
              次は、あなたのお店で試してみましょう。
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              入力は店舗名かGoogleマップURLだけ。30秒で「あと何件で追いつくか」が分かります。
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/check/"
                className="inline-flex rounded-lg bg-white px-6 py-3.5 text-base font-bold text-blue-800 transition hover:bg-blue-50"
              >
                ★ 無料で口コミ診断する
              </Link>
              <Link
                href="/plans/"
                className="inline-flex rounded-lg bg-white/10 px-6 py-3.5 text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                総合パッケージ・料金を見る
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
