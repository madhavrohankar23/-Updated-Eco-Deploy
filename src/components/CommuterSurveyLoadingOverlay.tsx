import React, { useState, useEffect } from "react";
import {
  Compass,
  Target,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface ProcessingPhaseItem {
  title: string;
  badge: string;
  iconType: "compass" | "target" | "trending" | "sparkles";
}

const PROCESSING_PHASES: ProcessingPhaseItem[] = [
  {
    title: "Analyzing your daily Nagpur commute patterns...",
    badge: "Commuter Analysis",
    iconType: "compass",
  },
  {
    title: "Prioritizing your commute priorities & corridors...",
    badge: "Commuter Optimization",
    iconType: "target",
  },
  {
    title: "Estimating your monthly fuel & carbon savings...",
    badge: "Estimating Savings",
    iconType: "trending",
  },
  {
    title: "Upgrading your personalized Eco-Move experience...",
    badge: "Upgrading Experience",
    iconType: "sparkles",
  },
];

interface CommuterSurveyLoadingOverlayProps {
  isVisible: boolean;
  onFinished: () => void;
  durationMs?: number;
}

export default function CommuterSurveyLoadingOverlay({
  isVisible,
  onFinished,
  durationMs = 4600,
}: CommuterSurveyLoadingOverlayProps) {
  const [progress, setProgress] = useState<number>(0);
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [typedHeadline, setTypedHeadline] = useState<string>("");
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setPhaseIndex(0);
      setTypedHeadline("");
      setIsFinishing(false);
      return;
    }

    const startTime = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const currentProgress = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setProgress(currentProgress);

      const totalPhases = PROCESSING_PHASES.length;
      const phaseDuration = durationMs / totalPhases; // ~1150ms per phase
      const currentIdx = Math.min(totalPhases - 1, Math.floor(elapsed / phaseDuration));
      setPhaseIndex(currentIdx);

      const currentPhase = PROCESSING_PHASES[currentIdx] ?? PROCESSING_PHASES[0]!;
      const phaseElapsed = elapsed - currentIdx * phaseDuration;
      // Typewriter: type characters smoothly across first 72% of phase time, hold for remaining 28%
      const typingWindow = phaseDuration * 0.72;
      const typingRatio = Math.min(1, phaseElapsed / typingWindow);
      const targetCharCount = Math.floor(typingRatio * currentPhase.title.length);
      setTypedHeadline(currentPhase.title.slice(0, targetCharCount));

      if (elapsed < durationMs) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        // Complete 100%
        setProgress(100);
        const lastPhase = PROCESSING_PHASES[totalPhases - 1] ?? PROCESSING_PHASES[0]!;
        setTypedHeadline(lastPhase.title);
        setIsFinishing(true);

        // Brief 400ms celebration checkmark before fading out the blurred overlay
        setTimeout(() => {
          onFinished();
        }, 450);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible, durationMs, onFinished]);

  if (!isVisible) return null;

  const activePhase = PROCESSING_PHASES[phaseIndex] ?? PROCESSING_PHASES[0]!;

  return (
    <div
      className={`fixed inset-0 z-[1200] flex flex-col items-center justify-center p-6 backdrop-blur-[5px] bg-[#0c1322]/55 text-white select-none pointer-events-auto transition-opacity duration-300 ${
        isFinishing ? "opacity-95" : "opacity-100 animate-in fade-in"
      }`}
      style={{
        // 5px glass blur ensures map streets, metro lines & landmarks remain clearly visible with a cool dark tone
        WebkitBackdropFilter: "blur(5px)",
      }}
    >
      {/* ── 1. Floating Concentric Loading Icon & Cool Tone Core ── */}
      <div className="relative mb-5">
        {/* Outer dashed spinning ring */}
        <div className="size-20 sm:size-24 rounded-full border-2 border-dashed border-emerald-400/45 animate-[spin_8s_linear_infinite]" />

        {/* Middle glowing pulse ring */}
        <div className="absolute inset-1 rounded-full border border-emerald-300/25 animate-pulse" />

        {/* Center circle with cool emerald/teal gradient */}
        <div className="absolute inset-2.5 rounded-full bg-gradient-to-br from-[#059669] via-[#047857] to-[#065f46] shadow-xl shadow-slate-950/70 border border-emerald-400/30 flex items-center justify-center text-white">
          {progress === 100 ? (
            <CheckCircle2 className="size-8 text-emerald-200 animate-in zoom-in-50 duration-200" />
          ) : (
            <>
              {activePhase.iconType === "compass" && (
                <Compass className="size-7 animate-bounce text-emerald-100" />
              )}
              {activePhase.iconType === "target" && (
                <Target className="size-7 animate-pulse text-emerald-100" />
              )}
              {activePhase.iconType === "trending" && (
                <TrendingUp className="size-7 animate-pulse text-emerald-100" />
              )}
              {activePhase.iconType === "sparkles" && (
                <Sparkles className="size-7 animate-spin text-emerald-100" />
              )}
            </>
          )}
        </div>

        {/* Percentage badge */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/90 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 shadow-md">
          {progress}%
        </div>
      </div>

      {/* ── 2. Typewriter Headline (Smaller size, normal bold/semibold, no heavy shadow) ── */}
      <div className="w-full max-w-2xl min-h-[3rem] flex items-center justify-center px-4 mt-2 mb-2 text-center">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white tracking-normal leading-relaxed drop-shadow-sm">
          {progress === 100 ? "Preferences Optimized & Ready! 🚀" : typedHeadline}
          {progress < 100 && (
            <span className="inline-block w-0.5 h-4 sm:h-5 bg-emerald-400 ml-1.5 translate-y-0.5 animate-pulse" />
          )}
        </h2>
      </div>

      {/* ── 3. Slightly Broad Loading Bar with Cool Tones ── */}
      <div className="w-full max-w-xl space-y-2 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Nagpur Commute Intelligence
          </span>
          <span className="text-emerald-400 font-extrabold">{progress}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-950/75 overflow-hidden p-0.5 border border-slate-700/60 backdrop-blur-sm shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── 4. Status Pills in a Balanced 4-Column Grid Matching Broad Bar Width ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-xl text-center">
        {PROCESSING_PHASES.map((phase, idx) => {
          const isDone = idx < phaseIndex || progress === 100;
          const isActive = idx === phaseIndex && progress < 100;
          return (
            <div
              key={phase.badge}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all ${
                isDone
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-xs"
                  : isActive
                  ? "bg-slate-800/90 text-white border border-emerald-400/50 shadow-md ring-1 ring-emerald-400/30"
                  : "bg-slate-900/60 text-slate-400 border border-slate-700/50"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              ) : isActive ? (
                <span className="size-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              ) : (
                <span className="size-2 rounded-full bg-slate-500 shrink-0" />
              )}
              <span className="truncate">{phase.badge}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
