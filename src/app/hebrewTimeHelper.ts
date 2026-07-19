/**
 * Hebrew Time Helper
 * Provides dictionary lookups for vocalized Hebrew numbers (with Niqqud)
 * and parser engine to convert Date to Hebrew words.
 */

// 1. Hours absolute representation (Feminine)
export const HOURS_HEBREW: Record<number, string> = {
  1: "אַחַת",
  2: "שְׁתַּיִם",
  3: "שָׁלוֹשׁ",
  4: "אַרְבַּע",
  5: "חָמֵשׁ",
  6: "שֵׁשׁ",
  7: "שֶׁבַע",
  8: "שְׁמוֹנֶה",
  9: "תֵּשַׁע",
  10: "עֶשֶׂר",
  11: "אַחַת עֶשְׂרֵה",
  12: "שְׁתֵּים עֶשְׂרֵה",
};

// 2. Prepositioned Hours for subtractive time ("to X hour")
// Accounts for Hebrew grammar rules (e.g. "לְ..." changing to "לִ..." before Shva)
export const HOURS_PREPOSITION_HEBREW: Record<number, string> = {
  0: "לַחֲצוֹת",              // to midnight
  1: "לְאַחַת",
  2: "לִשְׁתַּיִם",
  3: "לְשָׁלוֹשׁ",
  4: "לְאַרְבַּע",
  5: "לְחָמֵשׁ",
  6: "לְשֵׁשׁ",
  7: "לְשֶׁבַע",
  8: "לִשְׁמוֹנֶה",
  9: "לְתֵשַׁע",
  10: "לְעֶשֶׂר",
  11: "לְאַחַת עֶשְׂרֵה",
  12: "לִשְׁתֵּים עֶשְׂרֵה",
};

// 3. Spoken/Rounded Minutes - Masculine representation (since "דקות" is omitted)
// With the conjunction "וְ..." attached.
export const MINUTES_ROUNDED_ADDITIVE: Record<number, string> = {
  5: "וַחֲמִשָּׁה",
  10: "וַעֲשָׂרָה",
  15: "וָרֶבַע",
  20: "וְעֶשְׂרִים",
  25: "וְעֶשְׂרִים וַחֲמִשָּׁה",
  30: "וָחֵצִי",
  35: "וָחֵצִי וַחֲמִשָּׁה", // Poetic "half and five"
};

// Rounded minutes subtraction prefix (Masculine)
export const MINUTES_ROUNDED_SUBTRACTIVE: Record<number, string> = {
  5: "חֲמִשָּׁה",
  10: "עֲשָׂרָה",
  15: "רֶבַע",
  20: "עֶשְׂרִים",
  25: "עֶשְׂרִים וַחֲמִשָּׁה",
};

