import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { encodeReportId as coreEncode } from "@reviewcheck/core";
import {
  buildExtensionShareText,
  domainOf,
  encodeReportId as extensionEncode,
  mergeCheckEntry,
  queryFromManual,
  queryFromTab,
  recheckCopy,
  storageTargetKey,
} from "../../chrome-extension/personal.js";

const extensionDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../chrome-extension",
);

const PACKAGED = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "personal.js",
  "config.js",
  "background.js",
  "_locales/ja/messages.json",
  "README.md",
  "STORE-LISTING.md",
];

const BANNED: { label: string; pattern: RegExp }[] = [
  { label: "有料", pattern: /有料/ },
  { label: "料金", pattern: /料金/ },
  { label: "プラン", pattern: /プラン/ },
  { label: "相談", pattern: /相談/ },
  { label: "紹介", pattern: /紹介/ },
  { label: "LINE", pattern: /LINE/ },
  { label: "lin.ee", pattern: /lin\.ee/i },
  { label: "line.me", pattern: /line\.me/i },
  { label: "無料", pattern: /無料/ },
  { label: "必ず", pattern: /必ず/ },
  { label: "保証", pattern: /保証/ },
];

describe("Chrome拡張は自分用の文言だけ", () => {
  test("有料・LINE・紹介などの文言が無く、版も権限も増やしすぎない", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(extensionDir, "manifest.json"), "utf8"),
    ) as {
      version: string;
      permissions?: string[];
      host_permissions?: string[];
      options_page?: string;
      options_ui?: unknown;
    };
    const pkg = JSON.parse(
      readFileSync(path.join(extensionDir, "package.json"), "utf8"),
    ) as { version: string };

    expect(manifest.version).toBe("0.1.0");
    expect(pkg.version).toBe("0.1.0");
    expect([...(manifest.permissions ?? [])].sort()).toEqual([
      "activeTab",
      "storage",
    ]);
    expect(manifest.host_permissions).toEqual(["https://reviewcheck.jp/*"]);
    expect(manifest.options_page).toBeUndefined();
    expect(manifest.options_ui).toBeUndefined();

    for (const file of PACKAGED) {
      const text = readFileSync(path.join(extensionDir, file), "utf8");
      for (const banned of BANNED) {
        expect(text, `${file} に「${banned.label}」`).not.toMatch(banned.pattern);
      }
    }
  });
});

describe("拡張の点検日と診断対象", () => {
  test("前回日時と、1か月後の月日を出す", () => {
    const copy = recheckCopy("2026-10-27T01:06:00.000Z");
    expect(copy?.previous).toBe("前回の点検：2026年10月27日 10:06");
    expect(copy?.next).toBe("次の点検の目安：11月27日（1か月後）");

    const monthEnd = recheckCopy("2026-01-31T00:00:00.000Z");
    expect(monthEnd?.next).toBe("次の点検の目安：2月28日（1か月後）");
  });

  test("マップはURL、それ以外はホスト名。共有文に禁止語を入れない", () => {
    expect(domainOf("https://www.example.co.jp/menu")).toBe("example.co.jp");
    expect(queryFromTab("https://www.google.com/maps/place/test")).toEqual({
      mapsUrl: "https://www.google.com/maps/place/test",
    });
    expect(queryFromTab("https://www.example.co.jp/menu")).toEqual({
      text: "example.co.jp",
    });
    expect(queryFromManual("渋谷の食堂")).toEqual({ text: "渋谷の食堂" });
    expect(
      storageTargetKey("https://example.co.jp", "https://maps.app.goo.gl/abc"),
    ).toBe("maps:https://maps.app.goo.gl/abc");

    const text = buildExtensionShareText({
      score: 45,
      storeName: "テスト食堂",
      points: ["口コミが少ない", "返信が無い"],
    });
    expect(text.startsWith("選ばれやすさ 45点（目安）｜テスト食堂")).toBe(true);
    expect(text).toContain("・口コミが少ない");
    expect(text).not.toMatch(/無料|必ず|保証/);
  });

  test("結果URLのIDはWeb版と同じ", () => {
    const input = {
      store: {
        name: "テスト食堂",
        rating: 4,
        reviewCount: 45,
        source: "manual" as const,
      },
      competitors: [],
      diagnosedAt: "2026-10-27T01:06:00.000Z",
      ruleVersion: "1.0",
    };
    expect(extensionEncode(input)).toBe(coreEncode(input));
  });

  test("保存は新しい30件まで", () => {
    const existing: Record<string, { diagnosedAt: string }> = {};
    for (let i = 0; i < 30; i += 1) {
      existing[`k${i}`] = { diagnosedAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` };
    }
    const next = mergeCheckEntry(existing, "new", {
      diagnosedAt: "2026-10-27T01:06:00.000Z",
    });
    expect(Object.keys(next)).toHaveLength(30);
    expect(next.new.diagnosedAt).toBe("2026-10-27T01:06:00.000Z");
    expect(next.k0).toBeUndefined();
  });
});
