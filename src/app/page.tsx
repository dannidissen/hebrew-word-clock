"use client";

import React, { useState, useEffect, useRef } from "react";
import { convertTimeToHebrewWords, stripNiqqud } from "./hebrewTimeHelper";
import { useLocation } from "./useLocation";
import { useWeather } from "./useWeather";
import { getCurrentZmanPeriod, getAutoThemeColor } from "./solarTimes";
import type { WeatherIconKind, HourlyForecast } from "./useWeather";

type ColorTheme = "amber" | "stone" | "sunset" | "auto";
type FontChoice = "assistant" | "david" | "frank" | "secular";

const FONT_FAMILY_VAR: Record<FontChoice, string> = {
  assistant: "var(--font-assistant)",
  david: "var(--font-david-libre)",
  frank: "var(--font-frank-ruhl-libre)",
  secular: "var(--font-secular-one)",
};

// Picks 3 evenly-spaced points from the next ~12 hours, instead of dumping
// the full 24-hour list — a glance-able summary rather than a data table.
function forecastCheckpoints(hourly: HourlyForecast[]): HourlyForecast[] {
  const spacing = 4; // hours between checkpoints
  const count = 3;
  const picks: HourlyForecast[] = [];
  for (let i = 1; i <= count; i++) {
    const hour = hourly[i * spacing];
    if (hour) picks.push(hour);
  }
  return picks;
}

// Minimal stroke icons for the weather readout, one per WeatherIconKind.
// currentColor lets them inherit the active theme's text color.
function WeatherIcon({ kind, className }: { kind: WeatherIconKind; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "clear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
        </svg>
      );
    case "partly-cloudy":
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3.5" />
          <path d="M9 2.5v1.5M4.5 5l1 1M2.5 9.5H4" />
          <path d="M8.5 19h8a3.7 3.7 0 0 0 .5-7.36A5 5 0 0 0 7.3 13.2 3.5 3.5 0 0 0 8.5 19Z" />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path d="M6 8.5a4.5 4.5 0 0 1 8.65-1.73A3.7 3.7 0 0 1 19 10.5" />
          <path d="M3.5 14h17M5.5 17.5h13M7.5 21h9" />
        </svg>
      );
    case "drizzle":
      return (
        <svg {...common}>
          <path d="M6.5 12h9a3.7 3.7 0 0 0 .5-7.36A5 5 0 0 0 5.3 6.2 3.5 3.5 0 0 0 6.5 12Z" />
          <path d="M8 16v2M12 16v2M16 16v2" />
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path d="M6.5 11h9a3.7 3.7 0 0 0 .5-7.36A5 5 0 0 0 5.3 5.2 3.5 3.5 0 0 0 6.5 11Z" />
          <path d="M7.5 15.5 6 19M12 15.5 10.5 19M16.5 15.5 15 19" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path d="M6.5 11h9a3.7 3.7 0 0 0 .5-7.36A5 5 0 0 0 5.3 5.2 3.5 3.5 0 0 0 6.5 11Z" />
          <path d="M8 15.5v4M6 17.5h4M15 15.5v4M13 17.5h4" />
        </svg>
      );
    case "thunder":
      return (
        <svg {...common}>
          <path d="M6.5 10.5h9a3.7 3.7 0 0 0 .5-7.36A5 5 0 0 0 5.3 4.7a3.5 3.5 0 0 0 1.2 5.8Z" />
          <path d="m13 13-3 5h3l-2 4" />
        </svg>
      );
    case "cloudy":
    default:
      return (
        <svg {...common}>
          <path d="M6.5 17h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.6 10.06 3.75 3.75 0 0 0 6.5 17Z" />
        </svg>
      );
  }
}

