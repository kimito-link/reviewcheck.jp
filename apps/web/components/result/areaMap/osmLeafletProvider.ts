import type { AreaMapPin } from "@reviewcheck/core/areaMap";
import type { AreaMapProvider } from "./types";

/**
 * 既定の地図。Leaflet + OpenStreetMap タイル。
 *
 * 選んだ理由:
 * - リポジトリにあるのはサーバー専用の Places API キーだけで、
 *   Maps JavaScript API のキーも「1表示ごとの課金」の契約も無い。
 * - タイルは閲覧のたびに当社へ請求されない。キーも要らない。
 * - プロバイダはこのファイルだけ。別のタイルへ替えるとき、画面側は触らない。
 *
 * OSM のタイル利用方針: 帰属を出す、結果1件につき地図1枚、画面に入ってから読む。
 * 公開タイルは大量配信向けではない。読めないときは画面の一覧が正で、ここは落ちてよい。
 * このモジュールはクライアントの遅延読み込み専用。サーバーからは import しない。
 */
export const osmLeafletProvider: AreaMapProvider = {
  id: "osm-leaflet",
  async mount(container, pins) {
    if (pins.length === 0) {
      throw new Error("地図に出せる座標がありません");
    }
    const leaflet = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    const L = (leaflet.default ?? leaflet) as typeof import("leaflet");

    container.replaceChildren();
    const map = L.map(container, {
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true,
      minZoom: 4,
      maxZoom: 18,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const bounds = L.latLngBounds(
      pins.map((pin) => L.latLng(pin.lat, pin.lng)),
    );
    for (const pin of pins) {
      const marker = L.marker(L.latLng(pin.lat, pin.lng), {
        icon: iconFor(L, pin),
        keyboard: true,
        alt: pin.label,
        title: pin.label,
        zIndexOffset: pin.kind === "subject" ? 1000 : 0,
      });
      marker.bindPopup(escapeHtml(pin.label), {
        className: "area-map-popup",
      });
      marker.addTo(map);
    }

    const samePoint = bounds.getNorthEast().equals(bounds.getSouthWest());
    if (samePoint) {
      map.setView(bounds.getCenter(), 16);
    } else {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
    }
    container.setAttribute("role", "region");
    container.setAttribute(
      "aria-label",
      "このエリアの地図。ひし形の自が診断したお店、丸の数字は口コミ数の順位です。",
    );

    const onResize = () => map.invalidateSize();
    const resize =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(onResize);
    resize?.observe(container);
    requestAnimationFrame(onResize);

    return () => {
      resize?.disconnect();
      map.remove();
    };
  },
};

function iconFor(
  L: typeof import("leaflet"),
  pin: AreaMapPin,
): import("leaflet").DivIcon {
  const subject = pin.kind === "subject";
  const mark = subject ? "自" : pin.mark.replace(/[^\d]/g, "").slice(0, 2);
  const html = subject
    ? `<div style="${pinBox}transform:rotate(45deg);border-radius:4px;background:#0f172a;border:2px solid #0f172a;"><span style="transform:rotate(-45deg);color:#ffffff;font-size:16px;font-weight:700;line-height:1;">自</span></div>`
    : `<div style="${pinBox}border-radius:999px;background:#ffffff;color:#0f172a;border:2px solid #0f172a;font-size:16px;font-weight:700;line-height:1;">${mark}</div>`;
  return L.divIcon({
    className: "area-map-pin",
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const pinBox =
  "width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
