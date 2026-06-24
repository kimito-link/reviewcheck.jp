# 口コミチェック.jp Chrome拡張（Manifest V3）

Googleマップで開いている店舗のGoogle口コミ（星評価・口コミ数・選ばれやすさ・あと何件で追いつけるか）を、ポップアップから簡易チェックできる拡張機能です。

## 設計方針

- **権限は最小限**: `activeTab` のみ。`host_permissions` は自社API (`https://reviewcheck.jp/*`) だけ。
- **常時収集しない**: ユーザーが「この店舗を診断」ボタンを押したときだけ、現在のタブURLを取得して自社API (`/api/diagnose`) に問い合わせます。閲覧履歴の監視・常時収集は行いません。
- **診断ロジックはWeb版と共通**: 計算はサーバー側 (`@reviewcheck/core`) で実行。拡張は結果を表示するだけ。

## 開発・読み込み

1. アイコンを生成（リポジトリ直下で）：`pnpm icons`
2. Chrome → `chrome://extensions` → デベロッパーモードON → 「パッケージ化されていない拡張機能を読み込む」→ `apps/chrome-extension` を選択。
3. Googleマップで店舗ページを開き、ツールバーのアイコンから「この店舗を診断」。

### ローカルのWeb版に向ける場合

`config.js` の `API_BASE` を `http://localhost:3000` に変更し、`manifest.json` の `host_permissions` に `"http://localhost:3000/*"` を追加してください。

## Chrome Web Store 提出用 zip

```powershell
pnpm zip   # reviewcheck-extension.zip を生成
```

ストア掲載用の説明文は `STORE-LISTING.md` を参照してください。
