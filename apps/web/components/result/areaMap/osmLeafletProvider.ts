import type { AreaMapPin } from "@reviewcheck/core/areaMap";
import {
  connectorSegment,
  mapLabelHtml,
  placeMapLabels,
  type MapPoint,
} from "./labelLayout";
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
    const markers = pins.map((pin) => {
      const marker = L.marker(L.latLng(pin.lat, pin.lng), {
        icon: iconFor(L, pin),
        keyboard: true,
        alt: pin.label,
        title: pin.label,
        zIndexOffset: pin.kind === "subject" ? 1000 : 0,
      });
      marker.bindTooltip(mapLabelHtml(pin), {
        permanent: true,
        direction: "right",
        offset: [22, 0],
        opacity: 1,
        interactive: false,
        className:
          pin.kind === "subject"
            ? "area-map-label area-map-label-subject"
            : "area-map-label",
      });
      marker.addTo(map);
      return marker;
    });
    const connectors = pins.map((pin) =>
      L.polyline([], {
        color: "#0f172a",
        weight: pin.kind === "subject" ? 3 : 2,
        opacity: 0.9,
        interactive: false,
      }).addTo(map),
    );

    const samePoint = bounds.getNorthEast().equals(bounds.getSouthWest());
    const fit = () => {
      if (samePoint) {
        map.setView(bounds.getCenter(), 15);
        return;
      }
      const size = map.getSize();
      const narrow = size.x > 0 && size.x < 520;
      map.fitBounds(bounds, narrow
        ? {
            paddingTopLeft: [12, 16],
            paddingBottomRight: [156, 40],
            maxZoom: 16,
          }
        : {
            paddingTopLeft: [64, 28],
            paddingBottomRight: [28, 36],
            maxZoom: 16,
          });
    };
    fit();
    const layoutLabels = () => {
      const size = map.getSize();
      if (size.x < 40 || size.y < 40) return;
      const narrow = size.x < 520;
      const labelWidth = narrow ? "8.75rem" : "14rem";
      for (const marker of markers) {
        const el = marker.getTooltip()?.getElement();
        if (!el) continue;
        el.style.width = labelWidth;
        el.style.maxWidth = labelWidth;
      }
      const points: MapPoint[] = markers.map((marker, index) => {
        const point = map.latLngToContainerPoint(marker.getLatLng());
        return {
          x: point.x,
          y: point.y,
          subject: pins[index]?.kind === "subject",
        };
      });
      const labelSizes = markers.map((marker) => {
        const el = marker.getTooltip()?.getElement();
        return {
          w: el?.offsetWidth || (narrow ? 148 : 200),
          h: el?.offsetHeight || 56,
        };
      });
      const placed = placeMapLabels({
        points,
        labelSizes,
        map: { w: size.x, h: size.y },
      });
      markers.forEach((marker, index) => {
        const tip = marker.getTooltip();
        const spot = placed[index];
        if (!tip || !spot) return;
        tip.options.direction = spot.direction;
        tip.options.offset = L.point(spot.offset[0], spot.offset[1]);
        tip.update();
        keepLabelInside(container, tip, L);
        const segment = connectorSegment(points[index]!, spot.box);
        const line = connectors[index];
        if (!line) return;
        if (!segment) {
          line.setLatLngs([]);
          return;
        }
        line.setLatLngs([
          map.containerPointToLatLng(L.point(segment.from.x, segment.from.y)),
          map.containerPointToLatLng(L.point(segment.to.x, segment.to.y)),
        ]);
      });
    };
    container.setAttribute("role", "region");
    container.setAttribute(
      "aria-label",
      "このエリアの地図。各ピンのそばに店名・星・口コミ数・順位を表示しています。ひし形の自が診断したお店です。",
    );

    const onResize = () => {
      map.invalidateSize();
      fit();
      layoutLabels();
    };
    const resize =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(onResize);
    resize?.observe(container);
    requestAnimationFrame(() => {
      layoutLabels();
      requestAnimationFrame(layoutLabels);
    });

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

/** 計算位置と実際の描画がずれて端で切れるとき、枠の内側へ戻す。 */
function keepLabelInside(
  container: HTMLElement,
  tip: import("leaflet").Tooltip,
  L: typeof import("leaflet"),
) {
  const el = tip.getElement();
  if (!el) return;
  const frame = container.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  let dx = 0;
  let dy = 0;
  const margin = 4;
  if (box.left < frame.left + margin) dx += frame.left + margin - box.left;
  if (box.right > frame.right - margin) dx += frame.right - margin - box.right;
  if (box.top < frame.top + margin) dy += frame.top + margin - box.top;
  if (box.bottom > frame.bottom - margin) dy += frame.bottom - margin - box.bottom;
  if (dx === 0 && dy === 0) return;
  const current = L.point(tip.options.offset ?? [0, 0]);
  tip.options.offset = L.point(current.x + dx, current.y + dy);
  tip.update();
}
