declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(mapDiv: Element, opts?: MapOptions);

        fitBounds(bounds: LatLngBounds): void;
      }
      class Marker {
        constructor(opts?: MarkerOptions);

        setMap(map: Map | null): void;

        addListener(event: string, handler: Function): void;
      }
      class InfoWindow {
        constructor(opts?: InfoWindowOptions);

        open(map?: Map, anchor?: MVCObject): void;
      }
      class LatLngBounds {
        extend(point: LatLng): void;
      }
      interface MapOptions {
        center?: LatLng;
        zoom?: number;
        styles?: MapTypeStyle[];
      }
      interface MarkerOptions {
        position?: LatLng;
        map?: Map;
        title?: string;
        icon?: Symbol;
      }
      interface InfoWindowOptions {
        content?: string;
      }
      interface LatLng {
        lat: number;
        lng: number;
      }
      interface MapTypeStyle {
        featureType?: string;
        elementType?: string;
        stylers?: { [key: string]: any }[];
      }
      interface Symbol {
        path: SymbolPath;
        scale: number;
        fillColor: string;
        fillOpacity: number;
        strokeColor: string;
        strokeWeight: number;
      }
      enum SymbolPath {
        CIRCLE,
      }
      class MVCObject {}
    }
  }
}
