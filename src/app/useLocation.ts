"use client";

import { useCallback, useEffect, useState } from "react";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Where the coordinates in use came from — surfaced in the settings panel so
// it's clear which place the zmanim/weather are actually being computed for.
export type LocationSource = "manual" | "device" | "fallback";

export interface ManualLocation extends Coordinates {
  label: string;
}

export interface LocationInfo extends Coordinates {
  /** Human-readable place name, when one is known. */
  label: string | null;
  source: LocationSource;
  setManualLocation: (loc: ManualLocation) => void;
  clearManualLocation: () => void;
}

export interface CitySuggestion extends Coordinates {
  /** Short city name, stored as the manual location's label. */
  name: string;
  /** Fuller "city, region, country" string, used in the results list. */
  label: string;
}

// Jerusalem — used whenever geolocation is denied, unsupported, or hasn't
// resolved yet, so zmanim/weather always have something sensible to show.
export const FALLBACK_COORDINATES: Coordinates = {
  latitude: 31.7683,
  longitude: 35.2137,
};
export const FALLBACK_LABEL = "יְרוּשָׁלַיִם";

const STORAGE_KEY = "geoCoordinates";
const MANUAL_KEY = "manualLocation";
const LABEL_CACHE_KEY = "geoLabel";

const coordKey = (c: Coordinates) =>
  `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`;

/**
 * City search for the manual location picker, using Open-Meteo's free
 * geocoding API — the same service already behind the weather readout, so no
 * new key or account is involved.
 */
export async function searchCities(
  query: string,
  signal?: AbortSignal
): Promise<CitySuggestion[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=6&language=he&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("geocoding request failed");
  const data = await res.json();
  const results: Array<Record<string, unknown>> = Array.isArray(data?.results)
    ? data.results
    : [];
  return results
    .filter(
      (r) =>
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        typeof r.name === "string"
    )
    .map((r) => {
      const parts = [r.name, r.admin1, r.country].filter(
        (v): v is string => typeof v === "string" && v.length > 0
      );
      return {
        name: r.name as string,
        // de-duplicate e.g. city-states where name === country
        label: parts.filter((v, i) => parts.indexOf(v) === i).join(", "),
        latitude: r.latitude as number,
        longitude: r.longitude as number,
      };
    });
}

// Best-effort city name for a GPS fix, so the settings panel can say
// "Ra'anana" rather than a pair of decimals. Free, keyless endpoint; any
// failure just leaves the coordinates on screen instead.
async function reverseGeocode(
  coords: Coordinates,
  signal?: AbortSignal
): Promise<string | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=he`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  const name = data?.city || data?.locality || data?.principalSubdivision;
  return typeof name === "string" && name.length > 0 ? name : null;
}

/**
 * Shared location for zmanim + weather. A city chosen by hand in the settings
 * wins; otherwise it starts from the last known GPS coordinates in
 * localStorage (or the Jerusalem fallback). The browser is only asked for a
 * fresh GPS fix when `enabled` is true and no manual city is set, so features
 * that don't need location (the base clock) never trigger a permission dialog.
 */
export function useLocation(enabled: boolean = true): LocationInfo {
  const [manual, setManual] = useState<ManualLocation | null>(null);
  const [device, setDevice] = useState<Coordinates | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  // Storage is only readable after mount; hold off on the GPS prompt until
  // then, so a stored manual city isn't overridden by a fix we didn't need.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedManual = JSON.parse(localStorage.getItem(MANUAL_KEY) || "null");
      if (
        typeof storedManual?.latitude === "number" &&
        typeof storedManual?.longitude === "number"
      ) {
        setManual({
          latitude: storedManual.latitude,
          longitude: storedManual.longitude,
          label: String(storedManual.label || ""),
        });
      }

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (
        typeof stored?.latitude === "number" &&
        typeof stored?.longitude === "number"
      ) {
        setDevice({ latitude: stored.latitude, longitude: stored.longitude });
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || manual || !enabled || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setDevice(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage quota/availability errors
        }
      },
      () => {
        // permission denied or position unavailable — keep the stored/fallback value
      },
      { maximumAge: 1000 * 60 * 60, timeout: 10000 }
    );
  }, [enabled, manual, hydrated]);

  // Name the GPS fix. Cached per ~1km coordinate bucket so a returning visitor
  // (or a jittery fix) doesn't re-request it on every load.
  useEffect(() => {
    if (manual || !device) return;
    const key = coordKey(device);
    try {
      const cached = JSON.parse(localStorage.getItem(LABEL_CACHE_KEY) || "null");
      if (cached?.key === key && typeof cached.label === "string") {
        setDeviceLabel(cached.label);
        return;
      }
    } catch {
      // ignore malformed cache
    }

    const controller = new AbortController();
    reverseGeocode(device, controller.signal)
      .then((label) => {
        if (!label) return;
        setDeviceLabel(label);
        try {
          localStorage.setItem(LABEL_CACHE_KEY, JSON.stringify({ key, label }));
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => {
        // offline or blocked — the coordinates alone are still shown
      });
    return () => controller.abort();
  }, [manual, device]);

  const setManualLocation = useCallback((loc: ManualLocation) => {
    setManual(loc);
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(loc));
    } catch {
      // ignore storage errors — the choice still applies for this session
    }
  }, []);

  const clearManualLocation = useCallback(() => {
    setManual(null);
    try {
      localStorage.removeItem(MANUAL_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const coords = manual ?? device ?? FALLBACK_COORDINATES;
  const source: LocationSource = manual ? "manual" : device ? "device" : "fallback";
  const label = manual
    ? manual.label || null
    : device
      ? deviceLabel
      : FALLBACK_LABEL;

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    label,
    source,
    setManualLocation,
    clearManualLocation,
  };
}
