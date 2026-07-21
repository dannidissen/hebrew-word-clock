"use client";

import { useEffect, useState } from "react";
import type { Coordinates } from "./useLocation";

export interface WeatherInfo {
  temperatureC: number;
  description: string;
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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const temperatureC = Math.round(data?.current?.temperature_2m);
        const code = data?.current?.weather_code;
        if (!cancelled && Number.isFinite(temperatureC)) {
          setWeather({ temperatureC, description: describeWeatherCode(code) });
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
