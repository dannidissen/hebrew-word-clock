# שעון מילים פואטי · Poetic Hebrew Word Clock

A minimalist, full-screen **word clock** that tells the time in natural, vocalized
(Niqqud) Hebrew — e.g. _"עֶשֶׂר וָרֶבַע בַּבֹּקֶר"_ instead of `10:15`. Built as an
installable PWA, designed to be left running on a phone or tablet as an ambient
bedside / desk clock.

## Features

- **Poetic phrasing** — additive ("ten and a quarter"), subtractive ("ten to
  eleven"), and part-of-day suffixes (morning / noon / evening / night, plus a
  "towards morning" flourish for the small hours).
- **Two granularities** — a rounded *poetic* mode (nearest 5 minutes) and an
  exact *precise* mode (to the minute, with feminine "דַּקּוֹת" agreement).
- **Niqqud toggle** — show or hide vowel points.
- **Three warm themes** — amber / stone / sunset.
- **e-ink / Kindle mode** — a black-on-white, animation-free rendering for
  reflective e-ink browsers (Kindle & friends), where the warm dark themes ghost
  and wash out. Toggle it from the footer, force it with the `?eink=1` URL param
  (ideal for a bookmarked kiosk), or let it auto-enable on Kindle-class devices.
- **Screen Wake Lock** — optional, keeps the display awake for kiosk use, and
  re-acquires the lock when the tab becomes visible again.
- **Auto-hiding UI** — controls fade away (and the cursor hides) after 5s idle.
- **Accessible** — the clock is an `aria-live` timer announced to screen readers
  in clean, unpointed Hebrew; pinch-zoom is allowed.

## Architecture

| File | Responsibility |
| --- | --- |
| [`src/app/hebrewTimeHelper.ts`](src/app/hebrewTimeHelper.ts) | Pure logic: dictionaries of vocalized numbers + `convertTimeToHebrewWords()`. No React, no side effects — this is the part with tests. |
| [`src/app/page.tsx`](src/app/page.tsx) | The clock UI: ticker, settings (persisted to `localStorage`), wake lock, idle detection, fade transitions. |
| [`src/app/layout.tsx`](src/app/layout.tsx) | RTL document shell, Assistant Hebrew font, PWA metadata. |
| [`src/app/manifest.ts`](src/app/manifest.ts) | Web app manifest (icons, standalone display). |

### The ticker

Rather than a blind `setInterval(1000)` that re-renders 60×/minute, the ticker
polls each second but only pushes a new render when the rendered **phrase**
actually changes, and re-aligns to the real second boundary so it never drifts.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

## Testing

The Hebrew grammar engine is covered by [Vitest](https://vitest.dev):

```bash
npm test           # run once
npm run test:watch # watch mode
```

## Build & deploy

```bash
npm run build
npm start
```

Deploys cleanly to any Next.js host (e.g. Vercel). The service worker is
disabled in development and generated on build via `@ducanh2912/next-pwa`.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · next-pwa.
