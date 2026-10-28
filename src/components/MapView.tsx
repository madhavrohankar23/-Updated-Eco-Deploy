import DevBusRouteInspector from "./DevBusRouteInspector";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Tooltip,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useState, useMemo, useRef, memo, Fragment } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Journey } from "@/lib/routing";
import { allLines, busStops, metroStations } from "@/lib/routing";
import type { NearbyStop } from "@/lib/nearby";
import type { LiveBusRoute, LiveRouteTelemetry, LiveBusStop, NearbyLiveBusItem } from "@/lib/liveBus";
import { formatLiveEta } from "@/lib/liveBus";
import type { UberNearbyVehicle } from "@/lib/uberApi";
import { type NearbyPoiResult, type PoiCategory, calcDistanceM } from "@/lib/nagpurPlaces";
import { Clock, Navigation, Search, Loader2, RefreshCw, MapPin, Phone, Mail, ShieldAlert } from "lucide-react";
import RouteFlyThroughController from "./RouteFlyThroughController";
import type { FlyThroughState } from "./RouteFlyThroughHUD";
import { GOOGLE_MAPS_NIGHT_MODE_APISTYLE } from "@/lib/googleMapsStyles";
import { SafeCorridorsLayer, SafeCorridorFilterBar, type SafeCategoryFilter } from "./SafeCorridorsLayer";

/**
 * Nagpur Metropolitan Region Bounding Box
 * Restricts panning and zooming strictly to Greater Nagpur & suburbs:
 * [South-West: 20.80, 78.75] -> [North-East: 21.42, 79.40]
 */
export const NAGPUR_MAP_BOUNDS: L.LatLngBoundsLiteral = [
  [20.80, 78.75], // SW (Butibori, Hingna MIDC, MIHAN, Outer Ring Road)
  [21.42, 79.40], // NE (Koradi, Kamptee, Kanhan, Mauda, Pardi Octroi)
];

/** Outer buffer allowing gentle elastic pan before smoothly returning to center */
export const NAGPUR_OUTER_BOUNDS: L.LatLngBoundsLiteral = [
  [20.55, 78.45], // Outer SW buffer
  [21.65, 79.70], // Outer NE buffer
];

export const NAGPUR_CENTER: [number, number] = [21.1458, 79.0882];
export const NAGPUR_DEFAULT_ZOOM = 13;

// ⚙️ DEVELOPER SETTINGS / TOGGLES
export const ENABLE_DEV_BUS_ROUTE_INSPECTOR = false;

//⚙️ DEV LINE OF CODE: Bus Network Loading & Green Dots Configuration
export const DEV_SHOW_BUS_STOP_DOTS = false;

const MODE_COLOR: Record<string, string> = {
  walk: "#0284c7",  // Standard vibrant sky blue
  bus: "#0d9488",   // Classic transit teal
  metro: "#e07a1f", // fallback only
  drive: "#991b1b", // Dark Red for fallback driving route when no public transit available
};

/**
 * SafeMove Dedicated Color Palette: Emerald Guardian & Gold
 * Distinct, security-oriented high-visibility route lines
 */
const SAFE_MODE_COLOR = {
  walk: "#10b981",     // Bright Emerald Green (Safe Illuminated Arterial Walk)
  transfer: "#6366f1", // Luminous Indigo-Violet (Guarded Station Transfer)
  bus: "#047857",      // Deep Forest Jade (Primary Arterial Aapli Bus)
  metro: "#d97706",    // Warm Amber Gold (Guarded Metro viaduct fallback)
  drive: "#b45309",    // Guarded Amber-Brown (Safe patrolled road route)
} as const;

/**
 * Nagpur Metro brand colours per line name.
 * Standard: "Blue Line" → cyan-blue  |  "Orange Line" → deep orange
 */
const METRO_LINE_COLOR: Record<string, string> = {
  "Blue Line":   "#00aaff",
  "Orange Line": "#ff6a00",
};

/**
 * SafeMove Metro line colours:
 * "Blue Line" → Royal Sapphire Blue  |  "Orange Line" → Guarded Amber Gold
 */
const SAFE_METRO_LINE_COLOR: Record<string, string> = {
  "Blue Line":   "#2563eb", // Royal Sapphire Blue
  "Orange Line": "#d97706", // Guarded Amber Gold
};

/** Returns the correct colour for any line, automatically adapting when Safe Mode is active */
function lineColor(mode: string, name: string, isSafeMode = false): string {
  if (isSafeMode) {
    if (mode === "drive") return SAFE_MODE_COLOR["drive"] ?? "#b45309";
    if (mode === "metro") return SAFE_METRO_LINE_COLOR[name] ?? SAFE_MODE_COLOR["metro"] ?? "#d97706";
    if (mode === "bus") return SAFE_MODE_COLOR["bus"] ?? "#047857";
    return SAFE_MODE_COLOR["walk"] ?? "#10b981";
  }

  if (mode === "drive") return "#991b1b"; // Dark Red for fallback driving route
  if (mode === "metro") return METRO_LINE_COLOR[name] ?? MODE_COLOR["metro"] ?? "#e07a1f";
  if (mode === "bus") return MODE_COLOR["bus"] ?? "#0d9488";
  return MODE_COLOR["walk"] ?? "#0284c7";
}

function Fit({ journey, isFlyThroughActive }: { journey: Journey | null; isFlyThroughActive?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!journey || isFlyThroughActive) return;
    const pts = journey.legs.flatMap((l) => l.path.map((p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number]));
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40] });
  }, [journey, map, isFlyThroughActive]);
  return null;
}

/** Fits the camera bounds to the selected live bus route polyline */
function FitLiveRoute({ route }: { route: LiveBusRoute | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route || !route.polyline || route.polyline.length === 0) return;
    map.fitBounds(route.polyline, { padding: [60, 60], maxZoom: 15 });
  }, [route, map]);
  return null;
}

/** Smoothly centers on the selected stop in live bus tracking */
function FlyToLiveStop({ stop }: { stop: LiveBusStop | null }) {
  const map = useMap();
  useEffect(() => {
    if (!stop) return;
    map.flyTo([stop.lat, stop.lon], 16, { duration: 0.8 });
  }, [stop, map]);
  return null;
}

/** Smoothly flies to the position and adjusts zoom level to fit radius, ensuring it stays centered. */
function FlyToLocation({ pos, radiusM }: { pos: { lat: number; lon: number }; radiusM?: number }) {
  const map = useMap();

  useEffect(() => {
    let targetZoom = 15;
    if (radiusM) {
      if (radiusM >= 5000) targetZoom = 13.5;
      else if (radiusM >= 2500) targetZoom = 14.5;
      else targetZoom = 15.75;
    }

    // Always re-center strictly on [pos.lat, pos.lon] at exact targetZoom so coverage fits viewport perfectly
    map.flyTo([pos.lat, pos.lon], targetZoom, {
      duration: 0.5,
      easeLinearity: 0.25,
    });
  }, [pos.lat, pos.lon, radiusM, map]);
  return null;
}

/**
 * Smoothly animates the nearby coverage circle (purple dashed radius circle, glow ring,
 * and center dot marker) when changing coordinates (clicking from one location to another)
 * or when expanding/shrinking search radius.
 *
 * Direct Leaflet layer manipulation runs at native 60/120 FPS without causing React re-renders.
 */
