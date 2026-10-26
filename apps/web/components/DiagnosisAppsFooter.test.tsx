import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DIAGNOSIS_APPS } from "@reviewcheck/core";
import { Footer } from "./Footer";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => <span>{props.alt}</span>,
}));

const LINE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Line/14.0.0";

describe("フッターの公開中診断", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("全診断と公開中バッジを出し、評価数は出さない", () => {
    render(<Footer />);
    const block = document.querySelector("[data-diagnosis-apps]");
    expect(block).toBeTruthy();
    const text = block?.textContent ?? "";
    for (const app of DIAGNOSIS_APPS) {
      expect(text).toContain(app.name);
      expect(text).toContain(app.value);
    }
    expect(text).toContain("公開中 Web");
    expect(text).toContain("公開中 App Store");
    expect(text).toContain("公開中 Google Play");
    expect(text).toContain("公開中 Chrome ウェブストア");
    expect(text).not.toMatch(/無料|必ず|保証|安全です|ダウンロード|★|星[0-9]|件の評価/);

    const hrefs = [...(block?.querySelectorAll("a") ?? [])].map((anchor) =>
      anchor.getAttribute("href"),
    );
    expect(hrefs).toContain("https://apps.apple.com/jp/app/id6779860644");
    expect(hrefs).toContain(
      "https://play.google.com/store/apps/details?id=com.reversehack.malwarecheck",
    );
    expect(hrefs).toContain(
      "https://chromewebstore.google.com/detail/befoihdhopfaaodibepoblcejekffnhk",
    );
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/suggest-check/");
    expect(hrefs.some((href) => href?.includes("utm_") || href?.includes("ref="))).toBe(false);
    for (const anchor of block?.querySelectorAll("a") ?? []) {
      expect(anchor.className).toContain("underline");
    }
    const appStoreBadges = [...(block?.querySelectorAll("a") ?? [])].filter((anchor) =>
      anchor.textContent?.includes("公開中 App Store"),
    );
    expect(appStoreBadges).toHaveLength(2);
  });

  test("LINEアプリ内ブラウザでは外部リンクだけ openExternalBrowser=1 を足す", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(LINE_UA);
    render(<Footer />);
    await waitFor(() => {
      const block = document.querySelector("[data-diagnosis-apps]");
      const hrefs = [...(block?.querySelectorAll("a") ?? [])].map((anchor) =>
        anchor.getAttribute("href"),
      );
      expect(hrefs).toContain(
        "https://apps.apple.com/jp/app/id6779860644?openExternalBrowser=1",
      );
      expect(hrefs).toContain(
        "https://play.google.com/store/apps/details?id=com.kimito.link.webhealthcheck&openExternalBrowser=1",
      );
      expect(hrefs).toContain("/suggest-check/");
      expect(hrefs).not.toContain("/suggest-check/?openExternalBrowser=1");
    });
  });

  test("embed=1 では診断一覧を出さない", async () => {
    window.history.pushState(null, "", "/review-tool/?embed=1");
    render(<Footer />);
    await waitFor(() => {
      expect(document.querySelector("[data-diagnosis-apps]")).toBeNull();
    });
  });
});
