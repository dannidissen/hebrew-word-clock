/**
 * Sun position calculations (NOAA/SunCalc-style formulas), used to derive
 * the day's zmanim (halachic times) and the sun-driven color theme.
 *
 * These are astronomical approximations for a decorative clock — not a
 * halachic authority. Angle thresholds for "olat hashachar" and "tzeit
 * hakochavim" follow commonly cited approximations (16.1° / 8.5°), and the
 * proportional-hour zmanim (Shema/Tefila/Mincha/Plag) follow the Gra/Vilna
 * Gaon opinion (day split sunrise-to-sunset), the most commonly used default
 * — not necessarily the practice of every community. For anything
 * halachically load-bearing, confirm against a proper luach.
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
  sofZmanKriatShemaGra: Date | null; // latest Shema, sunrise + 3 halachic hours (Gra)
  sofZmanTefilaGra: Date | null; // latest Shacharit, sunrise + 4 halachic hours (Gra)
  solarNoon: Date;
  minchaGedola: Date | null; // earliest Mincha, sunrise + 6.5 halachic hours
  minchaKetana: Date | null; // preferred Mincha, sunrise + 9.5 halachic hours
  plagHaMincha: Date | null; // sunrise + 10.75 halachic hours
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

  const sunrise = sunriseAt(-0.833);
  const sunset = sunsetAt(-0.833);
  // Halachic "proportional hour" (Gra/Vilna Gaon opinion): the day from
  // sunrise to sunset split into 12 equal hours, rather than 60 fixed
  // minutes each.
  const shaaZmanit =
    sunrise && sunset ? (sunset.getTime() - sunrise.getTime()) / 12 : null;
  const plusHours = (hours: number): Date | null =>
    sunrise && shaaZmanit ? new Date(sunrise.getTime() + hours * shaaZmanit) : null;

  return {
    alotHaShachar: sunriseAt(-16.1),
    sunrise,
    sofZmanKriatShemaGra: plusHours(3),
    sofZmanTefilaGra: plusHours(4),
    solarNoon: fromJulian(Jnoon),
    minchaGedola: plusHours(6.5),
    minchaKetana: plusHours(9.5),
    plagHaMincha: plusHours(10.75),
    sunset,
    beinHashmashot: sunset,
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

export interface ZmanPeriod {
  /** The halachic period `now` currently falls within — always defined. */
  label: string;
  /** When this period ends (start of the next one), or null if unknown. */
  endsAt: Date | null;
}

interface ZmanEvent {
  time: Date;
  label: string;
}

// One calendar day's period *starts*, in chronological order. Each entry
// names the period that begins at that moment, so consecutive entries
// implicitly define an interval (e.g. sunrise → sofZmanKriatShemaGra is
// "זְמַן קְרִיאַת שְׁמַע"). Built from a single day's Zmanim so the whole
// cycle — including the pre-dawn "night" stretch and the post-nightfall
// "evening" stretch — falls out naturally once yesterday/today/tomorrow are
// concatenated in getCurrentZmanPeriod.
function dayEvents(z: Zmanim): ZmanEvent[] {
  const events: Array<[Date | null, string]> = [
    [z.solarMidnight, "לַיְלָה"],
    [z.alotHaShachar, "עֲלוֹת הַשַּׁחַר"],
    [z.sunrise, "זְמַן קְרִיאַת שְׁמַע"],
    [z.sofZmanKriatShemaGra, "זְמַן תְּפִלָּה"],
    [z.sofZmanTefilaGra, "בֹּקֶר"],
    [z.solarNoon, "אַחַר הַצָּהֳרַיִם"],
    [z.minchaGedola, "זְמַן מִנְחָה גְּדוֹלָה"],
    [z.minchaKetana, "זְמַן מִנְחָה קְטַנָּה"],
    [z.plagHaMincha, "פֶּלֶג הַמִּנְחָה"],
    [z.sunset, "בֵּין הַשְּׁמָשׁוֹת"],
    [z.tzeitHakochavim, "עֶרֶב"],
  ];
  return events
    .filter((e): e is [Date, string] => e[0] !== null)
    .map(([time, label]) => ({ time, label }));
}

/**
 * Returns the halachic period `now` currently falls in (always defined,
 * e.g. "זְמַן קְרִיאַת שְׁמַע"), plus when that period ends — the practically
 * useful form of "what time is it" for daily observance, rather than a
 * label that only appears briefly around each transition.
 */
export function getCurrentZmanPeriod(now: Date, lat: number, lon: number): ZmanPeriod {
  const t = now.getTime();
  const all = [
    ...dayEvents(getZmanim(new Date(t - DAY_MS), lat, lon)),
    ...dayEvents(getZmanim(now, lat, lon)),
    ...dayEvents(getZmanim(new Date(t + DAY_MS), lat, lon)),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  let current: ZmanEvent | null = null;
  let next: ZmanEvent | null = null;
  for (const event of all) {
    if (event.time.getTime() <= t) {
      current = event;
    } else {
      next = event;
      break;
    }
  }

  return { label: current?.label ?? "לַיְלָה", endsAt: next?.time ?? null };
}

export interface UpcomingZman {
  /** Vocalized name, e.g. "סוֹף זְמַן קְרִיאַת שְׁמַע". */
  label: string;
  /** The moment this zman occurs. */
  time: Date;
}

// The curated set of "deadline" zmanim worth surfacing as explicit clock
// times (rather than only as invisible period boundaries): the two morning
// davening cutoffs, plus sunset and nightfall. Listed here with the Zmanim
// field they read from; order doesn't matter (the result is time-sorted).
const KEY_ZMANIM: Array<{ key: keyof Zmanim; label: string }> = [
  { key: "sofZmanKriatShemaGra", label: "סוֹף זְמַן קְרִיאַת שְׁמַע" },
  { key: "sofZmanTefilaGra", label: "סוֹף זְמַן תְּפִלָּה" },
  { key: "sunset", label: "שְׁקִיעָה" },
  { key: "tzeitHakochavim", label: "צֵאת הַכּוֹכָבִים" },
];

/**
 * The next few "deadline" zmanim coming up from `now`, drawn from the curated
 * KEY_ZMANIM set. Spans today *and* tomorrow so that late in the evening —
 * once the day's own zmanim have all passed — the list rolls forward to the
 * next morning's cutoffs instead of going empty. Returns them time-sorted and
 * capped at `limit`, so the display always shows what's actually approaching.
 */
export function getUpcomingZmanim(
  now: Date,
  lat: number,
  lon: number,
  limit = 3
): UpcomingZman[] {
  const t = now.getTime();
  const days = [
    getZmanim(now, lat, lon),
    getZmanim(new Date(t + DAY_MS), lat, lon),
  ];

  const events: UpcomingZman[] = [];
  for (const z of days) {
    for (const { key, label } of KEY_ZMANIM) {
      const time = z[key];
      if (time instanceof Date && time.getTime() > t) {
        events.push({ label, time });
      }
    }
  }

  return events
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, limit);
}
