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
      <p className="mt-3 text-base text-slate-800">運営者は株式会社ベストトラストです。</p>
      <div className="mt-6 space-y-6 text-base leading-relaxed text-slate-800">
        <section>
          <h2 className="font-bold text-slate-900">第1条（本サービス）</h2>
          <p className="mt-2">
            {SITE.name}（以下「本サービス」）は、店舗名またはGoogleマップURL等の1回の入力と、その場で受け取った公開情報をもとに、星と口コミ数などの事実を表示し、既存の相談メニューへ任意で進めるサービスです。Google の利用条件は
            <a className="font-bold text-blue-800 underline" href="https://cloud.google.com/maps-platform/terms">Google Maps Platform Terms</a>
            にあります。本サービスは、その条件を満たしているとは表示しません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">第2条（診断結果の位置づけ）</h2>
          <p className="mt-2">
            Google から受け取った結果の通常画面は、取得できた星・口コミ数・電話・ウェブサイト・営業時間を事実として出します。取得していない返信、最新口コミの日付、写真は、未確認のままにします。未確認を不足や減点にはせず、それを理由に申し込みを勧めません。
          </p>
          <p className="mt-2">
            星や口コミ数から作る独自の点数、検索内の順位、その履歴を、販売の根拠にすることは、公開されている条件だけでは確定していません。本サービスは、確定したとは表示しません。手入力の数字についての点数は、利用者が渡した値の計算です。
          </p>
          <p className="mt-2">
            検索の半径は、業種ごとの設計上の仮定です。調査で確定した商圏ではありません。半径を自動で広げて再検索はしません。
          </p>
          <p className="mt-2">
            月次の自動巡回は新規では受けていません。保存してある監視の記録は消しません。新しい巡回の開始もしません。決済の停止、解約、返金は、このサイトの更新では行いません。相談は任意で、15分のご相談に費用はかかりません。表示している金額は既存メニューの目安です。新しい料金は作っていません。
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
            本サービスの利用により生じた損害について、当方は法令で認められる範囲で責任を負わないものとします。外部サービス（Google等）の仕様変更・障害等による影響についても同様とします。画面に出した見積りの円は、請求書の金額ではありません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">第5条（規約の変更）</h2>
          <p className="mt-2">
            本規約は予告なく変更されることがあります。変更後の規約は本ページに掲載した時点で効力を生じます。
          </p>
        </section>
      </div>
    </Container>
  );
}
