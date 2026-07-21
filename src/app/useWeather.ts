"use client";

import { useEffect, useState } from "react";
import type { Coordinates } from "./useLocation";

export type WeatherIconKind =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export interface HourlyForecast {
  time: Date;
  temperatureC: number;
  icon: WeatherIconKind;
}

export interface WeatherInfo {
  temperatureC: number;
  description: string;
  icon: WeatherIconKind;
  hourly: HourlyForecast[];
}

// WMO weather codes grouped into the icon families used by WeatherIcon.
function iconKindForCode(code: number): WeatherIconKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunder";
  return "cloudy";
}

// WMO weather codes (used by Open-Meteo) mapped to short vocalized Hebrew.
const CODE_DESCRIPTIONS: Record<number, string> = {
  0: "בָּהִיר",
  1: "בָּהִיר בְּעִקָּר",
  2: "מְעֻנָּן חֶלְקִית",
  3: "מְעֻנָּן",
  45: "עֲרָפֶל",
  48: "עֲרָפֶל קוֹפֵא",
  51: "טִפְטוּף קַל",
  53: "טִפְטוּף",
  55: "טִפְטוּף כָּבֵד",
  56: "טִפְטוּף קוֹפֵא",
  57: "טִפְטוּף קוֹפֵא כָּבֵד",
  61: "גֶּשֶׁם קַל",
  63: "גֶּשֶׁם",
  65: "גֶּשֶׁם כָּבֵד",
  66: "גֶּשֶׁם קוֹפֵא",
  67: "גֶּשֶׁם קוֹפֵא כָּבֵד",
  71: "שֶׁלֶג קַל",
  73: "שֶׁלֶג",
  75: "שֶׁלֶג כָּבֵד",
  77: "גַּרְגְּרֵי שֶׁלֶג",
  80: "מַמְטֵרִים קַלִּים",
  81: "מַמְטֵרִים",
  82: "מַמְטֵרִים עַזִּים",
  85: "מַמְטְרֵי שֶׁלֶג",
  86: "מַמְטְרֵי שֶׁלֶג כְּבֵדִים",
  95: "סוּפַת רְעָמִים",
  96: "סוּפַת רְעָמִים עִם בָּרָד",
  99: "סוּפַת רְעָמִים עַזָּה עִם בָּרָד",
};

function describeWeatherCode(code: number): string {
  return CODE_DESCRIPTIONS[code] ?? "מֶזֶג אֲוִיר";
}

const REFRESH_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Small corner weather readout, fetched from Open-Meteo's free forecast API
 * (no key required). Only fetches while `enabled` is true.
 */
export function useWeather(coords: Coordinates, enabled: boolean): WeatherInfo | null {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const lat = coords.latitude.toFixed(2);
  const lon = coords.longitude.toFixed(2);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const temperatureC = Math.round(data?.current?.temperature_2m);
        const code = data?.current?.weather_code;

        // Parse hourly forecast (next 24 hours from now). Open-Meteo's
        // hourly array starts at 00:00 of the current day, not from "now" —
        // find the first entry at/after the current moment before slicing,
        // otherwise this ends up showing hours that already passed.
        const hourly: HourlyForecast[] = [];
        const times: string[] = data?.hourly?.time ?? [];
        const temps: number[] = data?.hourly?.temperature_2m ?? [];
        const codes: number[] = data?.hourly?.weather_code ?? [];

        const now = Date.now();
        let startIndex = times.findIndex((t) => new Date(t).getTime() >= now);
        if (startIndex === -1) startIndex = 0;

        for (let i = startIndex; i < Math.min(startIndex + 24, times.length); i++) {
          const time = new Date(times[i]);
          hourly.push({
            time,
            temperatureC: Math.round(temps[i]),
            icon: iconKindForCode(codes[i]),
          });
        }

        if (!cancelled && Number.isFinite(temperatureC)) {
          setWeather({
            temperatureC,
            description: describeWeatherCode(code),
            icon: iconKindForCode(code),
            hourly,
          });
        }
      } catch {
        // offline or blocked — silently keep the last-known reading
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, lat, lon]);

  return enabled ? weather : null;
}
