import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  DIAGNOSIS_APPS,
  DIAGNOSIS_APPS_VERIFIED_AT,
  DIAGNOSIS_APP_COUNT,
  diagnosisHref,
  isLineInAppBrowser,
  normalizeCheckedIds,
  progressLabel,
  rankNextDiagnoses,
  toSitePath,
  withLineExternalParam,
} from "./diagnosisApps.ts";

const BANNED = ["無料", "必ず", "保証", "安全です"];
const FEAR = ["危険", "脅威", "感染", "攻撃", "不安", "最悪", "被害"];

const LINE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.0.0";

describe("診断アプリのレジストリ", () => {
  test("11件、確認日、公開中のURLだけ", () => {
    assert.equal(DIAGNOSIS_APP_COUNT, 11);
    assert.equal(DIAGNOSIS_APP_COUNT, DIAGNOSIS_APPS.length);
    assert.deepEqual(
      DIAGNOSIS_APPS.map((app) => app.id),
      [
        "ai-health",
        "web-health",
        "reverse-web",
        "malware",
        "review",
        "suggest",
        "check",
        "suggest-check",
        "ai-check",
        "kanban-check",
        "fact-check",
      ],
    );
    for (const app of DIAGNOSIS_APPS) {
      assert.equal(app.verifiedAt, "2026-10-27");
      assert.equal(app.verifiedAt, DIAGNOSIS_APPS_VERIFIED_AT);
      assert.equal(app.webUrl.startsWith("https://"), true);
      for (const store of app.stores) {
        assert.equal(store.url.startsWith("https://"), true);
        assert.equal(store.url.includes("utm_"), false);
        assert.equal(store.url.includes("ref="), false);
      }
    }

    const byId = Object.fromEntries(DIAGNOSIS_APPS.map((app) => [app.id, app]));
    assert.deepEqual(byId["ai-health"]?.stores, []);
    assert.equal(byId["ai-health"]?.webUrl, "https://app.ai-health-check.link/");
    assert.deepEqual(
      byId["web-health"]?.stores.map((store) => store.url),
      [
        "https://apps.apple.com/jp/app/id6779860644",
        "https://play.google.com/store/apps/details?id=com.kimito.link.webhealthcheck",
        "https://chromewebstore.google.com/detail/hcebljaachgkdfcokcidanmcglflfjbo",
      ],
    );
    assert.equal(
      byId["reverse-web"]?.stores.some((store) => store.kind === "chrome"),
      false,
    );
    assert.equal(
      byId["malware"]?.stores.some((store) => store.kind === "appStore"),
      false,
    );
    assert.deepEqual(
      byId["review"]?.stores.map((store) => store.url),
      ["https://chromewebstore.google.com/detail/nianfdjglnjghfmfkiinedfmgkoojcaa"],
    );
    assert.equal(byId["suggest"]?.webUrl, "https://reviewcheck.jp/suggest-check/");
    assert.deepEqual(
      byId["suggest"]?.stores.map((store) => store.url),
      ["https://chromewebstore.google.com/detail/befoihdhopfaaodibepoblcejekffnhk"],
    );
    assert.equal(byId["check"]?.webUrl, "https://reviewcheck.jp/check/");
    assert.equal(byId["suggest-check"]?.webUrl, "https://reviewcheck.jp/suggest-check/");
    assert.equal(byId["ai-check"]?.webUrl, "https://reviewcheck.jp/ai-check/");
    assert.equal(byId["kanban-check"]?.webUrl, "https://reviewcheck.jp/kanban-check/");
    assert.equal(byId["fact-check"]?.webUrl, "https://reviewcheck.jp/fact-check/");
    for (const app of DIAGNOSIS_APPS) {
      if (app.group === "reviewcheck") assert.deepEqual(app.stores, []);
    }
  });

  test("特許表記は2件だけで、取得済み等の語はソースに無い", () => {
    const noted = DIAGNOSIS_APPS.filter((app) => app.patentNote);
    assert.deepEqual(
      noted.map((app) => [app.id, app.patentNote]),
      [
        ["web-health", "特許出願中（特願2026-223098・特願2026-227149）"],
        ["reverse-web", "特許出願中（特願2026-223098）"],
      ],
    );
    for (const app of DIAGNOSIS_APPS) {
      if (app.id === "web-health" || app.id === "reverse-web") continue;
      assert.equal(app.patentNote, undefined, app.id);
    }
    const suggest = DIAGNOSIS_APPS.find((app) => app.id === "suggest");
    assert.equal(`${suggest?.name}${suggest?.value}`.includes("®"), false);
    assert.equal(`${suggest?.name}${suggest?.value}`.includes("商標登録"), false);

    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const sources = [
      "packages/core/src/diagnosisApps.ts",
      "apps/web/components/DiagnosisAppsFooter.tsx",
      "apps/web/components/result/NextDiagnoses.tsx",
      "apps/chrome-extension/popup.html",
    ];
    const banned = ["特許取得", "特許技術", "特許済み", "®", "商標登録"];
    for (const rel of sources) {
      const text = readFileSync(path.join(root, rel), "utf8");
      for (const phrase of banned) {
        assert.equal(text.includes(phrase), false, `${rel} ${phrase}`);
      }
    }
  });

  test("新しい文面に禁止語と不安をあおる語が無い", () => {
    for (const app of DIAGNOSIS_APPS) {
      const text = `${app.name}${app.value}${app.patentNote ?? ""}${app.stores.map((store) => store.label).join("")}`;
      for (const word of BANNED) assert.equal(text.includes(word), false, word);
      for (const word of FEAR) assert.equal(app.value.includes(word), false, word);
    }
  });
});

