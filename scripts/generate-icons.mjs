// リバースハックの公式ロゴ(apps/web/public/brand/reversehack-logo.png)から
// Web/PWA・Chrome拡張・favicon 用の各サイズPNGを生成する。
// 依存: sharp（ルート devDependencies）。  実行: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MARK = join(ROOT, "apps/web/public/brand/reversehack-logo.png");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function emit(size, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(MARK)
    .trim({ threshold: 25 })
    .resize(size, size, { fit: "contain", background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toFile(outPath);
  console.log(`generated ${outPath} (${size}x${size})`);
}

const jobs = [
  // Web / PWA
  [192, "apps/web/public/icons/icon-192.png"],
  [512, "apps/web/public/icons/icon-512.png"],
  [180, "apps/web/public/icons/apple-touch-icon.png"],
  // Next.js favicon（app/icon.png を自動でファビコン化）
  [256, "apps/web/app/icon.png"],
  // Chrome 拡張
  [16, "apps/chrome-extension/icons/icon-16.png"],
  [32, "apps/chrome-extension/icons/icon-32.png"],
  [48, "apps/chrome-extension/icons/icon-48.png"],
  [128, "apps/chrome-extension/icons/icon-128.png"],
];

for (const [size, rel] of jobs) {
  await emit(size, join(ROOT, rel));
}
console.log("done.");
