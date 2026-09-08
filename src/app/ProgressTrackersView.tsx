"use client";

import React from "react";
import {
  getWeeklyCycleStats,
  getSession5hStats,
} from "./progressTrackers";

interface ProgressTrackersViewProps {
  now: Date;
  einkMode: boolean;
  colorTheme: string;
  autoColorCss?: string;
  fontFamily?: string;
  themeTextClass: string;
  t5StartTime: number;
  onResetT5: () => void;
  deductShabbat?: boolean;
  percentDirection?: "elapsed" | "remaining";
}

export function ProgressTrackersView({
  now,
  einkMode,
  colorTheme,
  autoColorCss,
  fontFamily,
  themeTextClass,
  t5StartTime,
  onResetT5,
  deductShabbat = true,
  percentDirection = "elapsed",
}: ProgressTrackersViewProps) {
  const weekly = getWeeklyCycleStats(now, { deductShabbat });
  const t5 = getSession5hStats(t5StartTime, now);

  const weeklyPct =
    percentDirection === "elapsed"
      ? weekly.percentageElapsed
      : 100 - weekly.percentageElapsed;

  const t5Pct =
    percentDirection === "elapsed"
      ? t5.percentageElapsed
      : 100 - t5.percentageElapsed;

  const weeklyPctDisplay = `${weeklyPct.toFixed(1)}%`;
  const t5PctDisplay = `${t5Pct.toFixed(1)}%`;

  // Bar fill color based on active theme
  const getBarFillStyle = () => {
    if (einkMode) {
      return { backgroundColor: "#000000" };
    }
    if (colorTheme === "auto" && autoColorCss) {
      return {
        backgroundColor: autoColorCss,
        boxShadow: `0 0 10px ${autoColorCss}80`,
      };
    }
    if (colorTheme === "sunset") {
      return {
        backgroundColor: "rgb(251, 146, 60)", // orange-400
        boxShadow: "0 0 10px rgba(251, 146, 60, 0.4)",
      };
    }
    if (colorTheme === "stone") {
      return {
        backgroundColor: "rgb(214, 211, 209)", // stone-300
        boxShadow: "0 0 10px rgba(214, 211, 209, 0.3)",
      };
    }
    // amber
    return {
      backgroundColor: "rgb(251, 191, 36)", // amber-400
      boxShadow: "0 0 10px rgba(251, 191, 36, 0.4)",
    };
  };

  const barFillStyle = getBarFillStyle();

  return (
    <div
      className={`w-full max-w-sm sm:max-w-md flex flex-col gap-3.5 p-3.5 sm:p-4 rounded-2xl select-none transition-all duration-500 ${
        einkMode
          ? "bg-white border border-black/30"
          : "bg-neutral-950/40 backdrop-blur-md border border-neutral-800/50 shadow-lg shadow-black/40"
      }`}
      style={{ fontFamily }}
    >
      {/* 1. Weekly Tracker Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span
            className={`font-medium tracking-wide ${
              einkMode ? "text-black opacity-90" : `${themeTextClass} opacity-90`
            }`}
            style={{ color: einkMode ? "#000000" : autoColorCss }}
          >
            מחזור שבועי (ב׳ 06:00)
          </span>
          <span
            className={`font-mono text-xs font-semibold ${
              einkMode ? "text-black" : themeTextClass
            }`}
            style={{ color: einkMode ? "#000000" : autoColorCss }}
            dir="ltr"
          >
            {weeklyPctDisplay}
          </span>
        </div>

        {/* Linear Track */}
        <div
          className={`w-full h-2 rounded-full overflow-hidden ${
            einkMode
              ? "bg-neutral-200 border border-black/20"
              : "bg-neutral-800/80 border border-neutral-700/40"
          }`}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, weekly.percentageElapsed))}%`,
              ...barFillStyle,
            }}
          />
        </div>

        {/* Details / Status */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] opacity-60">
          {weekly.isCurrentlyShabbat && deductShabbat ? (
            <span className="text-amber-300 font-medium">
              🕯️ כעת שבת קודש - השעון מושהה
            </span>
          ) : (
            <>
              <span>חלפו {weekly.elapsedHebrew}</span>
              <span>נותרו {weekly.remainingHebrew}</span>
            </>
          )}
        </div>
      </div>

      {/* Subtle Divider */}
      <div
        className={`h-[1px] w-full ${
          einkMode ? "bg-black/15" : "bg-neutral-800/60"
        }`}
      />

      {/* 2. 5-Hour Session Timer Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium tracking-wide ${
                einkMode ? "text-black opacity-90" : `${themeTextClass} opacity-90`
              }`}
              style={{ color: einkMode ? "#000000" : autoColorCss }}
            >
              סשן 5 שעות
            </span>
            <button
              onClick={onResetT5}
              title="התחל סשן 5 שעות מחדש"
              aria-label="איפוס טיימר 5 שעות"
              className={`p-1 rounded-md text-[10px] sm:text-xs transition-colors border ${
                einkMode
                  ? "border-black/30 hover:bg-black/10 text-black"
                  : "border-neutral-700/50 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              ↻ איפוס
            </button>
          </div>
          <span
            className={`font-mono text-xs font-semibold ${
              einkMode ? "text-black" : themeTextClass
            }`}
            style={{ color: einkMode ? "#000000" : autoColorCss }}
            dir="ltr"
          >
            {t5PctDisplay}
          </span>
        </div>

        {/* Linear Track */}
        <div
          className={`w-full h-2 rounded-full overflow-hidden ${
            einkMode
              ? "bg-neutral-200 border border-black/20"
              : "bg-neutral-800/80 border border-neutral-700/40"
          }`}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, t5.percentageElapsed))}%`,
              ...barFillStyle,
            }}
          />
        </div>

        {/* Details / Status */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] opacity-60">
          {t5.isFinished ? (
            <span className="text-emerald-400 font-medium">
              🏆 הסתיים הסשן (5 שעות)
            </span>
          ) : (
            <>
              <span dir="ltr">חלפו {t5.elapsedDigital}</span>
              <span dir="ltr">נותרו {t5.remainingDigital}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
