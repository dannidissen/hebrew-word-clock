/**
 * The day's Jewish-calendar context — Hebrew date, weekly parasha, Daf Yomi,
 * and (in season) the Omer count — via @hebcal/core plus the official
 * @hebcal/learning schedules for Daf Yomi. Like shabbatTimes.ts this is a
 * heavy dependency, so it's code-split and only imported once the zmanim
 * feature is on.
 *
 * The Hebrew day rolls over at nightfall, not civil midnight, so after
 * tzeit hakochavim we advance to the next civil day's HDate — otherwise the
 * evening would still show the previous day's date/parasha/daf.
 */

import "@hebcal/learning"; // registers Daf Yomi (and friends) on DailyLearning
import {
  HDate,
  HebrewCalendar,
  ParshaEvent,
  DailyLearning,
  type Event,
} from "@hebcal/core";
import { getZmanim } from "./solarTimes";

export interface JewishCalendarInfo {
  /** Vocalized Hebrew date with gematriya year, e.g. "ט׳ אָב תשפ״ו". */
  hebrewDate: string;
  /** Weekly parasha, e.g. "פָּרָשַׁת וָאֶתְחַנַּן", or null. */
  parsha: string | null;
  /** Daf Yomi (masechet + daf), e.g. "חוּלִּין דף פ״ד", or null. */
  dafYomi: string | null;
  /** Omer count during the season, e.g. "ל״ח בָּעוֹמֶר", or null. */
  omer: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Same rough Israel bounding box used by shabbatTimes, to pick the Israel vs.
// Diaspora parasha schedule.
function isIsraelCoords(lat: number, lon: number): boolean {
  return lat >= 29.3 && lat <= 33.5 && lon >= 34.0 && lon <= 36.0;
}

export function getJewishCalendar(
  now: Date,
  lat: number,
  lon: number
): JewishCalendarInfo | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const il = isIsraelCoords(lat, lon);

  // After nightfall the Hebrew date has already advanced to the next day.
  let ref = now;
  try {
    const z = getZmanim(now, lat, lon);
    if (z.tzeitHakochavim && now.getTime() >= z.tzeitHakochavim.getTime()) {
      ref = new Date(now.getTime() + DAY_MS);
    }
  } catch {
    // fall back to the civil date
  }

  let hd: HDate;
  try {
    hd = new HDate(ref);
  } catch {
    return null;
  }

  const hebrewDate = hd.renderGematriya();

  let parsha: string | null = null;
  try {
    const events: Event[] = HebrewCalendar.calendar({
      start: hd,
      end: new HDate(hd.abs() + 6),
      il,
      sedrot: true,
      noHolidays: true,
    });
    const pe = events.find((e) => e instanceof ParshaEvent);
    if (pe) parsha = pe.render("he");
  } catch {
    // leave null
  }

  let dafYomi: string | null = null;
  try {
    const daf = DailyLearning.lookup("dafYomi", hd, il);
    // Drop the "דַּף יוֹמִי: " prefix — the column already carries that title.
    if (daf) dafYomi = daf.render("he").replace(/^דַּף\s+יוֹמִי:\s*/, "");
  } catch {
    // leave null
  }

  let omer: string | null = null;
  try {
    const oEvents: Event[] = HebrewCalendar.calendar({
      start: hd,
      end: hd,
      il,
      omer: true,
      noHolidays: true,
    });
    const oe = oEvents.find((e) => /omer/i.test(e.getDesc()));
    if (oe) omer = oe.render("he");
  } catch {
    // leave null
  }

  return { hebrewDate, parsha, dafYomi, omer };
}
