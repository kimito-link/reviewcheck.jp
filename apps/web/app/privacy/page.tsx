import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SITE } from "@reviewcheck/config";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "プライバシーポリシー",
  description: `${SITE.name}のプライバシーポリシーです。`,
  path: "/privacy/",
});

export default function PrivacyPage() {
  return (
    <Container className="py-12">
      <h1 className="text-2xl font-extrabold text-slate-900">
        プライバシーポリシー
      </h1>
      <p className="mt-3 text-base text-slate-800">
        運営者は株式会社ベストトラストです。このページは、いまのプログラムの動きに合わせています。Google の利用条件を満たしているとは書いていません。
      </p>
      <div className="mt-6 space-y-6 text-base leading-relaxed text-slate-800">
        <section>
          <h2 className="font-bold text-slate-900">1. 診断で扱う情報</h2>
          <p className="mt-2">
            利用者が入力した店舗名・GoogleマップのURL・星評価・口コミ数・競合の情報を、その診断のあいだ扱います。閲覧履歴を常時集めることはありません。
          </p>
          <p className="mt-2">
            現在地からお店を探すときは、端末の位置情報を使います。問い合わせのときは約100mに丸めます。その座標は、候補を返すためだけに使い、診断のあとには保存しません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">2. Google から受け取った内容</h2>
          <p className="mt-2">
            接続しているときは、店舗名やURLや Place ID を Google Places API へ送り、店名・星・口コミ数などをその応答から画面に出します。店名の検索で受け取るのは Place ID だけです。口コミの本文は取りません。Google の利用条件とプライバシーポリシーは、
            <a className="font-bold text-blue-800 underline" href="https://cloud.google.com/maps-platform/terms">Google Maps Platform Terms</a>
            と
            <a className="font-bold text-blue-800 underline" href="https://policies.google.com/privacy">Google Privacy Policy</a>
            にあります。このページは、それらを満たしているとは書いていません。
          </p>
          <p className="mt-2">
            診断の処理中、同じ問い合わせをまとめているあいだは、応答がメモリにあります。処理が終わるとそのまとめからは外します。これは永続の保存ではありません。
          </p>
          <p className="mt-2">
            新しい診断と共有は、店名・星・口コミ数を当サービスの Redis へ書きません。以前に書いたキーが残っていても、この画面はそれを読みません。残っているキーの削除は、別の承認まで行いません。Place ID は、新しい共有リンクに載ることがあります。
          </p>
          <p className="mt-2">
            古い共有リンクのパスには、作った時点の内容が残っていることがあります。画面では Place ID 以外を使いません。パス自体を消すことはできません。ブラウザの履歴や、サーバが受けたリクエストの記録に、そのパスが残ることがあります。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">3. 共有と相談</h2>
          <p className="mt-2">
            新しい共有リンクには、Place ID と、許可した共有者の LINE のURL（ref_line）だけを載せます。プレビュー画像に店名や点数は入れません。
          </p>
          <p className="mt-2">
            人がリンクを開くと、Place ID から店舗を取り直します。プレビューやクローラ向けの判定は、費用の上限そのものではありません。予算や回数の上限に当たると、取り直しを止めます。
          </p>
          <p className="mt-2">
            結果から相談へ進むリンクに、店名と点数は付けません。共有ボタンが渡す文面にも、店名と点数は入れません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">4. 端末に残るもの</h2>
          <p className="mt-2">
            Google から取った診断は、前回点数として新しく書きません。以前このブラウザに残った点数があっても、Google の結果では読みません。そのキーの削除は、この変更では行いません。利用者が自分で数字を入れて診断したときだけ、点数と比較のための日付をそのブラウザに残すことがあります。
          </p>
          <p className="mt-2">
            利用者が自分で保存した HTML や印刷は、その端末に残ります。サーバへは送りません。
          </p>
          <p className="mt-2">
            Chrome 拡張が新しく残すのは、点検日時と Place ID です。すでに拡張の保存領域にある古い内容は、この変更では一括では消しません。共有文には点数と店名を入れません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">5. 回数と、到達の件数</h2>
          <p className="mt-2">
            連続した自動取得を止めるため、接続元を数えます。別のアクセス解析サービスは足していません。
          </p>
          <p className="mt-2">
            診断の開始、診断の完了、相談の選択、相談ページへの到達を、イベント名だけの件数として数えることがあります。店名・点数・メールはその件数に入れません。ページを開いたことや相談ページへ着いたことは、購入でも売上でもありません。
          </p>
          <p className="mt-2">
            業種と地域で点数を集計する記録は、読み書きしません。継続監視の新しい点数も書きません。既にある記録は消さず、公開の診断画面には出しません。月次モニタリングの新規申込は受け付けていません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">6. お問い合わせ</h2>
          <p className="mt-2">
            個人情報保護管理者：株式会社ベストトラスト 個人情報お問い合わせ窓口
          </p>
          <p className="mt-2">
            このポリシーに関するお問い合わせは、{SITE.contactEmail} または当サイトの相談・お問い合わせ窓口までご連絡ください。
          </p>
        </section>
      </div>
    </Container>
  );
}
