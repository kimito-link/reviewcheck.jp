import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { DIAGNOSIS_APPS } from "@reviewcheck/core";

const extensionDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../chrome-extension",
);

describe("Chrome拡張のほかの診断", () => {
  test("ポップアップに自アプリ以外の公式URLがあり、版は上げない", () => {
    const popup = readFileSync(path.join(extensionDir, "popup.html"), "utf8");
    const manifest = JSON.parse(
      readFileSync(path.join(extensionDir, "manifest.json"), "utf8"),
    ) as { version: string };
    expect(manifest.version).toBe("0.1.0");

    const section = popup.match(
      /<section class="other-dx"[\s\S]*?<\/section>/,
    )?.[0];
    expect(section).toBeTruthy();
    expect(section).toContain("ほかの診断");
    expect(section ?? "").not.toMatch(/無料|必ず|保証|安全です/);
    for (const app of DIAGNOSIS_APPS) {
      if (app.id === "review") {
        expect(section).not.toContain(`href="${app.webUrl}"`);
        expect(section).not.toContain(app.stores[0]?.url);
        continue;
      }
      expect(section).toContain(`href="${app.webUrl}"`);
      expect(section).toContain(app.name);
      expect(section).toContain(app.value);
    }
  });
});