// 4. Precise Minutes - Feminine representation (matching the noun "דַּקּוֹת")
// With the conjunction "וְ..." attached.
export const MINUTES_PRECISE_ADDITIVE: Record<number, string> = {
  1: "וְדַקָּה",
  2: "וּשְׁתֵּי דַּקּוֹת",
  3: "וְשָׁלֹשׁ דַּקּוֹת",
  4: "וְאַרְבַּע דַּקּוֹת",
  5: "וְחָמֵשׁ דַּקּוֹת",
  6: "וְשֵׁשׁ דַּקּוֹת",
  7: "וְשֶׁבַע דַּקּוֹת",
  8: "וּשְׁמוֹנֶה דַּקּוֹת",
  9: "וְתֵשַׁע דַּקּוֹת",
  10: "וְעֶשֶׂר דַּקּוֹת",
  11: "וְאַחַת עֶשְׂרֵה דַּקּוֹת",
  12: "וּשְׁתֵּים עֶשְׂרֵה דַּקּוֹת",
  13: "וּשְׁלֹשׁ עֶשְׂרֵה דַּקּוֹת",
  14: "וְאַרְבַּע עֶשְׂרֵה דַּקּוֹת",
  15: "וַחֲמֵשׁ עֶשְׂרֵה דַּקּוֹת", // or "וָרֶבַע"
  16: "וּשְׁשׁ עֶשְׂרֵה דַּקּוֹת",
  17: "וּשְׁבַע עֶשְׂרֵה דַּקּוֹת",
  18: "וּשְׁמוֹנֶה עֶשְׂרֵה דַּקּוֹת",
  19: "וּתְשַׁע עֶשְׂרֵה דַּקּוֹת",
  20: "וְעֶשְׂרִים דַּקּוֹת",
  21: "וְעֶשְׂרִים וְדַקָּה",
  22: "וְעֶשְׂרִים וּשְׁתֵּי דַּקּוֹת",
  23: "וְעֶשְׂרִים וְשָׁלֹשׁ דַּקּוֹת",
  24: "וְעֶשְׂרִים וְאַרְבַּע דַּקּוֹת",
  25: "וְעֶשְׂרִים וְחָמֵשׁ דַּקּוֹת",
  26: "וְעֶשְׂרִים וְשֵׁשׁ דַּקּוֹת",
  27: "וְעֶשְׂרִים וְשֶׁבַע דַּקּוֹת",
  28: "וְעֶשְׂרִים וּשְׁמוֹנֶה דַּקּוֹת",
  29: "וְעֶשְׂרִים וְתֵשַׁע דַּקּוֹת",
  30: "וָחֵצִי", // keep "וָחֵצִי" for 30 even in precise as it's the natural way
  31: "וּשְׁלֹשִׁים וְדַקָּה",
  32: "וּשְׁלֹשִׁים וּשְׁתֵּי דַּקּוֹת",
  33: "וּשְׁלֹשִׁים וְשָׁלֹשׁ דַּקּוֹת",
  34: "וּשְׁלֹשִׁים וְאַרְבַּע דַּקּוֹת",
  35: "וּשְׁלֹשִׁים וְחָמֵשׁ דַּקּוֹת",
  36: "וּשְׁלֹשִׁים וְשֵׁשׁ דַּקּוֹת",
  37: "וּשְׁלֹשִׁים וְשֶׁבַע דַּקּוֹת",
  38: "וּשְׁלֹשִׁים וּשְׁמוֹנֶה דַּקּוֹת",
  39: "וּשְׁלֹשִׁים וְתֵשַׁע דַּקּוֹת",
};

// Precise minutes subtraction prefix (Feminine)
export const MINUTES_PRECISE_SUBTRACTIVE: Record<number, string> = {
  1: "דַּקָּה אַחַת",
  2: "שְׁתֵּי דַּקּוֹת",
  3: "שָׁלֹשׁ דַּקּוֹת",
  4: "אַרְבַּע דַּקּוֹת",
  5: "חָמֵשׁ דַּקּוֹת",
  6: "שֵׁשׁ דַּקּוֹת",
  7: "שֶׁבַע דַּקּוֹת",
  8: "שְׁמוֹנֶה דַּקּוֹת",
  9: "תֵּשַׁע דַּקּוֹת",
  10: "עֶשֶׂר דַּקּוֹת",
  11: "אַחַת עֶשְׂרֵה דַּקּוֹת",
  12: "שְׁתֵּים עֶשְׂרֵה דַּקּוֹת",
  13: "שְׁלֹשׁ עֶשְׂרֵה דַּקּוֹת",
  14: "אַרְבַּע עֶשְׂרֵה דַּקּוֹת",
  15: "רֶבַע", // or "חֲמֵשׁ עֶשְׂרֵה דַּקּוֹת"
  16: "שֵׁשׁ עֶשְׂרֵה דַּקּוֹת",
  17: "שְׁבַע עֶשְׂרֵה דַּקּוֹת",
  18: "שְׁמוֹנֶה עֶשְׂרֵה דַּקּוֹת",
  19: "תְּשַׁע עֶשְׂרֵה דַּקּוֹת",
  20: "עֶשְׂרִים דַּקּוֹת",
};

/**
 * Strips Hebrew Niqqud programmatically using the Unicode range regex
 */
export function stripNiqqud(text: string): string {
  return text.replace(/[\u05B0-\u05C7]/g, "");
}

/**
 * Translates 24h hour to 12h absolute name
 */
export function getHourName(h: number): string {
  let displayHour = h % 12;
  if (displayHour === 0) displayHour = 12;
  return HOURS_HEBREW[displayHour];
}

/**
 * Translates next hour index (0-23) to prepositioned "to X" form
 */
export function getPrepositionedHour(h: number): string {
  let displayHour = h % 12;
  // If target hour is midnight (0), map to 0 ("לַחֲצוֹת")
  if (h === 0) {
    return HOURS_PREPOSITION_HEBREW[0];
  }
  if (displayHour === 0) displayHour = 12;
  return HOURS_PREPOSITION_HEBREW[displayHour];
}

/**
 * Get period prefix based on 24h clock hour
 */
