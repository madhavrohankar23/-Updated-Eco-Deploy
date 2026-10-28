import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  X,
  FastForward,
  Footprints,
  Bus,
  TrainFront,
  Car,
  Leaf,
  Clock,
  Navigation,
} from "lucide-react";
import type { Journey } from "@/lib/routing";

export interface TransferInfo {
  isTransferring: boolean;
  stationName: string;
  deboardMode: "walk" | "bus" | "metro" | "drive";
  deboardText: string;
  boardMode: "walk" | "bus" | "metro" | "drive";
  boardText: string;
  nextDestination: string;
}

export interface FlyThroughState {
  isActive: boolean;
  isPlaying: boolean;
  isFinished?: boolean | undefined;
  progress: number; // 0 to 1
  speed: 1 | 2 | 4;
  currentLegIndex: number;
  totalLegs: number;
  mode: "walk" | "bus" | "metro" | "drive";
  lineName: string;
  headline: string;
  subline: string;
  co2SavedKg: number;
  fromName: string;
  toName: string;
  elapsedTimeMin?: number | undefined;
  totalTimeMin?: number | undefined;
  transferInfo?: TransferInfo | null | undefined;
  activeTbtStepIndex?: number | undefined;
  distanceToNextTbtStepM?: number | undefined;
}

function fmtTime(min: number): string {
  const t = Math.max(0, Math.round(min));
  return t < 60 ? `${t} min` : `${Math.floor(t / 60)} h ${t % 60} min`;
}

export interface RouteFlyThroughHUDProps {
  state: FlyThroughState;
  journey?: Journey | null | undefined;
  onTogglePlayPause: () => void;
  onChangeSpeed: (speed: 1 | 2 | 4) => void;
  onRestart: () => void;
  onExit: () => void;
  onSeekProgress?: ((progress: number) => void) | undefined;
  isTbtOpen?: boolean | undefined;
  onToggleTbt?: (() => void) | undefined;
}

