/**
 * source=places の固定応答で、診断・共有・相談・監視停止を見る。
 * Google、Stripe、外部の決済ホストへは出さない。
 * 起動: REVIEWCHECK_PLACES_FIXTURE=1 の next が BASE で動いていること。
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.FIXTURE_BASE ?? "http://127.0.0.1:3010";
const outDir = process.env.FIXTURE_OUT ?? "/opt/cursor/artifacts";
const queryText = "架空フィクスチャ（Google固定応答）";
const blockedHosts = [
  "places.googleapis.com",
  "maps.googleapis.com",
  "stripe.com",
  "partner.reverse-re-birth-hack.com",
];

function encodePlaceReportId(placeId) {
  const json = JSON.stringify({ placeId: placeId.trim() });
  const b64 = Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `p1.${b64}`;
}

function assertText(name, text) {
  const problems = [];
  if (!text.includes("架空")) problems.push(`${name}: 架空の表示が無い`);
  if (text.includes("選ばれやすさ")) problems.push(`${name}: 選ばれやすさが残っている`);
  if (/\/\s*100/.test(text)) problems.push(`${name}: 100点満点の点数が残っている`);
  if (/第\d+位/.test(text)) problems.push(`${name}: 順位が残っている`);
  if (text.includes("partner.reverse")) problems.push(`${name}: 監視の外部決済リンクがある`);
  if (text.includes("デモで試す") && name.startsWith("share")) {
    problems.push(`${name}: サンプル診断の画面になっている`);
  }
  return problems;
}

async function shot(page, name, selector) {
  if (selector) {
    const target = page.locator(selector).first();
    await target.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForTimeout(200);
  }
  const file = `${outDir}/${name}.png`;
  await page.screenshot({ path: file, fullPage: false, animations: "disabled" });
  return file;
}

async function runWidth(browser, width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const hits = [];
  const funnels = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).host;
    if (blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
      hits.push(request.url());
    }
  });
  await page.route("**/*", (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.url().includes("/api/funnel")) {
      try {
        funnels.push({ url: request.url(), body: request.postDataJSON() });
      } catch {
        funnels.push({ url: request.url(), body: null });
      }
    }
    const host = new URL(request.url()).host;
    if (blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
      return route.abort();
    }
    return route.continue();
  });

  await page.goto(`${base}/check/`, { waitUntil: "networkidle" });
  await page.getByLabel("店舗名 または GoogleマップURL").fill(queryText);
  const diagnoseResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/diagnose") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: "診断する" }).click();
  const diagnosed = await diagnoseResponse;
  const diagnoseJson = await diagnosed.json();
  const funnelHeader = diagnosed.headers()["x-funnel-counted"] ?? "";
  await page.getByRole("heading", { name: "架空フィクスチャ食堂", exact: true }).waitFor();
  const storageKeys = await page.evaluate(() => Object.keys(window.localStorage));
  const diagnosisText = await page.locator("body").innerText();
  const diagnosisShot = await shot(
    page,
    `fixture_places_diagnosis_${width}`,
    "[data-result-section='result']",
  );
  const areaShot = `${outDir}/fixture_places_area_${width}.png`;
  await page
    .locator("[data-result-section='area-map']")
    .screenshot({ path: areaShot, animations: "disabled" });
  const covered = await page.evaluate(() => {
    const bar = document.querySelector("[data-sticky-consult]");
    const area = document.querySelector("[data-result-section='area-map']");
    const credit = area?.querySelector("[data-places-attribution]");
    if (!bar || !area) return ["追従ボタンか表が無い"];
    const barRect = bar.getBoundingClientRect();
    const hidden = bar.classList.contains("invisible");
    const problems = [];
    if (!hidden) {
      for (const [node, name] of [
        [area, "表"],
        [credit, "出典"],
      ]) {
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (rect.bottom > barRect.top + 1 && rect.top < barRect.bottom - 1) {
          problems.push(`${name}が追従ボタンに重なっている`);
        }
      }
    }
    return problems;
  });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(250);
  const bottomClear = await page.evaluate(() => {
    const bar = document.querySelector("[data-sticky-consult]");
    const result = document.querySelector("[data-result-section='result']");
    const root = result?.parentElement;
    if (!bar || !root) return ["下端の確認ができない"];
    const barRect = bar.getBoundingClientRect();
    const pad = Number.parseFloat(getComputedStyle(root).paddingBottom);
    const problems = [];
    if (!(pad + 1 >= barRect.height)) {
      problems.push(`末尾余白 ${pad}px がボタンの高さ ${barRect.height}px より小さい`);
    }
    const last = [...root.children].findLast((el) => !el.hasAttribute("data-sticky-consult"));
    if (!last) return [...problems, "本文の末尾が無い"];
    const lastRect = last.getBoundingClientRect();
    if (!bar.classList.contains("invisible") && lastRect.bottom > barRect.top + 2) {
      problems.push("本文の末尾が追従ボタンに隠れている");
    }
    const footerBody = document.querySelector("footer .mx-auto");
    if (
      footerBody &&
      !bar.classList.contains("invisible") &&
      footerBody.getBoundingClientRect().bottom > barRect.top + 2
    ) {
      problems.push("フッターの本文が追従ボタンに隠れている");
    }
    return problems;
  });
  const bottomShot = await shot(page, `fixture_places_diagnosis_bottom_${width}`);
  await page.getByRole("link", { name: "15分のご相談ページを開く" }).first().click();
  await page.getByText("15分のご相談（費用はかかりません）").waitFor();
  await page.waitForTimeout(1000);
  const consultText = await page.locator("body").innerText();
  const consultShot = await shot(page, `fixture_places_consult_${width}`);

  const placeId = diagnoseJson?.input?.store?.placeId;
  const reportId = encodePlaceReportId(placeId);
  await page.goto(`${base}/report/${reportId}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "共有された診断への入口" }).waitFor();
  const shareText = await page.locator("body").innerText();
  const shareHeading = await page.locator("h1").first().innerText();
  const shareShot = await shot(page, `fixture_places_share_${width}`);

  await page.goto(`${base}/contact/?topic=monitoring`, { waitUntil: "networkidle" });
  await page.getByText("月次モニタリングの新規申込は停止中です").waitFor();
  const monitorText = await page.locator("body").innerText();
  const monitorShot = await shot(page, `fixture_places_monitor_${width}`);

  await context.close();
  return {
    width,
    diagnoseStatus: diagnosed.status(),
    source: diagnoseJson?.input?.store?.source ?? null,
    placesAttributed: diagnoseJson?.placesAttributed === true,
    providers: diagnoseJson?.providers ?? [],
    funnelHeader,
    scoreInJson: typeof diagnoseJson?.score === "number",
    storageKeys,
    funnels,
    hits,
    diagnosisShot,
    bottomShot,
    areaShot,
    shareShot,
    consultShot,
    monitorShot,
    problems: [
      ...covered,
      ...bottomClear,
      ...assertText("diagnosis", diagnosisText),
      ...assertText("share", shareText),
      ...(shareHeading.includes("選ばれやすさ") ? ["share heading に点数が残っている"] : []),
      ...(consultText.includes("15分のご相談（費用はかかりません）")
        ? []
        : ["consult: 15分のご相談が無い"]),
      ...(typeof diagnoseJson?.score === "number" ? ["diagnosis: score が残っている"] : []),
      ...(diagnoseJson?.kind === "facts" ? [] : ["diagnosis: kind が facts ではない"]),
      ...(consultText.includes("1時間") && consultText.includes("5,000")
        ? ["consult: 料金表に無い金額が出ている"]
        : []),
      ...(monitorText.includes("この画面から決済は始まりません")
        ? []
        : ["monitor: 決済停止の文が無い"]),
      ...(monitorText.includes("checkout.stripe.com") || monitorText.includes("partner.reverse")
        ? ["monitor: 決済先が出ている"]
        : []),
      ...(hits.length ? [`外部送信: ${hits.join(", ")}`] : []),
      ...(diagnoseJson?.input?.store?.source === "places" ? [] : ["source が places ではない"]),
      ...(funnelHeader === "diagnosis_complete" ? [] : ["diagnosis_complete が応答に無い"]),
      ...(
        ["diagnosis_start", "cta", "apply"].every((event) =>
          funnels.some((item) => item?.body?.event === event),
        )
          ? []
          : [`匿名イベントが揃っていない: ${JSON.stringify(funnels)}`]
      ),
      ...(storageKeys.some((key) => key.startsWith("rc:last:"))
        ? ["診断後に点数の端末保存キーがある"]
        : []),
    ],
  };
}

const reach = await fetch(`${base}/api/funnel/`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ event: "diagnosis_start" }),
});
const reachJson = await reach.json();
const rejected = await fetch(`${base}/api/funnel/`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ event: "diagnosis_start", score: 48, placeId: "x" }),
});
if (reachJson.counted !== "reach" || reachJson.purchase !== false || rejected.status !== 400) {
  console.error("funnel API", reach.status, reachJson, rejected.status);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const results = [];
for (const width of [390, 1280]) {
  results.push(await runWidth(browser, width));
}
await browser.close();
const report = {
  base,
  label: "架空フィクスチャ。Googleのライブ応答ではない。source は places。",
  results,
};
await mkdir(outDir, { recursive: true });
await writeFile("/tmp/places-fixture-e2e.json", JSON.stringify(report, null, 2));
const problems = results.flatMap((item) => item.problems);
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
