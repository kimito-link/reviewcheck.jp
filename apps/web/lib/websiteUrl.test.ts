import { describe, expect, test } from "vitest";
import { checkStoreWebsite } from "./siteCheck";
import { usableWebsite } from "./websiteUrl";

describe("usableWebsite", () => {
  test("空と http 以外は載せる対象にしない", () => {
    expect(usableWebsite("")).toBeNull();
    expect(usableWebsite("   ")).toBeNull();
    expect(usableWebsite(undefined)).toBeNull();
    expect(usableWebsite("ftp://shop.example/")).toBeNull();
    expect(usableWebsite("https://user:pass@shop.example/")).toBeNull();
    expect(usableWebsite("お店の名前")).toBeNull();
  });

  test("スキームの無いホスト名は https にする", () => {
    expect(usableWebsite("shop.example")).toBe("https://shop.example/");
    expect(usableWebsite(" http://shop.example/menu ")).toBe("http://shop.example/menu");
  });
});

describe("checkStoreWebsite", () => {
  test("ウェブサイトが無いときはチェックしない", async () => {
    expect(await checkStoreWebsite("")).toBeNull();
    expect(await checkStoreWebsite("ftp://shop.example/")).toBeNull();
  });

  test("画面確認用は正本の採点を通信なしで返す", async () => {
    const previous = process.env.SITE_CHECK_MOCK;
    process.env.SITE_CHECK_MOCK = "1";
    try {
      const report = await checkStoreWebsite("https://shop.example/");
      expect(report?.rubric).toBe("site-check v1.0");
      expect(report?.score).toBe(71);
      expect(report?.counts).toEqual({ action: 1, caution: 5, ok: 10, unknown: 0, na: 6 });
    } finally {
      if (previous === undefined) delete process.env.SITE_CHECK_MOCK;
      else process.env.SITE_CHECK_MOCK = previous;
    }
  });
});
