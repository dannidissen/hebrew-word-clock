import { describe, it, expect } from "vitest";
import {
  getCycleDates,
  getShabbatDates,
  getWeeklyCycleStats,
  getSession5hStats,
  formatDurationHebrew,
  formatDigital,
} from "./progressTrackers";

describe("progressTrackers", () => {
  describe("getCycleDates", () => {
    it("correctly identifies Monday 06:00 cycle start and end", () => {
      // Wednesday at noon
      const wednesday = new Date(2026, 8, 9, 12, 0, 0); // Sep 9, 2026 is Wednesday
      const { cycleStart, cycleEnd } = getCycleDates(wednesday, 1, 6, 0);

      // Start should be Monday Sep 7, 2026 at 06:00
      expect(cycleStart.getDay()).toBe(1);
      expect(cycleStart.getDate()).toBe(7);
      expect(cycleStart.getHours()).toBe(6);
      expect(cycleStart.getMinutes()).toBe(0);

      // End should be Monday Sep 14, 2026 at 06:00
      expect(cycleEnd.getDay()).toBe(1);
      expect(cycleEnd.getDate()).toBe(14);
      expect(cycleEnd.getHours()).toBe(6);
      expect(cycleEnd.getMinutes()).toBe(0);
    });

    it("handles Monday before 06:00 properly by pointing to previous Monday", () => {
      // Monday Sep 7, 2026 at 05:30 AM
      const mondayEarly = new Date(2026, 8, 7, 5, 30, 0);
      const { cycleStart, cycleEnd } = getCycleDates(mondayEarly, 1, 6, 0);

      // Start should be Monday Aug 31, 2026 at 06:00
      expect(cycleStart.getDate()).toBe(31);
      expect(cycleStart.getMonth()).toBe(7); // August
      expect(cycleEnd.getDate()).toBe(7);
      expect(cycleEnd.getMonth()).toBe(8); // September
    });
  });

  describe("getShabbatDates", () => {
    it("calculates Shabbat start Friday 18:30 and end Saturday 19:30", () => {
      const cycleStart = new Date(2026, 8, 7, 6, 0, 0); // Monday
      const { shabbatStart, shabbatEnd } = getShabbatDates(cycleStart, 18, 30, 19, 30);

      expect(shabbatStart.getDay()).toBe(5); // Friday
      expect(shabbatStart.getHours()).toBe(18);
      expect(shabbatStart.getMinutes()).toBe(30);

      expect(shabbatEnd.getDay()).toBe(6); // Saturday
      expect(shabbatEnd.getHours()).toBe(19);
      expect(shabbatEnd.getMinutes()).toBe(30);
    });
  });

  describe("getWeeklyCycleStats", () => {
    it("calculates progress before Shabbat with deduction", () => {
      // Thursday Sep 10, 2026 at 18:00
      const thursday = new Date(2026, 8, 10, 18, 0, 0);
      const stats = getWeeklyCycleStats(thursday, { deductShabbat: true });

      expect(stats.isCurrentlyShabbat).toBe(false);
      expect(stats.percentageElapsed).toBeGreaterThan(0);
      expect(stats.percentageElapsed).toBeLessThan(100);
      expect(stats.activeTotalMs).toBeLessThan(stats.totalCycleMs);
    });

    it("pauses progress during Shabbat when deductShabbat is true", () => {
      // Friday night Sep 11, 2026 at 22:00 (Shabbat start is 18:30)
      const duringShabbat1 = new Date(2026, 8, 11, 22, 0, 0);
      const stats1 = getWeeklyCycleStats(duringShabbat1, { deductShabbat: true });

      // Saturday afternoon Sep 12, 2026 at 14:00
      const duringShabbat2 = new Date(2026, 8, 12, 14, 0, 0);
      const stats2 = getWeeklyCycleStats(duringShabbat2, { deductShabbat: true });

      expect(stats1.isCurrentlyShabbat).toBe(true);
      expect(stats2.isCurrentlyShabbat).toBe(true);

      // Both must have the exact same active elapsed time and percentage!
      expect(stats1.activeElapsedMs).toBe(stats2.activeElapsedMs);
      expect(stats1.percentageElapsed).toBe(stats2.percentageElapsed);
    });

    it("does not deduct Shabbat if deductShabbat is false", () => {
      const duringShabbat1 = new Date(2026, 8, 11, 22, 0, 0);
      const stats = getWeeklyCycleStats(duringShabbat1, { deductShabbat: false });
      expect(stats.activeTotalMs).toBe(stats.totalCycleMs);
    });
  });

  describe("getSession5hStats", () => {
    it("calculates session progress accurately", () => {
      const start = new Date(2026, 8, 8, 10, 0, 0);
      // 2.5 hours later (50%)
      const now = new Date(2026, 8, 8, 12, 30, 0);

      const stats = getSession5hStats(start, now);
      expect(stats.isFinished).toBe(false);
      expect(stats.percentageElapsed).toBeCloseTo(50, 1);
      expect(stats.elapsedDigital).toBe("02:30:00");
      expect(stats.remainingDigital).toBe("02:30:00");
    });

    it("caps at 100% and marks finished when 5 hours pass", () => {
      const start = new Date(2026, 8, 8, 10, 0, 0);
      // 6 hours later
      const now = new Date(2026, 8, 8, 16, 0, 0);

      const stats = getSession5hStats(start, now);
      expect(stats.isFinished).toBe(true);
      expect(stats.percentageElapsed).toBe(100);
      expect(stats.remainingMs).toBe(0);
      expect(stats.remainingDigital).toBe("00:00:00");
    });
  });

  describe("formatting helpers", () => {
    it("formats Hebrew durations", () => {
      expect(formatDurationHebrew(0)).toBe("0 דק׳");
      expect(formatDurationHebrew(60 * 1000)).toBe("1 דק׳");
      expect(formatDurationHebrew(3600 * 1000)).toBe("שעה 1");
      expect(formatDurationHebrew((2 * 86400 + 3 * 3600 + 15 * 60) * 1000)).toBe(
        "2 ימים ו-3 שעות ו-15 דק׳"
      );
    });

    it("formats digital strings", () => {
      expect(formatDigital(0)).toBe("00:00:00");
      expect(formatDigital((3 * 3600 + 25 * 60 + 9) * 1000)).toBe("03:25:09");
    });
  });
});
