import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SITE } from "@reviewcheck/config";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "利用規約",
  description: `${SITE.name}の利用規約です。`,
  path: "/terms/",
});

export default function TermsPage() {
  return (
    <Container className="py-12">
      <h1 className="text-2xl font-extrabold text-slate-900">利用規約</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="font-bold text-slate-900">第1条（本サービス）</h2>
          <p className="mt-2">
            {SITE.name}（以下「本サービス」）は、店舗名またはGoogleマップURL等の入力情報・公開情報をもとに、Google口コミの状態を簡易診断し、口コミ改善・MEO対策等の相談導線を提供するサービスです。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">第2条（診断結果の位置づけ）</h2>
          <p className="mt-2">
            診断結果は簡易的な目安であり、検索順位・来店数・口コミ増加・星評価の改善を保証するものではありません。表示される数値（あと何件・何点 等）はGoogleの丸め処理や反映タイミングにより実際と異なる場合があります。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">第3条（禁止事項・方針）</h2>
          <p className="mt-2">
            本サービスは、口コミの購入、偽レビュー・やらせレビューの投稿、競合店舗への不正な低評価など、Googleのポリシーや法令に違反する行為は一切行いません。また、利用者がそうした不正行為を目的として本サービスを利用することを禁止します。本サービスは、実際の顧客体験にもとづく正当な口コミ獲得・返信改善・店舗情報改善のみを支援します。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">第4条（免責）</h2>
          <p className="mt-2">
            本サービスの利用により生じた損害について、当方は法令で認められる範囲で責任を負わないものとします。外部サービス（Google等）の仕様変更・障害等による影響についても同様とします。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">第5条（規約の変更）</h2>
          <p className="mt-2">
            本規約は予告なく変更されることがあります。変更後の規約は本ページに掲載した時点で効力を生じます。
          </p>
        </section>
        <p className="text-xs text-slate-500">
          ※本規約は草案です。実運用に合わせて加筆・修正してください。
        </p>
      </div>
    </Container>
  );
}
