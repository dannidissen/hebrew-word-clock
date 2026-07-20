/**
 * Sun position calculations (NOAA/SunCalc-style formulas), used to derive
 * poetic Jewish daily time markers and the sun-driven color theme.
 *
 * These are astronomical approximations for a decorative clock — not a
 * halachic authority. Angle thresholds for "olat hashachar" and "tzeit
 * hakochavim" follow commonly cited approximations (16.1° / 8.5°).
 */

const RAD = Math.PI / 180;
const DAY_MS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const OBLIQUITY = RAD * 23.4397;

function toJulian(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * DAY_MS);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C =
    RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372; // perihelion of the Earth
  return M + C + P + Math.PI;
}

function declination(l: number): number {
  return Math.asin(Math.sin(l) * Math.sin(OBLIQUITY));
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - J0 - lw / (2 * Math.PI));
}

function approxTransit(Ht: number, lw: number, n: number): number {
  return J0 + (Ht + lw) / (2 * Math.PI) + n;
}

function solarTransitJ(ds: number, M: number, L: number): number {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos(
    (Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d))
  );
}

function getSetJ(
  h: number,
  lw: number,
  phi: number,
  dec: number,
  n: number,
  M: number,
  L: number
): number {
  const w = hourAngle(h, phi, dec);
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

export interface Zmanim {
  alotHaShachar: Date | null; // dawn, sun at -16.1°
  sunrise: Date | null; // sun at -0.833°
  solarNoon: Date;
  sunset: Date | null; // sun at -0.833°
  beinHashmashot: Date | null; // twilight start = sunset
  tzeitHakochavim: Date | null; // nightfall, sun at -8.5°
  solarMidnight: Date;
}

/** Sun altitude in degrees above the horizon at a given moment/location. */
export function getSunAltitude(date: Date, lat: number, lon: number): number {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const dec = declination(L);

  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const Jnoon = solarTransitJ(ds, M, L);
  // Hour angle of "now" relative to solar noon (~1 solar day ≈ 24h)
  const H = 2 * Math.PI * (toJulian(date) - Jnoon);
  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );
  return altitude / RAD;
}

/** Computes the day's key sun events for a given date and location. */
export function getZmanim(date: Date, lat: number, lon: number): Zmanim {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);
  const Jmidnight = Jnoon - 0.5;

  const atAngle = (deg: number): Date | null => {
    const h = RAD * deg;
    const cosH =
      (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (cosH < -1 || cosH > 1) return null; // sun never reaches this angle today (polar regions)
    const Jset = getSetJ(h, lw, phi, dec, n, M, L);
    return fromJulian(Jset);
  };

  const sunsetAt = (deg: number): Date | null => atAngle(deg);
  const sunriseAt = (deg: number): Date | null => {
    const setTime = atAngle(deg);
    if (!setTime) return null;
    const Jset = toJulian(setTime);
    const Jrise = Jnoon - (Jset - Jnoon);
    return fromJulian(Jrise);
  };

  return {
    alotHaShachar: sunriseAt(-16.1),
    sunrise: sunriseAt(-0.833),
    solarNoon: fromJulian(Jnoon),
    sunset: sunsetAt(-0.833),
    beinHashmashot: sunsetAt(-0.833),
    tzeitHakochavim: sunsetAt(-8.5),
    solarMidnight: fromJulian(Jmidnight),
  };
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// Color stops keyed by sun altitude (degrees), from deep night to solar
// noon. Drives the "auto" theme so the clock's hue drifts with the sky.
const COLOR_STOPS: Array<[number, RgbColor]> = [
  [-90, { r: 96, g: 108, b: 143 }], // deep night — dim slate-indigo
  [-18, { r: 116, g: 122, b: 163 }], // astronomical night
  [-8.5, { r: 165, g: 130, b: 186 }], // nautical twilight — violet
  [-0.833, { r: 251, g: 146, b: 60 }], // horizon — sunrise/sunset orange
  [6, { r: 253, g: 224, b: 71 }], // golden hour
  [30, { r: 254, g: 243, b: 199 }], // daylight amber
  [90, { r: 255, g: 253, b: 240 }], // solar noon — near-white gold
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolates a warm/cool text color from the sun's current altitude. */
export function getAutoThemeColor(date: Date, lat: number, lon: number): RgbColor {
  const altitude = Math.max(-90, Math.min(90, getSunAltitude(date, lat, lon)));

  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (altitude >= COLOR_STOPS[i][0] && altitude <= COLOR_STOPS[i + 1][0]) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }

  const range = upper[0] - lower[0];
  const t = range === 0 ? 0 : (altitude - lower[0]) / range;
  return {
    r: Math.round(lerp(lower[1].r, upper[1].r, t)),
    g: Math.round(lerp(lower[1].g, upper[1].g, t)),
    b: Math.round(lerp(lower[1].b, upper[1].b, t)),
  };
}

const MINUTE_MS = 60 * 1000;

/**
 * Returns the current poetic zman label if `now` falls within a short window
 * around one of the day's key sun events, or null otherwise (plain clock).
 */
export function getCurrentZmanLabel(
  now: Date,
  lat: number,
  lon: number
): string | null {
  const today = getZmanim(now, lat, lon);
  const yesterday = getZmanim(new Date(now.getTime() - DAY_MS), lat, lon);
  const t = now.getTime();

  const within = (center: Date | null, beforeMin: number, afterMin: number) =>
    !!center &&
    t >= center.getTime() - beforeMin * MINUTE_MS &&
    t < center.getTime() + afterMin * MINUTE_MS;

  // Check yesterday's nightfall too, in case we're just after local midnight.
  if (within(today.alotHaShachar, 0, 20) || within(yesterday.alotHaShachar, 0, 20))
    return "עֲלוֹת הַשַּׁחַר";
  if (within(today.sunrise, 5, 20) || within(yesterday.sunrise, 5, 20))
    return "הָנֵץ הַחַמָּה";
  if (within(today.solarNoon, 10, 10)) return "חֲצוֹת הַיּוֹם";
  if (within(today.sunset, 15, 0)) return "שְׁקִיעָה";
  if (
    today.sunset &&
    today.tzeitHakochavim &&
    t >= today.sunset.getTime() &&
    t < today.tzeitHakochavim.getTime()
  )
    return "בֵּין הַעַרְבַּיִם";
  if (within(today.tzeitHakochavim, 0, 20) || within(yesterday.tzeitHakochavim, 0, 20))
    return "צֵאת הַכּוֹכָבִים";
  if (within(today.solarMidnight, 10, 10) || within(yesterday.solarMidnight, 10, 10))
    return "חֲצוֹת הַלַּיְלָה";

  return null;
}
