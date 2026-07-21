import { describe, it, expect } from "vitest";
import { getUpcomingSpecialTimes } from "./shabbatTimes";

// Jerusalem coordinates; a real Israeli location keeps the `il` schedule
// deterministic across the scenarios below.
const LAT = 31.78;
const LON = 35.22;

function stripNiqqudForCompare(s: string): string {
  return s.replace(/[ְ-ׇ]/g, "");
}

describe("getUpcomingSpecialTimes", () => {
  it("returns [] when location is unknown", () => {
    expect(getUpcomingSpecialTimes(new Date(), NaN, NaN)).toEqual([]);
  });

  it("shows only the ordinary next Shabbat, entry and exit, far from any fast", () => {
    // Sunday, 2026-07-26 — the week after Tish'a B'Av, nothing else nearby.
    const now = new Date("2026-07-26T07:00:00Z");
    const entries = getUpcomingSpecialTimes(now, LAT, LON);
    const occasions = entries.map((e) => stripNiqqudForCompare(e.label));
    expect(occasions).toEqual(["כניסת שבת", "יציאת שבת"]);
  });

  it("clusters a nearby fast day together with the following Shabbat", () => {
    // Tuesday 2026-07-21, the day before Tish'a B'Av begins that Wednesday
    // evening, with Shabbat right behind it — the scenario the user asked
    // about: both the fast's and Shabbat's entry/exit should show together.
    const now = new Date("2026-07-21T07:00:00Z");
    const entries = getUpcomingSpecialTimes(now, LAT, LON);
    const occasions = entries.map((e) => stripNiqqudForCompare(e.label));
    expect(occasions).toEqual([
      "כניסת צום תשעה באב",
      "יציאת צום תשעה באב",
      "כניסת שבת",
      "יציאת שבת",
    ]);
    // Chronological order and every entry a distinct day.
    const times = entries.map((e) => e.time.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("shows only the fast's exit once already inside the fast", () => {
    // Wednesday evening 2026-07-22, after the fast has begun (~19:43 local).
    const now = new Date("2026-07-22T17:00:00Z");
    const entries = getUpcomingSpecialTimes(now, LAT, LON);
    const occasions = entries.map((e) => stripNiqqudForCompare(e.label));
    expect(occasions[0]).toBe("יציאת צום תשעה באב");
    expect(occasions).not.toContain("כניסת צום תשעה באב");
  });

  it("drops next week's Shabbat once the current cluster is behind us", () => {
    // Friday morning 2026-07-24, fast is over; only that Shabbat's own
    // entry/exit should show, not the one after it.
    const now = new Date("2026-07-24T07:00:00Z");
    const entries = getUpcomingSpecialTimes(now, LAT, LON);
    const occasions = entries.map((e) => stripNiqqudForCompare(e.label));
    expect(occasions).toEqual(["כניסת שבת", "יציאת שבת"]);
  });

  it("labels a same-day time with no day prefix and a further one with a weekday name", () => {
    const now = new Date("2026-07-21T07:00:00Z"); // Tuesday
    const entries = getUpcomingSpecialTimes(now, LAT, LON);
    // Tish'a B'Av begins Wednesday evening — one day out.
    expect(entries[0].dayPrefix).toBe("מָחָר");
    // Shabbat entry, a couple of days further out, gets its weekday name.
    const shabbatEntry = entries.find((e) => stripNiqqudForCompare(e.label) === "כניסת שבת");
    expect(shabbatEntry?.dayPrefix).toBe("יוֹם שִׁישִׁי");
  });
});
