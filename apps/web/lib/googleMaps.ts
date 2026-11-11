/**
 * Maps JavaScript API を1回だけ読む。
 * キーは NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY（ブラウザ専用・リファラー制限）。
 * サーバー用の Places キーはここに渡さない。
 */

const SCRIPT_ID = "reviewcheck-google-maps";

let pending: Promise<NonNullable<Window["google"]>> | null = null;
const authListeners = new Set<() => void>();

function ensureAuthHook(): void {
  if (window.__reviewcheckMapsAuthHook) return;
  window.__reviewcheckMapsAuthHook = true;
  const previous = window.gm_authFailure;
  window.gm_authFailure = () => {
    previous?.();
    for (const listener of authListeners) listener();
  };
}

/** キーの制限で地図を出せないとき、一覧だけを残すために使う。 */
export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  if (typeof window !== "undefined") ensureAuthHook();
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function loadGoogleMaps(apiKey: string): Promise<NonNullable<Window["google"]>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("browser"));
  }
  ensureAuthHook();
  if (window.google?.maps?.Map && window.google.maps.Marker) {
    return Promise.resolve(window.google);
  }
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.maps?.Map && window.google.maps.Marker) {
        resolve(window.google);
        return;
      }
      pending = null;
      reject(new Error("maps"));
    };
    const fail = () => {
      pending = null;
      reject(new Error("maps"));
    };
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", finish);
      existing.addEventListener("error", fail);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.referrerPolicy = "origin";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=ja&region=JP&v=weekly`;
    script.addEventListener("load", finish);
    script.addEventListener("error", fail);
    document.head.appendChild(script);
  });
  return pending;
}
