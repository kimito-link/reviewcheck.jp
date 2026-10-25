# site-check

外から見えるサイト設定だけの採点です。正本はこのフォルダです。WEB健康診断、reviewcheck.jp の店舗サイト、AIの健康診断、リバースハックへ持っていくときは、ここをコピーするか、このパッケージを依存に足します。コピー先で規則だけを変えないでください。項目・減点・並びを変えるときは、正本の `SITE_CHECK_RUBRIC_VERSION` を上げてから配ります。

フレームワークには依存しません。使うのは TypeScript と `fetch`（GET だけ）です。React も Next も要りません。

## 結果の形

`runSiteCheck` と `gradeSiteCheck` は同じ JSON を返します。1件は `id` / `status` / `severity` / `why` / `fix` / `evidence` です。`status` は `action`（要対応）・`caution`（注意）・`ok`（問題なし）・`unknown`（確認できず）・`na`（対象外）。`severity` は `high` / `medium` / `none` / `unknown`。`evidence` にはファイルの中身と利用者名を入れません。

点数は 100 から、要対応 9 点・注意 4 点を引いたものです。版は `site-check v1.0`。

## 取り込み

フォルダごとコピーするとき:

```bash
cp -R packages/site-check ../別の診断/packages/site-check
```

依存に足すとき（このモノレポ、またはファイル参照）:

```json
{ "dependencies": { "site-check": "workspace:*" } }
```

別リポジトリでファイル参照にする例:

```json
{ "dependencies": { "site-check": "file:../malwarecheck.site/packages/site-check" } }
```

## 使い方

```ts
import { runSiteCheck, renderSiteCheckCard } from "site-check";

const report = await runSiteCheck("https://example.com", {
  userAgent: "ExampleDiagnosis/1.0",
  certNotAfter: null,
});
document.querySelector("#result")!.innerHTML = renderSiteCheckCard(report);
```

すでに応答ヘッダや本文を持っている診断は、同じサイトへ取りにいき直さず `gradeSiteCheck` に観測を渡します。malwarecheck.site はこちらです。

```ts
import { gradeSiteCheck } from "site-check";

const report = gradeSiteCheck({
  signals,
  isWordPress,
  unreachable,
  httpsFinal,
  headers,
  discoveryRan: true,
  target: "https://example.com",
});
```

`renderSiteCheckCard` はスタイル付きの HTML 文字列です。`mountSiteCheckCard(element, report)` は要素の中身をそれに置き換えます。直し方の例を出さないときは `{ showFix: false }`。

## 通信

- メソッドは GET だけです。ログインも書き込みもしません。
- 対象サイトへの GET は最大 14 件。間に短い待ちを入れます。本文は判定に必要な先頭だけ読み、残りは閉じます。
- 内部のホスト名と私用アドレスは送りません。DNS の付け替えまでは見ていません。公開の診断サーバーでは、呼び出し側の検査済み `fetch` を `options.fetch` に渡してください。
- 証明書の期限は `fetch` では取れません。取れた側が `certNotAfter`（ISO 日時）を渡します。渡さないとその項目は「確認できず」です。
- 送信元の証明と、なりすましへの方針は TXT です。`lookupTxt` を渡すか、省略すると Cloudflare の DNS-over-HTTPS を使います。
- 言語の版が公式の更新期間を過ぎているかは、このパッケージでは見ません。呼び出し側が信号 `eol-php-official` または `php-branch-unfixed` を渡したときだけ要対応になります。

## 画面に出すとき

状態は文字と印で出します（■要対応、▲注意、●問題なし、？確認できず、—対象外）。色だけにしないでください。先頭に点数と件数の1行を出します。「見つからない＝安全ではない」を消さないでください。価格と、急かす言い方は入れません。