export default function RouteFlyThroughHUD({
  state,
  journey,
  onTogglePlayPause,
  onChangeSpeed,
  onRestart,
  onExit,
  onSeekProgress,
  isTbtOpen = false,
  onToggleTbt,
}: RouteFlyThroughHUDProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; cardX: number; cardY: number } | null>(null);

  // Keep card safely within viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (!prev || !cardRef.current) return prev;
        const cardWidth = cardRef.current.offsetWidth;
        const cardHeight = cardRef.current.offsetHeight;
        return {
          x: Math.max(10, Math.min(window.innerWidth - cardWidth - 10, prev.x)),
          y: Math.max(10, Math.min(window.innerHeight - cardHeight - 10, prev.y)),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!state.isActive) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore clicks on buttons, inputs, links to preserve instant button clicking
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) {
      return;
    }

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      cardX: rect.left,
      cardY: rect.top,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !cardRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const cardWidth = cardRef.current.offsetWidth;
    const cardHeight = cardRef.current.offsetHeight;

    const newX = dragRef.current.cardX + deltaX;
    const newY = dragRef.current.cardY + deltaY;

    // Boundary constraints: keep card inside screen with 10px safe margins
    const clampedX = Math.max(10, Math.min(window.innerWidth - cardWidth - 10, newX));
    const clampedY = Math.max(10, Math.min(window.innerHeight - cardHeight - 10, newY));

    setPos({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null;
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const getModeBadge = () => {
    switch (state.mode) {
      case "metro": {
        const isAqua =
          state.lineName.toLowerCase().includes("aqua") ||
          state.lineName.toLowerCase().includes("blue");
        let label = "Maha Metro";
        if (
          state.lineName &&
          !state.lineName.toLowerCase().includes("pedestrian") &&
          !state.lineName.toLowerCase().includes("walk")
        ) {
          label = state.lineName.startsWith("Maha") ? state.lineName : `Maha Metro (${state.lineName})`;
        }
        return {
          icon: TrainFront,
          label,
          colorClass: isAqua
            ? "bg-[#00aaff]/15 text-[#0088cc] dark:text-[#38bdf8] border-[#00aaff]/30"
            : "bg-[#ff6a00]/15 text-[#ea580c] dark:text-[#fb923c] border-[#ff6a00]/30",
          iconColor: isAqua ? "text-[#0088cc] dark:text-[#38bdf8]" : "text-[#ea580c] dark:text-[#fb923c]",
        };
      }
      case "bus": {
        let label = "Aapli Bus";
        if (
          state.lineName &&
          !state.lineName.toLowerCase().includes("pedestrian") &&
          !state.lineName.toLowerCase().includes("walk")
        ) {
          label = state.lineName.startsWith("Aapli") ? state.lineName : `Aapli Bus (${state.lineName})`;
        }
        return {
          icon: Bus,
          label,
          colorClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
          iconColor: "text-teal-600 dark:text-teal-400",
        };
      }
      case "drive":
        return {
          icon: Car,
          label: "Direct Driving Route",
          colorClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
          iconColor: "text-slate-600 dark:text-slate-400",
        };
      case "walk":
      default:
        return {
          icon: Footprints,
          label: "Pedestrian Walk",
          colorClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        };
    }
  };

  const badge = getModeBadge();
  const ModeIcon = badge.icon;
  const percent = Math.min(100, Math.max(0, Math.round(state.progress * 100)));

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        touchAction: "none",
        ...(pos
          ? {
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: "none",
            }
          : {}),
      }}
      className={`fixed z-[1050] w-[calc(100%-2rem)] max-w-lg ${
        !pos ? "top-5 left-1/2 -translate-x-1/2" : ""
      } ${
        isDragging
          ? "cursor-grabbing select-none"
          : "cursor-grab"
      }`}
    >
      <div
        className={`rounded-3xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-md transition-shadow duration-200 ${
          isDragging ? "shadow-primary/25 ring-2 ring-primary/40" : ""
        }`}
      >
        {/* Sleek Draggable Pill Handle */}
        <div
          className="flex items-center justify-center -mt-1.5 mb-2.5 py-0.5 cursor-grab active:cursor-grabbing group"
          title="Drag to reposition card anywhere"
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 group-active:bg-primary transition-all duration-200" />
        </div>

        {/* Top Header: Badge + Stage + Interchange + Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.colorClass}`}
            >
              <ModeIcon className={`size-3.5 ${badge.iconColor}`} />
              <span className="truncate max-w-[150px]">{badge.label}</span>
            </span>

            <span className="inline-flex items-center rounded-full bg-secondary/80 border border-border/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
              Stage {state.currentLegIndex + 1} of {state.totalLegs}
            </span>

            {state.transferInfo?.isTransferring && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary animate-pulse whitespace-nowrap">
                Interchange
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {state.co2SavedKg > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                <Leaf className="size-3 text-emerald-600" />
                {state.co2SavedKg.toFixed(2)} kg CO₂
              </span>
            )}
            <button
              onClick={onExit}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              title="Exit 3D Preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Live Headline, Corridor Info & Turn-by-Turn Navigation Trigger */}
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-foreground leading-snug truncate">
              {state.headline}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {state.subline}
            </p>
          </div>

          {/* Turn-by-Turn Navigation Button in Red-Circled Area */}
          {journey && (
            <button
              type="button"
              onClick={onToggleTbt}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer border ${
                isTbtOpen
                  ? "bg-primary text-primary-foreground border-primary shadow-primary/20 ring-2 ring-primary/30"
                  : "bg-secondary/80 hover:bg-secondary text-foreground hover:text-primary border-border/80"
              }`}
              title={isTbtOpen ? "Hide Turn-by-Turn Navigation Widget" : "Open Turn-by-Turn Navigation Widget (Upper-Right)"}
            >
              <Navigation className={`size-3.5 ${isTbtOpen ? "fill-current" : "text-primary"}`} />
              <span>Turn-by-Turn</span>
            </button>
          )}
        </div>

        {/* Progress & Live Travel Time Bar */}
        <div className="mt-3 rounded-2xl bg-secondary/35 border border-border/60 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            {/* Travel Time counter: starts at 0 min and counts up to total time */}
            {typeof state.totalTimeMin === "number" && state.totalTimeMin > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-950/60 border border-blue-500/25 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                  <Clock className="size-3 text-blue-600 dark:text-blue-400" />
                  <span className="tabular-nums">{fmtTime(state.elapsedTimeMin || 0)}</span>
                  <span className="text-muted-foreground/60 font-normal">/</span>
                  <span className="text-muted-foreground font-medium">{fmtTime(state.totalTimeMin)}</span>
                </span>
              </div>
            ) : (
              <div />
            )}

            <span className="font-mono text-xs font-bold text-foreground tabular-nums">
              {percent}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-primary transition-all duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground mt-1.5">
            <span className="truncate max-w-[180px]">{state.fromName}</span>
            <span className="truncate max-w-[180px] text-right">{state.toName}</span>
          </div>
        </div>

        {/* Control bar */}
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
          <div className="flex items-center gap-2">
            {/* Play / Pause / Go to Start Button */}
            <button
              onClick={state.isFinished ? onRestart : onTogglePlayPause}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              {state.isFinished ? (
                <>
                  <RotateCcw className="size-3.5" />
                  <span>Go to Start</span>
                </>
              ) : state.isPlaying ? (
                <>
                  <Pause className="size-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : state.progress > 0 ? (
                <>
                  <Play className="size-3.5 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5 fill-current" />
                  <span>Start</span>
                </>
              )}
            </button>

            {/* Restart Button (Visible only mid-flight when not finished) */}
            {!state.isFinished && state.progress > 0 && (
              <button
                onClick={onRestart}
                className="flex items-center gap-1 rounded-xl border border-border bg-secondary/40 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition active:scale-95 cursor-pointer"
                title="Restart from Origin"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </button>
            )}
          </div>

          {/* Speed Multiplier Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-secondary/30 p-0.5 text-xs font-bold">
            {([1, 2, 4] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`rounded-lg px-2 py-1 transition cursor-pointer ${
                  state.speed === spd
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
