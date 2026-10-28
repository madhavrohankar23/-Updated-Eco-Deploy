import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Leaf, Sun, Moon, Sparkles } from "lucide-react";

export default function Navbar({ visible = true }: { visible?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("eco_move_theme");
      if (saved === "dark" || saved === "light") return saved;
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("eco_move_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
      }`}
    >
      <div className="px-5 sm:px-8 lg:px-10 pt-5 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-3 bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 border border-white/80 dark:border-border px-5 py-3 transition duration-300 hover:scale-105"
        >
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-md shadow-emerald-200/50 text-white">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-nagpur-navy dark:text-white leading-tight tracking-tight">
              Eco Move
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-[0.2em] leading-tight">
              Nagpur
            </span>
          </div>
        </Link>

        {/* Top-Right Theme Toggle (Icon Only) */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex size-11 items-center justify-center rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 active:scale-95 cursor-pointer group ${
            theme === "dark"
              ? "border-cyan-500/40 bg-[#0f1b33]/95 text-amber-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:border-cyan-400 hover:shadow-[0_0_28px_rgba(56,189,248,0.4)]"
              : "border-slate-200/90 bg-white/95 text-slate-700 shadow-xl shadow-slate-900/5 hover:border-slate-300 hover:bg-white hover:text-slate-900"
          }`}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="size-5 transition-transform duration-300 group-hover:rotate-45 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] stroke-[2.2]" />
          ) : (
            <Moon className="size-5 transition-transform duration-300 group-hover:-rotate-12 text-slate-700 stroke-[2.2]" />
          )}
        </button>
      </div>
    </nav>
  );
}

