"use client";

import { useEffect, useRef, useState } from "react";
import type { AreaMapPin } from "@reviewcheck/core/areaMap";
import { loadGoogleMaps, onGoogleMapsAuthFailure } from "@/lib/googleMaps";

/**
 * 診断店と競合を Google 公式の地図に出す。
 * キーが無い、または読み込めないときは何も出さない。呼び出し側の一覧が残る。
 * OpenStreetMap や Leaflet は使わない。ロゴや出典は地図の外にかぶせない。
 */
export function AreaGoogleMap({ pins }: { pins: AreaMapPin[] }) {
  const apiKey = browserMapsKey();
  const frameRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const pinKey = pins.map((pin) => `${pin.id}:${pin.lat}:${pin.lng}:${pin.mark}`).join("|");

  useEffect(() => onGoogleMapsAuthFailure(() => setFailed(true)), []);

  useEffect(() => {
    if (!apiKey || pins.length === 0) return;
    const frame = frameRef.current;
    if (!frame) return;
    let cancelled = false;
    setFailed(false);
    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !frameRef.current) return;
        drawMap(google, frameRef.current, pins);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // pinKey が同じならピンの中身も同じ。親の再描画で地図を作り直さない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, pinKey]);

  if (!apiKey || failed || pins.length === 0) return null;

  return (
    <div className="mt-4" data-area-map-frame="" data-google-map="js">
      <div
        ref={frameRef}
        data-area-map-canvas=""
        role="region"
        aria-label="診断したお店と周辺のお店のGoogleマップ"
        className="h-64 w-full rounded-xl border border-slate-200 text-base text-slate-800 sm:h-96"
      >
        地図を読み込んでいます
      </div>
      <p className="mt-2 text-base leading-relaxed text-slate-800" data-google-map-credit="">
        地図の出典{" "}
        <span translate="no" className="gmp-attribution">
          Google Maps
        </span>
      </p>
    </div>
  );
}

function browserMapsKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim();
  return key ? key : undefined;
}

function drawMap(
  google: NonNullable<Window["google"]>,
  element: HTMLElement,
  pins: AreaMapPin[],
) {
  const maps = google.maps;
  const subject = pins.find((pin) => pin.kind === "subject") ?? pins[0];
  const map = new maps.Map(element, {
    center: { lat: subject.lat, lng: subject.lng },
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    gestureHandling: "cooperative",
    clickableIcons: true,
  });
  const bounds = new maps.LatLngBounds();
  for (const pin of pins) {
    const position = { lat: pin.lat, lng: pin.lng };
    bounds.extend(position);
    const subjectPin = pin.kind === "subject";
    // Advanced Marker は Map ID が要る。地図 ID の透かしを出さないため、従来の Marker を使う。
    const marker = new maps.Marker({
      map,
      position,
      title: pin.label,
      zIndex: subjectPin ? 2 : 1,
      label: {
        text: pin.mark,
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "700",
      },
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: subjectPin ? 16 : 13,
        fillColor: subjectPin ? "#b91c1c" : "#1d4ed8",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
    const content = document.createElement("p");
    content.textContent = pin.label;
    content.style.margin = "0";
    content.style.fontSize = "14px";
    content.style.lineHeight = "1.5";
    content.style.color = "#0f172a";
    const info = new maps.InfoWindow({ content });
    marker.addListener("click", () => {
      info.open({ map, anchor: marker });
    });
  }
  map.fitBounds(bounds, 48);
  maps.event.addListenerOnce(map, "idle", () => {
    const zoom = map.getZoom();
    if (typeof zoom === "number" && zoom > 14) map.setZoom(14);
  });
}
