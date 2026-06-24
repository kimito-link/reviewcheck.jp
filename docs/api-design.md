# Google Places API 接続 設計メモ

口コミ診断の店舗データ（星評価・口コミ数・基本情報）を Google Places API から取得するための設計。
初期版は **未接続でもモックデータで動作**し、`GOOGLE_PLACES_API_KEY` を設定すると自動で実データに切り替わる。

## 全体方針

- 取得ロジックは `packages/core/src/providers` に集約（Web・拡張・モバイルで共通）。
- `StoreDataProvider` インターフェースに準拠した adapter を差し込む方式。
  - `GooglePlacesProvider`（`google-places`）: `GOOGLE_PLACES_API_KEY` があるときのみ有効。
  - `MockStoreProvider`（`mock`）: 最後のフォールバック。クエリから決定的にそれっぽい値を生成。
- `fetchStore(query)` が「有効な実プロバイダ → なければmock」の順で解決する。
- **取得できない情報は無理にスクレイピングしない**。オーナー返信の網羅・低評価比率・最新口コミの鮮度などは、ユーザー入力・将来の Google Business Profile API 連携で補完する。

## 取得フィールド（Places API New / v1）

| 用途 | Place Details フィールド | 備考 |
|---|---|---|
| 店舗名 | `displayName` | |
| 住所 | `formattedAddress` | |
| カテゴリ | `primaryTypeDisplayName` | |
| 星評価 | `rating` | 0.0〜5.0 |
| 口コミ数 | `userRatingCount` | |
| 電話 | `internationalPhoneNumber` | プロフィール充実度に利用 |
| サイト | `websiteUri` | プロフィール充実度に利用 |
| マップURL | `googleMapsUri` | |
| 営業時間 | `regularOpeningHours` | 有無のみ充実度に利用 |
| place_id | `id` | |

> 口コミ本文（`reviews`）は最大5件程度しか返らず、課金SKUも上がるため、**口コミの完全取得・大量取得は前提にしない**。

## クエリ解決フロー

`StoreQuery = { text?, mapsUrl?, placeId? }`

1. `placeId` があればそのまま使用。
2. `mapsUrl` があれば `parseMapsUrl()` で place_id / 店舗名 / 座標を推測。
3. それ以外は `text`（店舗名）で **Text Search**（`places:searchText`）→ 先頭の place を採用。
4. 取得した place_id で **Place Details** を取得し `StoreInput` に変換。

## 必要な環境変数

```
GOOGLE_PLACES_API_KEY=xxxxxxxx   # Places API (New) を有効化したキー
```

- Vercel の Project → Settings → Environment Variables に設定。
- キーは **サーバー側（/api/diagnose, /report）でのみ使用**。クライアントには出さない。
- API キーには「Places API (New)」のみ許可、リファラ/IP 制限を推奨。

## エンドポイント（参考）

- Text Search: `POST https://places.googleapis.com/v1/places:searchText`
  - Header: `X-Goog-Api-Key`, `X-Goog-FieldMask: places.id,places.displayName`
  - Body: `{ "textQuery": "<店舗名>", "languageCode": "ja", "regionCode": "JP" }`
- Place Details: `GET https://places.googleapis.com/v1/places/{placeId}`
  - Header: `X-Goog-Api-Key`, `X-Goog-FieldMask: id,displayName,formattedAddress,rating,userRatingCount,...`

## 将来の拡張

- **Google Business Profile API**: オーナー返信状況、未返信口コミ、投稿・写真の充実度などを取得し、選ばれやすさスコアの推定値を実測値に置き換える。
- **競合の自動取得**: Nearby Search で同カテゴリの近隣店舗を候補表示（手動追加の補助）。
- キャッシュ層（短期）で API コール削減。
