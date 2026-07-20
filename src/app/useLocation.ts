"use client";

import { useEffect, useState } from "react";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Jerusalem — used whenever geolocation is denied, unsupported, or hasn't
// resolved yet, so zmanim/weather always have something sensible to show.
export const FALLBACK_COORDINATES: Coordinates = {
  latitude: 31.7683,
  longitude: 35.2137,
};

const STORAGE_KEY = "geoCoordinates";

/**
 * Shared location for zmanim + weather. Starts from the last known
 * coordinates in localStorage (or the Jerusalem fallback). Only prompts the
 * browser for a fresh GPS fix when `enabled` is true, so features that don't
 * need location (the base clock) never trigger a permission dialog.
 */
export function useLocation(enabled: boolean = true): Coordinates {
  const [coords, setCoords] = useState<Coordinates>(FALLBACK_COORDINATES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCoords(JSON.parse(stored));
    } catch {
      // ignore malformed/inaccessible storage
    }

    if (!enabled || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCoords(next);
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
  }, [enabled]);

  return coords;
}
