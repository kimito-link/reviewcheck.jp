import { describe, expect, test } from "vitest";
import { lineConsultHref, sanitizeRefLine, withRefLine } from "./refLine";

describe("ref_line の許可リスト", () => {
  test("lin.ee と line.me の https だけ残す", () => {
    expect(sanitizeRefLine("https://lin.ee/from-friend")).toBe(
      "https://lin.ee/from-friend",
    );
    expect(sanitizeRefLine("https://line.me/R/ti/p/@example")).toBe(
      "https://line.me/R/ti/p/@example",
    );
    expect(sanitizeRefLine(" HTTPS://LIN.EE/AbC ")).toBe("https://lin.ee/AbC");
  });

  test("それ以外は無視する", () => {
    const rejected = [
      "",
      "   ",
      null,
      undefined,
      "http://lin.ee/abc",
      "https://lin.ee",
      "https://lin.ee/",
      "https://www.lin.ee/abc",
      "https://lin.ee.evil.com/abc",
      "https://evil.example/phish",
      "https://evil.example/?next=https://lin.ee/abc",
      "https://user:pass@lin.ee/abc",
      "https://lin.ee@evil.example/abc",
      "https://liff.line.me/123",
      "https://page.line.me/abc",
      "javascript:https://lin.ee/abc",
      "//lin.ee/abc",
      "https://lin.ee/abc\nhttps://evil.example",
      "https://lin.ee/abc\\@evil.example",
    ];
    for (const value of rejected) {
      expect(sanitizeRefLine(value)).toBeNull();
    }
  });

  test("共有URLには許可したものだけ載せ、取次店コードは足さない", () => {
    const page = "https://reviewcheck.jp/report/abc/";
    const shared = withRefLine(page, "https://lin.ee/from-friend");
    const params = new URL(shared).searchParams;
    expect(params.get("ref_line")).toBe("https://lin.ee/from-friend");
    expect([...params.keys()]).toEqual(["ref_line"]);

    expect(withRefLine(page, "https://evil.example/phish")).toBe(page);
    const stripped = withRefLine(
      "https://reviewcheck.jp/report/abc/?ref_line=https://evil.example/phish",
      null,
    );
    expect(new URL(stripped).searchParams.has("ref_line")).toBe(false);
  });

  test("UA に Line/ があるときだけ openExternalBrowser=1", () => {
    expect(lineConsultHref("https://lin.ee/abc", "Mozilla/5.0")).toBe(
      "https://lin.ee/abc",
    );
    expect(
      lineConsultHref("https://lin.ee/abc", "Mozilla/5.0 Line/14.0.0"),
    ).toBe("https://lin.ee/abc?openExternalBrowser=1");
    expect(
      lineConsultHref("https://lin.ee/abc?foo=1", "something Line/1"),
    ).toBe("https://lin.ee/abc?foo=1&openExternalBrowser=1");
    expect(lineConsultHref("https://evil.example", "Mozilla/5.0 Line/1")).toBe(
      null,
    );
  });
});
