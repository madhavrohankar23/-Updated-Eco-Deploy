import React, { useState, useMemo, memo } from "react";
import { Polyline, Circle, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import safeData from "@/data/nagpur_safe_corridors.json";
import {
  ShieldCheck,
  PhoneCall,
  X,
  Sparkles,
} from "lucide-react";

export type SafeCategoryFilter =
  | "all"
  | "corridors"
  | "police"
  | "hospitals"
  | "pharmacies"
  | "fuel"
  | "women_kiosks";

interface GuardianAnchor {
  id: string;
  name: string;
  type: string;
  zone: string;
  lat: number;
  lon: number;
  radius_meters: number;
  safety_boost: number;
  phone?: string;
  features?: string[];
}

interface LitArterialCorridor {
  id: string;
  name: string;
  region: string;
  aliases: string[];
  lighting_tier: string;
  safety_rating: number;
  patrolled: boolean;
  spine_waypoints: [number, number][];
}

const GUARDIAN_ANCHORS = (safeData.guardian_anchors || []) as GuardianAnchor[];
const LIT_CORRIDORS = (safeData.lit_arterial_corridors || []) as LitArterialCorridor[];

// Icon cache to avoid creating DOM icons on every render
const anchorIconCache = new Map<string, L.DivIcon>();

function getAnchorIcon(type: string): L.DivIcon {
  const cached = anchorIconCache.get(type);
  if (cached) return cached;

  let bgGradient = "linear-gradient(135deg, #1e3a8a, #3b82f6)";
  let borderColor = "#60a5fa";
  let symbol = "🚓";
  let shadowColor = "rgba(59, 130, 246, 0.4)";

  switch (type) {
    case "police_station":
    case "police_outpost":
      bgGradient = "linear-gradient(135deg, #1e1b4b, #312e81)";
      borderColor = "#818cf8";
      symbol = "🚓";
      shadowColor = "rgba(99, 102, 241, 0.45)";
      break;
    case "24x7_hospital_cluster":
      bgGradient = "linear-gradient(135deg, #881337, #e11d48)";
      borderColor = "#fb7185";
      symbol = "🏥";
      shadowColor = "rgba(244, 63, 94, 0.45)";
      break;
    case "24x7_pharmacy_cluster":
      bgGradient = "linear-gradient(135deg, #581c87, #9333ea)";
      borderColor = "#c084fc";
      symbol = "💊";
      shadowColor = "rgba(168, 85, 247, 0.45)";
      break;
    case "24x7_fuel_commercial":
      bgGradient = "linear-gradient(135deg, #78350f, #d97706)";
      borderColor = "#fbbf24";
      symbol = "⛽";
      shadowColor = "rgba(245, 158, 11, 0.45)";
      break;
    case "women_safe_transit_kiosk":
      bgGradient = "linear-gradient(135deg, #831843, #db2777)";
      borderColor = "#f472b6";
      symbol = "🛡️";
      shadowColor = "rgba(236, 72, 153, 0.45)";
      break;
    default:
      bgGradient = "linear-gradient(135deg, #064e3b, #059669)";
      borderColor = "#34d399";
      symbol = "⭐";
      shadowColor = "rgba(16, 185, 129, 0.45)";
      break;
  }

  const icon = L.divIcon({
    className: "guardian-anchor-divicon",
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -50%);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: ${bgGradient};
          border: 2px solid ${borderColor};
          box-shadow: 0 4px 12px ${shadowColor}, 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          user-select: none;
        ">
          ${symbol}
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  anchorIconCache.set(type, icon);
  return icon;
}

function getAnchorColor(type: string): string {
  switch (type) {
    case "police_station":
    case "police_outpost":
      return "#4f46e5";
    case "24x7_hospital_cluster":
      return "#e11d48";
    case "24x7_pharmacy_cluster":
      return "#9333ea";
    case "24x7_fuel_commercial":
      return "#d97706";
    case "women_safe_transit_kiosk":
      return "#db2777";
    default:
      return "#059669";
  }
}

function formatAnchorTypeLabel(type: string): { label: string; badgeClass: string } {
  switch (type) {
    case "police_station":
      return { label: "Police Station", badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" };
    case "police_outpost":
      return { label: "PCR Outpost", badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" };
    case "24x7_hospital_cluster":
      return { label: "24x7 Trauma Hospital", badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" };
    case "24x7_pharmacy_cluster":
      return { label: "24x7 Chemist Strip", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" };
    case "24x7_fuel_commercial":
      return { label: "24x7 Fuel Station", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" };
    case "women_safe_transit_kiosk":
      return { label: "Women Transit Kiosk", badgeClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30" };
    default:
      return { label: "Guardian Anchor", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" };
  }
}

interface SafeCorridorsLayerProps {
  visible: boolean;
  filter?: SafeCategoryFilter;
}

export const SafeCorridorsLayer = memo(function SafeCorridorsLayer({
  visible,
  filter = "all",
}: SafeCorridorsLayerProps) {
  const filteredAnchors = useMemo(() => {
    if (!visible) return [];
    if (filter === "corridors") return [];
    return GUARDIAN_ANCHORS.filter((a) => {
      if (filter === "all") return true;
      if (filter === "police") return a.type === "police_station" || a.type === "police_outpost";
      if (filter === "hospitals") return a.type === "24x7_hospital_cluster";
      if (filter === "pharmacies") return a.type === "24x7_pharmacy_cluster";
      if (filter === "fuel") return a.type === "24x7_fuel_commercial";
      if (filter === "women_kiosks") return a.type === "women_safe_transit_kiosk";
      return true;
    });
  }, [visible, filter]);

  const showCorridors = visible && (filter === "all" || filter === "corridors");

  if (!visible) return null;

  return (
    <>
      {/* ── 1. 22 ILLUMINATED PRIMARY ARTERIAL CORRIDORS ── */}
      {showCorridors &&
        LIT_CORRIDORS.map((corridor) => (
          <React.Fragment key={`corridor-group-${corridor.id}`}>
            {/* Luminous Glow Aura (High-Mast Street Lighting Radius) */}
            <Polyline
              positions={corridor.spine_waypoints}
              pathOptions={{
                color: "#10b981",
                weight: 14,
                opacity: 0.24,
                lineCap: "round",
                lineJoin: "round",
              }}
            />

            {/* Core Illuminated Spine */}
            <Polyline
              positions={corridor.spine_waypoints}
              pathOptions={{
                color: "#059669",
                weight: 4.5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Tooltip sticky>
                <div className="p-1 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{corridor.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      🛡️ {Math.round(corridor.safety_rating * 100)}% Safety Score
                    </span>
                    <span>•</span>
                    <span>{corridor.region}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400">
                    {corridor.patrolled
                      ? "🚓 24x7 Police PCR Patrols Active"
                      : "💡 High-Mast Municipal LED Lighting"}
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="p-2 space-y-2 min-w-[240px]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      ⚡ Safe Arterial Corridor
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      {Math.round(corridor.safety_rating * 100)}% Protected
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground">{corridor.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{corridor.region}</p>
                  </div>

                  <div className="rounded-xl bg-secondary/50 p-2 text-[10px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Lighting Tier:</span>
                      <span className="font-semibold capitalize text-foreground">
                        {corridor.lighting_tier.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Night Patrolled:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {corridor.patrolled ? "Yes (PCR Van)" : "Standard Beat"}
                      </span>
                    </div>
                  </div>

                  {corridor.aliases && corridor.aliases.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      <span className="font-semibold">Covers:</span> {corridor.aliases.slice(0, 3).join(", ")}
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        ))}

      {/* ── 2. 77 GUARDIAN ANCHORS & SAFETY BUFFERS ── */}
      {filteredAnchors.map((anchor) => {
        const { label, badgeClass } = formatAnchorTypeLabel(anchor.type);
        const color = getAnchorColor(anchor.type);

        return (
          <React.Fragment key={`anchor-group-${anchor.id}`}>
            {/* Protective Pedestrian Security Zone Buffer */}
            <Circle
              center={[anchor.lat, anchor.lon]}
              radius={anchor.radius_meters}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: "3 6",
              }}
            />

            {/* Anchor DivIcon Marker */}
            <Marker
              position={[anchor.lat, anchor.lon]}
              icon={getAnchorIcon(anchor.type)}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <span>{anchor.name}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {label} • {anchor.zone}
                </div>
              </Tooltip>

              <Popup>
                <div className="p-2 space-y-2.5 min-w-[250px]">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                      {label}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{Math.round(anchor.safety_boost * 100)}% Boost
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground leading-snug">{anchor.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{anchor.zone}</p>
                  </div>

                  {anchor.phone && (
                    <a
                      href={`tel:${anchor.phone.replace(/[^0-9]/g, "")}`}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <PhoneCall className="size-3.5" />
                      <span>{anchor.phone} (24x7 Helpline)</span>
                    </a>
                  )}

                  {anchor.features && anchor.features.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Verified Safety Features:</span>
                      <div className="flex flex-wrap gap-1">
                        {anchor.features.map((feat, fIdx) => (
                          <span
                            key={fIdx}
                            className="rounded-md bg-secondary px-1.5 py-0.5 text-[9.5px] font-medium text-secondary-foreground"
                          >
                            ✓ {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border/60 pt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Protected Perimeter:</span>
                    <span className="font-semibold text-foreground">~{anchor.radius_meters}m Radius</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
});

interface SafeCorridorFilterBarProps {
  activeFilter: SafeCategoryFilter;
  onSelectFilter: (filter: SafeCategoryFilter) => void;
  onClose: () => void;
}

export function SafeCorridorFilterBar({
  activeFilter,
  onSelectFilter,
  onClose,
}: SafeCorridorFilterBarProps) {
  const categories: { id: SafeCategoryFilter; label: string; count: number; icon: string }[] = [
    { id: "all", label: "All Safe Elements", count: 99, icon: "🛡️" },
    { id: "corridors", label: "Lit Corridors", count: 22, icon: "⚡" },
    { id: "police", label: "Police & PCR", count: 35, icon: "🚓" },
    { id: "hospitals", label: "24x7 Trauma", count: 17, icon: "🏥" },
    { id: "pharmacies", label: "24x7 Chemists", count: 9, icon: "💊" },
    { id: "fuel", label: "24x7 Fuel Hubs", count: 11, icon: "⛽" },
    { id: "women_kiosks", label: "Women Kiosks", count: 5, icon: "🛡️" },
  ];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1180] flex max-w-[95vw] items-center gap-1.5 overflow-x-auto rounded-2xl border border-emerald-500/40 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-emerald-500/30 dark:bg-slate-900/95 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-1.5 pl-2 pr-1 border-r border-slate-200 dark:border-slate-800">
        <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-xs font-bold text-foreground whitespace-nowrap">Nagpur SafeMove Dataset</span>
      </div>

      <div className="flex items-center gap-1">
        {categories.map((cat) => {
          const active = activeFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectFilter(cat.id)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                active
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold"
                  : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                  active ? "bg-white/25 text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="ml-1 flex size-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800 transition cursor-pointer"
        title="Close SafeMove Dataset Overlay"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