function AnimatedNearbyCircle({
  anchor,
  radiusM,
}: {
  anchor: { lat: number; lon: number; name?: string };
  radiusM: number;
}) {
  const map = useMap();
  const currentPosRef = useRef<[number, number]>([anchor.lat, anchor.lon]);
  const currentRadiusRef = useRef<number>(radiusM);
  const animFrameRef = useRef<number | null>(null);

  // References to Leaflet layers
  const circleLayerRef = useRef<L.Circle | null>(null);
  const glowLayerRef = useRef<L.CircleMarker | null>(null);
  const dotLayerRef = useRef<L.CircleMarker | null>(null);

  // Initialize Leaflet layers once on mount
  useEffect(() => {
    const circle = L.circle([anchor.lat, anchor.lon], {
      radius: radiusM,
      color: "#7c3aed",
      fillColor: "#7c3aed",
      fillOpacity: 0.08,
      weight: 1.8,
      dashArray: "6, 8",
    }).addTo(map);

    const glow = L.circleMarker([anchor.lat, anchor.lon], {
      radius: 18,
      color: "#7c3aed",
      fillColor: "#7c3aed",
      fillOpacity: 0.18,
      weight: 0,
    }).addTo(map);

    const dot = L.circleMarker([anchor.lat, anchor.lon], {
      radius: 7,
      color: "#ffffff",
      fillColor: "#7c3aed",
      fillOpacity: 1,
      weight: 2.5,
    }).addTo(map);

    if (anchor.name) {
      dot.bindTooltip(anchor.name, { permanent: false });
    }

    circleLayerRef.current = circle;
    glowLayerRef.current = glow;
    dotLayerRef.current = dot;

    currentPosRef.current = [anchor.lat, anchor.lon];
    currentRadiusRef.current = radiusM;

    return () => {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      map.removeLayer(circle);
      map.removeLayer(glow);
      map.removeLayer(dot);
      circleLayerRef.current = null;
      glowLayerRef.current = null;
      dotLayerRef.current = null;
    };
  }, [map]);

  // Smoothly interpolate position and radius whenever anchor or radiusM changes
  useEffect(() => {
    const targetLat = anchor.lat;
    const targetLon = anchor.lon;
    const targetRadius = radiusM;

    const [fromLat, fromLon] = currentPosRef.current;
    const fromRadius = currentRadiusRef.current;

    // Update tooltip text if present
    if (dotLayerRef.current) {
      if (anchor.name) {
        if (dotLayerRef.current.getTooltip()) {
          dotLayerRef.current.setTooltipContent(anchor.name);
        } else {
          dotLayerRef.current.bindTooltip(anchor.name, { permanent: false });
        }
      }
    }

    // If layers are not yet created or already at target, return
    if (
      !circleLayerRef.current ||
      !glowLayerRef.current ||
      !dotLayerRef.current ||
      (fromLat === targetLat && fromLon === targetLon && fromRadius === targetRadius)
    ) {
      return;
    }

    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const startTime = performance.now();
    const duration = 500; // ms, synchronized with camera flyTo duration

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth cubic ease-out curve for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      const curLat = fromLat + (targetLat - fromLat) * eased;
      const curLon = fromLon + (targetLon - fromLon) * eased;
      const curRadius = fromRadius + (targetRadius - fromRadius) * eased;

      currentPosRef.current = [curLat, curLon];
      currentRadiusRef.current = curRadius;

      if (circleLayerRef.current) {
        circleLayerRef.current.setLatLng([curLat, curLon]);
        circleLayerRef.current.setRadius(curRadius);
      }
      if (glowLayerRef.current) {
        glowLayerRef.current.setLatLng([curLat, curLon]);
      }
      if (dotLayerRef.current) {
        dotLayerRef.current.setLatLng([curLat, curLon]);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [anchor.lat, anchor.lon, anchor.name, radiusM]);

  return null;
}

/** 
 * Smoothly returns user to Central Nagpur at fixed zoom level 13 whenever 
 * they navigate/drag outside the Greater Nagpur area at ANY zoom level.
 */
function NagpurBoundsWatcher({ isFlyThroughActive }: { isFlyThroughActive?: boolean }) {
  const map = useMap();
  const isReturningRef = useRef(false);

  useEffect(() => {
    if (isFlyThroughActive) return;
    const checkAndReturn = () => {
      if (isReturningRef.current || isFlyThroughActive) return;

      const center = map.getCenter();
      const zoom = map.getZoom();
      const nagpurBounds = L.latLngBounds(NAGPUR_MAP_BOUNDS);
      const distFromCenterKm = calcDistanceM(center.lat, center.lng, NAGPUR_CENTER[0], NAGPUR_CENTER[1]) / 1000;

      // Detect going out of Nagpur across any zoom level:
      // 1. Center is outside Greater Nagpur coordinates ([20.80, 78.75] to [21.42, 79.40])
      // 2. High/Mid zoom (zoom >= 13): center is > 23 km from Zero Mile / Central Nagpur
      // 3. Low zoom (zoom < 13): user pans away from city center (> 12 km) or zooms out past regional overview
      const isOutsideBounds = !nagpurBounds.contains(center);
      const isPannedAway = zoom < 13 ? distFromCenterKm > 12 : distFromCenterKm > 16;

      if (isOutsideBounds || isPannedAway) {
        isReturningRef.current = true;

        // Smoothly fly back to Central Nagpur at the exact fixed zoom level (13)
        map.flyTo(NAGPUR_CENTER, NAGPUR_DEFAULT_ZOOM, {
          duration: 0.85,
          easeLinearity: 0.25,
        });

        setTimeout(() => {
          isReturningRef.current = false;
        }, 1000);
      }
    };

    map.on("dragend", checkAndReturn);
    map.on("moveend", checkAndReturn);
    map.on("zoomend", checkAndReturn);

    return () => {
      map.off("dragend", checkAndReturn);
      map.off("moveend", checkAndReturn);
      map.off("zoomend", checkAndReturn);
    };
  }, [map]);

  return null;
}

function ClickHandler({
  onClick,
}: {
  onClick?: ((p: { lat: number; lon: number }) => void) | undefined;
}) {
  const map = useMap();
  useMapEvents({
    click(e) {
      const nagpurBounds = L.latLngBounds(NAGPUR_MAP_BOUNDS);
      const distFromCenterKm = calcDistanceM(e.latlng.lat, e.latlng.lng, NAGPUR_CENTER[0], NAGPUR_CENTER[1]) / 1000;
      if (!nagpurBounds.contains(e.latlng) || distFromCenterKm > 24) {
        map.flyTo(NAGPUR_CENTER, NAGPUR_DEFAULT_ZOOM, {
          duration: 0.85,
          easeLinearity: 0.25,
        });
        return;
      }
      onClick?.({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Progressive Bus Network Layer
 *
 * Renders Nagpur's extensive bus network (837 routes & 1,796 stops) progressively in
 * synchronized animation-frame batches so the main thread never freezes or stutters.
 *
 * When `includeStopDots` is true:
 *   Loads routes and green bus stop dots in synchronized lockstep batches.
 * When `includeStopDots` is false:
 *   Loads routes only, omitting stop dots for optimal performance.
 */
interface ProgressiveBusNetworkLayerProps {
  showBusStops: boolean;
  includeStopDots?: boolean;
}

function ProgressiveBusNetworkLayer({
  showBusStops,
  includeStopDots = DEV_SHOW_BUS_STOP_DOTS,
}: ProgressiveBusNetworkLayerProps) {
  const busLines = useMemo(
    () => allLines.filter((l) => l.mode === "bus"),
    []
  );

  const totalRoutes = busLines.length;
  const totalStops = busStops.length;

  const [renderedRoutesCount, setRenderedRoutesCount] = useState<number>(0);
  const [renderedStopsCount, setRenderedStopsCount] = useState<number>(0);

  useEffect(() => {
    if (!showBusStops) {
      setRenderedRoutesCount(0);
      setRenderedStopsCount(0);
      return;
    }

    // Batch sizes per frame (~14-16 frames to render entire network smoothly at 60 FPS)
    const ROUTE_BATCH = 60;
    const STOP_BATCH = 130;

    let currentRoutes = 0;
    let currentStops = 0;
    let animFrameId: number;

    const step = () => {
      currentRoutes = Math.min(currentRoutes + ROUTE_BATCH, totalRoutes);
      setRenderedRoutesCount(currentRoutes);

      if (includeStopDots) {
        currentStops = Math.min(currentStops + STOP_BATCH, totalStops);
        setRenderedStopsCount(currentStops);
      } else {
        setRenderedStopsCount(0);
      }

      const routesDone = currentRoutes >= totalRoutes;
      const stopsDone = !includeStopDots || currentStops >= totalStops;

      if (!routesDone || !stopsDone) {
        animFrameId = requestAnimationFrame(step);
      }
    };

    animFrameId = requestAnimationFrame(step);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [showBusStops, includeStopDots, totalRoutes, totalStops]);

  if (!showBusStops) return null;

  const visibleRoutes = busLines.slice(0, renderedRoutesCount);
  const visibleStops = includeStopDots ? busStops.slice(0, renderedStopsCount) : [];

  return (
    <>
      {/* Bus Route Polylines rendered progressively */}
      {visibleRoutes.map((l) => (
        <Polyline
          key={l.id}
          positions={(l.geometry ?? l.points).map(
            (p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number]
          )}
          pathOptions={{
            color: lineColor(l.mode, l.name),
            weight: 2,
            opacity: 0.35,
          }}
        >
          <Tooltip sticky>{l.name}</Tooltip>
        </Polyline>
      ))}

      {/* Green Bus Stop Dots rendered synchronously/progressively with routes */}
      {includeStopDots &&
        visibleStops.map((s) => (
          <CircleMarker
            key={`bus-stop-${s.id}`}
            center={[s.lat, s.lon]}
            radius={4}
            pathOptions={{
              color: MODE_COLOR["bus"] ?? "#0d9488",
              fillColor: MODE_COLOR["bus"] ?? "#0d9488",
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Tooltip>{s.name}</Tooltip>
          </CircleMarker>
        ))}
    </>
  );
}

/** Creates a live bus vehicle marker with exact transit bus icon, light blue pin background, and registration badge */
function createLiveBusIcon(vNo: string, isHalted: boolean) {
  return L.divIcon({
    className: "live-bus-vehicle-divicon",
    html: `
      <div class="live-bus-marker-container">
        ${
          isHalted
            ? `<div class="live-bus-halted-badge">
                <span class="live-bus-dot-halted"></span>
                <span>Halted</span>
              </div>`
            : ""
        }
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div class="live-bus-pulse-ring"></div>
          <div class="live-bus-pin" style="${isHalted ? "background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 14px rgba(217, 119, 6, 0.45);" : "background: linear-gradient(135deg, #38bdf8 0%, #00a2ea 100%);"}">
            <svg width="27" height="27" viewBox="0 0 128 128" fill="black" stroke="black" stroke-width="0.9" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M106.17 35.75C108.57 36.61 111.02 35.92 112.79 38.37C114.79 41.13 114.79 56.87 112.79 59.63C111.02 62.07 108.56 61.39 106.17 62.25C104.52 71.35 108.54 91.45 104.84 98.69C103.25 101.79 99.4 102.2 98.23 104.06C96.59 106.67 99.19 109.82 95.5 111.7C93.43 112.75 80.72 112.34 79.12 110.71C77.4 108.96 78.15 106.22 77.83 104.01C68.64 104.01 59.45 104.01 50.25 104.01C49.6 106.27 50.65 108.8 48.86 110.7C46.98 112.7 33.31 112.7 31.29 110.87C29.12 108.91 31.25 105.62 29.63 103.89C27.64 101.76 24.72 101.73 23.16 98.7C19.46 91.47 23.47 71.34 21.83 62.25C19.43 61.39 16.98 62.07 15.21 59.63C13.21 56.89 13.21 41.11 15.2 38.37C16.98 35.92 19.43 36.61 21.83 35.75C22.91 29.78 20.18 22.92 25.56 18.38C30.17 14.49 37.9 16 43.5 16C57.28 16 71.06 16 84.83 16C90.36 16 97.61 14.62 102.26 18.23C107.89 22.61 105.09 29.8 106.17 35.75ZM101.82 32C102.67 27.75 102.47 22.1 97.86 20.28C94.14 18.81 84.8 20 80.5 20C68.83 20 57.17 20 45.5 20C41.13 20 34.21 18.68 30.14 20.28C25.52 22.1 25.33 27.75 26.18 32C51.39 32 76.61 32 101.82 32ZM47.54 24.08C52.97 22.7 67.77 24 74.17 24C76.09 24 82.17 22.91 81.94 26.16C81.74 29.05 76.05 28 74.17 28C67.77 28 52.97 29.3 47.54 27.92C45.61 27.43 45.61 24.57 47.54 24.08ZM61.99 36.17C53.7 34.99 44.56 36 36.17 36C33.91 36 28.76 35.05 26.93 36.44C25.24 37.71 26 50.13 26 52.83C26 57.45 24.37 65.74 27.21 69.63C29.24 72.41 32.8 72 35.83 72C41.96 72 56.9 73.23 61.99 71.75C61.99 59.89 61.99 48.03 61.99 36.17ZM66.01 71.83C73.67 72.92 82.09 72 89.83 72C92.95 72 96.94 72.73 99.63 70.79C102.23 68.9 102 65.69 102 62.83C102 56.72 102 50.61 102 44.5C102 42.46 102.97 37.5 100.88 36.29C98.85 35.11 94.17 36 91.83 36C85.28 36 71.73 34.59 66.01 36.25C66.01 48.11 66.01 59.97 66.01 71.83ZM21.98 40.17C20.67 39.98 19.07 39.73 18.29 41.11C17.69 42.15 17.69 55.86 18.29 56.88C19.09 58.26 20.66 58.02 21.98 57.83C21.98 51.94 21.98 46.06 21.98 40.17ZM106.02 57.83C107.35 58.02 108.91 58.25 109.71 56.88C110.3 55.86 110.3 42.14 109.71 41.12C108.91 39.74 107.34 39.98 106.02 40.17C106.02 46.06 106.02 51.94 106.02 57.83ZM26.5 74.24C25.54 75.96 26 78.55 26 80.5C26 85.28 23.93 95.57 28.37 98.79C32.2 101.56 46.68 100 51.83 100C63.72 100 75.61 100 87.5 100C91.5 100 97.76 101.3 100.64 97.8C103.25 94.62 102 88.35 102 84.5C102 81.61 102.91 76.77 101.5 74.23C97.53 77.48 89.96 76 85.17 76C71.28 76 57.39 76 43.5 76C38.58 76 30.57 77.57 26.5 74.24ZM34.56 81.12C39.99 79.97 51.69 83.58 51.98 90.5C52.05 92.07 51.99 93.5 50.86 94.7C48.47 97.25 33.46 96.72 31.21 93.63C28.56 90.01 29.49 82.2 34.56 81.12ZM90.26 81.14C97.1 80.01 100.57 88.41 96.79 93.63C94.2 97.2 88.29 96 84.5 96C82.08 96 78.98 96.61 77.12 94.71C75.96 93.53 75.96 92.06 76.02 90.5C76.29 83.32 84.64 82.08 90.26 81.14ZM55.54 82.08C59.94 80.96 65.95 81.98 70.5 82C72.05 82 74.37 82.25 73.91 84.46C73.52 86.29 71.19 86 69.83 86C66.29 86 58.34 87.01 55.29 85.84C53.54 85.17 53.75 82.54 55.54 82.08ZM47.83 91.75C48.61 86.69 42.92 86.64 39.43 85.78C37.86 85.39 35.06 84.09 34.17 86.31C31.19 93.73 44.1 93.09 47.83 91.75ZM80.17 91.75C81.91 92.38 84.29 92 86.17 92C90.23 92 96.08 92.49 93.85 86.29C93.05 84.05 90.06 85.27 88.51 85.7C85 86.69 79.34 86.57 80.17 91.75ZM57.54 90.08C59.8 89.51 72.64 88.96 71.91 92.46C71.5 94.42 59.17 94.56 57.29 93.84C55.54 93.17 55.75 90.54 57.54 90.08ZM45.94 104.02C41.98 104.02 38.02 104.02 34.06 104.02C34.06 105.34 34.06 106.66 34.06 107.98C38.02 107.98 41.98 107.98 45.94 107.98C45.94 106.66 45.94 105.34 45.94 104.02ZM93.94 104.02C89.99 104.02 86.03 104.02 82.07 104.02C82.07 105.34 82.07 106.66 82.07 107.98C86.03 107.98 89.99 107.98 93.94 107.98C93.94 106.66 93.94 105.34 93.94 104.02Z" />
            </svg>
          </div>
        </div>
        <div class="live-bus-plate-badge">
          <span class="${isHalted ? "live-bus-dot-halted" : "live-bus-dot-live"}"></span>
          <span>${vNo}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Cache for Nearby Live Bus DivIcons to prevent continuous DOM recreation and flickering
const nearbyLiveBusIconCache = new Map<string, L.DivIcon>();

/** Creates a live nearby bus marker icon matching Chalo's bus pin with route badge and direction indicator */
function createNearbyLiveBusMarkerIcon(bus: NearbyLiveBusItem, isSelected: boolean) {
  const routeName = bus.routeName || "Bus";
  const bearingVal = bus.bearing !== undefined ? Math.round(bus.bearing) : -1;
  const cacheKey = `${routeName}_${bearingVal}_${isSelected ? 1 : 0}`;

  const cached = nearbyLiveBusIconCache.get(cacheKey);
  if (cached) return cached;

  // Selected bus uses a rich, dark shade of blue (#0c4a6e / deep navy blue)
  const bgBlue = isSelected ? "#0c4a6e" : "#0284c7";
  const borderStyle = isSelected ? "2.2px solid #ffffff" : "1.8px solid #ffffff";
  const shadowFilter = isSelected
    ? "drop-shadow(0 6px 14px rgba(12, 74, 110, 0.75))"
    : "drop-shadow(0 4px 8px rgba(0,0,0,0.35))";
  const ringGlow = isSelected ? "box-shadow: 0 0 0 3px rgba(12, 74, 110, 0.45), 0 4px 10px rgba(0,0,0,0.35);" : "";

  const icon = L.divIcon({
    className: "nearby-live-bus-divicon",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; filter: ${shadowFilter}; z-index: ${isSelected ? 9999 : 1};">
        <div style="
          display: flex;
          align-items: center;
          gap: 5px;
          padding: ${isSelected ? "5.5px 11px" : "5px 10px"};
          border-radius: 10px;
          background: ${bgBlue};
          color: #ffffff;
          font-weight: 800;
          font-size: ${isSelected ? "14px" : "13.5px"};
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          border: ${borderStyle};
          white-space: nowrap;
          transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.2px;
          ${ringGlow}
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6" />
            <path d="M15 6v6" />
            <path d="M2 12h19.6" />
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4C2.9 6 1.9 6.8 1.6 7.8L.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="15" cy="18" r="2" />
          </svg>
          <span>${routeName}</span>
          ${
            bus.bearing !== undefined
              ? `<span style="display: inline-block; transform: rotate(${bus.bearing}deg); font-size: 13px; line-height: 1;">➤</span>`
              : ""
          }
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${bgBlue};"></div>
      </div>
    `,
    iconSize: [80, 38],
    iconAnchor: [40, 37],
  });

  nearbyLiveBusIconCache.set(cacheKey, icon);
  return icon;
}

/** Individual memoized live bus marker component preventing continuous frame flicker and DOM recreation */
const NearbyLiveBusMarker = memo(function NearbyLiveBusMarker({
  bus,
  isSelected,
  onSelect,
}: {
  bus: NearbyLiveBusItem;
  isSelected: boolean;
  onSelect?: ((bus: NearbyLiveBusItem | null) => void) | undefined;
}) {
  const icon = createNearbyLiveBusMarkerIcon(bus, isSelected);

  return (
    <Marker
      position={[bus.lat, bus.lon]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect?.(bus),
      }}
    >
      <Tooltip direction="top" offset={[0, -26]}>
        <div className="font-sans text-xs">
          <div className="font-bold flex items-center gap-1 text-sky-700">
            <span>🚌 Bus {bus.routeName}</span>
            <span className="text-[10px] text-slate-500 font-normal">({bus.vehicleId})</span>
          </div>
          <div className="text-[11px] text-slate-600 truncate max-w-[200px]">
            {bus.fromName} ➔ {bus.toName}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold text-emerald-600">
            Next Stop: {bus.nextStopName} ({formatLiveEta(bus.nextStopEta)})
          </div>
          <div className="text-[10px] text-slate-500">
            {bus.distM < 1000 ? `${bus.distM}m` : `${(bus.distM / 1000).toFixed(1)} km`} from pinned point
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
});

/** Creates a live Uber vehicle marker matching Uber's top-down 2D rotating icons */
function createUberVehicleIcon(vehicle: UberNearbyVehicle) {
  const defaultIcon = "https://d1a3f4spazzrp4.cloudfront.net/car-types/mapIconsStandard/car_go_2d.png";
  const iconSrc = vehicle.mapImageUrl || defaultIcon;

  // Fallback SVG in case CDN image fails or takes time to load
  const fallbackSvg =
    vehicle.vehicleCategory === "auto"
      ? `<svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="4" width="14" height="24" rx="5" fill="#facc15" stroke="#166534" stroke-width="2"/><rect x="11" y="8" width="10" height="6" rx="2" fill="#166534"/><circle cx="16" cy="24" r="2.5" fill="#1e293b"/></svg>`
      : vehicle.vehicleCategory === "bike"
      ? `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="3" width="4" height="26" rx="2" fill="#0f172a"/><circle cx="16" cy="14" r="4.5" fill="#0284c7"/><rect x="8" y="7" width="16" height="3" rx="1.5" fill="#475569"/></svg>`
      : `<svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="3" width="16" height="26" rx="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5"/><rect x="10" y="8" width="12" height="7" rx="2" fill="#64748b"/><rect x="11" y="20" width="10" height="5" rx="1.5" fill="#334155"/></svg>`;

  return L.divIcon({
    className: "uber-vehicle-2d-divicon",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        <div style="
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${vehicle.bearing}deg);
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.32));
        ">
          <img
            src="${iconSrc}"
            alt="Uber Vehicle"
            loading="eager"
            decoding="async"
            style="width: 28px; height: 28px; object-fit: contain;"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div style="display: none; width: 28px; height: 28px; align-items: center; justify-content: center;">
            ${fallbackSvg}
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/** Creates Uber-style Pickup & Destination Label Banners on Map */
function createUberPickupIcon(etaMin?: number, locationName?: string) {
  const label = locationName ? `From ${locationName}` : "Pickup location";
  const etaText = `${etaMin || 3} min`;

  return L.divIcon({
    className: "uber-pickup-pin-divicon",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 8px;
          padding: 4px 8px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          border: 1px solid rgba(0,0,0,0.08);
          font-family: system-ui, sans-serif;
          white-space: nowrap;
          gap: 6px;
        ">
          <div style="
            background: #000000;
            color: #ffffff;
            border-radius: 5px;
            padding: 2px 5px;
            font-size: 9.5px;
            font-weight: 800;
            line-height: 1;
            text-align: center;
          ">
            ${etaText}
          </div>
          <span style="font-size: 11px; font-weight: 700; color: #111827; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
            ${label}
          </span>
          <span style="font-size: 10px; font-weight: 900; color: #6b7280;">›</span>
        </div>
        <div style="
          width: 8px;
          height: 8px;
          background: #000000;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          margin-top: 2px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createUberDropoffIcon(locationName?: string) {
  const label = locationName ? `To ${locationName}` : "Destination";

  return L.divIcon({
    className: "uber-dropoff-pin-divicon",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 8px;
          padding: 5px 9px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          border: 1px solid rgba(0,0,0,0.08);
          font-family: system-ui, sans-serif;
          white-space: nowrap;
          gap: 6px;
        ">
          <span style="font-size: 11px; font-weight: 700; color: #111827; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">
            ${label}
          </span>
          <span style="font-size: 10px; font-weight: 900; color: #6b7280;">›</span>
        </div>
        <div style="
          width: 8px;
          height: 8px;
          background: #000000;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          margin-top: 2px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Creates a slender, elegant 3D Green Pushpin Tack for Source with exact needle-tip anchoring */
function createOriginMarkerIcon(isGPS: boolean = false) {
  if (isGPS) {
    return L.divIcon({
      className: "custom-origin-gps-marker",
      html: `
        <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.25);
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 30%, #4ade80 0%, #16a34a 60%, #064e3b 100%);
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 4px; height: 4px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  return L.divIcon({
    className: "custom-origin-pushpin",
    html: `
      <div style="width: 20px; height: 32px; pointer-events: auto;">
        <svg width="20" height="32" viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible;">
          <!-- Ground Contact Shadow -->
          <ellipse cx="10" cy="31.5" rx="3" ry="1" fill="#000000" fill-opacity="0.3" />
          
          <!-- Slender Metallic Steel Needle -->
          <path d="M9.4 12.5 L10 31.5 L10 12.5 Z" fill="#f1f5f9" />
          <path d="M10 12.5 L10 31.5 L10.6 12.5 Z" fill="#64748b" />
          <!-- Metallic Collar / Base Cap -->
          <ellipse cx="10" cy="12.5" rx="1.5" ry="0.5" fill="#94a3b8" />
          <ellipse cx="10" cy="12.3" rx="1.1" ry="0.35" fill="#cbd5e1" />

          <!-- Slender 3D Green Sphere Head -->
          <circle cx="10" cy="6.5" r="6" fill="#064e3b" />
          <circle cx="10" cy="6.5" r="5.7" fill="url(#green-pushpin-grad)" />
          <!-- 3D Specular Highlights -->
          <ellipse cx="8" cy="4.5" rx="1.8" ry="1.2" transform="rotate(-25 8 4.5)" fill="#ffffff" fill-opacity="0.85" />
          <circle cx="7.6" cy="4.1" r="0.7" fill="#ffffff" />
          <!-- Ambient bottom bounce glow -->
          <path d="M 6.5 8.8 Q 10 11.2 13.5 8.8" stroke="rgba(255,255,255,0.2)" stroke-width="0.7" fill="none" />

          <defs>
            <radialGradient id="green-pushpin-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#86efac" />
              <stop offset="25%" stop-color="#22c55e" />
              <stop offset="65%" stop-color="#16a34a" />
              <stop offset="90%" stop-color="#15803d" />
              <stop offset="100%" stop-color="#064e3b" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    `,
    iconSize: [20, 32],
    iconAnchor: [10, 31.5],
  });
}

/** Creates a slender, elegant 3D Red Pushpin Tack for Destination with exact needle-tip anchoring */
function createDestinationMarkerIcon() {
  return L.divIcon({
    className: "custom-dest-pushpin",
    html: `
      <div style="width: 20px; height: 32px; pointer-events: auto;">
        <svg width="20" height="32" viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible;">
          <!-- Ground Contact Shadow -->
          <ellipse cx="10" cy="31.5" rx="3" ry="1" fill="#000000" fill-opacity="0.3" />
          
          <!-- Slender Metallic Steel Needle -->
          <path d="M9.4 12.5 L10 31.5 L10 12.5 Z" fill="#f1f5f9" />
          <path d="M10 12.5 L10 31.5 L10.6 12.5 Z" fill="#64748b" />
          <!-- Metallic Collar / Base Cap -->
          <ellipse cx="10" cy="12.5" rx="1.5" ry="0.5" fill="#94a3b8" />
          <ellipse cx="10" cy="12.3" rx="1.1" ry="0.35" fill="#cbd5e1" />

          <!-- Slender 3D Red Sphere Head -->
          <circle cx="10" cy="6.5" r="6" fill="#450a0a" />
          <circle cx="10" cy="6.5" r="5.7" fill="url(#red-pushpin-grad)" />
          <!-- 3D Specular Highlights -->
          <ellipse cx="8" cy="4.5" rx="1.8" ry="1.2" transform="rotate(-25 8 4.5)" fill="#ffffff" fill-opacity="0.85" />
          <circle cx="7.6" cy="4.1" r="0.7" fill="#ffffff" />
          <!-- Ambient bottom bounce glow -->
          <path d="M 6.5 8.8 Q 10 11.2 13.5 8.8" stroke="rgba(255,255,255,0.2)" stroke-width="0.7" fill="none" />

          <defs>
            <radialGradient id="red-pushpin-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#fca5a5" />
              <stop offset="25%" stop-color="#ef4444" />
              <stop offset="65%" stop-color="#dc2626" />
              <stop offset="90%" stop-color="#991b1b" />
              <stop offset="100%" stop-color="#450a0a" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    `,
    iconSize: [20, 32],
    iconAnchor: [10, 31.5],
  });
}

/** Creates a 3D Orange pin for Restaurant POIs */
function createRestaurantMarkerIcon() {
  return L.divIcon({
    className: "custom-restaurant-pin",
    html: `
      <div style="position: relative; width: 32px; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(234, 88, 12, 0.45));">
        <div style="width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path>
              <path d="M15 2v19"></path>
              <path d="M7 2v20"></path>
              <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
  });
}

/** Creates a 3D Rose-Red pin for Hospital POIs */
function createHospitalMarkerIcon() {
  return L.divIcon({
    className: "custom-hospital-pin",
    html: `
      <div style="position: relative; width: 32px; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(225, 29, 72, 0.45));">
        <div style="width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 6v12"></path>
              <path d="M6 12h12"></path>
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
  });
}

/** Creates a 3D Royal Blue pin for Police Station POIs */
function createPoliceMarkerIcon() {
  return L.divIcon({
    className: "custom-police-pin",
    html: `
      <div style="position: relative; width: 32px; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(37, 99, 235, 0.45));">
        <div style="width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
  });
}

/** Official Police Station Card matching nagpurpolice.gov.in format */
function OfficialPoliceStationCard({
  poi,
  onDirections,
}: {
  poi: NearbyPoiResult;
  onDirections?: ((loc: { lat: number; lon: number; name: string }) => void) | undefined;
}) {
  return (
    <div className="w-[285px] p-0 font-sans text-slate-900 bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 pointer-events-auto">
      {/* Top Blue Accent Bar (matching nagpurpolice.gov.in header) */}
      <div className="h-1.5 w-full bg-[#0b72c7]" />

      <div className="p-4">
        {/* Police Station Title */}
        <h3 className="text-lg font-bold text-[#0b72c7] dark:text-sky-400 tracking-tight leading-snug">
          {poi.name}
        </h3>
        {poi.nameMr && poi.nameMr !== poi.name && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {poi.nameMr}
          </p>
        )}

        {/* Info Items List */}
        <div className="mt-3.5 space-y-2">
          {/* Location */}
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <MapPin className="size-4 text-[#0b72c7] shrink-0" />
            <span className="font-medium truncate">{poi.location || "Nagpur City"}</span>
          </div>

          {/* Phone */}
          {poi.phone && (
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <Phone className="size-4 text-[#0b72c7] shrink-0" />
              <a
                href={`tel:${poi.phone.split(/[\s,]+/)[0]}`}
                className="font-medium hover:text-[#0b72c7] hover:underline"
              >
                {poi.phone}
              </a>
            </div>
          )}

          {/* Email */}
          {poi.email && (
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <Mail className="size-4 text-[#0b72c7] shrink-0" />
              <a
                href={`mailto:${poi.email}`}
                className="font-medium truncate hover:text-[#0b72c7] hover:underline"
                title={poi.email}
              >
                {poi.email}
              </a>
            </div>
          )}
        </div>

        {/* Officer In Charge Highlight Box (with blue left bar) */}
        {poi.officerInCharge && (
          <div className="mt-3.5 rounded-r-xl border-l-[3.5px] border-[#0b72c7] bg-slate-50/90 dark:bg-slate-800/60 p-2.5">
            <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              OFFICER IN CHARGE
            </div>
            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              {poi.officerInCharge}
            </div>
          </div>
        )}

        {/* Distance Pill */}
        <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg px-2.5 py-1">
          <span>Distance from you:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {poi.distM < 1000 ? `${poi.distM} m` : `${(poi.distM / 1000).toFixed(1)} km`}
          </span>
        </div>

        {/* Action Button */}
        {onDirections && (
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDirections({
                  lat: poi.lat,
                  lon: poi.lon,
                  name: poi.name,
                });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-98 cursor-pointer"
            >
              <Navigation className="size-3.5 rotate-45" />
              <span>Get Directions</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Fits map camera bounds to discovered POIs and user location */
function FitPoiMarkers({
  userPos,
  pois,
}: {
  userPos?: { lat: number; lon: number } | null;
  pois: NearbyPoiResult[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!pois || pois.length === 0) return;
    const pts: [number, number][] = pois.map((p) => [p.lat, p.lon]);
    if (userPos && typeof userPos.lat === "number" && !isNaN(userPos.lat)) {
      pts.push([userPos.lat, userPos.lon]);
    }
    if (pts.length === 1) {
      map.setView(pts[0]!, 15);
    } else if (pts.length > 1) {
      map.fitBounds(pts, { padding: [60, 60], maxZoom: 15 });
    }
  }, [pois, userPos, map]);
  return null;
}

function FitCabRoute({
  origin,
  destination,
  polyline,
}: {
  origin?: { lat: number; lon: number } | null;
  destination?: { lat: number; lon: number } | null;
  polyline?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    try {
      if (Array.isArray(polyline) && polyline.length >= 2) {
        const valid = polyline.filter(
          (p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && !isNaN(p[0]) && typeof p[1] === "number" && !isNaN(p[1])
        );
        if (valid.length >= 2) {
          map.fitBounds(valid, { padding: [50, 50], maxZoom: 16 });
          return;
        }
      }
      if (
        origin &&
        typeof origin.lat === "number" &&
        !isNaN(origin.lat) &&
        typeof origin.lon === "number" &&
        !isNaN(origin.lon) &&
        destination &&
        typeof destination.lat === "number" &&
        !isNaN(destination.lat) &&
        typeof destination.lon === "number" &&
        !isNaN(destination.lon)
      ) {
        if (Math.abs(origin.lat - destination.lat) > 0.0001 || Math.abs(origin.lon - destination.lon) > 0.0001) {
          map.fitBounds(
            [
              [origin.lat, origin.lon],
              [destination.lat, destination.lon],
            ],
            { padding: [50, 50], maxZoom: 15 }
          );
        } else {
          map.setView([origin.lat, origin.lon], 15);
        }
      }
    } catch (e) {
      console.warn("Leaflet fitBounds error prevented:", e);
    }
  }, [origin?.lat, origin?.lon, destination?.lat, destination?.lon, polyline, map]);
  return null;
}

/**
 * Formats station and stop names cleanly (expands common abbreviations, strips redundant words)
 */
function cleanStationTitle(name: string): string {
  if (!name) return "";
  return name
    .replace(/\s*Metro\s*Station\s*/gi, "")
    .replace(/\s*Exchang\b/gi, " Exchange")
    .replace(/\s*Ngr\b/gi, " Nagar")
    .replace(/^Board\s+/gi, "")
    .replace(/^Alight\s+@?\s*/gi, "")
    .replace(/^Transfer\s+@?\s*/gi, "")
    .trim();
}

/**
 * Creates modern, high-contrast callout pin cards for transit boarding, transfers & arrivals.
 * On hover, expands smoothly to display the full bus route name, boarding point, and bus/line number without clashing.
 */
function createTransitMilestoneIcon(params: {
  mode: "metro" | "bus" | "transfer" | "alight";
  title: string;
  subtitle?: string | undefined;
  lineColor?: string | undefined;
  busNumber?: string | undefined;
  fullRouteName?: string | undefined;
  destination?: string | undefined;
  timeMin?: number | undefined;
  fareRs?: number | undefined;
}) {
  const isTransfer = params.mode === "transfer";
  const isMetro = params.mode === "metro";
  const isBus = params.mode === "bus";
  const isAlight = params.mode === "alight";

  const accentColor = isTransfer
    ? "#8b5cf6"
    : isMetro
    ? (params.lineColor ?? "#0284c7")
    : isBus
    ? "#0d9488"
    : "#10b981";

  const badgeBg = isTransfer
    ? "#f5f3ff"
    : isMetro
    ? "#f0f9ff"
    : isBus
    ? "#f0fdfa"
    : "#ecfdf5";

  const badgeBorder = isTransfer
    ? "#ddd6fe"
    : isMetro
    ? "#bae6fd"
    : isBus
    ? "#99f6e4"
    : "#a7f3d0";

  const actionTag = isTransfer
    ? "Transfer"
    : isMetro
    ? "Board Metro"
    : isBus
    ? "Board Bus"
    : "Alight";

  const iconSvg = isTransfer
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"></path><path d="M20 7H4"></path><path d="m8 21-4-4 4-4"></path><path d="M4 17h16"></path></svg>`
    : isMetro
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"></rect><path d="M4 11h16"></path><path d="M12 3v8"></path><path d="m8 19-2 3"></path><path d="m18 22-2-3"></path><circle cx="8" cy="15" r="1"></circle><circle cx="16" cy="15" r="1"></circle></svg>`
    : isBus
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5C0.1 13.2 0 13.6 0 14c0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path><circle cx="7" cy="18" r="2"></circle><path d="M9 18h5"></path><circle cx="16" cy="18" r="2"></circle></svg>`
    : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`;

  const cleanTitle = cleanStationTitle(params.title);

  // Line chip badge (e.g. "Bus 35" or "Blue Line")
  const lineTag = params.busNumber
    ? `Bus ${params.busNumber}`
    : params.subtitle && params.subtitle !== "Destination arrival"
    ? params.subtitle.trim()
    : "";

  const cleanRouteName = params.fullRouteName ? cleanStationTitle(params.fullRouteName) : "";

  return L.divIcon({
    className: "transit-milestone-divicon",
    html: `
      <div class="transit-pin-wrapper">
        <div class="transit-pin-card" style="border-top-color: ${accentColor};">
          <!-- Top Row: Action Tag + Bus/Line No -->
          <div class="transit-pin-header">
            <span class="transit-pin-badge" style="background: ${badgeBg}; color: ${accentColor}; border-color: ${badgeBorder};">
              ${iconSvg}
              <span>${actionTag}</span>
            </span>
            ${lineTag ? `<span class="transit-pin-line-chip">${lineTag}</span>` : ""}
          </div>

          <!-- Boarding Point Station Name -->
          <div class="transit-pin-title" title="${cleanTitle}">${cleanTitle}</div>

          <!-- Expanded Details (Reveals full route name, boarding point & destination on hover) -->
          <div class="transit-pin-expanded-details">
            ${cleanRouteName ? `
              <div class="transit-detail-row">
                <span class="transit-detail-label">Route:</span>
                <span class="transit-detail-value font-medium">${cleanRouteName}</span>
              </div>
            ` : ""}
            <div class="transit-detail-row">
              <span class="transit-detail-label">${isAlight ? "Alight at:" : isTransfer ? "Transfer at:" : "Boarding at:"}</span>
              <span class="transit-detail-value font-bold">${cleanTitle}</span>
            </div>
            ${params.destination ? `
              <div class="transit-detail-row">
                <span class="transit-detail-label">Towards:</span>
                <span class="transit-detail-value">${cleanStationTitle(params.destination)}</span>
              </div>
            ` : ""}
            ${(params.timeMin !== undefined || params.fareRs !== undefined) ? `
              <div class="transit-detail-footer">
                ${params.timeMin !== undefined ? `<span class="transit-chip-pill">⏱️ ~${Math.max(1, Math.round(params.timeMin))} min</span>` : ""}
                ${params.fareRs !== undefined ? `<span class="transit-chip-pill">💰 ₹${params.fareRs}</span>` : ""}
              </div>
            ` : ""}
          </div>
        </div>
        <div class="transit-pin-needle"></div>
        <div class="transit-pin-ground-dot" style="background: ${accentColor}; color: ${accentColor}; box-shadow: 0 0 0 2px #ffffff, 0 0 6px ${accentColor};"></div>
      </div>
    `,
    iconSize: [280, 52],
    iconAnchor: [140, 49],
  });
}

// Reusable DivIcon cache by mode & line color for 60fps rendering without DOM recreation
const nearbyStopIconCache = new Map<string, L.DivIcon>();

/**
 * Creates modern, 3D teardrop transit point tokens for Nearby Transit locator.
 * High-contrast glyphs with directional bottom notch for precise stop pinning.
 * Memoized via nearbyStopIconCache for zero layout thrashing.
 */
function getNearbyStopPointIcon(stop: NearbyStop): L.DivIcon {
  const isMetro = stop.mode === "metro";
  const color = isMetro
    ? (METRO_LINE_COLOR[stop.lineName ?? ""] ?? "#0284c7")
    : "#0d9488";
  const cacheKey = `${stop.mode}_${color}`;

  const cached = nearbyStopIconCache.get(cacheKey);
  if (cached) return cached;

  const headSize = isMetro ? 24 : 20;
  const notchHeight = 4;
  const totalHeight = headSize + notchHeight;
  const totalWidth = headSize;

  const iconSvg = isMetro
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"></rect><path d="M4 11h16"></path><path d="M12 3v8"></path><path d="m8 19-2 3"></path><path d="m18 22-2-3"></path><circle cx="8" cy="15" r="1"></circle><circle cx="16" cy="15" r="1"></circle></svg>`
    : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5C0.1 13.2 0 13.6 0 14c0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path><circle cx="7" cy="18" r="2"></circle><path d="M9 18h5"></path><circle cx="16" cy="18" r="2"></circle></svg>`;

  const icon = L.divIcon({
    className: "nearby-stop-pin-divicon",
    html: `
      <div class="nearby-stop-pin-wrapper">
        <div class="nearby-stop-pin-head" style="background: ${color}; width: ${headSize}px; height: ${headSize}px; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.28);">
          ${iconSvg}
        </div>
        <div class="nearby-stop-pin-notch" style="border-top-color: ${color};"></div>
      </div>
    `,
    iconSize: [totalWidth, totalHeight],
    iconAnchor: [totalWidth / 2, totalHeight],
  });

  nearbyStopIconCache.set(cacheKey, icon);
  return icon;
}

/**
 * Individual memoized stop marker to allow rendering hundreds of transit points across 
 * the full search radius at 60fps without redundant DOM reconciliation.
 */
const NearbyStopMarker = memo(function NearbyStopMarker({
  stop,
}: {
  stop: NearbyStop;
}) {
  const isMetro = stop.mode === "metro";
  const color = isMetro
    ? (METRO_LINE_COLOR[stop.lineName ?? ""] ?? MODE_COLOR["metro"] ?? "#0284c7")
    : MODE_COLOR["bus"] ?? "#0d9488";
  const cleanName = cleanStationTitle(stop.name);
  const distLabel = stop.distM < 1000 ? `${Math.round(stop.distM)} m` : `${(stop.distM / 1000).toFixed(1)} km`;

  return (
    <Marker
      position={[stop.lat, stop.lon]}
      icon={getNearbyStopPointIcon(stop)}
    >
      <Tooltip
        direction="top"
        offset={[0, isMetro ? -28 : -24]}
        className="nearby-stop-tooltip"
        opacity={1}
      >
        <div className="nearby-stop-hover-card" style={{ borderTopColor: color }}>
          <div className="nearby-card-header">
            <span
              className="nearby-card-mode-badge"
              style={{
                background: isMetro ? "#f0f9ff" : "#f0fdfa",
                color: color,
                border: `1px solid ${isMetro ? "#bae6fd" : "#99f6e4"}`,
              }}
            >
              {isMetro ? "Metro Station" : "Bus Stop"}
            </span>
            <span className="nearby-card-walk-pill">
              🚶 ~{Math.max(1, Math.round(stop.walkMin))} min walk
            </span>
          </div>

          <div className="nearby-card-title">
            {cleanName}
          </div>

          <div className="nearby-card-meta">
            <span className="text-slate-500 font-medium">Distance from pin:</span>
            <span className="font-bold text-slate-800">{distLabel}</span>
          </div>

          {isMetro && (
            <div className="nearby-card-footer">
              <span className="text-sky-600 font-semibold">
                ⚡ {stop.lineName || "Metro Rail"} · High Frequency
              </span>
            </div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
});

/**
 * Progressively renders transit stops in concentric waves radiating from the inner anchor circle outward.
 * Prevents main-thread freezing and guarantees a 60 FPS smooth camera transition when expanding radius.
 */
function ProgressiveNearbyStopsLayer({
  stops,
  radiusM,
}: {
  stops: NearbyStop[];
  radiusM: number;
}) {
  const [renderedCount, setRenderedCount] = useState<number>(() => Math.min(25, stops.length));
  const prevRadiusRef = useRef<number>(radiusM);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // If switching from smaller to larger radius, keep current inner stops and expand outward
    const isExpanding = radiusM > prevRadiusRef.current;
    prevRadiusRef.current = radiusM;

    let current = isExpanding ? Math.min(renderedCount, stops.length) : Math.min(25, stops.length);
    if (current === 0 && stops.length > 0) {
      current = Math.min(25, stops.length);
    }
    setRenderedCount(current);

    if (current >= stops.length) return;

    // Progressive concentric wave: ~28 stops per tick, timed with the 0.5s flyTo zoom
    const BATCH_SIZE = 28;
    let lastTick = performance.now();

    const step = (now: number) => {
      // Step every ~24ms so Leaflet's zoom and tile rendering run at silky 60 FPS
      if (now - lastTick >= 24) {
        lastTick = now;
        current = Math.min(current + BATCH_SIZE, stops.length);
        setRenderedCount(current);
      }

      if (current < stops.length) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stops, radiusM]);

  const visibleStops = useMemo(() => stops.slice(0, renderedCount), [stops, renderedCount]);

  return (
    <>
      {visibleStops.map((s) => (
        <NearbyStopMarker key={`nearby-${s.mode}-${s.id}`} stop={s} />
      ))}
    </>
  );
}

/**
 * Recalculates Leaflet pixel bounds and tile coverage when the 3D stage expands or collapses,
 * ensuring 100% full tile coverage with zero blank edge cutoffs.
 */
function FlyThroughSizeController({ isFlyThroughActive }: { isFlyThroughActive?: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 50);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setTimeout(() => map.invalidateSize({ animate: false }), 60);
    };
  }, [isFlyThroughActive, map]);
  return null;
}

export default function MapView({
  journey,
  origin,
  destination,
  showNetwork,
  showBusStops,
  showMetroStations,
  picking,
  onMapClick,
  isCurrentLocation,
  nearbyMode = false,
  nearbyAnchor,
  nearbyRadiusM = 2500,
  nearbyMarkers = [],
  nearbyTab = "stops",
  nearbyLiveBuses = [],
  selectedNearbyBus = null,
  onSelectNearbyBus,
  liveRoute = null,
  liveTelemetry = null,
  selectedLiveStop = null,
  onSelectLiveStop,
  onSelectBusTimetable,
  nearbyCabs = [],
  cabOrigin = null,
  cabDestination = null,
  cabPolyline = [],
  cabOriginName,
  cabDestinationName,
  searchedLocation = null,
  onDirectionsToSearchedLocation,
  poiMarkers = [],
  activePoiCategory = null,
  onDirectionsToPoi,
  mapStyle = "roadmap",
  isDark = false,
  devShowBusStopDots,
  showSafeCorridors = false,
  onToggleSafeCorridors,
  isSafeMode = false,
  isFlyThroughActive = false,
  isFlyThroughPlaying = true,
  flyThroughSpeed = 1,
  flyThroughRestartCounter = 0,
  flyThroughSeekProgress,
  onFlyThroughUpdateState,
  onFlyThroughFinished,
}: {
  journey: Journey | null;
  origin?: { lat: number; lon: number; name?: string } | null;
  destination?: { lat: number; lon: number; name?: string } | null;
  showNetwork: boolean;
  showBusStops: boolean;
  showMetroStations: boolean;
  /** Whether SafeMode is active (used to style journey polylines with Emerald Guardian & Gold palette) */
  isSafeMode?: boolean;
  /** Whether the SafeMove illuminated corridors and guardian anchors are visible on map */
  showSafeCorridors?: boolean;
  /** Callback to toggle the SafeMove dataset layer */
  onToggleSafeCorridors?: () => void;
  picking?: "origin" | "destination" | "cab_origin" | "cab_destination" | null;
  onMapClick?: ((p: { lat: number; lon: number }) => void) | undefined;
  /** When true, the origin pin is rendered as a pulsing blue GPS dot */
  isCurrentLocation?: boolean;
  /** When true, map cursor is crosshair and nearby click handler is active */
  nearbyMode?: boolean;
  /** The pinned anchor for nearby search */
  nearbyAnchor?: { lat: number; lon: number; name: string } | null;
  /** Radius in metres for nearby search circle */
  nearbyRadiusM?: number;
  /** Nearby transit stops to show as map markers */
  nearbyMarkers?: NearbyStop[];
  /** Sub-tab in nearby rail: "stops" vs "buses" */
  nearbyTab?: "stops" | "buses";
  /** Live buses found near the anchor point */
  nearbyLiveBuses?: NearbyLiveBusItem[];
  /** Currently selected/inspected nearby bus */
  selectedNearbyBus?: NearbyLiveBusItem | null;
  /** Callback when user selects a nearby bus marker or card */
  onSelectNearbyBus?: ((bus: NearbyLiveBusItem | null) => void) | undefined;
  /** Live bus tracking: currently selected route */
  liveRoute?: LiveBusRoute | null;
  /** Live bus tracking: real-time telemetry from Chalo */
  liveTelemetry?: LiveRouteTelemetry | null;
  /** Live bus tracking: currently inspected stop */
  selectedLiveStop?: LiveBusStop | null;
  /** Callback when a stop along the live bus route is tapped */
  onSelectLiveStop?: ((stop: LiveBusStop | null) => void) | undefined;
  /** Callback when user wants to open the dedicated right-hand timetable panel */
  onSelectBusTimetable?: ((bus: {
    busNumber?: string | undefined;
    routeName?: string | undefined;
    fromStop?: string | undefined;
    toStop?: string | undefined;
  }) => void) | undefined;
  /** Standalone Uber cab options: nearby vehicle markers */
  nearbyCabs?: UberNearbyVehicle[];
  /** Standalone Uber cab options: pickup point */
  cabOrigin?: { lat: number; lon: number } | null;
  /** Standalone Uber cab options: dropoff point */
  cabDestination?: { lat: number; lon: number } | null;
  /** Standalone Uber cab options: decoded road polyline */
  cabPolyline?: [number, number][];
  /** Standalone Uber cab options: pickup name */
  cabOriginName?: string | undefined;
  /** Standalone Uber cab options: destination name */
  cabDestinationName?: string | undefined;
  /** Google Maps Floating Search Bar selected location */
  searchedLocation?: { lat: number; lon: number; name?: string | undefined; subtitle?: string | undefined } | null;
  /** Callback when user clicks directions from the searched location marker on map */
  onDirectionsToSearchedLocation?: ((loc: { lat: number; lon: number; name: string }) => void) | undefined;
  /** Discovered POI markers (Restaurants or Hospitals) to render on the map */
  poiMarkers?: NearbyPoiResult[];
  /** Active POI category */
  activePoiCategory?: PoiCategory | null;
  /** Callback when user clicks directions to a POI from its popup */
  onDirectionsToPoi?: ((poi: { lat: number; lon: number; name: string }) => void) | undefined;
  /** Base map layer style */
  mapStyle?: "carto" | "roadmap";
  /** Whether dark mode (Google Maps dark blue theme) is active */
  isDark?: boolean;
  /** Dev setting: whether to include green bus stop dots when rendering bus network. Defaults to DEV_SHOW_BUS_STOP_DOTS */
  devShowBusStopDots?: boolean;
  /** 3D Route Fly-Through controller props */
  isFlyThroughActive?: boolean;
  isFlyThroughPlaying?: boolean;
  flyThroughSpeed?: 1 | 2 | 4;
  flyThroughRestartCounter?: number;
  flyThroughSeekProgress?: number | null | undefined;
  onFlyThroughUpdateState?: (state: Partial<FlyThroughState>) => void;
  onFlyThroughFinished?: () => void;
}) {
  const cartoApiKey = (import.meta.env as Record<string, string | undefined>)["VITE_CARTO_API_KEY"] || "cb1_3m87_1_9a62d04449bdddc8bb5b8466";
  const cartoTileUrl = cartoApiKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoApiKey}`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
  const cartoDarkTileUrl = cartoApiKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png";

  // Filter state for SafeMove dataset visualization (corridors, police, hospitals, etc.)
  const [safeCategoryFilter, setSafeCategoryFilter] = useState<SafeCategoryFilter>("all");

  // Staggered loading: when changing nearby pin location, delay loading transit stops & live buses by ~280ms
  // so the pin drops and the coverage circle smoothly animates/glides into position on the map first.
  const [nearbyContentReady, setNearbyContentReady] = useState(false);
  const prevAnchorCoordRef = useRef<string>("");

  useEffect(() => {
    if (!nearbyAnchor) {
      setNearbyContentReady(false);
      prevAnchorCoordRef.current = "";
      return undefined;
    }

    const coordKey = `${nearbyAnchor.lat.toFixed(4)}_${nearbyAnchor.lon.toFixed(4)}`;
    if (prevAnchorCoordRef.current !== coordKey) {
      prevAnchorCoordRef.current = coordKey;
      setNearbyContentReady(false);
      const timer = setTimeout(() => {
        setNearbyContentReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [nearbyAnchor?.lat, nearbyAnchor?.lon]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${isFlyThroughActive ? "flythrough-3d-active" : ""}`}
      style={{
        cursor: (picking || nearbyMode) ? "crosshair" : undefined,
        perspective: isFlyThroughActive ? "950px" : "none",
        perspectiveOrigin: "50% 60%",
      }}
    >
      <div
        id="flythrough-3d-stage"
        className={isFlyThroughActive ? "absolute" : "h-full w-full"}
        style={{
          width: isFlyThroughActive ? "240%" : "100%",
          height: isFlyThroughActive ? "240%" : "100%",
          left: isFlyThroughActive ? "-70%" : "0%",
          top: isFlyThroughActive ? "-70%" : "0%",
          transformOrigin: "50% 50%",
          transformStyle: "preserve-3d",
          willChange: "transform",
          transition: isFlyThroughActive ? undefined : "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
          transform: isFlyThroughActive ? undefined : "scale(1) rotateX(0deg) rotateZ(0deg)",
        }}
      >
        <MapContainer
          center={NAGPUR_CENTER}
          zoom={NAGPUR_DEFAULT_ZOOM}
          minZoom={11}
          maxZoom={19}
          maxBounds={NAGPUR_OUTER_BOUNDS}
          maxBoundsViscosity={0.2}
          zoomControl={false}
          attributionControl={!isFlyThroughActive}
          preferCanvas={true}
          className="h-full w-full"
          scrollWheelZoom
          style={{ background: isDark ? "#242f3e" : "#eef2f4" }}
        >
      {/* ── Base Map Layer: Google Maps or Carto Map ── */}
      {mapStyle === "roadmap" ? (
        <TileLayer
          key={isDark ? "roadmap-dark" : "roadmap-light"}
          className={isDark ? "google-roadmap-dark-tiles" : "google-roadmap-light-tiles"}
          attribution="&copy; Google Maps"
          url={
            isDark
              ? `https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&apistyle=${GOOGLE_MAPS_NIGHT_MODE_APISTYLE}`
              : "https://mt{s}.google.com/vt/lyrs=r&x={x}&y={y}&z={z}"
          }
          subdomains={["0", "1", "2", "3"]}
          maxZoom={21}
        />
      ) : (
        <TileLayer
          key={isDark ? "carto-dark" : "carto-light"}
          className={isDark ? "carto-dark-tiles" : "carto-light-tiles"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={isDark ? cartoDarkTileUrl : cartoTileUrl}
          subdomains={["a", "b", "c", "d"]}
          maxZoom={20}
        />
      )}


      {/* Metro Line Polylines — ONLY shown when Metro toggle is clicked */}
      {showMetroStations &&
        allLines
          .filter((l) => l.mode === "metro")
          .map((l) => (
            <Polyline
              key={l.id}
              positions={(l.geometry ?? l.points).map((p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number])}
              pathOptions={{
                color: lineColor(l.mode, l.name),
                weight: 4.5,
                opacity: 0.85,
              }}
            >
              <Tooltip sticky>{l.name}</Tooltip>
            </Polyline>
          ))}

      {/* Bus Network Layer — progressively loaded routes and synchronized bus stop dots */}
      <ProgressiveBusNetworkLayer
        showBusStops={showBusStops}
        includeStopDots={devShowBusStopDots ?? DEV_SHOW_BUS_STOP_DOTS}
      />

      {/* Metro station dots — colour matches their line */}
      {showMetroStations &&
        metroStations.map((s) => {
          const parentLine = allLines.find(
            (l) => l.mode === "metro" && l.points.some((p: { lat: number; lon: number }) => p.lat === s.lat && p.lon === s.lon),
          );
          const color = parentLine ? (METRO_LINE_COLOR[parentLine.name] ?? MODE_COLOR["metro"] ?? "#e07a1f") : MODE_COLOR["metro"] ?? "#e07a1f";
          return (
            <CircleMarker
              key={`metro-stn-${s.id}`}
              center={[s.lat, s.lon]}
              radius={6}
              pathOptions={{
                color,
                fillColor: "#ffffff",
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Tooltip>{s.name}</Tooltip>
            </CircleMarker>
          );
        })}

      {/* ── Active Journey Polylines (Dual-Layer Cased Polylines + Animated Transit Flow) ── */}
      {!isFlyThroughActive && journey?.legs.map((leg, i) => {
        const isSafeModeJourney = Boolean(isSafeMode || (journey as { isSafeMode?: boolean })?.isSafeMode);

        const isWalk = leg.mode === "walk";
        const isDrive = leg.mode === "drive";
        const isMetro = leg.mode === "metro";
        const isTransferWalk = isWalk && (
          leg.isTransfer ||
          (i > 0 && i < (journey?.legs.length ?? 0) - 1 && journey?.legs[i - 1]?.mode !== "walk" && journey?.legs[i + 1]?.mode !== "walk") ||
          ((leg.distanceM ?? 0) <= 250 && i > 0 && i < (journey?.legs.length ?? 0) - 1)
        );

        const coreColor = isDrive
          ? (isSafeModeJourney ? SAFE_MODE_COLOR.drive : "#991b1b")
          : isMetro
          ? lineColor("metro", leg.line ?? "", isSafeModeJourney)
          : (isSafeModeJourney ? SAFE_MODE_COLOR.bus : (MODE_COLOR[leg.mode] ?? "#0d9488"));

        const positions = leg.path.map((p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number]);

        // Casing and core styling tuned for visual hierarchy
        const casingWeight = isTransferWalk ? 5 : isWalk ? 6.5 : (isDrive ? 8.5 : 9.5);
        const polylineColor = isTransferWalk
          ? (isSafeModeJourney ? SAFE_MODE_COLOR.transfer : "#8b5cf6")
          : isWalk
          ? (isSafeModeJourney ? SAFE_MODE_COLOR.walk : "#0284c7")
          : coreColor;

        const polylineDash = isTransferWalk
          ? "4 6"
          : isWalk
          ? "3 8"
          : undefined;

        return (
          <Fragment key={`journey-leg-${i}`}>
            {/* 1. Base Casing Layer: Crisp white outline + 3D shadow for elevated contrast against map */}
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#ffffff",
                weight: casingWeight,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
                className: "journey-casing-line",
              }}
            />

            {/* 2. Core Vibrant Transit Line */}
            <Polyline
              positions={positions}
              pathOptions={{
                color: polylineColor,
                weight: isTransferWalk ? 4 : isWalk ? 4.5 : (isDrive ? 5.5 : 6),
                dashArray: polylineDash,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
                className: isWalk ? "transit-walk-flow-animated" : undefined,
              }}
            >
              <Tooltip sticky>
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <span>
                    {isTransferWalk
                      ? `🔄 Station Transfer Walk (${leg.from} ➔ ${leg.to})`
                      : isWalk
                      ? (isSafeModeJourney
                          ? (leg.line ? `🛡️ Safe Walk (${leg.line})` : "🛡️ Safe Walk (Illuminated Corridor)")
                          : "🚶 Walk")
                      : isMetro
                      ? `🚇 ${leg.line ?? "Metro"}`
                      : `🚌 ${leg.busNumber ? `Bus ${leg.busNumber}` : "Aapli Bus"}`}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>
                    {Math.max(1, Math.round(leg.timeMin))} min ({leg.distanceM >= 1000 ? `${(leg.distanceM / 1000).toFixed(1)} km` : `${Math.round(leg.distanceM)} m`})
                  </span>
                </div>
              </Tooltip>
            </Polyline>

            {/* 3. Top Animated Transit Flow Pulse (Active energy beam traveling in direction of transit) */}
            {!isWalk && !isDrive && (
              <Polyline
                positions={positions}
                pathOptions={{
                  color: isSafeModeJourney ? "#ecfdf5" : "#ffffff",
                  weight: 2.5,
                  opacity: 0.85,
                  dashArray: "10 22",
                  lineCap: "round",
                  lineJoin: "round",
                  className: "transit-flow-animated",
                  interactive: false,
                }}
              />
            )}
          </Fragment>
        );
      })}

      {/* ── Active Journey Multimodal Milestone Badges (Boarding, Transfers & Alighting) ── */}
      {!journey?.isFallbackDrive &&
        journey?.legs
          .filter((l) => l.mode === "bus" || l.mode === "metro")
          .flatMap((leg, li, arr) => {
            const startPt = leg.path[0];
            const endPt = leg.path[leg.path.length - 1];
            const isInterchange = li > 0;
            const isFinal = li === arr.length - 1;
            const isSafeModeJourney = Boolean(isSafeMode || (journey as { isSafeMode?: boolean })?.isSafeMode);

          const pts = [];
          if (startPt) {
            pts.push({
              pt: startPt,
              type: isInterchange ? ("transfer" as const) : (leg.mode as "metro" | "bus"),
              title: leg.from,
              subtitle: leg.mode === "metro" ? (leg.line ?? "Metro Line") : (leg.busNumber ? `Bus ${leg.busNumber}` : "Aapli Bus"),
              busNumber: leg.busNumber,
              fullRouteName: leg.line,
              destination: leg.to,
              timeMin: leg.timeMin,
              fareRs: leg.fareRs,
              lineColor: leg.mode === "metro" ? lineColor("metro", leg.line ?? "", isSafeModeJourney) : undefined,
            });
          }
          if (endPt && isFinal) {
            pts.push({
              pt: endPt,
              type: "alight" as const,
              title: leg.to,
              subtitle: undefined,
              busNumber: undefined,
              fullRouteName: leg.line,
              destination: undefined,
              timeMin: undefined,
              fareRs: undefined,
              lineColor: "#10b981",
            });
          }
          return pts;
        })
        .map((milestone, idx) => (
          <Marker
            key={`journey-milestone-${idx}`}
            position={[milestone.pt.lat, milestone.pt.lon]}
            icon={createTransitMilestoneIcon({
              mode: milestone.type,
              title: milestone.title,
              subtitle: milestone.subtitle,
              busNumber: milestone.busNumber,
              fullRouteName: milestone.fullRouteName,
              destination: milestone.destination,
              timeMin: milestone.timeMin,
              fareRs: milestone.fareRs,
              lineColor: milestone.lineColor,
            })}
          />
        ))}

      {/* Origin / Source Pin — slender 3D green pushpin */}
      {origin && isCurrentLocation && (
        <>
          <Marker
            position={[origin.lat, origin.lon]}
            icon={createOriginMarkerIcon(true)}
          >
            <Tooltip direction="top" offset={[0, -12]}>Your Location (GPS)</Tooltip>
          </Marker>
          <FlyToLocation pos={origin} />
        </>
      )}
      {origin && !isCurrentLocation && (
        <Marker
          position={[origin.lat, origin.lon]}
          icon={createOriginMarkerIcon(false)}
        >
          <Tooltip direction="top" offset={[0, -32]}>{origin.name || "Source"}</Tooltip>
        </Marker>
      )}

      {/* Destination Pin — slender 3D red pushpin */}
      {destination && (
        <Marker
          position={[destination.lat, destination.lon]}
          icon={createDestinationMarkerIcon()}
        >
          <Tooltip direction="top" offset={[0, -32]}>{destination.name || "Destination"}</Tooltip>
        </Marker>
      )}

      {/* ── Google Maps Standalone Searched Location Pin & Popup ── */}
      {searchedLocation && (
        <>
          <CircleMarker
            center={[searchedLocation.lat, searchedLocation.lon]}
            radius={22}
            pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.18, weight: 0 }}
          />
          <Marker
            position={[searchedLocation.lat, searchedLocation.lon]}
            icon={createDestinationMarkerIcon()}
          >
            <Popup autoPan={true} offset={[0, -28]}>
              <div className="min-w-[190px] max-w-[240px] p-1 font-sans text-slate-900">
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-800">
                  📍 Pinned Location
                </span>
                <h4 className="mt-1 text-sm font-bold text-slate-900 leading-snug">
                  {searchedLocation.name || "Selected Location"}
                </h4>
                {searchedLocation.subtitle && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{searchedLocation.subtitle}</p>
                )}
                {onDirectionsToSearchedLocation && (
                  <button
                    type="button"
                    onClick={() =>
                      onDirectionsToSearchedLocation({
                        lat: searchedLocation.lat,
                        lon: searchedLocation.lon,
                        name: searchedLocation.name || "Searched Location",
                      })
                    }
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 cursor-pointer"
                  >
                    <span>Get Directions</span>
                  </button>
                )}
              </div>
            </Popup>
            <Tooltip direction="top" offset={[0, -32]} permanent={false}>
              {searchedLocation.name || "Searched Location"}
            </Tooltip>
          </Marker>
          <FlyToLocation pos={searchedLocation} />
        </>
      )}

      {/* Nearby anchor pin & search radius coverage circle (smoothly animated glide) */}
      {nearbyAnchor && (
        <>
          <AnimatedNearbyCircle anchor={nearbyAnchor} radiusM={nearbyRadiusM} />
          <FlyToLocation pos={nearbyAnchor} radiusM={nearbyRadiusM} />
        </>
      )}

      {/* Nearby transit markers: Stops mode (Concentric progressive loader radiating outward from inner circle) */}
      {nearbyAnchor && nearbyContentReady && nearbyTab === "stops" && (
        <ProgressiveNearbyStopsLayer
          key={`progressive-nearby-${nearbyAnchor.lat.toFixed(4)}_${nearbyAnchor.lon.toFixed(4)}_${nearbyRadiusM}`}
          stops={nearbyMarkers}
          radiusM={nearbyRadiusM}
        />
      )}

      {/* Nearby Live Buses Markers (Chalo-style moving bus pins with route badge) */}
      {nearbyAnchor && nearbyContentReady && nearbyTab === "buses" && (
        nearbyLiveBuses.map((bus) => (
          <NearbyLiveBusMarker
            key={`nearby-bus-${bus.id}`}
            bus={bus}
            isSelected={selectedNearbyBus?.id === bus.id || (Boolean(selectedNearbyBus?.vehicleId) && selectedNearbyBus?.vehicleId === bus.vehicleId)}
            onSelect={onSelectNearbyBus}
          />
        ))
      )}

      {/* ── Discovered Nearby POI Markers (Restaurants / Hospitals) ── */}
      {poiMarkers && poiMarkers.length > 0 && (
        <>
          <FitPoiMarkers userPos={origin || searchedLocation} pois={poiMarkers} />
          {poiMarkers.map((poi, idx) => {
            const isRestaurant = poi.category.toLowerCase().includes("restaurant");
            const isHospital = poi.category.toLowerCase().includes("hospital");
            const isPoliceStation = !isRestaurant && !isHospital;
            const icon = isRestaurant
              ? createRestaurantMarkerIcon()
              : isHospital
              ? createHospitalMarkerIcon()
              : createPoliceMarkerIcon();

            return (
              <Marker
                key={`poi-${poi.id}-${idx}`}
                position={[poi.lat, poi.lon]}
                icon={icon}
              >
                {/* ── Hover Tooltip: Official Card for Police Stations ── */}
                {isPoliceStation ? (
                  <Tooltip
                    direction="top"
                    offset={[0, -28]}
                    interactive={true}
                    className="leaflet-police-card-tooltip"
                  >
                    <OfficialPoliceStationCard
                      poi={poi}
                      onDirections={onDirectionsToPoi}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip direction="top" offset={[0, -28]}>
                    <div className="font-sans text-xs">
                      <span className="font-bold">{poi.name}</span>
                      <span className="ml-1 text-[10px] text-slate-500">
                        ({poi.distM < 1000 ? `${poi.distM}m` : `${(poi.distM / 1000).toFixed(1)}km`})
                      </span>
                    </div>
                  </Tooltip>
                )}

                {/* ── Click Popup ── */}
                {isPoliceStation ? (
                  <Popup autoPan={true} offset={[0, -24]} className="police-station-popup">
                    <OfficialPoliceStationCard
                      poi={poi}
                      onDirections={onDirectionsToPoi}
                    />
                  </Popup>
                ) : (
                  <Popup autoPan={true} offset={[0, -24]}>
                    <div className="min-w-[210px] max-w-[260px] p-1 font-sans text-slate-900">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                          isRestaurant ? "bg-orange-100 text-orange-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {isRestaurant ? "🍽️ Restaurant" : "🏥 Hospital"}
                        </span>
                        {typeof poi.rating === "number" && poi.rating > 0 && (
                          <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200/60">
                            <span className="text-amber-500 font-black">★</span>
                            <span>{poi.rating.toFixed(1)}</span>
                            {typeof poi.userRatingCount === "number" && poi.userRatingCount > 0 && (
                              <span className="text-slate-400 font-normal text-[8.5px]">
                                ({poi.userRatingCount > 999 ? `${(poi.userRatingCount / 1000).toFixed(1)}k` : poi.userRatingCount})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-slate-900 leading-snug">
                        {poi.name}
                      </h4>
                      {poi.subtitle && (
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-tight">{poi.subtitle}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-600 bg-slate-50 rounded-lg px-2 py-1">
                        <span>Distance from you:</span>
                        <span className="font-bold text-slate-900">
                          {poi.distM < 1000 ? `${poi.distM} m` : `${(poi.distM / 1000).toFixed(1)} km`}
                        </span>
                      </div>
                      {onDirectionsToPoi && (
                        <button
                          type="button"
                          onClick={() =>
                            onDirectionsToPoi({
                              lat: poi.lat,
                              lon: poi.lon,
                              name: poi.name,
                            })
                          }
                          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 cursor-pointer"
                        >
                          <Navigation className="size-3.5 rotate-45" />
                          <span>Plan Route Here</span>
                        </button>
                      )}
                    </div>
                  </Popup>
                )}
              </Marker>
            );
          })}
        </>
      )}

      {/* ── LIVE BUS TRACKING MAP OVERLAY ── */}
      {liveRoute && (
        <>
          {/* 1. Live Route Street-Level Polyline */}
          <Polyline
            positions={liveRoute.polyline}
            pathOptions={{
              color: "#0f172a",
              weight: 5.5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-bold">
                BUS {liveRoute.bus_number}: {liveRoute.route_name}
              </div>
            </Tooltip>
          </Polyline>

          {/* 2. All Sequenced Stops along Route */}
          {liveRoute.stops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === liveRoute.stops.length - 1;
            const isSelected = selectedLiveStop?.stop_id === stop.stop_id;
            const stopEtas = liveTelemetry?.stopsEta?.[stop.stop_id];
            const primaryEta = stopEtas?.[0];

            const color = isFirst ? "#16a34a" : isLast ? "#dc2626" : isSelected ? "#0284c7" : "#0f172a";
            const radius = isFirst || isLast ? 8 : isSelected ? 7 : 5;

            return (
              <CircleMarker
                key={`live-stop-${stop.stop_id || idx}`}
                center={[stop.lat, stop.lon]}
                radius={radius}
                eventHandlers={{
                  click: () => onSelectLiveStop?.(stop),
                }}
                pathOptions={{
                  color,
                  fillColor: isSelected ? "#0284c7" : "#ffffff",
                  fillOpacity: 1,
                  weight: isSelected ? 3 : 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  <div className="font-sans text-slate-900 min-w-[150px] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-800">
                        #{stop.stop_sequence}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        BUS STOP {isFirst ? "(Start)" : isLast ? "(End)" : ""}
                      </span>
                    </div>

                    <div className="text-xs font-bold leading-snug text-slate-900">
                      {stop.name}
                    </div>

                    {primaryEta && primaryEta.etaSeconds >= 0 ? (
                      <div className="mt-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800 shadow-2xs">
                            <span>🚌</span>
                            <span>{primaryEta.vNo}</span>
                          </div>
                          {primaryEta.dist > 0 && (
                            <span className="text-[10px] font-medium text-slate-500">
                              {primaryEta.dist < 1000 ? `${primaryEta.dist}m` : `${(primaryEta.dist / 1000).toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 font-bold text-sky-600">
                          <span className="text-[11px] font-extrabold">((•</span>
                          <span className="text-[11px] font-extrabold">{formatLiveEta(primaryEta.etaSeconds)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] font-medium text-slate-400">
                        Tap stop to check schedule
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* 3. Dedicated Popup Card for Selected Bus Stop */}
          {selectedLiveStop && (
            <Popup
              key={`live-stop-popup-${selectedLiveStop.stop_id}-${selectedLiveStop.lat}-${selectedLiveStop.lon}`}
              position={[selectedLiveStop.lat, selectedLiveStop.lon]}
              autoPan={true}
              offset={[0, -10]}
              eventHandlers={{
                remove: () => onSelectLiveStop?.(null),
              }}
            >
              <div className="min-w-[210px] max-w-[260px] p-1 font-sans text-slate-900">
                <div className="border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-800">
                      #{selectedLiveStop.stop_sequence}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Bus Stop
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold leading-snug text-slate-900">
                    {selectedLiveStop.name}
                  </h4>
                </div>

                {(() => {
                  const etas = liveTelemetry?.stopsEta?.[selectedLiveStop.stop_id];
                  if (etas && etas.length > 0) {
                    return (
                      <div className="mt-2 space-y-2">
                        {etas.map((etaItem, i) => (
                          <div
                            key={`eta-card-${etaItem.vNo}-${i}`}
                            className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2 text-xs shadow-2xs"
                          >
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-800 shadow-2xs">
                              <span className="text-xs">🚌</span>
                              <span>{etaItem.vNo}</span>
                            </div>

                            <div className="mt-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-sky-600">
                                <span className="text-xs font-extrabold">((•</span>
                                <span className="text-xs font-extrabold">{formatLiveEta(etaItem.etaSeconds)}</span>
                              </div>

                              {etaItem.dist > 0 && (
                                <span className="text-[10px] font-medium text-slate-500">
                                  {etaItem.dist < 1000 ? `${etaItem.dist}m away` : `${(etaItem.dist / 1000).toFixed(1)}km`}
                                </span>
                              )}
                            </div>

                            {etaItem.isHalted && (
                              <div className="mt-1 text-[10px] font-bold text-amber-600">
                                ⚠️ Bus is halted
                              </div>
                            )}
                          </div>
                        ))}

                        {/* View Timetable Button for selected stop */}
                        {onSelectBusTimetable && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectBusTimetable({
                                busNumber: liveRoute.display_bus_number || liveRoute.bus_number,
                                routeName: liveRoute.route_name,
                                fromStop: selectedLiveStop.name,
                                toStop: liveRoute.to_terminal,
                              });
                            }}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/90 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Clock className="size-3 text-indigo-600" />
                            <span>View Full Timetable</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="mt-2 rounded-xl border border-slate-200/90 bg-slate-50 p-2.5 text-center text-xs text-slate-600 shadow-2xs">
                      <p className="font-bold text-slate-800">No live bus approaching now</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Scheduled route service available</p>
                      {onSelectBusTimetable && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBusTimetable({
                              busNumber: liveRoute.display_bus_number || liveRoute.bus_number,
                              routeName: liveRoute.route_name,
                              fromStop: selectedLiveStop.name,
                              toStop: liveRoute.to_terminal,
                            });
                          }}
                          className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 cursor-pointer"
                        >
                          <Clock className="size-3.5" />
                          <span>View Timetable</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </Popup>
          )}

          {/* 4. Live Moving Bus Vehicle Markers */}
          {liveTelemetry?.vehicles?.map((v) => (
            <Marker
              key={`live-v-${v.vehicleId}`}
              position={[v.lat, v.lon]}
              icon={createLiveBusIcon(v.vNo, v.isHalted)}
            >
              <Tooltip>
                <div className="text-xs font-semibold">
                  <div className="font-bold">🚌 Vehicle {v.vNo}</div>
                  <div className="text-[10px] text-slate-500">
                    Status: {v.isHalted ? "⚠️ Halted" : "🟢 In Transit"}
                  </div>
                  {v.etaSeconds !== undefined && v.etaSeconds >= 0 && (
                    <div className="text-[10px] text-emerald-600 font-bold">
                      Next Stop ETA: {formatLiveEta(v.etaSeconds)}
                    </div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          ))}

          <FitLiveRoute route={liveRoute} />
          <FlyToLiveStop stop={selectedLiveStop} />
        </>
      )}

      {/* ── Standalone Uber Cab Options Layer (Live 2D Top-Down Moving Vehicles) ── */}
      {nearbyCabs && nearbyCabs.length > 0 && (
        <>
          {nearbyCabs
            .filter(
              (v) =>
                typeof v?.coordinate?.latitude === "number" &&
                !isNaN(v.coordinate.latitude) &&
                typeof v?.coordinate?.longitude === "number" &&
                !isNaN(v.coordinate.longitude)
            )
            .map((v) => (
              <Marker
                key={`uber-v-${v.id}`}
                position={[v.coordinate.latitude, v.coordinate.longitude]}
                icon={createUberVehicleIcon(v)}
              />
            ))}
        </>
      )}

      {/* Standalone Uber Cab Driving Route Polyline (Exact Road Navigation from polyline.json / OSRM) */}
      {(() => {
        const hasValidPolyline =
          Array.isArray(cabPolyline) &&
          cabPolyline.length >= 2 &&
          cabPolyline.every(
            (p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && !isNaN(p[0]) && typeof p[1] === "number" && !isNaN(p[1])
          );

        const hasValidOrigin =
          cabOrigin &&
          typeof cabOrigin.lat === "number" &&
          !isNaN(cabOrigin.lat) &&
          typeof cabOrigin.lon === "number" &&
          !isNaN(cabOrigin.lon);

        const hasValidDest =
          cabDestination &&
          typeof cabDestination.lat === "number" &&
          !isNaN(cabDestination.lat) &&
          typeof cabDestination.lon === "number" &&
          !isNaN(cabDestination.lon);

        if (!hasValidPolyline && !hasValidOrigin && !hasValidDest) return null;

        return (
          <>
            {/* Solid Black Road Driving Line matching Uber Web UI (rendered ONLY when real road polyline is ready) */}
            {hasValidPolyline && (
              <Polyline
                positions={cabPolyline}
                pathOptions={{
                  color: "#000000",
                  weight: 4.5,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            )}

            {/* Uber Pickup Banner Pin */}
            {hasValidOrigin && (
              <Marker
                position={[cabOrigin!.lat, cabOrigin!.lon]}
                icon={createUberPickupIcon(nearbyCabs[0]?.etaInMin || 3, cabOriginName)}
              />
            )}

            {/* Uber Dropoff Banner Pin */}
            {hasValidDest && (
              <Marker
                position={[cabDestination!.lat, cabDestination!.lon]}
                icon={createUberDropoffIcon(cabDestinationName)}
              />
            )}

            <FitCabRoute origin={cabOrigin} destination={cabDestination} polyline={cabPolyline} />
          </>
        );
      })()}

      {/* ── Dev Bus Route Inspector (Controlled by ENABLE_DEV_BUS_ROUTE_INSPECTOR toggle at top of file) ── */}
      {ENABLE_DEV_BUS_ROUTE_INSPECTOR && <DevBusRouteInspector />}

      {/* ── 3D Camera Route Fly-Through Controller ── */}
      {isFlyThroughActive && journey && (
        <RouteFlyThroughController
          journey={journey}
          isPlaying={isFlyThroughPlaying}
          speed={flyThroughSpeed}
          restartCounter={flyThroughRestartCounter}
          seekProgress={flyThroughSeekProgress}
          onUpdateState={onFlyThroughUpdateState || (() => {})}
          onFinished={onFlyThroughFinished || (() => {})}
        />
      )}

      {/* ── Nagpur SafeMove Dataset Layer (22 Lit Corridors & 77 Guardian Anchors) ── */}
      <SafeCorridorsLayer visible={showSafeCorridors} filter={safeCategoryFilter} />

      <ClickHandler onClick={onMapClick} />
      <NagpurBoundsWatcher isFlyThroughActive={isFlyThroughActive} />
      <FlyThroughSizeController isFlyThroughActive={isFlyThroughActive} />
      <Fit journey={journey} isFlyThroughActive={isFlyThroughActive} />
    </MapContainer>
    </div>

    {/* ── Floating Category Filter Pill Bar for SafeMove Dataset ── */}
    {showSafeCorridors && (
      <SafeCorridorFilterBar
        activeFilter={safeCategoryFilter}
        onSelectFilter={setSafeCategoryFilter}
        onClose={() => onToggleSafeCorridors?.()}
      />
    )}
    </div>
  );
}
