export {};

interface GoogleMap {
  fitBounds: (bounds: GoogleLatLngBounds, padding?: number) => void;
  getZoom: () => number | undefined;
  setZoom: (zoom: number) => void;
}

interface GoogleMarker {
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleInfoWindow {
  open: (options: { map: GoogleMap; anchor: GoogleMarker }) => void;
}

interface GoogleLatLngBounds {
  extend: (point: { lat: number; lng: number }) => void;
}

interface GoogleMapsNamespace {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: Record<string, unknown>) => GoogleMarker;
  InfoWindow: new (options: { content: HTMLElement }) => GoogleInfoWindow;
  LatLngBounds: new () => GoogleLatLngBounds;
  SymbolPath: { CIRCLE: number };
  event: {
    addListenerOnce: (instance: object, eventName: string, handler: () => void) => void;
  };
}

declare global {
  interface Window {
    google?: { maps: GoogleMapsNamespace };
    /** Maps JavaScript API がキーやリファラーを拒んだときに呼ぶ。 */
    gm_authFailure?: () => void;
    __reviewcheckMapsAuthHook?: boolean;
  }
}