export default function ClockPage() {
  const [time, setTime] = useState<Date | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isFading, setIsFading] = useState<boolean>(false);

  // Settings states loaded from localStorage on mount
  const [preciseMode, setPreciseMode] = useState<boolean>(false);
  const [niqqudMode, setNiqqudMode] = useState<boolean>(true);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("amber");
  const [zmanimMode, setZmanimMode] = useState<boolean>(false);
  const [fontChoice, setFontChoice] = useState<FontChoice>("assistant");
  const [weatherMode, setWeatherMode] = useState<boolean>(false);

  // Only prompt for GPS when a feature that actually needs it is on.
  const wantsLocation = zmanimMode || weatherMode || colorTheme === "auto";
  const location = useLocation(wantsLocation);
  const weather = useWeather(location, weatherMode);

  // Wake Lock states
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean>(true);

  // Fullscreen states (hides the browser chrome — great on tablets)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenSupported, setFullscreenSupported] = useState<boolean>(false);
  const [fullscreenMessage, setFullscreenMessage] = useState<string | null>(null);

  // Idle state to auto-hide UI settings controls
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize settings from localStorage on mount
  useEffect(() => {
    setWakeLockSupported("wakeLock" in navigator);

    // Fullscreen is unavailable on e.g. iOS Safari (no non-video fullscreen).
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    setFullscreenSupported(
      document.fullscreenEnabled ||
        typeof docEl.webkitRequestFullscreen === "function"
    );

    // Read stored preferences
    const storedPrecise = localStorage.getItem("preciseMode");
    if (storedPrecise !== null) setPreciseMode(storedPrecise === "true");

    const storedNiqqud = localStorage.getItem("niqqudMode");
    if (storedNiqqud !== null) setNiqqudMode(storedNiqqud === "true");

    const storedTheme = localStorage.getItem("colorTheme") as ColorTheme;
    if (
      storedTheme !== null &&
      ["amber", "stone", "sunset", "auto"].includes(storedTheme)
    ) {
      setColorTheme(storedTheme);
    }

    const storedZmanim = localStorage.getItem("zmanimMode");
    if (storedZmanim !== null) setZmanimMode(storedZmanim === "true");

    const storedFont = localStorage.getItem("fontChoice") as FontChoice;
    if (
      storedFont !== null &&
      ["assistant", "david", "frank", "secular"].includes(storedFont)
    ) {
      setFontChoice(storedFont);
    }

    const storedWeather = localStorage.getItem("weatherMode");
    if (storedWeather !== null) setWeatherMode(storedWeather === "true");
  }, []);

  // 1b. Clock ticker.
  // Instead of a blind 1s interval (which re-renders 60x/min even though the
  // words change at most once a minute), we poll each second but only push a
  // new `time` — triggering a render — when the rendered phrase actually
  // changes. The timeout re-aligns to the real second boundary each tick so it
  // never drifts. Re-runs when preciseMode changes so the phrase updates at once.
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let lastPhrase = "";

    const tick = () => {
      const now = new Date();
      const phrase = convertTimeToHebrewWords(
        now.getHours(),
        now.getMinutes(),
        preciseMode,
        now.getSeconds()
      );
      if (phrase !== lastPhrase) {
        lastPhrase = phrase;
        setTime(now);
      }
      // Align the next tick to the upcoming second boundary (no drift).
      timeoutId = setTimeout(tick, 1000 - now.getMilliseconds());
    };

    tick();
    return () => clearTimeout(timeoutId);
  }, [preciseMode]);

  // 2. Wake Lock handlers
  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      setWakeLock(lock);
      setWakeLockActive(true);

      lock.addEventListener("release", () => {
        setWakeLockActive(false);
        setWakeLock(null);
      });
    } catch (err) {
      console.error("Failed to request wake lock:", err);
      setWakeLockActive(false);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setWakeLockActive(false);
    }
  };

  const toggleWakeLock = () => {
    if (wakeLockActive) {
      releaseWakeLock();
    } else {
      requestWakeLock();
    }
  };

  // 2b. Fullscreen handling (with a webkit fallback for older WebKit engines)
  const toggleFullscreen = async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    try {
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) await docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
        else throw new Error("Fullscreen API not present");

        // Some Android browsers (notably Amazon Silk) resolve the promise
        // without ever actually entering fullscreen — no error, no effect.
        // Catch that silent no-op so the user gets feedback instead of a
        // button that appears to do nothing.
        if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
          throw new Error("Fullscreen request had no effect");
        }
      } else {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      }
    } catch (err) {
      console.error("Failed to toggle fullscreen:", err);
      setFullscreenMessage(
        "מסך מלא לא נתמך בדפדפן הזה. נסה/י להוסיף את האתר למסך הבית — כך הוא ייפתח במסך מלא אוטומטית."
      );
      setTimeout(() => setFullscreenMessage(null), 6000);
    }
  };

  // Keep the button state in sync with the actual fullscreen status (covers the
  // user leaving fullscreen via the system back gesture or the Esc key).
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const handleChange = () => {
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  // Re-request wake lock if window regains focus/visibility
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockActive && document.visibilityState === "visible") {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [wakeLockActive]);

  // 3. User inactivity idle detector
  useEffect(() => {
    const resetIdleTimer = () => {
      setIsIdle(false);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 5000); // 5 seconds of absolute silence to hide UI controls
    };

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("mousedown", resetIdleTimer);
    window.addEventListener("touchstart", resetIdleTimer);
    window.addEventListener("keydown", resetIdleTimer);

    resetIdleTimer();

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("mousedown", resetIdleTimer);
      window.removeEventListener("touchstart", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
    };
  }, []);

  // 4. Save options to localStorage on change
  const handlePreciseToggle = () => {
    setPreciseMode((prev) => {
      const next = !prev;
      localStorage.setItem("preciseMode", String(next));
      return next;
    });
  };

  const handleNiqqudToggle = () => {
    setNiqqudMode((prev) => {
      const next = !prev;
      localStorage.setItem("niqqudMode", String(next));
      return next;
    });
  };

  const handleThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme);
    localStorage.setItem("colorTheme", theme);
  };

  const handleZmanimToggle = () => {
    setZmanimMode((prev) => {
      const next = !prev;
      localStorage.setItem("zmanimMode", String(next));
      return next;
    });
  };

  const handleFontChange = (font: FontChoice) => {
    setFontChoice(font);
    localStorage.setItem("fontChoice", font);
  };

  const handleWeatherToggle = () => {
    setWeatherMode((prev) => {
      const next = !prev;
      localStorage.setItem("weatherMode", String(next));
      return next;
    });
  };

  // 5. Compute correct Hebrew phrasing
  const targetText = time
    ? convertTimeToHebrewWords(
        time.getHours(),
        time.getMinutes(),
        preciseMode,
        time.getSeconds()
      )
    : "";
  const processedText = niqqudMode ? targetText : stripNiqqud(targetText);

  // 5b. Current halachic period (e.g. "זְמַן קְרִיאַת שְׁמַע"), shown at all
  // times when enabled — with its end time, since a deadline is what's
  // actually useful, not just naming the period.
  const zmanPeriod =
    zmanimMode && time
      ? getCurrentZmanPeriod(time, location.latitude, location.longitude)
      : null;
  const zmanEndsAtLabel = zmanPeriod?.endsAt
    ? zmanPeriod.endsAt.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const zmanLabelRaw = zmanPeriod
    ? zmanEndsAtLabel
      ? `${zmanPeriod.label} · עד ${zmanEndsAtLabel}`
      : zmanPeriod.label
    : null;
  const zmanLabel = zmanLabelRaw
    ? niqqudMode
      ? zmanLabelRaw
      : stripNiqqud(zmanLabelRaw)
    : null;

  // 5c. "Auto" theme color, drifting with the sun's altitude
  const autoColor =
    colorTheme === "auto" && time
      ? getAutoThemeColor(time, location.latitude, location.longitude)
      : null;
  const autoColorCss = autoColor
    ? `rgb(${autoColor.r}, ${autoColor.g}, ${autoColor.b})`
    : undefined;

  // 6. Smooth transition handling
  useEffect(() => {
    if (!processedText) return;
    if (displayedText === "") {
      setDisplayedText(processedText);
      return;
    }
    if (displayedText !== processedText) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayedText(processedText);
        setIsFading(false);
      }, 600); // Matches the duration of the transition opacity
      return () => clearTimeout(timer);
    }
  }, [processedText, displayedText]);

  // 7. Styling mappings based on theme state
  const getThemeTextClass = () => {
    switch (colorTheme) {
      case "stone":
        return "text-stone-300";
      case "sunset":
        return "text-orange-200";
      case "auto":
        return ""; // color comes from the inline auto-color style instead
      case "amber":
      default:
        return "text-amber-100";
    }
  };

  const getThemeTextShadow = () => {
    switch (colorTheme) {
      case "stone":
        return "0 0 14px rgba(214, 211, 209, 0.25)";
      case "sunset":
        return "0 0 14px rgba(254, 215, 170, 0.25)";
      case "auto":
        return autoColor
          ? `0 0 16px rgba(${autoColor.r}, ${autoColor.g}, ${autoColor.b}, 0.3)`
          : "0 0 14px rgba(254, 243, 199, 0.25)";
      case "amber":
      default:
        return "0 0 14px rgba(254, 243, 199, 0.25)";
    }
  };

  // Scale the clock with the screen instead of fixed breakpoints, and let
  // short phrases (rounded mode) run larger than long precise-mode ones so
  // both fill the display without overflowing. The vh term caps the size on
  // wide-landscape tablets; the rem bounds keep phones and desktops sane.
  const phraseLength = stripNiqqud(displayedText || "טוען...").length;
  const vwFactor = phraseLength <= 16 ? 15 : phraseLength <= 26 ? 13 : 10.5;
  const clockFontSize = `clamp(3rem, min(${vwFactor}vw, 20vh), 12rem)`;

  const getThemeButtonActive = () => {
    switch (colorTheme) {
      case "stone":
        return "border-stone-500 text-stone-200";
      case "sunset":
        return "border-orange-400 text-orange-200";
      case "auto":
        return "border-sky-200 text-sky-100";
      case "amber":
      default:
        return "border-amber-400 text-amber-100";
    }
  };

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen w-full bg-black select-none relative overflow-hidden transition-colors duration-1000 px-6"
      style={{ cursor: isIdle ? "none" : "default" }}
    >
      {/* Weather corner readout */}
      {weatherMode && weather && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-10 flex flex-col gap-2 max-w-sm">
          {/* Current weather pill */}
          <div
            className={`flex items-center gap-2 rounded-full border border-neutral-900/60 bg-neutral-950/40 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium tracking-wide select-none transition-opacity duration-700 ${getThemeTextClass()} ${
              isIdle ? "opacity-50" : "opacity-95"
            }`}
          >
            <WeatherIcon kind={weather.icon} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <span dir="ltr">{weather.temperatureC}°</span>
            <span className="opacity-50">·</span>
            <span>
              {niqqudMode ? weather.description : stripNiqqud(weather.description)}
            </span>
          </div>

          {/* Minimal forecast summary — a few checkpoints, not a full scroll */}
          {weather.hourly.length > 0 && (
            <div
              className={`flex items-center justify-center gap-3 sm:gap-4 rounded-full border border-neutral-900/60 bg-neutral-950/40 backdrop-blur-md px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm select-none transition-opacity duration-700 ${getThemeTextClass()} ${
                isIdle ? "opacity-40" : "opacity-80"
              }`}
            >
              {forecastCheckpoints(weather.hourly).map((hour) => (
                <div
                  key={hour.time.getTime()}
                  className="flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <span className="opacity-60">
                    {hour.time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                  <WeatherIcon kind={hour.icon} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span dir="ltr" className="font-medium">
                    {hour.temperatureC}°
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visual Clock Screen Wrapper to Prevent Shift */}
      <section className="flex flex-col items-center justify-center min-h-[45vh] w-full max-w-7xl gap-3">
        <h1
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={displayedText ? stripNiqqud(displayedText) : "טוען"}
          className={`leading-[1.45] font-medium tracking-wide text-center transition-[opacity,color] ease-in-out select-none ${
            displayedText ? getThemeTextClass() : "text-neutral-600"
          } ${isFading ? "opacity-0" : "opacity-100"}`}
          style={{
            fontSize: clockFontSize,
            fontFamily: FONT_FAMILY_VAR[fontChoice],
            color: displayedText ? autoColorCss : undefined,
            textShadow: displayedText ? getThemeTextShadow() : "none",
            transitionDuration: "500ms, 3000ms",
          }}
        >
          <span className="flex flex-wrap items-baseline justify-center gap-x-[0.3em] gap-y-2">
            {(displayedText || "טוען...").split(" ").map((word, i) => (
              <span
                key={`${displayedText}-${i}`}
                className="inline-block animate-word-in"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {word}
              </span>
            ))}
          </span>
        </h1>

        {/* Poetic zman label — appears only around dawn/sunrise/twilight/nightfall */}
        <p
          aria-live="polite"
          className={`text-lg sm:text-xl md:text-2xl font-light tracking-[0.2em] text-center transition-[opacity,color] duration-700 ease-in-out select-none ${getThemeTextClass()} ${
            zmanLabel ? "opacity-70" : "opacity-0"
          }`}
          style={{ color: autoColorCss, fontFamily: FONT_FAMILY_VAR[fontChoice] }}
        >
          {zmanLabel || " "}
        </p>
      </section>

      {/* Floating minimal settings footer */}
      <footer
        className={`fixed bottom-6 left-0 right-0 flex flex-col items-center gap-4 transition-all duration-700 px-4 z-50 ${
          isIdle ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl bg-neutral-950/40 backdrop-blur-md border border-neutral-900/60 p-2.5 rounded-full shadow-2xl">
          {/* Mode rounded/precise toggle */}
          <button
            onClick={handlePreciseToggle}
            className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider transition-all duration-300 border ${
              preciseMode
                ? getThemeButtonActive()
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {preciseMode ? "מוד דקות: מדויק" : "מוד דקות: פואטי"}
          </button>

          {/* Niqqud toggle */}
          <button
            onClick={handleNiqqudToggle}
            className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider transition-all duration-300 border ${
              niqqudMode
                ? getThemeButtonActive()
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {niqqudMode ? "ניקוד: מופעל" : "ניקוד: כבוי"}
          </button>

          {/* Zmanim (Jewish daily times) toggle */}
          <button
            onClick={handleZmanimToggle}
            className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider transition-all duration-300 border ${
              zmanimMode
                ? getThemeButtonActive()
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            זמני היום
          </button>

          {/* Weather corner readout toggle */}
          <button
            onClick={handleWeatherToggle}
            className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider transition-all duration-300 border ${
              weatherMode
                ? getThemeButtonActive()
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            מזג אוויר
          </button>

          {/* Screen Sleep toggle */}
          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider transition-all duration-300 border flex items-center gap-2 ${
                wakeLockActive
                  ? getThemeButtonActive()
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wakeLockActive ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"
                }`}
              />
              {wakeLockActive ? "מסך ער" : "מנע שינה"}
            </button>
          )}

          {/* Fullscreen toggle */}
          {fullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "צא ממסך מלא" : "מסך מלא"}
              className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider transition-all duration-300 border ${
                isFullscreen
                  ? getThemeButtonActive()
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {isFullscreen ? "צא ממסך מלא" : "מסך מלא"}
            </button>
          )}

          {/* Separation line */}
          <span className="h-4 w-[1px] bg-neutral-800 mx-1 hidden sm:inline" />

          {/* Color theme selectors */}
          <div className="flex items-center gap-1.5 px-2">
            <button
              onClick={() => handleThemeChange("amber")}
              className={`w-4 h-4 rounded-full bg-amber-200/90 border transition-transform duration-300 ${
                colorTheme === "amber"
                  ? "scale-125 border-white"
                  : "border-transparent hover:scale-110"
              }`}
              title="ענבר"
            />
            <button
              onClick={() => handleThemeChange("stone")}
              className={`w-4 h-4 rounded-full bg-stone-300 border transition-transform duration-300 ${
                colorTheme === "stone"
                  ? "scale-125 border-white"
                  : "border-transparent hover:scale-110"
              }`}
              title="אבן"
            />
            <button
              onClick={() => handleThemeChange("sunset")}
              className={`w-4 h-4 rounded-full bg-orange-200/95 border transition-transform duration-300 ${
                colorTheme === "sunset"
                  ? "scale-125 border-white"
                  : "border-transparent hover:scale-110"
              }`}
              title="שקיעה"
            />
            <button
              onClick={() => handleThemeChange("auto")}
              className={`w-4 h-4 rounded-full border transition-transform duration-300 ${
                colorTheme === "auto"
                  ? "scale-125 border-white"
                  : "border-transparent hover:scale-110"
              }`}
              style={{
                background:
                  "conic-gradient(from 180deg, #60748f, #a582ba, #fb923c, #fde047, #fef3c7, #60748f)",
              }}
              title="אוטומטי (לפי אור היום)"
            />
          </div>

          {/* Separation line */}
          <span className="h-4 w-[1px] bg-neutral-800 mx-1 hidden sm:inline" />

          {/* Font selectors */}
          <div className="flex items-center gap-1 px-1">
            {(
              [
                { key: "assistant", label: "רגיל" },
                { key: "david", label: "דוד" },
                { key: "frank", label: "פרנק רוהל" },
                { key: "secular", label: "שאנן" },
              ] as { key: FontChoice; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleFontChange(key)}
                title={label}
                style={{ fontFamily: FONT_FAMILY_VAR[key] }}
                className={`w-7 h-7 rounded-full text-sm flex items-center justify-center border transition-all duration-300 ${
                  fontChoice === key
                    ? getThemeButtonActive()
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                א
              </button>
            ))}
          </div>
        </div>

        {/* Small wake-lock fallback guidance note */}
        {!wakeLockActive && (
          <p className="text-[10px] font-light text-neutral-600 text-center tracking-wide">
            להפעלה קבועה, מומלץ לבטל את כיבוי המסך האוטומטי בהגדרות המכשיר.
          </p>
        )}

        {/* Fullscreen failure feedback (some Android browsers reject or no-op silently) */}
        {fullscreenMessage && (
          <p className="max-w-xs text-[10px] font-light text-amber-200/80 text-center tracking-wide bg-neutral-950/60 backdrop-blur-md border border-neutral-900/60 rounded-2xl px-3 py-2">
            {fullscreenMessage}
          </p>
        )}
      </footer>
    </main>
  );
}
