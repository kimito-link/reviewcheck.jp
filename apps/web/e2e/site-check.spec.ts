import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const artifacts = "/opt/cursor/artifacts";

test.beforeAll(() => {
  mkdirSync(artifacts, { recursive: true });
});

test("ウェブサイトが無いサンプル結果には欄が無い", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/check/");
  await page.getByRole("button", { name: "サンプル結果を見る" }).click();
  await expect(page.getByText("これはサンプル（デモ）です。")).toBeVisible();
  await expect(page.locator("[data-result-section='site-check']")).toHaveCount(0);
});

test("390pxとデスクトップで、点数のあとに設定チェックが出る", async ({ page }) => {
  async function shot(width: number, height: number, file: string) {
    await page.setViewportSize({ width, height });
    await page.goto("/check/");
    await page.locator("#store-query").fill("テスト食堂");
    await page.locator("#store-website").fill("https://shop.example/");
    await page.getByRole("button", { name: "実際の数値・競合を入力（任意）" }).click();
    await page.getByPlaceholder("例：4.1").fill("4.0");
    await page.getByPlaceholder("例：50").fill("45");
    await page.getByRole("button", { name: "無料で診断する" }).click();
    const section = page.locator("[data-result-section='site-check']");
    await expect(section).toBeVisible();
    await expect(section).toContainText("71");
    await expect(section).toContainText("要対応1・注意5・問題なし10・確認できず0・対象外6");
    await expect(section).toContainText("HTTPからHTTPSへの転送");
    await expect(section).toContainText("直し方の例");
    await expect(section.getByRole("link", { name: "マルウェアチェックで全文を見る" })).toHaveAttribute(
      "href",
      /malwarecheck\.site\/check\/\?url=/,
    );
    const box = await section.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(width);
    await section.screenshot({ path: `${artifacts}/${file}` });
  }

  await shot(390, 844, "site-check-390.png");
  await shot(1280, 800, "site-check-desktop.png");
});
