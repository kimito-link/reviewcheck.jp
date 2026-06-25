import type { Metadata } from "next";
import Link from "next/link";
import { PACKAGE_ITEMS } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { PlanCards } from "@/components/PlanCards";
import { Disclaimer } from "@/components/Disclaimer";
import { LineCtaButton } from "@/components/LineCtaButton";
import { TrustBadges } from "@/components/TrustBadges";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Googleの評判、まるごとお任せ｜評判改善・集客 総合パッケージ",
  description:
    "悪い口コミ・サジェスト・ネット評判にお困りの店舗・事業者さまへ。AIによる口コミ対策サポート、提携弁護士の窓口、口コミ獲得ツール、公式WEB・LINE・アプリまで。契約中ずっと使える月額パッケージで『選ばれ続けるお店』をつくります。",
  path: "/plans/",
});

const TAG_TONE: Record<string, string> = {
  ai: "bg-blue-50 text-blue-700",
  law: "bg-emerald-50 text-emerald-700",
  star: "bg-amber-50 text-amber-700",
  free: "bg-amber-100 text-amber-800",
  opt: "bg-slate-100 text-slate-600",
  all: "bg-cyan-50 text-cyan-700",
};

const STEPS = [
  {
    title: "無料の評判診断",
    desc: "現在のGoogle口コミ・★評価・競合との差・サジェストを診断。改善ポイントを無料でお伝えします。",
  },
  {
    title: "プランのご提案",
    desc: "お店の状況とご予算に合わせて最適なプランをご提案。ご納得いただいてからのスタートです。",
  },
  {
    title: "基盤づくり＆対策開始",
    desc: "WEB・LINE・アプリを整え、口コミ獲得の仕組みを導入。AI・弁護士の窓口もすぐにご利用いただけます。",
  },
  {
    title: "毎月の改善サポート",
    desc: "★評価や評判の推移をレポート。継続的に評判を磨き続け、競合に抜かれないよう伴走します。",
  },
];

const ROLES = [
  {
    icon: "🤖",
    who: "AI",
    what: "「違反の可能性」「申請文の書き方」をヒント提供。申請は事業者ご本人が行います。",
  },
  {
    icon: "⚖️",
    who: "提携弁護士",
    what: "権利侵害・悪質な誹謗中傷など、法的対応が必要な事案を担当します。",
  },
  {
    icon: "⭐",
    who: "当社",
    what: "口コミ獲得・MEO・WEB/LINE/アプリなど、評判を上げる施策に専念します。",
  },
];

const PLAN_FAQ = [
  {
    q: "口コミの削除も代行してくれるのですか？",
    a: "いいえ、当社が削除申請を代行することはありません。ガイドライン違反の可能性がある口コミについて、見分け方や申請フォームの書き方をAIが具体的にサポートし、申請はお客様ご自身で行っていただきます。削除はGoogleの判断によるため、消えることをお約束するものではありません。だからこそ私たちは、★評価を上げ評判全体を整えることを本命のゴールにしています。",
  },
  {
    q: "口コミの「やらせ投稿」や購入はできますか？",
    a: "行いません。Googleのポリシー違反であり、長期的にお店の信頼を損ないます。私たちは、満足された実際のお客様が“ご自身で”口コミを書きやすくする導線（タップ式ツール・NFCカード・LINE）づくりで、正当に★を増やすことに専念します。",
  },
  {
    q: "WEBやLINE、アプリの制作費は別途かかりますか？",
    a: "いいえ。月額プランに含まれており、契約期間中は制作費なしでずっとご利用いただけます。買い切りではなくサブスクリプション型のため、初期費用を抑えてスタートできます。",
  },
  {
    q: "サジェスト対策・逆SEOは必ず効果がありますか？",
    a: "検索エンジンの仕様変更などの影響を受けるため、結果を保証するものではありません。ポジティブな情報を増やし相対的に改善を図る取り組みで、状況を見ながら継続的に進めます（Proプランに含まれます）。",
  },
];

