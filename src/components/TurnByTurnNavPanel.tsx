import React, { useEffect, useRef } from "react";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Footprints,
  TrainFront,
  Bus,
  Car,
  Flag,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  Maximize2,
  Minimize2,
  ListOrdered,
} from "lucide-react";
import {
  type NavigationStep,
  type ManeuverType,
  formatStepDistance,
} from "@/lib/turnByTurn";

interface TurnByTurnNavPanelProps {
  steps: NavigationStep[];
  activeStepIndex: number;
  distanceToNextStepM: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onSeekStep?: (stepIndex: number) => void;
}

export function ManeuverIcon({
  type,
  mode,
  className = "size-5",
}: {
  type: ManeuverType;
  mode?: "walk" | "bus" | "metro" | "drive" | undefined;
  className?: string | undefined;
}) {
  switch (type) {
    case "depart":
      return <MapPin className={className} />;
    case "straight":
      return <ArrowUp className={className} />;
    case "turn-left":
    case "turn-slight-left":
    case "turn-sharp-left":
      return <CornerUpLeft className={className} />;
    case "turn-right":
    case "turn-slight-right":
    case "turn-sharp-right":
      return <CornerUpRight className={className} />;
    case "u-turn":
      return <RotateCcw className={className} />;
    case "board-metro":
      return <TrainFront className={className} />;
    case "board-bus":
      return <Bus className={className} />;
    case "deboard-transfer":
      return <Footprints className={className} />;
    case "arrive":
      return <Flag className={className} />;
    default:
      return mode === "metro" ? (
        <TrainFront className={className} />
      ) : mode === "bus" ? (
        <Bus className={className} />
      ) : mode === "drive" ? (
        <Car className={className} />
      ) : (
        <Footprints className={className} />
      );
  }
}

function getManeuverBadgeColor(type: ManeuverType, mode: "walk" | "bus" | "metro" | "drive") {
  if (type === "arrive") return "bg-emerald-600 text-white shadow-emerald-500/30";
  if (type === "board-metro" || mode === "metro") return "bg-blue-600 text-white shadow-blue-500/30";
  if (type === "board-bus" || mode === "bus") return "bg-teal-600 text-white shadow-teal-500/30";
  if (mode === "drive") return "bg-slate-700 text-white shadow-slate-500/30";
  return "bg-primary text-primary-foreground shadow-primary/30";
}