export function getPeriodOfDay(h: number): string {
  // 05:00 - 11:59 -> בַּבֹּקֶר
  if (h >= 5 && h < 12) {
    return "בַּבֹּקֶר";
  }
  // 12:01 - 16:59 -> בַּצָּהֳרַיִם
  if (h >= 12 && h < 17) {
    return "בַּצָּהֳרַיִם";
  }
  // 17:00 - 21:59 -> בָּעֶרֶב
  if (h >= 17 && h < 22) {
    return "בָּעֶרֶב";
  }
  // 22:00 - 04:59 -> בַּלַּיְלָה
  // Special poetic option: "לִפְנוֹת בֹּקֶר" between 02:00 and 05:00 (i.e. 2, 3, 4)
  if (h >= 2 && h < 5) {
    return "לִפְנוֹת בֹּקֶר";
  }
  return "בַּלַּיְלָה";
}

/**
 * Parses time parameters into natural, poetic Hebrew phrases
 * @param hours 0-23 hour format
 * @param minutes 0-59 minute format
 * @param precise true if exact minutes, false if rounded to 5 mins
 * @param seconds 0-59 seconds, used only in rounded mode so the 5-minute
 *        rounding reflects the true time (e.g. 10:02:40 rounds to 10:05)
 */
export function convertTimeToHebrewWords(
  hours: number,
  minutes: number,
  precise: boolean,
  seconds: number = 0
): string {
  if (precise) {
    // Precise Mode
    // exact hour
    if (minutes === 0) {
      if (hours === 0) {
        return "חֲצוֹת";
      }
      return `${getHourName(hours)} בְּדִיּוּק ${getPeriodOfDay(hours)}`;
    }

    // Additive (minutes < 40)
    if (minutes < 40) {
      const minPhrase = MINUTES_PRECISE_ADDITIVE[minutes];
      if (hours === 0) {
        // Midnight doesn't require "בלילה" period suffix for additive time
        return `חֲצוֹת ${minPhrase}`;
      }
      return `${getHourName(hours)} ${minPhrase} ${getPeriodOfDay(hours)}`;
    }

    // Subtractive (minutes >= 40)
    const diff = 60 - minutes;
    const nextHour = (hours + 1) % 24;
    const minPhrase = MINUTES_PRECISE_SUBTRACTIVE[diff];
    const hourPhrase = getPrepositionedHour(nextHour);

    // If nextHour is midnight (0), we don't need period of day "לַחֲצוֹת בַּלַּיְלָה" is redundant, "לַחֲצוֹת" is enough.
    if (nextHour === 0) {
      return `${minPhrase} ${hourPhrase}`;
    }
    return `${minPhrase} ${hourPhrase} ${getPeriodOfDay(nextHour)}`;
  } else {
    // Rounded Mode (nearest 5-minute increments).
    // Include seconds so the rounding tracks the real time instead of lagging
    // up to a full minute behind.
    let roundedMinutes = Math.round((minutes + seconds / 60) / 5) * 5;
    let targetHour = hours;

    if (roundedMinutes === 60) {
      roundedMinutes = 0;
      targetHour = (hours + 1) % 24;
    }

    // exact hour — no "exactly" word here: this is the rounded mode, so the
    // real time may be up to ~2.5 minutes away and "exactly" would mislead.
    if (roundedMinutes === 0) {
      if (targetHour === 0) {
        return "חֲצוֹת";
      }
      return `${getHourName(targetHour)} ${getPeriodOfDay(targetHour)}`;
    }

    // Additive (roundedMinutes < 40)
    if (roundedMinutes < 40) {
      const minPhrase = MINUTES_ROUNDED_ADDITIVE[roundedMinutes];
      if (targetHour === 0) {
        return `חֲצוֹת ${minPhrase}`;
      }
      return `${getHourName(targetHour)} ${minPhrase} ${getPeriodOfDay(targetHour)}`;
    }

    // Subtractive (roundedMinutes >= 40)
    const diff = 60 - roundedMinutes;
    const nextHour = (targetHour + 1) % 24;
    const minPhrase = MINUTES_ROUNDED_SUBTRACTIVE[diff];
    const hourPhrase = getPrepositionedHour(nextHour);

    if (nextHour === 0) {
      return `${minPhrase} ${hourPhrase}`;
    }
    return `${minPhrase} ${hourPhrase} ${getPeriodOfDay(nextHour)}`;
  }
}
