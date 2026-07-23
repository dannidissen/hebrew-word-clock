"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

// useLayoutEffect warns during SSR/prerender; fall back to useEffect there.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { convertTimeToHebrewWords, stripNiqqud } from "./hebrewTimeHelper";
import { useLocation } from "./useLocation";
import { useWeather } from "./useWeather";
import { getCurrentZmanPeriod, getUpcomingZmanim, getAutoThemeColor } from "./solarTimes";
import type { SpecialTimeEntry } from "./shabbatTimes";
import type { WeatherIconKind, HourlyForecast } from "./useWeather";

type ColorTheme = "amber" | "stone" | "sunset" | "auto";
type FontChoice = "assistant" | "david" | "frank" | "secular" | "rashi" | "stam" | "yiddishkeit";

const FONT_CHOICES: FontChoice[] = [
  "assistant",
  "david",
  "frank",
  "secular",
  "rashi",
  "stam",
  "yiddishkeit",
];

const FONT_FAMILY_VAR: Record<FontChoice, string> = {
  assistant: "var(--font-assistant)",
  david: "var(--font-david-libre)",
  frank: "var(--font-frank-ruhl-libre)",
  secular: "var(--font-secular-one)",
  rashi: "var(--font-rashi)",
  stam: "var(--font-stam)",
  yiddishkeit: "var(--font-yiddishkeit)",
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

// Gear icon for the collapsed settings toggle.
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4M17.8 17.8l-1.4-1.4M7.6 7.6 6.2 6.2" />
    </svg>
  );
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
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // e-ink / Kindle mode: white background, black text, no animations, no glow.
  // e-ink panels are reflective and refresh slowly — the warm dark themes ghost
  // badly and wash out on them, so this flips to pure black-on-white and strips
  // every transition/shadow. Activated by a `?eink=1` URL param, a stored
  // preference, or auto-detected Kindle-class user agents (see mount effect).
  const [einkMode, setEinkMode] = useState<boolean>(false);

  // Diagnostic overlay, enabled with ?debug=1. Prints what the browser's clock
  // actually reports — used to tell apart a frozen ticker, a wrong device clock,
  // and a browser whose JS timezone disagrees with the device (as some e-reader
  // browsers do). Off by default; never shown without the explicit param.
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // Optional timezone override (?tz=…), persisted. Needed for browsers whose JS
  // clock reports the wrong local time even though the device's own clock is
  // correct — notably the Kindle, whose experimental browser was observed a
  // clean two hours behind Israel time. Accepts an IANA zone ("Asia/Jerusalem",
  // DST-aware via Intl) or a plain UTC offset in hours ("3", "-5"). Empty =
  // trust the browser's local time, as before.
  const [tzOverride, setTzOverride] = useState<string>("");

  // Live viewport size, so the clock font can be sized in plain pixels from JS.
  // We deliberately avoid CSS clamp()/min() for the font size: the Kindle's
  // experimental browser runs an older WebKit that doesn't support them and
  // silently drops the declaration, collapsing the clock to a tiny default.
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // In the landscape dashboard the clock is forced onto one line; this scale
  // shrinks it just enough to fit its column so the eye reads the time at a
  // glance without it wrapping. Measured from the rendered width below.
  const clockRef = useRef<HTMLHeadingElement>(null);
  const [fitScale, setFitScale] = useState(1);

  // Only prompt for GPS when a feature that actually needs it is on.
  const wantsLocation = zmanimMode || weatherMode || colorTheme === "auto";
  const location = useLocation(wantsLocation);
  const weather = useWeather(location, weatherMode);

  // Upcoming Shabbat/Yom Tov/fast-day entry and exit moments, shown
  // alongside the zmanim label. Usually just the next candle-lighting and
  // havdalah, but when a fast day (e.g. Tish'a B'Av) falls close to Shabbat
  // both occasions' times are included together. @hebcal/core is a hefty
  // dependency, so it's code-split and only fetched once this feature is
  // actually turned on. Recomputed every few minutes rather than on every
  // clock tick — the Hebrew-calendar lookup is comparatively heavy and the
  // answer only changes at the minute grain anyway.
  const [specialTimes, setSpecialTimes] = useState<SpecialTimeEntry[]>([]);
  useEffect(() => {
    if (!zmanimMode) {
      setSpecialTimes([]);
      return;
    }
    let cancelled = false;
    const update = async () => {
      const { getUpcomingSpecialTimes } = await import("./shabbatTimes");
      if (cancelled) return;
      setSpecialTimes(getUpcomingSpecialTimes(new Date(), location.latitude, location.longitude));
    };
    update();
    const interval = setInterval(update, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [zmanimMode, location.latitude, location.longitude]);

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
    if (storedFont !== null && FONT_CHOICES.includes(storedFont)) {
      setFontChoice(storedFont);
    }

    const storedWeather = localStorage.getItem("weatherMode");
    if (storedWeather !== null) setWeatherMode(storedWeather === "true");

    // e-ink mode resolution, in priority order:
    //   1. explicit ?eink=1 / ?eink=0 URL param (best for a bookmarked kiosk),
    //   2. a previously stored toggle,
    //   3. auto-detect Kindle-class e-readers by user agent.
    // Silk is excluded on purpose — it also ships on colour Fire tablets.
    const einkParam = new URLSearchParams(window.location.search).get("eink");
    const storedEink = localStorage.getItem("einkMode");
    if (einkParam !== null) {
      setEinkMode(einkParam === "1" || einkParam === "true");
    } else if (storedEink !== null) {
      setEinkMode(storedEink === "true");
    } else if (/Kindle|Kobo|reMarkable|EBRD/i.test(navigator.userAgent || "")) {
      setEinkMode(true);
    }

    const debugParam = new URLSearchParams(window.location.search).get("debug");
    if (debugParam === "1" || debugParam === "true") setDebugMode(true);

    // Timezone override: ?tz=… wins and is remembered; otherwise reuse a stored one.
    const tzParam = new URLSearchParams(window.location.search).get("tz");
    if (tzParam !== null) {
      localStorage.setItem("tzOverride", tzParam);
      setTzOverride(tzParam);
    } else {
      const storedTz = localStorage.getItem("tzOverride");
      if (storedTz) setTzOverride(storedTz);
    }
  }, []);

  // Paint the document background to match, so any overscroll edge or pre-hydration
  // flash on the e-reader is white rather than the default black.
  useEffect(() => {
    const bg = einkMode ? "#ffffff" : "#000000";
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [einkMode]);

  // Resolve the timezone override into either an IANA zone (DST-aware) or a
  // fixed minute offset from UTC. `wallParts` then converts any epoch into the
  // wall-clock hour/minute/second the clock should show, and `fmtHM` formats a
  // Date's time — both bypassing the browser's (possibly wrong) local zone.
  // Solar/zmanim maths keep using the real Date, since sun position depends on
  // the true UTC instant, not on which wall clock we display it in.
  const tzZone = tzOverride.includes("/") ? tzOverride : null;
  const tzOffsetMin = (() => {
    if (!tzOverride || tzZone) return null;
    const n = parseFloat(tzOverride);
    if (isNaN(n)) return null;
    return Math.abs(n) <= 14 ? Math.round(n * 60) : Math.round(n); // hours, or raw minutes
  })();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const wallParts = (epochMs: number) => {
    if (tzOffsetMin != null) {
      const d = new Date(epochMs + tzOffsetMin * 60000);
      return { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds() };
    }
    if (tzZone) {
      try {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: tzZone,
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).formatToParts(new Date(epochMs));
        const get = (t: string) =>
          parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
        let h = get("hour");
        if (h === 24) h = 0; // some engines emit "24" for midnight
        return { h, m: get("minute"), s: get("second") };
      } catch {
        // Intl timeZone unsupported — fall through to local time.
      }
    }
    const d = new Date(epochMs);
    return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
  };
  const fmtHM = (date: Date) => {
    const { h, m } = wallParts(date.getTime());
    return `${pad2(h)}:${pad2(m)}`;
  };

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
      const { h, m, s } = wallParts(now.getTime());
      const phrase = convertTimeToHebrewWords(h, m, preciseMode, s);
      if (phrase !== lastPhrase) {
        lastPhrase = phrase;
        setTime(now);
      }
      // Align the next tick to the upcoming second boundary (no drift).
      timeoutId = setTimeout(tick, 1000 - now.getMilliseconds());
    };

    tick();
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preciseMode, tzOverride]);

  // 1c. Snap the clock back to the real time whenever the page returns to the
  // foreground. Some browsers — the Kindle's experimental browser especially —
  // suspend a backgrounded/idle tab's JS timers, freezing the ticker on a stale
  // time. Re-reading the clock on visibility/focus/pageshow means waking the
  // device (or reloading) always shows the correct time immediately, instead of
  // whatever moment the tab was paused at.
  useEffect(() => {
    const resync = () => {
      if (document.visibilityState !== "hidden") setTime(new Date());
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    window.addEventListener("pageshow", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
      window.removeEventListener("pageshow", resync);
    };
  }, []);

  // 1d. Track the viewport so the clock font size can be computed in JS pixels.
  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

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

  const handleEinkToggle = () => {
    setEinkMode((prev) => {
      const next = !prev;
      localStorage.setItem("einkMode", String(next));
      return next;
    });
  };

  // 5. Compute correct Hebrew phrasing (wall time honors any tz override)
  const targetText = time
    ? (() => {
        const { h, m, s } = wallParts(time.getTime());
        return convertTimeToHebrewWords(h, m, preciseMode, s);
      })()
    : "";
  const processedText = niqqudMode ? targetText : stripNiqqud(targetText);

  // 5b. Current halachic period (e.g. "זְמַן קְרִיאַת שְׁמַע"), shown at all
  // times when enabled — with its end time, since a deadline is what's
  // actually useful, not just naming the period.
  const zmanPeriod =
    zmanimMode && time
      ? getCurrentZmanPeriod(time, location.latitude, location.longitude)
      : null;
  const zmanEndsAtLabel = zmanPeriod?.endsAt ? fmtHM(zmanPeriod.endsAt) : null;
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

  // 5b2. Upcoming Shabbat/Yom Tov/fast-day entry and exit times, shown next
  // to the zman label so they're always visible together with "times of
  // day". Usually one line; a fast day clustered near Shabbat adds more.
  const specialTimeLines = specialTimes.map((entry) => {
    const timeLabel = fmtHM(entry.time);
    const raw = entry.dayPrefix
      ? `${entry.dayPrefix} · ${entry.label} · ${timeLabel}`
      : `${entry.label} · ${timeLabel}`;
    return niqqudMode ? raw : stripNiqqud(raw);
  });

  // 5b3. Upcoming "deadline" zmanim (latest Shema/Tefila, sunset, nightfall)
  // as a short rolling list of the next few — the concrete times a religious
  // user actually plans around, which the single period label above never
  // surfaces on its own. Nearest one is emphasized in the render below.
  const upcomingZmanim =
    zmanimMode && time
      ? getUpcomingZmanim(time, location.latitude, location.longitude, 3)
      : [];
  const nowDayStart = time
    ? new Date(time.getFullYear(), time.getMonth(), time.getDate()).getTime()
    : 0;
  const zmanTimeLines = upcomingZmanim.map((z) => {
    const timeLabel = fmtHM(z.time);
    const zmanDayStart = new Date(
      z.time.getFullYear(),
      z.time.getMonth(),
      z.time.getDate()
    ).getTime();
    const dayPrefix = zmanDayStart > nowDayStart ? "מָחָר" : null;
    const raw = dayPrefix
      ? `${dayPrefix} · ${z.label} · ${timeLabel}`
      : `${z.label} · ${timeLabel}`;
    return niqqudMode ? raw : stripNiqqud(raw);
  });

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
    // In e-ink mode (or on first paint) swap the phrase in immediately — a
    // cross-fade on a slow e-ink panel is just a smeary flicker, not a fade.
    if (einkMode || displayedText === "") {
      setDisplayedText(processedText);
      setIsFading(false);
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
  }, [processedText, displayedText, einkMode]);

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
  // both fill the display without overflowing. The height term caps the size on
  // wide-landscape tablets; the min/max bounds keep phones and desktops sane.
  //
  // Computed in JS pixels rather than CSS `clamp(3rem, min(Xvw, 20vh), 12rem)`
  // so it works on the Kindle's older WebKit (which ignores clamp()/min()). On
  // e-ink the panel is monochrome and held close, so we let the text fill a bit
  // more of the width. The clamp() string is only an SSR/pre-measurement
  // fallback; once mounted, the pixel value below takes over.
  // Diagnostic string (only rendered when ?debug=1). Shows what the browser's
  // clock reports so we can see if the JS time/timezone matches the device.
  const debugInfo = debugMode
    ? (() => {
        const raw = new Date();
        const corrected = wallParts(raw.getTime());
        return [
          `shown ${pad2(corrected.h)}:${pad2(corrected.m)}:${pad2(corrected.s)}`,
          `rawlocal ${pad2(raw.getHours())}:${pad2(raw.getMinutes())}`,
          `utc ${pad2(raw.getUTCHours())}:${pad2(raw.getUTCMinutes())}`,
          `tzoff ${raw.getTimezoneOffset()}min`,
          `tz "${tzOverride || "(none)"}"`,
          raw.toString(),
        ].join("  |  ");
      })()
    : "";

  const phraseLength = stripNiqqud(displayedText || "טוען...").length;
  const vwFactor = einkMode
    ? phraseLength <= 16
      ? 18
      : phraseLength <= 26
        ? 15
        : 12
    : phraseLength <= 16
      ? 15
      : phraseLength <= 26
        ? 13
        : 10.5;
  // In landscape (tablet / secondary monitor) the clock stays the hero at the
  // top, and the extra readouts — zmanim, Shabbat/fast times, weather — sit
  // beneath it as side-by-side columns, using the wide screen instead of a
  // tall stack that crowds it. Portrait keeps the original centered stack.
  const hasSideContent = Boolean(
    zmanLabel || zmanTimeLines.length > 0 || specialTimeLines.length > 0
  );
  const hasWeather = Boolean(weatherMode && weather);
  const isLandscape = viewport.w > 0 && viewport.w / viewport.h >= 1.25;
  const dashboardLayout =
    isLandscape && viewport.w >= 700 && (hasSideContent || hasWeather);

  // The hero clock uses the full width; cap its height a bit more tightly in
  // the dashboard so the columns below it have room.
  const heightCap = einkMode ? 0.26 : 0.2;
  // In the dashboard the clock shares the screen with the columns beneath it,
  // so hold it a bit smaller than a full-bleed hero would be.
  const clockPx = dashboardLayout
    ? Math.min((vwFactor / 100) * viewport.w * 0.95, 0.32 * viewport.h, 220)
    : Math.min((vwFactor / 100) * viewport.w, heightCap * viewport.h, 192);
  const clockBasePx = Math.max(48, clockPx);
  const clockFontSize = viewport.w
    ? `${Math.round(clockBasePx * (dashboardLayout ? fitScale : 1))}px`
    : `clamp(3rem, min(${vwFactor}vw, ${heightCap * 100}vh), 12rem)`;

  // Measure the (single-line) clock against its column and shrink to fit, so a
  // long phrase never wraps. Converges in a render or two; the ±0.02 guard and
  // the reset-to-1 outside the dashboard stop it from oscillating.
  useIsomorphicLayoutEffect(() => {
    const el = clockRef.current;
    if (!el) return;
    if (!dashboardLayout) {
      if (fitScale !== 1) setFitScale(1);
      return;
    }
    // Fit against ~94% of the whole screen width, not the (narrower) column
    // container, so the hero clock can grow much larger than the max-w band.
    const avail = (viewport.w || el.parentElement?.clientWidth || 0) * 0.94;
    if (avail <= 0) return;
    const naturalAtBase = el.scrollWidth / (fitScale || 1);
    const desired = Math.min(1, avail / naturalAtBase);
    if (Math.abs(desired - fitScale) > 0.02) setFitScale(desired);
  }, [
    displayedText,
    clockBasePx,
    dashboardLayout,
    viewport.w,
    niqqudMode,
    fontChoice,
    fitScale,
  ]);

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

  // Footer pill styling. On e-ink the warm theme tints and faint neutral greys
  // vanish into the white, so fall back to plain high-contrast black there.
  const pillActiveClass = einkMode
    ? "border-black text-black font-semibold"
    : getThemeButtonActive();
  const pillIdleClass = einkMode
    ? "border-black/25 text-neutral-700"
    : "border-transparent text-neutral-500 hover:text-neutral-300";
  const pillClass = (active: boolean, extra = "") =>
    `px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-wider transition-all duration-300 border ${
      active ? pillActiveClass : pillIdleClass
    } ${extra}`;

  // Shared, center-aligned readout nodes, reused by both the portrait stack
  // and the landscape dashboard columns so the two layouts can't drift apart.
  const textColorStyle = {
    color: einkMode ? "#000000" : autoColorCss,
    fontFamily: FONT_FAMILY_VAR[fontChoice],
  } as const;

  const columnHeader = (text: string) => (
    <p
      className={`text-xs sm:text-sm font-medium tracking-[0.25em] select-none ${
        einkMode ? "text-black opacity-50" : `${getThemeTextClass()} opacity-40`
      }`}
      style={{ color: einkMode ? "#000000" : autoColorCss, fontFamily: FONT_FAMILY_VAR[fontChoice] }}
    >
      {text}
    </p>
  );

  const periodLabelNode = (
    <p
      aria-live="polite"
      className={`text-lg sm:text-xl md:text-2xl font-light tracking-[0.2em] text-center select-none ${
        einkMode
          ? `text-black ${zmanLabel ? "opacity-100" : "opacity-0"}`
          : `transition-[opacity,color] duration-700 ease-in-out ${getThemeTextClass()} ${
              zmanLabel ? "opacity-70" : "opacity-0"
            }`
      }`}
      style={textColorStyle}
    >
      {zmanLabel || " "}
    </p>
  );

  const zmanListNode =
    zmanTimeLines.length > 0 ? (
      <div className="flex flex-col gap-0.5 items-center">
        {zmanTimeLines.map((line, i) => (
          <p
            key={i}
            aria-live="polite"
            className={`text-base sm:text-lg tracking-[0.15em] text-center select-none ${
              i === 0 ? "font-normal opacity-90" : "font-light opacity-55"
            } ${
              einkMode
                ? "text-black"
                : `transition-[opacity,color] duration-700 ease-in-out ${getThemeTextClass()}`
            }`}
            style={textColorStyle}
          >
            {line}
          </p>
        ))}
      </div>
    ) : null;

  const specialListNode =
    specialTimeLines.length > 0 ? (
      <div className="flex flex-col gap-0.5 items-center">
        {specialTimeLines.map((line, i) => (
          <p
            key={i}
            aria-live="polite"
            className={`text-sm sm:text-base font-light tracking-[0.15em] text-center opacity-60 select-none ${
              einkMode
                ? "text-black"
                : `transition-[opacity,color] duration-700 ease-in-out ${getThemeTextClass()}`
            }`}
            style={textColorStyle}
          >
            {line}
          </p>
        ))}
      </div>
    ) : null;

  const weatherReadoutNode = hasWeather ? (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`flex items-center gap-2 text-2xl sm:text-3xl font-light select-none ${
          einkMode ? "text-black" : getThemeTextClass()
        }`}
        style={textColorStyle}
      >
        <WeatherIcon kind={weather!.icon} className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        <span dir="ltr">{weather!.temperatureC}°</span>
      </div>
      <p
        className={`text-sm sm:text-base font-light tracking-[0.12em] text-center opacity-70 select-none ${
          einkMode ? "text-black" : getThemeTextClass()
        }`}
        style={textColorStyle}
      >
        {niqqudMode ? weather!.description : stripNiqqud(weather!.description)}
      </p>
      {weather!.hourly.length > 0 && (
        <div
          className={`flex items-start gap-3 sm:gap-4 select-none ${
            einkMode ? "text-black" : getThemeTextClass()
          }`}
          style={{ color: einkMode ? "#000000" : autoColorCss }}
        >
          {forecastCheckpoints(weather!.hourly).map((hour) => (
            <div
              key={hour.time.getTime()}
              className="flex flex-col items-center gap-0.5 text-xs sm:text-sm"
            >
              <span className="opacity-60" dir="ltr">
                {fmtHM(hour.time)}
              </span>
              <WeatherIcon kind={hour.icon} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span dir="ltr">{hour.temperatureC}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <main
      className={`flex flex-col items-center justify-center min-h-screen w-full select-none relative overflow-hidden px-6 ${
        einkMode ? "bg-white" : "bg-black transition-colors duration-1000"
      }`}
      style={{ cursor: isIdle ? "none" : "default" }}
    >
      {/* Diagnostic overlay (?debug=1 only) — reports the browser's real clock */}
      {debugMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            padding: "6px 10px",
            fontSize: "12px",
            lineHeight: 1.5,
            direction: "ltr",
            textAlign: "left",
            fontFamily: "monospace",
            color: einkMode ? "#000" : "#22c55e",
            background: einkMode ? "#fff" : "#000",
            borderBottom: "1px solid #888",
            wordBreak: "break-word",
          }}
        >
          {debugInfo}
        </div>
      )}

      {/* Weather corner readout — hidden in the dashboard, where weather
          becomes one of the bottom columns instead. */}
      {weatherMode && weather && !dashboardLayout && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-10 flex flex-col gap-2 max-w-sm">
          {/* Current weather pill */}
          <div
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium tracking-wide select-none ${
              einkMode
                ? `border border-black/30 bg-white text-black ${isIdle ? "opacity-70" : "opacity-100"}`
                : `border border-neutral-900/60 bg-neutral-950/40 backdrop-blur-md transition-opacity duration-700 ${getThemeTextClass()} ${
                    isIdle ? "opacity-50" : "opacity-95"
                  }`
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
              className={`flex items-center justify-center gap-3 sm:gap-4 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm select-none ${
                einkMode
                  ? `border border-black/30 bg-white text-black ${isIdle ? "opacity-70" : "opacity-100"}`
                  : `border border-neutral-900/60 bg-neutral-950/40 backdrop-blur-md transition-opacity duration-700 ${getThemeTextClass()} ${
                      isIdle ? "opacity-40" : "opacity-80"
                    }`
              }`}
            >
              {forecastCheckpoints(weather.hourly).map((hour) => (
                <div
                  key={hour.time.getTime()}
                  className="flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <span className="opacity-60">{fmtHM(hour.time)}</span>
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
      <section
        className={`flex flex-col items-center w-full ${
          dashboardLayout
            ? "justify-center min-h-screen gap-6 lg:gap-10 pt-6 pb-24"
            : "max-w-7xl justify-center min-h-[45vh] gap-3"
        }`}
      >
        <h1
          ref={clockRef}
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={displayedText ? stripNiqqud(displayedText) : "טוען"}
          className={`leading-[1.45] font-medium tracking-wide text-center select-none ${
            einkMode
              ? "text-black"
              : `transition-[opacity,color] ease-in-out ${
                  displayedText ? getThemeTextClass() : "text-neutral-600"
                } ${isFading ? "opacity-0" : "opacity-100"}`
          }`}
          style={{
            fontSize: clockFontSize,
            fontFamily: FONT_FAMILY_VAR[fontChoice],
            color: einkMode ? "#000000" : displayedText ? autoColorCss : undefined,
            textShadow: einkMode ? "none" : displayedText ? getThemeTextShadow() : "none",
            ...(einkMode ? {} : { transitionDuration: "500ms, 3000ms" }),
          }}
        >
          <span
            className={`flex items-baseline justify-center gap-x-[0.3em] gap-y-2 ${
              dashboardLayout ? "flex-nowrap whitespace-nowrap" : "flex-wrap"
            }`}
          >
            {(displayedText || "טוען...").split(" ").map((word, i) => (
              <span
                key={`${displayedText}-${i}`}
                className={einkMode ? "inline-block" : "inline-block animate-word-in"}
                style={einkMode ? undefined : { animationDelay: `${i * 70}ms` }}
              >
                {word}
              </span>
            ))}
          </span>
        </h1>

        {dashboardLayout ? (
          /* Landscape: a thin divider seals off the clock, then the readouts
             sit below as titled columns — so the eye locks onto the time. */
          <>
            <div
              aria-hidden
              className={`shrink-0 ${einkMode ? "" : getThemeTextClass()}`}
              style={{
                height: "1px",
                width: "min(78%, 680px)",
                backgroundColor: einkMode ? "#000000" : autoColorCss ?? "currentColor",
                opacity: einkMode ? 0.28 : 0.16,
              }}
            />
            <div className="flex flex-row flex-wrap justify-center items-start gap-x-12 lg:gap-x-20 gap-y-6 w-full max-w-7xl mx-auto">
            {(zmanLabel || zmanTimeLines.length > 0) && (
              <div className="flex flex-col items-center gap-2">
                {columnHeader("זְמַנֵּי הַיּוֹם")}
                {periodLabelNode}
                {zmanListNode}
              </div>
            )}
            {specialListNode && (
              <div className="flex flex-col items-center gap-2">
                {columnHeader("שַׁבָּת וְצוֹם")}
                {specialListNode}
              </div>
            )}
            {weatherReadoutNode && (
              <div className="flex flex-col items-center gap-2">
                {columnHeader("מֶזֶג אֲוִיר")}
                {weatherReadoutNode}
              </div>
            )}
            </div>
          </>
        ) : (
          /* Portrait: the original single centered stack, unchanged. */
          hasSideContent && (
            <div className="flex flex-col gap-3 items-center w-full">
              {periodLabelNode}
              {zmanListNode}
              {specialListNode}
            </div>
          )
        )}
      </section>

      {/* Floating minimal settings footer — collapsed behind a gear icon by
          default, with grouped categories inside instead of one long row. */}
      <footer
        className={`fixed bottom-6 left-0 right-0 flex flex-col items-center gap-3 transition-all duration-700 px-4 z-50 ${
          isIdle ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100 translate-y-0"
        }`}
      >
        {settingsOpen && (
          <div
            className={`animate-panel-in flex flex-col gap-4 w-full max-w-xs sm:max-w-sm p-4 rounded-[28px] ${
              einkMode
                ? "bg-white border border-black/30"
                : "bg-neutral-950/60 backdrop-blur-md border border-neutral-800/60 shadow-2xl shadow-black/50"
            }`}
          >
            {/* תצוגה: how the clock itself reads */}
            <div className="flex flex-col gap-2">
              <span
                className={`text-[9px] font-medium tracking-widest px-1 ${
                  einkMode ? "text-neutral-700" : "text-neutral-600"
                }`}
              >
                תצוגה
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={handlePreciseToggle} className={pillClass(preciseMode)}>
                  {preciseMode ? "מוד: מדויק" : "מוד: פואטי"}
                </button>
                <button onClick={handleNiqqudToggle} className={pillClass(niqqudMode)}>
                  {niqqudMode ? "ניקוד: מופעל" : "ניקוד: כבוי"}
                </button>
                <button onClick={handleZmanimToggle} className={pillClass(zmanimMode)}>
                  זמני היום
                </button>
                <button onClick={handleWeatherToggle} className={pillClass(weatherMode)}>
                  מזג אוויר
                </button>
              </div>
            </div>

            {/* מסך: device/screen behavior. Always rendered — it holds the
                e-ink toggle, which must stay reachable even where wake-lock and
                fullscreen are unavailable (e.g. the Kindle browser). */}
            <div
              className={`flex flex-col gap-2 pt-3.5 border-t ${
                einkMode ? "border-black/15" : "border-neutral-800/60"
              }`}
            >
                <span
                  className={`text-[9px] font-medium tracking-widest px-1 ${
                    einkMode ? "text-neutral-700" : "text-neutral-600"
                  }`}
                >
                  מסך
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={handleEinkToggle} className={pillClass(einkMode)}>
                    {einkMode ? "מסך: e-ink" : "מסך: רגיל"}
                  </button>
                  {wakeLockSupported && (
                    <button
                      onClick={toggleWakeLock}
                      className={pillClass(wakeLockActive, "flex items-center gap-2")}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          wakeLockActive ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"
                        }`}
                      />
                      {wakeLockActive ? "מסך ער" : "מנע שינה"}
                    </button>
                  )}
                  {fullscreenSupported && (
                    <button
                      onClick={toggleFullscreen}
                      aria-label={isFullscreen ? "צא ממסך מלא" : "מסך מלא"}
                      className={pillClass(isFullscreen)}
                    >
                      {isFullscreen ? "צא ממסך מלא" : "מסך מלא"}
                    </button>
                  )}
                </div>
            </div>

            {/* צבע: color theme — meaningless on a monochrome e-ink panel */}
            {!einkMode && (
            <div className="flex flex-col gap-2 pt-3.5 border-t border-neutral-800/60">
              <span className="text-[9px] font-medium tracking-widest text-neutral-600 px-1">
                צבע
              </span>
              <div className="flex items-center gap-2.5 px-1">
                <button
                  onClick={() => handleThemeChange("amber")}
                  className={`w-5 h-5 rounded-full bg-amber-200/90 border transition-transform duration-300 ${
                    colorTheme === "amber"
                      ? "scale-125 border-white"
                      : "border-transparent hover:scale-110"
                  }`}
                  title="ענבר"
                />
                <button
                  onClick={() => handleThemeChange("stone")}
                  className={`w-5 h-5 rounded-full bg-stone-300 border transition-transform duration-300 ${
                    colorTheme === "stone"
                      ? "scale-125 border-white"
                      : "border-transparent hover:scale-110"
                  }`}
                  title="אבן"
                />
                <button
                  onClick={() => handleThemeChange("sunset")}
                  className={`w-5 h-5 rounded-full bg-orange-200/95 border transition-transform duration-300 ${
                    colorTheme === "sunset"
                      ? "scale-125 border-white"
                      : "border-transparent hover:scale-110"
                  }`}
                  title="שקיעה"
                />
                <button
                  onClick={() => handleThemeChange("auto")}
                  className={`w-5 h-5 rounded-full border transition-transform duration-300 ${
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
            </div>
            )}

            {/* גופן: clock typeface */}
            <div
              className={`flex flex-col gap-2 pt-3.5 border-t ${
                einkMode ? "border-black/15" : "border-neutral-800/60"
              }`}
            >
              <span
                className={`text-[9px] font-medium tracking-widest px-1 ${
                  einkMode ? "text-neutral-700" : "text-neutral-600"
                }`}
              >
                גופן
              </span>
              <div className="flex flex-wrap items-center gap-2 px-1">
                {(
                  [
                    { key: "assistant", label: "רגיל" },
                    { key: "david", label: "דוד" },
                    { key: "frank", label: "פרנק רוהל" },
                    { key: "secular", label: "שאנן" },
                    { key: "rashi", label: "רש״י" },
                    { key: "stam", label: "סת״ם" },
                    { key: "yiddishkeit", label: "יידישקייט" },
                  ] as { key: FontChoice; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleFontChange(key)}
                    title={label}
                    style={{ fontFamily: FONT_FAMILY_VAR[key] }}
                    className={`w-9 h-9 rounded-2xl text-lg flex items-center justify-center border transition-all duration-300 ${
                      fontChoice === key
                        ? einkMode
                          ? "border-black text-black font-semibold"
                          : `${getThemeButtonActive()} bg-white/5`
                        : einkMode
                          ? "border-black/25 text-neutral-700"
                          : "border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
                    }`}
                  >
                    אב
                  </button>
                ))}
              </div>
              {/* Required credit for the Yiddishkeit font's free web-embedding license */}
              {fontChoice === "yiddishkeit" && (
                <p
                  className={`text-[9px] font-light px-1 ${
                    einkMode ? "text-neutral-700" : "text-neutral-600"
                  }`}
                >
                  גופן &quot;יידישקייט&quot; באדיבות{" "}
                  <a
                    href="https://alefalefalef.co.il"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-neutral-400"
                  >
                    אאא בית לטיפוגרפיה עברית
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Settings toggle */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label={settingsOpen ? "סגור הגדרות" : "פתח הגדרות"}
          aria-expanded={settingsOpen}
          className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 ${
            einkMode
              ? settingsOpen
                ? "bg-white border-black text-black"
                : "bg-white border-black/30 text-neutral-700"
              : `bg-neutral-950/50 backdrop-blur-md shadow-2xl ${
                  settingsOpen
                    ? getThemeButtonActive()
                    : "border-neutral-900/60 text-neutral-400 hover:text-neutral-200"
                }`
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
        </button>

        {/* Small wake-lock fallback guidance note */}
        {!wakeLockActive && (
          <p
            className={`text-[10px] font-light text-center tracking-wide ${
              einkMode ? "text-neutral-700" : "text-neutral-600"
            }`}
          >
            {einkMode
              ? "בקינדל: בטל/י את כיבוי המסך האוטומטי (הגדרות ← מסך/שינה) כדי שהשעון יישאר דלוק."
              : "להפעלה קבועה, מומלץ לבטל את כיבוי המסך האוטומטי בהגדרות המכשיר."}
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
