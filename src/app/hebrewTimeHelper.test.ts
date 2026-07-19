import { describe, it, expect } from "vitest";
import {
  convertTimeToHebrewWords,
  stripNiqqud,
  getHourName,
  getPrepositionedHour,
  getPeriodOfDay,
  HOURS_HEBREW,
  HOURS_PREPOSITION_HEBREW,
  MINUTES_ROUNDED_ADDITIVE,
  MINUTES_ROUNDED_SUBTRACTIVE,
  MINUTES_PRECISE_ADDITIVE,
} from "./hebrewTimeHelper";

// Assertions are built compositionally from the exported dictionaries so the
// tests never hard-code fragile Niqqud strings, and stripNiqqud() is used when
// a plain-consonant comparison is clearer.

describe("stripNiqqud", () => {
  it("removes vowel points", () => {
    expect(stripNiqqud(HOURS_HEBREW[1])).toBe("אחת");
    expect(stripNiqqud("שָׁלוֹשׁ")).toBe("שלוש");
  });

  it("is a no-op on text with no Niqqud", () => {
    expect(stripNiqqud("שלוש")).toBe("שלוש");
  });
});

describe("getPeriodOfDay", () => {
  it("maps each part of the day", () => {
    expect(stripNiqqud(getPeriodOfDay(8))).toBe("בבקר");
    expect(stripNiqqud(getPeriodOfDay(14))).toBe("בצהרים");
    expect(stripNiqqud(getPeriodOfDay(19))).toBe("בערב");
    expect(stripNiqqud(getPeriodOfDay(23))).toBe("בלילה");
    expect(stripNiqqud(getPeriodOfDay(3))).toBe("לפנות בקר");
  });
});

describe("getHourName / getPrepositionedHour", () => {
  it("wraps 24h hours to their 12h names", () => {
    expect(getHourName(13)).toBe(HOURS_HEBREW[1]);
    expect(getHourName(0)).toBe(HOURS_HEBREW[12]);
    expect(getHourName(12)).toBe(HOURS_HEBREW[12]);
  });

  it("maps midnight to the 'to midnight' preposition", () => {
    expect(getPrepositionedHour(0)).toBe(HOURS_PREPOSITION_HEBREW[0]);
    expect(getPrepositionedHour(13)).toBe(HOURS_PREPOSITION_HEBREW[1]);
  });
});

describe("convertTimeToHebrewWords - precise mode", () => {
  it("says 'exactly' on the hour", () => {
    const result = convertTimeToHebrewWords(10, 0, true);
    expect(result.startsWith(HOURS_HEBREW[10])).toBe(true);
    expect(result.endsWith(getPeriodOfDay(10))).toBe(true);
    // The word between hour and period is the "exactly" marker.
    expect(stripNiqqud(result)).toContain("בדיוק");
  });

  it("renders midnight as חצות", () => {
    expect(stripNiqqud(convertTimeToHebrewWords(0, 0, true))).toBe("חצות");
  });

  it("renders additive minutes", () => {
    const result = convertTimeToHebrewWords(10, 5, true);
    expect(result).toBe(
      `${HOURS_HEBREW[10]} ${MINUTES_PRECISE_ADDITIVE[5]} ${getPeriodOfDay(10)}`
    );
  });

  it("renders subtractive minutes past 40", () => {
    // 10:50 -> ten minutes to eleven
    const result = convertTimeToHebrewWords(10, 50, true);
    expect(result).toContain(getPrepositionedHour(11));
    expect(result.endsWith(getPeriodOfDay(11))).toBe(true);
  });

  it("ignores seconds (truncates like a normal clock)", () => {
    expect(convertTimeToHebrewWords(10, 5, true, 59)).toBe(
      convertTimeToHebrewWords(10, 5, true, 0)
    );
  });
});

describe("convertTimeToHebrewWords - rounded (poetic) mode", () => {
  it("does NOT say 'exactly' on a rounded hour", () => {
    const result = convertTimeToHebrewWords(10, 2, false);
    expect(result).toBe(`${HOURS_HEBREW[10]} ${getPeriodOfDay(10)}`);
    expect(stripNiqqud(result)).not.toContain("בדיוק");
  });

  it("differs from precise mode on the exact hour", () => {
    const rounded = convertTimeToHebrewWords(10, 0, false);
    const precise = convertTimeToHebrewWords(10, 0, true);
    expect(rounded).not.toBe(precise);
  });

  it("rounds to the nearest 5 minutes", () => {
    // :02 rounds down to the hour, :03 rounds up to five past
    expect(convertTimeToHebrewWords(10, 2, false)).toBe(
      `${HOURS_HEBREW[10]} ${getPeriodOfDay(10)}`
    );
    expect(convertTimeToHebrewWords(10, 3, false)).toBe(
      `${HOURS_HEBREW[10]} ${MINUTES_ROUNDED_ADDITIVE[5]} ${getPeriodOfDay(10)}`
    );
  });

  it("takes seconds into account when rounding", () => {
    // 10:02:00 -> hour; 10:02:40 (~10:02.7) -> five past
    expect(convertTimeToHebrewWords(10, 2, false, 0)).toBe(
      `${HOURS_HEBREW[10]} ${getPeriodOfDay(10)}`
    );
    expect(convertTimeToHebrewWords(10, 2, false, 40)).toBe(
      `${HOURS_HEBREW[10]} ${MINUTES_ROUNDED_ADDITIVE[5]} ${getPeriodOfDay(10)}`
    );
  });

  it("rolls over to the next hour when rounding up from :58", () => {
    expect(convertTimeToHebrewWords(10, 58, false)).toBe(
      `${HOURS_HEBREW[11]} ${getPeriodOfDay(11)}`
    );
  });

  it("uses subtractive phrasing past the half hour", () => {
    // 10:50 -> ten to eleven
    const result = convertTimeToHebrewWords(10, 50, false);
    expect(result).toBe(
      `${MINUTES_ROUNDED_SUBTRACTIVE[10]} ${getPrepositionedHour(11)} ${getPeriodOfDay(11)}`
    );
  });

  it("drops the day-period when counting down to midnight", () => {
    // 23:50 -> ten to midnight, no period suffix
    const result = convertTimeToHebrewWords(23, 50, false);
    expect(result).toBe(
      `${MINUTES_ROUNDED_SUBTRACTIVE[10]} ${getPrepositionedHour(0)}`
    );
  });
});

describe("convertTimeToHebrewWords - full-day coverage", () => {
  it("never produces an empty or undefined phrase for any minute", () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        for (const precise of [true, false]) {
          const result = convertTimeToHebrewWords(h, m, precise);
          expect(result, `h=${h} m=${m} precise=${precise}`).toBeTruthy();
          expect(result).not.toContain("undefined");
        }
      }
    }
  });
});