export default function PlansPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "トップ", path: "/" },
            { name: "総合改善パッケージ・料金", path: "/plans/" },
          ]),
        ]}
      />

      {/* ファーストビュー */}
      <section className="relative overflow-hidden bg-navy-gradient py-14 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label justify-center text-amber-300 before:bg-amber-300">
              All-in-one Package
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-4xl">
              Googleの評判、
              <span className="text-amber-300">まるごとお任せ。</span>
              <br className="hidden sm:block" />
              「選ばれ続けるお店」を、ひとつのパッケージで。
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
              悪い口コミ、変なサジェスト、ネットの評判 ——
              <br className="hidden sm:block" />
              AIによる口コミ対策サポートから提携弁護士の窓口、口コミ獲得ツール、公式WEB・LINE・アプリまで。
              契約中ずっと使える月額パッケージで、Googleの評判を総合的に改善します。
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/check/"
                className="inline-flex rounded-lg bg-white px-6 py-3.5 text-base font-bold text-blue-800 transition hover:bg-blue-50"
              >
                ★ まずは無料で評判診断
              </Link>
              <Link
                href="#pricing"
                className="inline-flex rounded-lg bg-white/10 px-6 py-3.5 text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                料金プランを見る
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-300">
              ※ 初回の評判診断は無料です。しつこい営業は一切いたしません。
            </p>
          </div>
        </Container>
      </section>

      {/* 消す＝手段／上げる＝ゴール */}
      <Section title="口コミを「消す」ことが、ゴールではありません。">
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          削除はあくまで手段。しかも消える保証はありません。私たちが目指すのは、★評価そのものを上げ、ネット全体の評判を整えて
          <strong className="text-slate-900">「選ばれ続けるお店」</strong>
          になること。だから、消えても・消えなくても前に進めます。
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-extrabold text-slate-500">
              口コミを消す ＝ 手段
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              ガイドライン違反の口コミは、AIのサポートでご自身で申請。通らなければ行き止まりになる「手段」のひとつです。
            </p>
          </div>
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <p className="text-sm font-extrabold text-amber-700">
              評判を上げる ＝ ゴール
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              良い口コミを集め、サジェストや検索結果も整え、★が積み上がり続ける状態へ。長期的に強いお店をつくります。
            </p>
          </div>
        </div>
      </Section>

      {/* パッケージの中身 */}
      <Section
        title="評判改善に必要なものが、ぜんぶ揃った総合パッケージ。"
        lead="「対策」も「集客の仕組み」も「守り」も、これひとつ。契約中はずっとご利用いただけます。"
        tone="muted"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGE_ITEMS.map((item) => (
            <div
              key={item.key}
              className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              {item.freeBadge ? (
                <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  契約中 無料
                </span>
              ) : null}
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-snug text-slate-900">
                    {item.title}
                  </h3>
                  {item.tag ? (
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        TAG_TONE[item.tagTone ?? "opt"]
                      }`}
                    >
                      {item.tag}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 料金プラン */}
      <Section
        id="pricing"
        title="料金プラン"
        lead="守備範囲に合わせて3プラン。束ねるほど割安です。まずは無料診断からどうぞ。"
      >
        <PlanCards />
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Light・Standardは
          <strong className="text-slate-700">クレジットカード（Stripe）</strong>
          でそのままお申し込みいただけます（月額・自動更新／いつでも解約可）。
          お支払い条件は
          <Link
            href="/commerce-disclosure/"
            className="font-bold text-blue-600 hover:underline"
          >
            特定商取引法に基づく表記
          </Link>
          をご確認ください。Proは内容に応じてお見積りします。
        </p>
      </Section>

      {/* 役割分担（非弁回避） */}
      <Section title="安心の役割分担" tone="muted">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ROLES.map((r) => (
            <div
              key={r.who}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {r.icon}
                </span>
                <h3 className="text-base font-bold text-slate-900">{r.who}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {r.what}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          ※ 当社は口コミ削除の申請を代行するものではなく、ご自身による申請をAI等で支援するサービスです。法的対応が必要な事案は提携弁護士をご案内します。
        </p>
      </Section>

      {/* 流れ */}
      <Section title="ご相談から改善までの流れ">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="geo-box p-5">
              <span className="font-mono text-xs font-bold text-amber-500">
                STEP {i + 1}
              </span>
              <h3 className="mt-1 text-base font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* FAQ */}
      <Section title="よくあるご質問" tone="muted">
        <div className="mx-auto max-w-3xl space-y-3">
          {PLAN_FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-slate-200 bg-white p-4"
            >
              <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">
                <span className="mr-2 text-blue-600">Q.</span>
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* 最終CTA */}
      <section className="bg-navy-gradient py-14">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label justify-center text-amber-300 before:bg-amber-300">
              Free Diagnosis
            </span>
            <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">
              まずは「無料の評判診断」から。
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              しつこい営業はいたしません。口コミ・競合との差・サジェストの状況を、無料で診断します。
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/check/"
                className="inline-flex rounded-lg bg-white px-6 py-3.5 text-base font-bold text-blue-800 transition hover:bg-blue-50"
              >
                無料で評判診断する
              </Link>
              <LineCtaButton size="lg" />
            </div>
            <div className="mt-6">
              <TrustBadges onDark />
            </div>
          </div>
        </Container>
      </section>

      <Container className="pb-12">
        <Disclaimer />
      </Container>
    </>
  );
}
