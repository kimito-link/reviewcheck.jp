# apps/mobile（iOS / Android 化の予定地）

Web版（Next.js）を土台に、将来 **Capacitor** でiOS/Androidアプリ化するためのプレースホルダです。
初期版では実装しません（優先度は最後）。設計だけ確定させておきます。

## 方針

- ネイティブ実装を増やさず、**Capacitor の `server.url` 方式**で本番Web（`https://reviewcheck.jp`）をラップする「薄いシェル」を基本とする。
- 共有ロジック（`@reviewcheck/core`）はWeb・拡張と同一。アプリ固有コードは最小限。
- PWA（`manifest` + `sw.js`）を先に整えてあるため、まずは「ホーム画面に追加」で擬似アプリ体験が可能。

## 将来の構成（例）

```
apps/mobile/
  package.json
  capacitor.config.ts     # ↓のテンプレを使用
  ios/                    # npx cap add ios で生成
  android/                # npx cap add android で生成
```

`capacitor.config.template.ts` を `capacitor.config.ts` にコピーして使う想定。

## 立ち上げ手順（将来）

```bash
pnpm --filter @reviewcheck/mobile add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "口コミチェック" site.reviewcheck.app --web-dir=public
npx cap add ios
npx cap add android
npx cap sync
```

- ストア審査では「単なるWebラッパー」と見なされないよう、プッシュ通知・共有・カメラからのQR読取（口コミ依頼導線）などネイティブ価値を1つ以上足すことを推奨。
