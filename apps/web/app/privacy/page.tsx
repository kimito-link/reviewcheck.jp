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
            接続しているときは、店舗名やURLや Place ID を Google Places API へ送り、店名・星・口コミ数などをその応答から画面に出します。口コミの本文は取りません。
          </p>
          <p className="mt-2">
            店名・星・口コミ数・口コミ本文・Google のURL・座標は、当サービスの保存領域へ新しく書きません。古いキーが残っていても、診断と共有の画面はそれを読みません。Place ID は、共有リンクに載ることがあります。
          </p>
          <p className="mt-2">
            手入力の星や件数は、利用者がその場で渡した値として計算します。Google の画面から書き写した値が、書き写しただけで許されるとは書いていません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">3. 共有と LINE</h2>
          <p className="mt-2">
            口コミ診断の共有リンクには、Place ID と、許可した共有者の LINE のURL（ref_line）だけを載せます。店名・星・口コミ数・座標・個人の名前は、URL にもプレビュー画像にも入れません。
          </p>
          <p className="mt-2">
            リンクを人が開くと、Place ID から店舗を取り直します。プレビューやクローラは取り直しません。予算や回数の上限に当たると、点数は出さず、もう一度診断する案内を出します。
          </p>
          <p className="mt-2">
            LINE で送るときは、利用者が選んだ文面に店名や点数が含まれることがあります。共有ボタンは LINE の共有機能へ、そのURLを渡します。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">4. 端末に残るもの</h2>
          <p className="mt-2">
            Google から取った診断は、このブラウザの前回点数として保存しません。利用者が自分で数字を入れて診断したときだけ、点数と比較のための日付をそのブラウザに残すことがあります。店名そのものは残しません。
          </p>
          <p className="mt-2">
            Chrome 拡張は、前回の点検日時と Place ID だけを、その端末の拡張の保存領域に残します。星・店名・点数は残しません。権限は増やしていません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">5. 回数の制限と、書いていない記録</h2>
          <p className="mt-2">
            連続した自動取得を止めるため、接続元を約1日数えます。別のアクセス解析サービスは足していません。
          </p>
          <p className="mt-2">
            業種と地域で点数を集計する記録は、確認が終わるまで読み書きしません。継続監視が Google の点数を新しく記録することも、同じ確認が終わるまで止めています。既にある記録は、この変更では消さず、公開の診断画面には出しません。
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