export default function TurnByTurnNavPanel({
  steps,
  activeStepIndex,
  distanceToNextStepM,
  isExpanded,
  onToggleExpand,
  onClose,
  onSeekStep,
}: TurnByTurnNavPanelProps) {
  const activeStepElRef = useRef<HTMLDivElement | null>(null);
  const activeStep = steps[activeStepIndex] || steps[0];

  // Auto-scroll expanded list to active step as 3D camera advances
  useEffect(() => {
    if (isExpanded && activeStepElRef.current) {
      activeStepElRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeStepIndex, isExpanded]);

  if (!steps || steps.length === 0 || !activeStep) return null;

  const badgeColor = getManeuverBadgeColor(activeStep.type, activeStep.mode);
  const isFinalStep = activeStepIndex >= steps.length - 1;
  const isDepart = activeStep.type === "depart";
  const isBoarding = activeStep.type === "board-bus" || activeStep.type === "board-metro";
  const isNow = distanceToNextStepM < 25 && !isFinalStep && !isDepart && !isBoarding;

  const distanceLabel = isFinalStep
    ? "Arriving"
    : isDepart
    ? "Start"
    : isBoarding
    ? "Board now"
    : isNow
    ? "Now"
    : `In ${formatStepDistance(distanceToNextStepM)}`;

  return (
    <aside
      aria-label="Turn by Turn Navigation"
      className="fixed top-18 right-5 z-[1060] select-none pointer-events-auto transition-all duration-300 animate-in fade-in zoom-in-95"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. SMALL SQUARE CARD VIEW (Default when collapsed)
          ───────────────────────────────────────────────────────────── */}
      {!isExpanded ? (
        <div
          className="w-44 h-44 rounded-3xl border border-primary/35 bg-card/95 shadow-2xl backdrop-blur-xl p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-primary/25 hover:border-primary/60 group"
          title="Turn-by-Turn Navigation · Click 'View full' to expand all turns"
        >
          {/* Top row: Maneuver Icon badge + Close button */}
          <div className="flex items-start justify-between gap-2">
            <div
              className={`size-11 rounded-2xl flex items-center justify-center shadow-md ${badgeColor} transition-transform group-hover:scale-105`}
            >
              <ManeuverIcon type={activeStep.type} mode={activeStep.mode} className="size-6" />
            </div>

            <div className="flex items-center gap-1">
              <span className="rounded-full bg-secondary/80 border border-border/80 px-2 py-0.5 text-[9px] font-black text-muted-foreground whitespace-nowrap">
                {activeStepIndex + 1}/{steps.length}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                title="Close Navigation Card"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Middle: Live countdown distance + short instruction */}
          <div className="my-1 min-w-0">
            <div className="text-base font-black tracking-tight text-primary tabular-nums leading-tight">
              {distanceLabel}
            </div>
            <div
              className="mt-0.5 text-xs font-bold text-foreground leading-tight line-clamp-2"
              title={activeStep.instruction}
            >
              {activeStep.instruction}
            </div>
          </div>

          {/* Bottom row: 'View full' expand trigger */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 py-1.5 px-2 text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Expand to view full turn-by-turn route directions"
          >
            <ListOrdered className="size-3.5" />
            <span>View full</span>
            <Maximize2 className="size-3 opacity-70" />
          </button>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            2. EXPANDED FULL DIRECTIONS PANEL (Google Maps Style)
            ───────────────────────────────────────────────────────────── */
        <div className="w-84 sm:w-96 max-h-[calc(100vh-4rem)] rounded-3xl border border-primary/35 bg-card/95 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-300">
          {/* Header Banner: Current Maneuver & Controls */}
          <div className="p-3.5 bg-gradient-to-r from-primary/15 via-secondary/40 to-transparent border-b border-border/60">
            <div className="flex items-center justify-between gap-2.5">
              <div
                className={`size-11 shrink-0 rounded-2xl flex items-center justify-center shadow-md ${badgeColor}`}
              >
                <ManeuverIcon type={activeStep.type} mode={activeStep.mode} className="size-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black tracking-tight text-primary tabular-nums">
                    {distanceLabel}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Step {activeStepIndex + 1} of {steps.length}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-foreground leading-snug truncate mt-0.5">
                  {activeStep.instruction}
                </h5>
                {activeStep.subInstruction && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {activeStep.subInstruction}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="flex items-center gap-1 rounded-xl bg-secondary/80 hover:bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-foreground transition active:scale-95 cursor-pointer border border-border/80"
                  title="Collapse to small square card"
                >
                  <Minimize2 className="size-3" />
                  <span>Square</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                  title="Close Navigation Panel"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Subheader: Mode & Steps count */}
          <div className="px-3.5 py-2 flex items-center justify-between border-b border-border/40 text-[11px] font-bold text-muted-foreground bg-secondary/15">
            <div className="flex items-center gap-1.5">
              <Compass className="size-3.5 text-primary" />
              <span>Route Directions & Turns</span>
            </div>
            <span>{steps.length} total steps</span>
          </div>

          {/* Scrollable Timeline matching Google Maps Screenshot */}
          <div className="p-3 overflow-y-auto space-y-1.5 max-h-[58vh] scrollbar-thin">
            {steps.map((step, idx) => {
              const isCurrent = idx === activeStepIndex;
              const isPassed = idx < activeStepIndex;
              const stepBadge = getManeuverBadgeColor(step.type, step.mode);

              return (
                <div
                  key={step.id}
                  ref={isCurrent ? activeStepElRef : null}
                  onClick={() => onSeekStep?.(idx)}
                  className={`group relative flex items-start gap-2.5 rounded-2xl p-2.5 transition-all cursor-pointer border ${
                    isCurrent
                      ? "bg-primary/15 border-primary/50 shadow-md ring-1 ring-primary/40"
                      : isPassed
                      ? "bg-secondary/20 border-transparent opacity-65 hover:opacity-100"
                      : "bg-card/50 hover:bg-card border-border/40 hover:border-border"
                  }`}
                  title="Click to jump 3D camera to this turn"
                >
                  {/* Step Icon */}
                  <div className="relative flex flex-col items-center shrink-0">
                    <div
                      className={`size-8 rounded-xl flex items-center justify-center shadow-xs ${
                        isCurrent
                          ? `${stepBadge} ring-2 ring-primary/40 scale-105`
                          : isPassed
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-secondary text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <ManeuverIcon type={step.type} mode={step.mode} className="size-4" />
                      )}
                    </div>
                  </div>

                  {/* Step Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`text-xs leading-snug truncate ${
                          isCurrent ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                        }`}
                      >
                        {step.instruction}
                      </span>
                      {step.distanceM > 0 && (
                        <span className="text-[10px] font-mono font-bold text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatStepDistance(step.distanceM)}
                        </span>
                      )}
                    </div>

                    {step.subInstruction && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {step.subInstruction}
                      </p>
                    )}

                    {isCurrent && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-black text-primary animate-pulse">
                          ● Current Turn
                        </span>
                        {distanceToNextStepM > 0 && (
                          <span className="text-[9px] font-medium text-muted-foreground tabular-nums">
                            {formatStepDistance(distanceToNextStepM)} remaining
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="p-2.5 border-t border-border/40 bg-secondary/20 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Click any turn to jump camera</span>
            <button
              type="button"
              onClick={onToggleExpand}
              className="font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <Minimize2 className="size-3" />
              <span>Collapse to square</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
