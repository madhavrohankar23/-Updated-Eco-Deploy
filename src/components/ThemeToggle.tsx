import React from "react";
import { Sun, Moon } from "lucide-react";

export interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
}

export default function ThemeToggle({
  theme,
  onToggle,
  className = "",
}: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`fixed top-5 right-5 z-[1070] select-none flex size-11 items-center justify-center rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 active:scale-95 cursor-pointer group ${
        isDark
          ? "border-cyan-500/40 bg-[#0f1b33]/95 text-amber-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:border-cyan-400 hover:shadow-[0_0_28px_rgba(56,189,248,0.4)]"
          : "border-slate-200/90 bg-white/95 text-slate-700 shadow-xl shadow-slate-900/5 hover:border-slate-300 hover:bg-white hover:text-slate-900"
      } ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        // When in dark mode, show Sun icon to switch to light mode
        <Sun className="size-5 transition-transform duration-300 group-hover:rotate-45 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] stroke-[2.2]" />
      ) : (
        // When in light mode, show Moon icon to switch to dark mode
        <Moon className="size-5 transition-transform duration-300 group-hover:-rotate-12 text-slate-700 stroke-[2.2]" />
      )}
    </button>
  );
}
