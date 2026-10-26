import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DIAGNOSIS_APPS,
  DIAGNOSIS_APPS_VERIFIED_AT,
  DIAGNOSIS_APP_COUNT,
  diagnosisHref,
  isLineInAppBrowser,
  normalizeCheckedIds,
  progressLabel,
  rankNextDiagnoses,
  withLineExternalParam,
} from "./diagnosisApps.ts";

const BANNED = ["無料", "必ず", "保証", "安全です"];
const FEAR = ["危険", "脅威", "感染", "攻撃", "不安", "最悪", "被害"];

const LINE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.0.0";

describe("診断アプリのレジストリ", () => {
  test("6件、確認日、公開中のURLだけ", () => {
    assert.equal(DIAGNOSIS_APP_COUNT, 6);
    assert.deepEqual(
      DIAGNOSIS_APPS.map((app) => app.id),
      ["ai-health", "web-health", "reverse-web", "malware", "review", "suggest"],
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
  });

  test("新しい文面に禁止語と不安をあおる語が無い", () => {
    for (const app of DIAGNOSIS_APPS) {
      const text = `${app.name}${app.value}${app.stores.map((store) => store.label).join("")}`;
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
      ["suggest", "web-health", "malware", "reverse-web", "ai-health"],
    );
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
      ["web-health", "malware", "suggest", "reverse-web", "ai-health"],
    );
  });

  test("検索候補に気になる語があるときは口コミ診断を先にする", () => {
    const risky = rankNextDiagnoses({ surface: "suggest", risk: "high" });
    assert.deepEqual(
      risky.map((app) => app.id),
      ["review", "malware", "web-health", "reverse-web", "ai-health"],
    );
    const calm = rankNextDiagnoses({ surface: "suggest", risk: "safe" });
    assert.equal(calm[0]?.id, "review");
    assert.equal(calm[1]?.id, "web-health");
    assert.equal(
      calm.some((app) => app.id === "suggest"),
      false,
    );
  });
});

describe("進捗の文言とLINEの外部ブラウザ", () => {
  test("6つのうちnつ、と未知のIDは数えない", () => {
    assert.equal(progressLabel(2), "6つのうち2つを確かめました");
    assert.equal(progressLabel(0), "6つのうち0つを確かめました");
    assert.equal(progressLabel(9), "6つのうち6つを確かめました");
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
