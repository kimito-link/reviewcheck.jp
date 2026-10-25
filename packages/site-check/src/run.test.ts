import { describe, expect, it } from "vitest";
import { isBlockedSiteHost, runSiteCheck } from "./run";

function mockFetch(routes: Record<string, { status?: number; body?: string; location?: string; headers?: Record<string, string> }>) {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if ((init?.method ?? "GET") !== "GET") throw new Error("GET 以外");
    const hit = routes[url];
    if (!hit) return new Response("missing", { status: 404 });
    const headers = new Headers(hit.headers ?? { "content-type": "text/html" });
    if (hit.location) headers.set("location", hit.location);
    return new Response(hit.body ?? "", { status: hit.status ?? 200, headers });
  };
  return { fetchImpl, calls };
}

describe("runSiteCheck", () => {
  it("内部の宛先へは送らない", async () => {
    expect(isBlockedSiteHost("127.0.0.1")).toBe(true);
    let called = false;
    const report = await runSiteCheck("http://127.0.0.1/", {
      fetch: async () => {
        called = true;
        return new Response("no");
      },
      lookupTxt: async () => null,
    });
    expect(called).toBe(false);
    expect(report.items.find((item) => item.id === "https")?.status).toBe("unknown");
  });

  it("公開ファイルの中身と利用者名を結果に残さない", async () => {
    const html = `<!doctype html><html><head><meta name="generator" content="WordPress 6.4.2"></head>
      <body><script src="https://cdn.example/jquery-1.12.4.min.js"></script></body></html>`;
    const { fetchImpl, calls } = mockFetch({
      "https://shop.example/": {
        status: 200,
        body: html,
        headers: {
          "content-type": "text/html",
          server: "nginx/1.18.0",
          "strict-transport-security": "max-age=15552000",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "permissions-policy": "camera=()",
          "content-security-policy": "default-src 'self'",
          "x-frame-options": "SAMEORIGIN",
        },
      },
      "http://shop.example/": { status: 301, location: "https://shop.example/" },
      "https://shop.example/.env": { status: 200, body: "DB_PASSWORD=super-secret-value\n" },
      "https://shop.example/.git/HEAD": { status: 404 },
      "https://shop.example/backup.sql": { status: 404 },
      "https://shop.example/wp-config.php.bak": { status: 404 },
      "https://shop.example/feed/": { status: 200, body: "<rss><channel><generator>https://wordpress.org/?v=6.4.2</generator></channel></rss>" },
      "https://shop.example/?author=1": { status: 301, location: "https://shop.example/author/admin/" },
      "https://shop.example/wp-content/uploads/": { status: 200, body: "<title>Index of /wp-content/uploads/</title>" },
      "https://shop.example/readme.html": { status: 200, body: "WordPress" },
      "https://shop.example/wp-json/wp/v2/users": { status: 200, body: '[{"slug":"admin"}]', headers: { "content-type": "application/json" } },
      "https://shop.example/xmlrpc.php": { status: 405, body: "XML-RPC server accepts POST requests only" },
    });
    const report = await runSiteCheck("https://shop.example/", {
      fetch: fetchImpl,
      gapMs: 0,
      certNotAfter: "2020-01-01T00:00:00.000Z",
      now: new Date("2026-10-25T00:00:00.000Z"),
      lookupTxt: async (name) => (name.startsWith("_dmarc.") ? ["v=DMARC1; p=none"] : ["v=spf1 -all"]),
    });
    const dumped = JSON.stringify(report);
    expect(dumped).not.toContain("super-secret-value");
    expect(dumped).not.toContain("author/admin");
    expect(calls.every((line) => line.startsWith("GET "))).toBe(true);
    expect(report.target).toBe("https://shop.example");
    expect(report.items.find((item) => item.id === "exposed-files")?.status).toBe("action");
    expect(report.items.find((item) => item.id === "https-redirect")?.status).toBe("ok");
    expect(report.items.find((item) => item.id === "cert-expiry")?.status).toBe("action");
    expect(report.items.find((item) => item.id === "wp-users-author")?.status).toBe("action");
    expect(report.items.find((item) => item.id === "wp-users-rest")?.status).toBe("action");
    expect(report.items.find((item) => item.id === "dir-uploads")?.status).toBe("action");
    expect(report.items.find((item) => item.id === "wp-feed")?.status).toBe("caution");
    expect(report.items.find((item) => item.id === "js-libs")?.status).toBe("caution");
    expect(report.items.find((item) => item.id === "version-headers")?.status).toBe("caution");
    expect(report.items.find((item) => item.id === "spf")?.status).toBe("ok");
    expect(report.items.find((item) => item.id === "dmarc")?.status).toBe("caution");
    expect(report.items.find((item) => item.id === "header-frame")?.status).toBe("ok");
  });
});
