import type { Metadata, Viewport } from "next";
import { Assistant, David_Libre, Frank_Ruhl_Libre, Secular_One } from "next/font/google";
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

// Note: the <link rel="manifest"> that Next injects from app/manifest.ts is NOT
// rewritten with basePath (a Next bug), so its href is patched to /wordsWatch/…
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
        className={`${assistant.variable} ${davidLibre.variable} ${frankRuhlLibre.variable} ${secularOne.variable} font-sans antialiased bg-black text-amber-100 h-full w-full`}
      >
        {children}
      </body>
    </html>
  );
}
