/**
 * テスト実行用のモジュール解決ローダー
 *
 * このリポジトリのソースはバンドラ前提で拡張子なしの相対import
 * （例: import { clamp } from "../utils/number"）を使っている。
 * Node の ESM 解決は拡張子を補完しないため、そのままでは
 * node --test でソースを読み込めない。
 *
 * 本番のビルド経路（Next.js / bundler）には一切影響しない。
 * テストを走らせるためだけの薄いシムであり、ソース側は変更しない。
 *
 * 使い方:
 *   node --experimental-strip-types --import ./packages/core/test-loader.mjs \
 *        --test packages/core/src/**\/*.test.ts
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(
  "data:text/javascript," +
    encodeURIComponent(`
  import { existsSync } from 'node:fs';
  import { fileURLToPath } from 'node:url';

  // 拡張子なしの相対importに .ts / .tsx / /index.ts を順に試す
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\\.(ts|tsx|js|mjs|json)$/.test(specifier)) {
      const base = new URL(specifier, context.parentURL);
      for (const cand of [base.href + '.ts', base.href + '.tsx', base.href + '/index.ts']) {
        try {
          if (existsSync(fileURLToPath(cand))) {
            return next(cand, context);
          }
        } catch { /* 解決できない候補は次を試す */ }
      }
    }
    return next(specifier, context);
  }
`),
  pathToFileURL("./"),
);
