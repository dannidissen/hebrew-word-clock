/**
 * Shabbat/Yom Tov/fast-day entry and exit times, via @hebcal/core's
 * astronomical + Hebrew-calendar calculations (accurate Jewish calendar,
 * not something worth re-deriving by hand).
 *
 * Besides candle-lighting/havdalah, hebcal also emits "Fast begins"/"Fast
 * ends" TimedEvents for the non-Yom-Kippur fast days (Tzom Gedaliah, Asara
 * B'Tevet, Ta'anit Esther, Tzom Tammuz, Tish'a B'Av, Ta'anit Bechorot),
 * already correctly timed (sunset-to-nightfall for Tish'a B'Av, dawn-to-
 * nightfall for the others) — so the same boundary-event machinery below
 * covers both without any separate zmanim math.
 */

import { HebrewCalendar, Location, TimedEvent, type Event } from "@hebcal/core";

export interface SpecialTimeEntry {
  /** e.g. "כְּנִיסַת שַׁבָּת" or "יְצִיאַת צוֹם תִּשְׁעָה בְּאָב" — no time baked in. */
  label: string;
  /** "מָחָר", a weekday name, or null when `time` falls today. */
  dayPrefix: string | null;
  time: Date;
}

// Untranslated `basename()` -> vocalized Hebrew, for occasions that carry a
// candle-lighting/havdalah or fast-begins/fast-ends pair.
const OCCASION_NAMES_HE: Record<string, string> = {
  "Rosh Hashana": "רֹאשׁ הַשָּׁנָה",
  "Yom Kippur": "יוֹם כִּפּוּר",
  Sukkot: "סֻכּוֹת",
  "Shmini Atzeret": "שְׁמִינִי עֲצֶרֶת",
  "Simchat Torah": "שִׂמְחַת תּוֹרָה",
  Pesach: "פֶּסַח",
  Shavuot: "שָׁבוּעוֹת",
  "Tzom Gedaliah": "צוֹם גְּדַלְיָה",
  "Asara B'Tevet": "צוֹם עֲשָׂרָה בְּטֵבֵת",
  "Ta'anit Esther": "תַּעֲנִית אֶסְתֵּר",
  "Tzom Tammuz": "צוֹם תַּמּוּז",
  "Tish'a B'Av": "צוֹם תִּשְׁעָה בְּאָב",
  "Ta'anit Bechorot": "תַּעֲנִית בְּכוֹרוֹת",
};

const SHABBAT_HE = "שַׁבָּת";
const ENTRY_PREFIX = "כְּנִיסַת";
const EXIT_PREFIX = "יְצִיאַת";

const WEEKDAY_NAMES_HE = [
  "יוֹם רִאשׁוֹן",
  "יוֹם שֵׁנִי",
  "יוֹם שְׁלִישִׁי",
  "יוֹם רְבִיעִי",
  "יוֹם חֲמִישִׁי",
  "יוֹם שִׁישִׁי",
  "שַׁבָּת",
];

const DAY_MS = 24 * 60 * 60 * 1000;
// Boundaries within this gap of one another are treated as one "cluster"
// (e.g. a fast day right before Shabbat) and shown together; a bigger gap
// (e.g. next week's ordinary Shabbat) is left for when it's actually near.
const CLUSTER_GAP_MS = 3 * DAY_MS;
const MAX_ENTRIES = 4;

const RELEVANT_DESC = new Set(["Candle lighting", "Havdalah", "Fast begins", "Fast ends"]);

// Rough bounding box for Israel, to pick the one-day Yom Tov schedule and
// local candle-lighting custom vs. the Diaspora two-day schedule.
function isIsraelCoords(lat: number, lon: number): boolean {
  return lat >= 29.3 && lat <= 33.5 && lon >= 34.0 && lon <= 36.0;
}

function occasionName(linkedEvent: Event | undefined): string {
  if (!linkedEvent) return SHABBAT_HE;
  return OCCASION_NAMES_HE[linkedEvent.basename()] ?? SHABBAT_HE;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayPrefixFor(time: Date, now: Date): string | null {
  const diffDays = Math.round(
    (startOfDay(time).getTime() - startOfDay(now).getTime()) / DAY_MS
  );
  if (diffDays <= 0) return null; // today
  if (diffDays === 1) return "מָחָר";
  return WEEKDAY_NAMES_HE[time.getDay()];
}

/**
 * The upcoming Shabbat/Yom Tov/fast-day entry and exit moments relative to
 * `now`, as a flat chronological list. Normally this is just the next
 * candle-lighting and havdalah (or whichever of the two is still ahead), but
 * when a fast day falls close to Shabbat (or two occasions otherwise
 * cluster within a few days of each other) their entries and exits are
 * included together, each labeled with its own day so the list stays
 * unambiguous regardless of how many occasions it covers.
 */
export function getUpcomingSpecialTimes(
  now: Date,
  lat: number,
  lon: number
): SpecialTimeEntry[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  const il = isIsraelCoords(lat, lon);
  const tzid = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const location = new Location(lat, lon, il, tzid);

  const start = new Date(now.getTime() - DAY_MS);
  const end = new Date(now.getTime() + 21 * DAY_MS);

  let events: Event[];
  try {
    events = HebrewCalendar.calendar({
      start,
      end,
      location,
      candlelighting: true,
      sedrot: false,
      omer: false,
    });
  } catch {
    return [];
  }

  const boundaries = events
    .filter((ev): ev is TimedEvent => ev instanceof TimedEvent && RELEVANT_DESC.has(ev.getDesc()))
    .filter((ev) => ev.eventTime.getTime() > now.getTime())
    .map((ev) => {
      const isEntry = ev.getDesc() === "Candle lighting" || ev.getDesc() === "Fast begins";
      const occasion = occasionName(ev.linkedEvent);
      return {
        label: `${isEntry ? ENTRY_PREFIX : EXIT_PREFIX} ${occasion}`,
        time: ev.eventTime,
      };
    })
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const kept: { label: string; time: Date }[] = [];
  for (const boundary of boundaries) {
    if (kept.length >= MAX_ENTRIES) break;
    const prev = kept[kept.length - 1];
    if (prev && boundary.time.getTime() - prev.time.getTime() > CLUSTER_GAP_MS) break;
    kept.push(boundary);
  }

  return kept.map((b) => ({
    label: b.label,
    dayPrefix: dayPrefixFor(b.time, now),
    time: b.time,
  }));
}
