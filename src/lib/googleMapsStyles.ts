/**
 * Official Google Maps Night Mode Style Array & URL Styler Encoder
 * Source: https://developers.google.com/maps/documentation/javascript/examples/style-array#maps_style_array-typescript
 */

export interface GoogleMapStyleRule {
  featureType?: string;
  elementType?: string;
  stylers: Array<Record<string, string | number | boolean>>;
}

/**
 * Official Google Maps JavaScript API Night Mode Style Array
 */
export const GOOGLE_MAPS_NIGHT_MODE_STYLES: GoogleMapStyleRule[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

const STYLEPARSE_TYPES: Record<string, string> = {
  all: "0",
  administrative: "1",
  "administrative.country": "17",
  "administrative.land_parcel": "21",
  "administrative.locality": "19",
  "administrative.neighborhood": "20",
  "administrative.province": "18",
  landscape: "5",
  "landscape.man_made": "81",
  "landscape.natural": "82",
  poi: "2",
  "poi.attraction": "37",
  "poi.business": "33",
  "poi.government": "34",
  "poi.medical": "36",
  "poi.park": "40",
  "poi.place_of_worship": "38",
  "poi.school": "35",
  "poi.sports_complex": "39",
  road: "3",
  "road.arterial": "50",
  "road.highway": "49",
  "road.local": "51",
  transit: "4",
  "transit.line": "65",
  "transit.station": "66",
  water: "6",
};

const STYLEPARSE_ELEMENTS: Record<string, string> = {
  all: "a",
  geometry: "g",
  "geometry.fill": "g.f",
  "geometry.stroke": "g.s",
  labels: "l",
  "labels.icon": "l.i",
  "labels.text": "l.t",
  "labels.text.fill": "l.t.f",
  "labels.text.stroke": "l.t.s",
};

const STYLEPARSE_STYLERS: Record<string, string> = {
  color: "p.c",
  gamma: "p.g",
  hue: "p.h",
  invert_lightness: "p.il",
  lightness: "p.l",
  saturation: "p.s",
  visibility: "p.v",
  weight: "p.w",
};

/**
 * Encodes a Google Maps style array into the URL `apistyle` parameter format
 * accepted by Google's raster tile endpoint (mt.google.com/vt).
 */
export function encodeGoogleMapStyles(styles: GoogleMapStyleRule[]): string {
  let ret = "";

  styles.forEach((style) => {
    if (style.featureType && STYLEPARSE_TYPES[style.featureType]) {
      ret += "s.t:" + STYLEPARSE_TYPES[style.featureType] + "|";
    }

    if (style.elementType && STYLEPARSE_ELEMENTS[style.elementType]) {
      ret += "s.e:" + STYLEPARSE_ELEMENTS[style.elementType] + "|";
    }

    style.stylers.forEach((styler) => {
      for (const k in styler) {
        if (STYLEPARSE_STYLERS[k]) {
          let val = String(styler[k]);
          if (k === "color" && val.length === 7 && val.startsWith("#")) {
            val = "#ff" + val.slice(1);
          }
          ret += STYLEPARSE_STYLERS[k] + ":" + val + "|";
        }
      }
    });

    if (ret.endsWith("|")) {
      ret = ret.slice(0, -1);
    }
    ret += ",";
  });

  if (ret.endsWith(",")) {
    ret = ret.slice(0, -1);
  }

  return encodeURIComponent(ret);
}

/**
 * Pre-encoded official Google Maps Night Mode apistyle parameter string.
 */
export const GOOGLE_MAPS_NIGHT_MODE_APISTYLE = encodeGoogleMapStyles(GOOGLE_MAPS_NIGHT_MODE_STYLES);
