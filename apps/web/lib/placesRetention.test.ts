import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Google の内容を保存し直さない", () => {
  test("診断と現在地は、古いキャッシュを読み書きしない", () => {
    const diagnose = source("app/api/diagnose/route.ts");
    const nearby = source("app/api/nearby/route.ts");
    for (const text of [diagnose, nearby]) {
      expect(text).not.toMatch(/cacheGet|cacheSet/);
      expect(text).not.toMatch(/analyzeReviews|publishCohort/);
    }
    expect(diagnose).toMatch(/読みません|読まない/);
    expect(diagnose).toMatch(/places\.id|areaScopeText/);
    expect(diagnose).not.toMatch(/reviews/);
  });

  test("共有の画像とプレビュー経路は Places を呼ばない", () => {
    const image = source("app/report/[id]/opengraph-image.tsx");
    const page = source("app/report/[id]/page.tsx");
    expect(image).not.toMatch(/fetchStore|places\.googleapis|decodeReportId|diagnose\(/);
    expect(page).not.toMatch(/decodeReportId|publishCohort/);
    expect(page).toMatch(/isPreviewRequest/);
    expect(page).toMatch(/loadSharedPlace/);
  });

  test("監視は認可のあと Places を呼ばず、0件で返す", () => {
    for (const path of [
      "app/api/monitor/run/route.ts",
      "app/api/monitor/monthly-report/route.ts",
    ]) {
      const text = source(path);
      expect(text).not.toMatch(/runAllMonitors|fetchStore|createReviewcheckScanner/);
      expect(text).toMatch(/MONITOR_PLACES_PAUSED/);
    }
  });

  test("画面の実装に OpenStreetMap を戻さない", () => {
    const area = source("components/result/AreaCompare.tsx");
    const credit = source("components/result/GoogleMapsCredit.tsx");
    const report = source("components/ReportView.tsx");
    expect(area).not.toMatch(/leaflet|openstreetmap/i);
    expect(report).not.toMatch(/leaflet|openstreetmap/i);
    expect(area).toMatch(/GoogleMapsCredit/);
    expect(credit).toMatch(/Google Maps/);
    expect(report).toMatch(/エリア全体の順位ではありません/);
  });
});
