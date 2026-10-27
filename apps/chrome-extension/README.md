# 口コミチェック.jp Chrome拡張（Manifest V3）

今開いているページのGoogle口コミを、ポップアップから簡易チェックする拡張機能です。

## 設計方針

- **権限**: `activeTab` と `storage`。`host_permissions` は自社API (`https://reviewcheck.jp/*`) だけ。`storage` は前回の点検を `chrome.storage.local` に残すために必要です。これ以外の権限は足していません。
- **常時収集しない**: ポップアップを開いたページと、手入力した対象だけを自社API (`/api/diagnose`) に送ります。閲覧履歴の監視・常時収集は行いません。前回の点検日時と要点は、この端末の拡張の保存領域だけに残します。
- **自分用**: お金の案内や、外部のトークアプリへのリンクは出しません。
- **診断ロジックはWeb版と共通**: 計算はサーバー側 (`@reviewcheck/core`) で実行。拡張は結果を表示するだけ。

## 開発・読み込み

1. アイコンを生成（リポジトリ直下で）：`pnpm icons`
2. Chrome → `chrome://extensions` → デベロッパーモードON → 「パッケージ化されていない拡張機能を読み込む」→ `apps/chrome-extension` を選択。
3. 調べたいページを開き、ツールバーのアイコンを押すと、そのページを診断します。店舗名やGoogleマップURLは、ポップアップの入力欄からも診断できます。

### ローカルのWeb版に向ける場合

`config.js` の `API_BASE` を `http://localhost:3000` に変更し、`manifest.json` の `host_permissions` に `"http://localhost:3000/*"` を追加してください。

## Chrome Web Store 提出用 zip

```powershell
pnpm zip   # reviewcheck-extension.zip を生成
```

ストア掲載用の説明文は `STORE-LISTING.md` を参照してください。バージョンは掲載中の `0.1.0` のままです。このリポジトリの変更だけではストアへ出していません。
