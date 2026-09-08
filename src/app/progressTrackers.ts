export interface WeeklyCycleOptions {
  startDay?: number; // 0 = Sunday, 1 = Monday (default)
  startHour?: number; // 6 (default)
  startMinute?: number; // 0 (default)
  deductShabbat?: boolean; // true (default)
  shabbatStartHour?: number; // 18 (default 18:30)
  shabbatStartMinute?: number; // 30 (default)
  shabbatEndHour?: number; // 19 (default 19:30)
  shabbatEndMinute?: number; // 30 (default)
}

export interface WeeklyCycleStats {
  cycleStart: Date;
  cycleEnd: Date;
  shabbatStart: Date;
  shabbatEnd: Date;
  isCurrentlyShabbat: boolean;
  totalCycleMs: number;
  activeTotalMs: number;
  activeElapsedMs: number;
  activeRemainingMs: number;
  percentageElapsed: number; // 0 to 100
  elapsedHebrew: string;
  remainingHebrew: string;
}

export interface Session5hStats {
  startMs: number;
  durationMs: number;
  elapsedMs: number;
  remainingMs: number;
  isFinished: boolean;
  percentageElapsed: number; // 0 to 100
  elapsedDigital: string;
  remainingDigital: string;
  remainingHebrew: string;
}

/**
 * Calculates start and end of the current weekly cycle (Monday 06:00 to Monday 06:00 by default)
 */
export function getCycleDates(
  now: Date = new Date(),
  startDay: number = 1,
  startHour: number = 6,
  startMinute: number = 0
): { cycleStart: Date; cycleEnd: Date } {
  const cycleStart = new Date(now);
  cycleStart.setHours(startHour, startMinute, 0, 0);

  const currentDay = now.getDay();
  let diffDays = (currentDay - startDay + 7) % 7;
  if (diffDays === 0 && now.getTime() < cycleStart.getTime()) {
    diffDays = 7;
  }
  cycleStart.setDate(cycleStart.getDate() - diffDays);

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 7);

  return { cycleStart, cycleEnd };
}

/**
 * Calculates Shabbat start and end times for the given cycle
 */
export function getShabbatDates(
  cycleStart: Date,
  shabbatStartHour: number = 18,
  shabbatStartMinute: number = 30,
  shabbatEndHour: number = 19,
  shabbatEndMinute: number = 30
): { shabbatStart: Date; shabbatEnd: Date } {
  // Cycle starts on Monday (day 1); Shabbat starts on Friday (day 5), which is +4 days
  const shabbatStart = new Date(cycleStart);
  shabbatStart.setDate(cycleStart.getDate() + 4);
  shabbatStart.setHours(shabbatStartHour, shabbatStartMinute, 0, 0);

  const shabbatEnd = new Date(shabbatStart);
  shabbatEnd.setDate(shabbatStart.getDate() + 1);
  shabbatEnd.setHours(shabbatEndHour, shabbatEndMinute, 0, 0);

  return { shabbatStart, shabbatEnd };
}

/**
 * Calculates full weekly cycle statistics, including optional Shabbat deduction
 */
export function getWeeklyCycleStats(
  now: Date = new Date(),
  options: WeeklyCycleOptions = {}
): WeeklyCycleStats {
  const {
    startDay = 1,
    startHour = 6,
    startMinute = 0,
    deductShabbat = true,
    shabbatStartHour = 18,
    shabbatStartMinute = 30,
    shabbatEndHour = 19,
    shabbatEndMinute = 30,
  } = options;

  const { cycleStart, cycleEnd } = getCycleDates(now, startDay, startHour, startMinute);
  const { shabbatStart, shabbatEnd } = getShabbatDates(
    cycleStart,
    shabbatStartHour,
    shabbatStartMinute,
    shabbatEndHour,
    shabbatEndMinute
  );

  const totalCycleMs = cycleEnd.getTime() - cycleStart.getTime();
  const shabbatDurationMs = Math.max(0, shabbatEnd.getTime() - shabbatStart.getTime());
  const activeTotalMs = deductShabbat ? totalCycleMs - shabbatDurationMs : totalCycleMs;
  const rawElapsedMs = now.getTime() - cycleStart.getTime();

  let shabbatPassedMs = 0;
  let isCurrentlyShabbat = false;

  if (now.getTime() >= shabbatEnd.getTime()) {
    shabbatPassedMs = shabbatDurationMs;
  } else if (now.getTime() >= shabbatStart.getTime() && now.getTime() < shabbatEnd.getTime()) {
    shabbatPassedMs = now.getTime() - shabbatStart.getTime();
    isCurrentlyShabbat = true;
  }

  const activeElapsedMs = deductShabbat
    ? Math.max(0, rawElapsedMs - shabbatPassedMs)
    : Math.max(0, rawElapsedMs);

  const activeRemainingMs = Math.max(0, activeTotalMs - activeElapsedMs);

  let percentageElapsed = activeTotalMs > 0 ? (activeElapsedMs / activeTotalMs) * 100 : 0;
  percentageElapsed = Math.min(100, Math.max(0, percentageElapsed));

  return {
    cycleStart,
    cycleEnd,
    shabbatStart,
    shabbatEnd,
    isCurrentlyShabbat,
    totalCycleMs,
    activeTotalMs,
    activeElapsedMs,
    activeRemainingMs,
    percentageElapsed,
    elapsedHebrew: formatDurationHebrew(activeElapsedMs),
    remainingHebrew: formatDurationHebrew(activeRemainingMs),
  };
}

/**
 * Calculates 5-hour session timer statistics
 */
export function getSession5hStats(
  startTime: Date | number,
  now: Date = new Date(),
  durationMs: number = 5 * 60 * 60 * 1000
): Session5hStats {
  const startMs = typeof startTime === "number" ? startTime : startTime.getTime();
  const nowMs = now.getTime();
  const rawElapsed = nowMs - startMs;
  const elapsedMs = Math.min(durationMs, Math.max(0, rawElapsed));
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const isFinished = rawElapsed >= durationMs;

  let percentageElapsed = durationMs > 0 ? (elapsedMs / durationMs) * 100 : 0;
  percentageElapsed = Math.min(100, Math.max(0, percentageElapsed));

  return {
    startMs,
    durationMs,
    elapsedMs,
    remainingMs,
    isFinished,
    percentageElapsed,
    elapsedDigital: formatDigital(elapsedMs),
    remainingDigital: formatDigital(remainingMs),
    remainingHebrew: formatDurationHebrew(remainingMs),
  };
}

/**
 * Formats milliseconds to readable Hebrew duration (e.g. "2 ימים ו-4 שעות")
 */
export function formatDurationHebrew(ms: number): string {
  if (ms <= 0) return "0 דק׳";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(days === 1 ? "יום 1" : `${days} ימים`);
  }
  if (hours > 0) {
    parts.push(hours === 1 ? "שעה 1" : `${hours} שעות`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} דק׳`);
  }
  return parts.join(" ו-");
}

/**
 * Formats milliseconds to HH:MM:SS
 */
export function formatDigital(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSecs = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
  const s = String(totalSecs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
