"use client";

import React, { useState, useEffect, useRef } from "react";
import { convertTimeToHebrewWords, stripNiqqud } from "./hebrewTimeHelper";

type ColorTheme = "amber" | "stone" | "sunset";

export default function ClockPage() {
  const [time, setTime] = useState<Date | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isFading, setIsFading] = useState<boolean>(false);

  // Settings states loaded from localStorage on mount
  const [preciseMode, setPreciseMode] = useState<boolean>(false);
  const [niqqudMode, setNiqqudMode] = useState<boolean>(true);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("amber");

  // Wake Lock states
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean>(true);

  // Idle state to auto-hide UI settings controls
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize settings from localStorage on mount
  useEffect(() => {
    setWakeLockSupported("wakeLock" in navigator);

    // Read stored preferences
    const storedPrecise = localStorage.getItem("preciseMode");
    if (storedPrecise !== null) setPreciseMode(storedPrecise === "true");

    const storedNiqqud = localStorage.getItem("niqqudMode");
    if (storedNiqqud !== null) setNiqqudMode(storedNiqqud === "true");

    const storedTheme = localStorage.getItem("colorTheme") as ColorTheme;
    if (storedTheme !== null && ["amber", "stone", "sunset"].includes(storedTheme)) {
      setColorTheme(storedTheme);
    }
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
        return "text-orange-200/90";
      case "amber":
      default:
        return "text-amber-100/90";
    }
  };

  const getThemeTextShadow = () => {
    switch (colorTheme) {
      case "stone":
        return "0 0 10px rgba(214, 211, 209, 0.15)";
      case "sunset":
        return "0 0 10px rgba(254, 215, 170, 0.15)";
      case "amber":
      default:
        return "0 0 10px rgba(254, 243, 199, 0.15)";
    }
  };

  const getThemeButtonActive = () => {
    switch (colorTheme) {
      case "stone":
        return "border-stone-500 text-stone-200";
      case "sunset":
        return "border-orange-400 text-orange-200";
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
      {/* Visual Clock Screen Wrapper to Prevent Shift */}
      <section className="flex items-center justify-center min-h-[45vh] w-full max-w-5xl">
        <h1
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={displayedText ? stripNiqqud(displayedText) : "טוען"}
          className={`text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] leading-relaxed font-light tracking-wide text-center transition-opacity duration-500 ease-in-out select-none ${
            displayedText ? getThemeTextClass() : "text-neutral-600"
          } ${isFading ? "opacity-0" : "opacity-100"}`}
          style={{
            textShadow: displayedText ? getThemeTextShadow() : "none",
          }}
        >
          {displayedText || "טוען..."}
        </h1>
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
          </div>
        </div>

        {/* Small wake-lock fallback guidance note */}
        {!wakeLockActive && (
          <p className="text-[10px] font-light text-neutral-600 text-center tracking-wide">
            להפעלה קבועה, מומלץ לבטל את כיבוי המסך האוטומטי בהגדרות המכשיר.
          </p>
        )}
      </footer>
    </main>
  );
}
