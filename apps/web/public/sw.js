// 口コミチェック.jp - 簡易サービスワーカー（PWA）
// 診断結果はキャッシュせず、静的アセットのみ軽くキャッシュする。
const CACHE_NAME = "reviewcheck-v1";
const PRECACHE = ["/", "/check/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // APIや診断結果は常にネットワーク（キャッシュしない）
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/report/")) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // ナビゲーションはネットワーク優先、失敗時キャッシュ
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // それ以外はキャッシュ優先
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
