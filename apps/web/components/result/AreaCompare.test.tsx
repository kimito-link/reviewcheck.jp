import { describe, expect, test, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { buildAreaComparison, type AreaComparison } from "@reviewcheck/core/areaMap";
import type { Competitor, StoreInput } from "@reviewcheck/core";
import { AreaCompare } from "./AreaCompare";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

const store: StoreInput = {
  name: "テスト食堂",
  rating: 4,
  reviewCount: 45,
  lat: 36.06,
  lng: 138.05,
  mapsUrl: "https://maps.google.com/?q=subject",
};

const peers: Competitor[] = [
  { name: "競合A", rating: 4.7, reviewCount: 320, lat: 36.07, lng: 138.05, mapsUrl: "https://maps.google.com/?q=a" },
  { name: "競合B", rating: 4.6, reviewCount: 210 },
];

function areaOf(nextStore: StoreInput = store, nextPeers: Competitor[] = peers): AreaComparison {
  const area = buildAreaComparison(nextStore, nextPeers);
  if (!area) throw new Error("area");
  return area;
}

describe("エリアの比較", () => {
  test("座標がある店は高さ固定の地図と、距離つきの一覧になる", () => {
    window.history.pushState(null, "", "/check/");
    document.documentElement.removeAttribute("data-area-map");
    const { container } = render(<AreaCompare area={areaOf()} />);
    const section = container.querySelector("[data-result-section='area-map']");
    const frame = section?.querySelector("[data-area-map-frame]");
    expect(frame).toBeTruthy();
    expect(frame?.className).toContain("h-64");
    expect(frame?.className).toContain("sm:h-80");
    expect(frame?.getAttribute("data-area-map-state")).toBe("pending");
    expect(section?.textContent).toContain("テスト食堂");
    expect(section?.textContent).toContain("診断したお店");
    expect(section?.textContent).toContain("第3位");
    expect(section?.textContent).toContain("基準");
    expect(section?.textContent).toContain("未取得");
    expect(section?.textContent).toMatch(/km/);
    expect(section?.textContent).toContain("中央値は210件");
    expect(section?.textContent).toContain("あと165件");
    expect(section?.querySelector("a[href='#result-next-step']")).toBeTruthy();
    expect(section?.innerHTML ?? "").not.toMatch(/text-(xs|sm)\b/);
    expect(section?.innerHTML ?? "").toContain("underline");
    expect(section?.textContent ?? "").not.toMatch(/無料|必ず|保証|今すぐ|緊急/);
    expect(section?.innerHTML ?? "").not.toContain("#06C755");
  });

  test("座標が無ければ一覧だけを出し、地図の枠は確保しない", () => {
    const area = areaOf(
      { name: "テスト食堂", rating: 4, reviewCount: 45 },
      [{ name: "競合A", rating: 4.2, reviewCount: 80 }],
    );
    const { container } = render(<AreaCompare area={area} />);
    expect(container.querySelector("[data-area-map-frame]")).toBeNull();
    expect(container).toHaveTextContent("競合A");
    expect(container).toHaveTextContent("未取得");
    expect(container).toHaveTextContent("中央値は62.5件");
  });

  test("地図が落ちても、同じ高さの案内と一覧が残る", async () => {
    document.documentElement.dataset.areaMap = "fallback";
    const { container } = render(<AreaCompare area={areaOf()} />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("地図を表示できませんでした");
    });
    const frame = container.querySelector("[data-area-map-frame]");
    expect(frame?.className).toContain("h-64");
    expect(frame?.className).toContain("sm:h-80");
    expect(frame?.getAttribute("data-area-map-state")).toBe("fallback");
    expect(container.querySelector("[data-area-map-canvas]")).toBeNull();
    expect(container).toHaveTextContent("テスト食堂");
    expect(container).toHaveTextContent("競合A");
    expect(container).toHaveTextContent("OpenStreetMap contributors");
    document.documentElement.removeAttribute("data-area-map");
  });

  test("http 以外のURLはリンクにしない", () => {
    const area = areaOf(
      { ...store, mapsUrl: "javascript:alert(1)" },
      [
        {
          name: "競合A",
          rating: 4.7,
          reviewCount: 80,
          lat: 36.07,
          lng: 138.05,
          mapsUrl: "https://maps.google.com/?q=a",
        },
      ],
    );
    const { container } = render(<AreaCompare area={area} />);
    const links = screen.getAllByRole("link", { name: "Googleマップで開く" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("href") ?? "").toMatch(/^https:\/\//);
    }
    expect(container.innerHTML).not.toContain("javascript:");
  });

  test("embed=1 ではエリアのブロックを出さない", async () => {
    window.history.pushState(null, "", "/check/?embed=1");
    render(<AreaCompare area={areaOf()} />);
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "このエリアで比べたお店" }),
      ).not.toBeInTheDocument();
    });
    cleanup();
    window.history.pushState(null, "", "/check/");
  });
});
