/**
 * Shabbat/Yom Tov candle-lighting and havdalah times, via @hebcal/core's
 * astronomical + Hebrew-calendar calculations (accurate Jewish calendar,
 * not something worth re-deriving by hand).
 */

import { HebrewCalendar, Location, TimedEvent, type Event } from "@hebcal/core";

export interface ShabbatStatus {
  label: string; // e.g. "כְּנִיסַת שַׁבָּת" or "יְצִיאַת יוֹם כִּפּוּר"
  time: Date;
}

// Untranslated `basename()` -> vocalized Hebrew, for the handful of Yamim
// Tovim that carry candle-lighting/havdalah (i.e. actual CHAG, not every
// minor holiday).
const HOLIDAY_NAMES_HE: Record<string, string> = {
  "Rosh Hashana": "רֹאשׁ הַשָּׁנָה",
  "Yom Kippur": "יוֹם כִּפּוּר",
  Sukkot: "סֻכּוֹת",
  "Shmini Atzeret": "שְׁמִינִי עֲצֶרֶת",
  "Simchat Torah": "שִׂמְחַת תּוֹרָה",
  Pesach: "פֶּסַח",
  Shavuot: "שָׁבוּעוֹת",
};

const SHABBAT_HE = "שַׁבָּת";
const ENTRY_PREFIX = "כְּנִיסַת";
const EXIT_PREFIX = "יְצִיאַת";

// Rough bounding box for Israel, to pick the one-day Yom Tov schedule and
// local candle-lighting custom vs. the Diaspora two-day schedule.
function isIsraelCoords(lat: number, lon: number): boolean {
  return lat >= 29.3 && lat <= 33.5 && lon >= 34.0 && lon <= 36.0;
}

function occasionName(linkedEvent: Event | undefined): string {
  if (!linkedEvent) return SHABBAT_HE;
  return HOLIDAY_NAMES_HE[linkedEvent.basename()] ?? SHABBAT_HE;
}

/**
 * The next relevant Shabbat/Yom Tov entry or exit moment relative to `now`:
 * the upcoming candle-lighting if we're not currently in one, or the
 * havdalah time if we are.
 */
export function getShabbatStatus(now: Date, lat: number, lon: number): ShabbatStatus | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const il = isIsraelCoords(lat, lon);
  const tzid = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const location = new Location(lat, lon, il, tzid);

  const start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

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
    return null;
  }

  const timed = events.filter(
    (ev): ev is TimedEvent =>
      ev instanceof TimedEvent && (ev.getDesc() === "Candle lighting" || ev.getDesc() === "Havdalah")
  );

  // Currently inside a Shabbat/Yom Tov if the latest start before now has no
  // end in between it and now.
  let lastStart: TimedEvent | null = null;
  let lastEnd: TimedEvent | null = null;
  for (const ev of timed) {
    if (ev.eventTime.getTime() > now.getTime()) continue;
    if (ev.getDesc() === "Candle lighting") lastStart = ev;
    else lastEnd = ev;
  }
  const insideNow =
    lastStart && (!lastEnd || lastEnd.eventTime.getTime() < lastStart.eventTime.getTime());

  if (insideNow) {
    const exitEvent = timed.find(
      (ev) => ev.getDesc() === "Havdalah" && ev.eventTime.getTime() > now.getTime()
    );
    if (exitEvent) {
      return { label: `${EXIT_PREFIX} ${occasionName(exitEvent.linkedEvent)}`, time: exitEvent.eventTime };
    }
  }

  const entryEvent = timed.find(
    (ev) => ev.getDesc() === "Candle lighting" && ev.eventTime.getTime() > now.getTime()
  );
  if (entryEvent) {
    return { label: `${ENTRY_PREFIX} ${occasionName(entryEvent.linkedEvent)}`, time: entryEvent.eventTime };
  }

  return null;
}
