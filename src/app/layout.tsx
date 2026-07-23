import type { Metadata, Viewport } from "next";
import {
  Assistant,
  David_Libre,
  Frank_Ruhl_Libre,
  Secular_One,
  Noto_Rashi_Hebrew,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew"],
  variable: "--font-assistant",
  weight: ["300", "400", "500", "600", "700"],
});

// Selectable clock display fonts (see page.tsx's font picker).
// Note: Amatic SC — an earlier playful pick — has no Hebrew glyphs, so
// Secular One stands in as the informal/rounded option instead.
const davidLibre = David_Libre({
  subsets: ["hebrew"],
  variable: "--font-david-libre",
  weight: ["400", "500", "700"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ["hebrew"],
  variable: "--font-frank-ruhl-libre",
  weight: ["300", "400", "500", "700", "900"],
});

const secularOne = Secular_One({
  subsets: ["hebrew"],
  variable: "--font-secular-one",
  weight: "400",
});

// Semi-cursive Rashi-script typeface (based on 15th-century Sephardic
// commentary writing), for readers who want the clock in that register.
const notoRashiHebrew = Noto_Rashi_Hebrew({
  subsets: ["hebrew"],
  variable: "--font-rashi",
  weight: ["400", "500", "600", "700"],
});

// Stam Ashkenaz CLM — a Torah-scribal (STA"M) style scribal typeface, full
// niqqud support. Self-hosted (not on Google Fonts): "Stam Ashkenaz" font by
// Yoram Gnat / the Culmus project, GPLv2 with a font-embedding exception —
// see src/app/fonts/STAM-LICENSE.txt for the exact clause.
const stamAshkenaz = localFont({
  src: "./fonts/stam-ashkenaz-clm-webfont.woff",
  variable: "--font-stam",
  weight: "400",
});

// Yiddishkeit AlefAlefAlef Bold — a bold display face from AAA (אאא בית
// לטיפוגרפיה עברית), used here under their free web-embedding license
// (under 1M monthly pageviews; see src/app/fonts/YIDDISHKEIT-LICENSE.pdf).
// The license requires visible credit to אאא wherever the font is used —
// see the credit line under the font picker in page.tsx.
const yiddishkeit = localFont({
  src: "./fonts/YiddishkeitAlefAlefAlef-Bold.woff",
  variable: "--font-yiddishkeit",
  weight: "700",
});

// Note: the <link rel="manifest"> that Next injects from app/manifest.ts is NOT
// rewritten with basePath (a Next bug), so its href is patched to /hebrew-word-clock/…
// after export by scripts/postbuild.mjs.
export const metadata: Metadata = {
  title: "שעון מילים פואטי",
  description: "שעון מילים מינימליסטי בעברית פואטית ומנוקדת",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "שעון מילים",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom for accessibility (do not lock scaling).
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body
        className={`${assistant.variable} ${davidLibre.variable} ${frankRuhlLibre.variable} ${secularOne.variable} ${notoRashiHebrew.variable} ${stamAshkenaz.variable} ${yiddishkeit.variable} font-sans antialiased bg-black text-amber-100 h-full w-full`}
      >
        {/*
          e-ink keep-alive. The Kindle's browser suspends a page's JS timers even
          in the foreground, which freezes the clock's ticker on the load-time
          value. A <meta http-equiv="refresh"> is driven by the browser itself,
          not the JS event loop, so it keeps firing while timers are frozen — the
          page reloads every 60s and re-renders the current time. This runs at
          parse time (before hydration) and only when e-ink mode is active, so
          the interactive dark-mode UI on phones/tablets is never auto-reloaded.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  try {
    var e = new URLSearchParams(window.location.search).get('eink');
    var on = e !== null ? (e === '1' || e === 'true') : (localStorage.getItem('einkMode') === 'true');
    if (on) {
      var m = document.createElement('meta');
      m.httpEquiv = 'refresh';
      m.content = '60';
      (document.head || document.documentElement).appendChild(m);
    }
  } catch (err) {}
})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