describe("結果に対する並び", () => {
  test("口コミが低いときは検索候補を先にし、今の診断は出さない", () => {
    const next = rankNextDiagnoses({
      surface: "review",
      score: 45,
      hasWebsite: false,
      behindPeers: true,
    });
    assert.deepEqual(
      next.map((app) => app.id),
      [
        "suggest-check",
        "web-health",
        "malware",
        "reverse-web",
        "ai-check",
        "ai-health",
        "kanban-check",
        "fact-check",
      ],
    );
    assert.equal(next.some((app) => app.id === "check" || app.id === "review"), false);
    assert.equal(new Set(next.map((app) => toSitePath(app.webUrl))).size, next.length);
  });

  test("口コミが高くサイトがあるときはサイト診断を先にする", () => {
    const next = rankNextDiagnoses({
      surface: "review",
      score: 88,
      hasWebsite: true,
      behindPeers: false,
    });
    assert.deepEqual(
      next.map((app) => app.id),
      [
        "web-health",
        "malware",
        "suggest-check",
        "reverse-web",
        "ai-check",
        "ai-health",
        "kanban-check",
        "fact-check",
      ],
    );
  });

  test("検索候補に気になる語があるときは口コミ診断を先にする", () => {
    const risky = rankNextDiagnoses({ surface: "suggest", risk: "high" });
    assert.deepEqual(
      risky.map((app) => app.id),
      [
        "check",
        "malware",
        "web-health",
        "reverse-web",
        "ai-check",
        "ai-health",
        "kanban-check",
        "fact-check",
      ],
    );
    const calm = rankNextDiagnoses({ surface: "suggest", risk: "safe" });
    assert.equal(calm[0]?.id, "check");
    assert.equal(calm[1]?.id, "web-health");
    assert.equal(
      calm.some((app) => app.id === "suggest" || app.id === "suggest-check"),
      false,
    );
  });
});

describe("進捗の文言とLINEの外部ブラウザ", () => {
  test("レジストリの件数のうちnつ、と未知のIDは数えない", () => {
    assert.equal(progressLabel(2), "11のうち2つを確かめました");
    assert.equal(progressLabel(0), "11のうち0つを確かめました");
    assert.equal(progressLabel(99), "11のうち11つを確かめました");
    assert.equal(progressLabel(2), `${DIAGNOSIS_APP_COUNT}のうち2つを確かめました`);
    assert.deepEqual(
      normalizeCheckedIds(["review", "nope", "review", "suggest", 1]),
      ["review", "suggest"],
    );
  });

  test("LINEのアプリ内ブラウザだけ、外部URLに openExternalBrowser=1 を足す", () => {
    assert.equal(isLineInAppBrowser(LINE_UA), true);
    assert.equal(isLineInAppBrowser("Mozilla/5.0 Lineish"), false);
    const play =
      "https://play.google.com/store/apps/details?id=com.kimito.link.webhealthcheck";
    assert.equal(
      withLineExternalParam(play, LINE_UA),
      `${play}&openExternalBrowser=1`,
    );
    assert.equal(
      withLineExternalParam("https://web-health-check.link/", LINE_UA),
      "https://web-health-check.link/?openExternalBrowser=1",
    );
    assert.equal(
      withLineExternalParam("https://web-health-check.link/", "Mozilla/5.0"),
      "https://web-health-check.link/",
    );
    assert.equal(
      diagnosisHref("https://reviewcheck.jp/suggest-check/", LINE_UA),
      "/suggest-check/",
    );
    assert.equal(
      diagnosisHref("https://reviewcheck.jp/", "Mozilla/5.0"),
      "/",
    );
    const store = diagnosisHref(
      "https://apps.apple.com/jp/app/id6779860644",
      LINE_UA,
    );
    assert.equal(store.includes("openExternalBrowser=1"), true);
    assert.equal(store.includes("utm_"), false);
    assert.equal(store.includes("ref="), false);
  });
});
