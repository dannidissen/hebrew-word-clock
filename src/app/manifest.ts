import { MetadataRoute } from "next";

// Note: all URLs here are RELATIVE (no leading slash). A relative URL in a web
// manifest resolves against the manifest's own location, so when the app is
// hosted under a sub-path (e.g. GitHub Pages /hebrew-word-clock/) the start_url, scope,
// and icons all resolve correctly without hard-coding the base path.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "שעון מילים פואטי",
    short_name: "שעון מילים",
    description: "שעון מילים בעברית פואטית ומנוקדת",
    start_url: "./",
    scope: "./",
    display: "standalone",
    // "fullscreen" hides the status bar too (not just the browser chrome that
    // "standalone" hides) when the browser supports display_override — the
    // most reliable way to get a true kiosk look on tablets, since the
    // in-page Fullscreen API (see page.tsx's toggleFullscreen) is flaky on
    // some Android browsers when the app isn't installed to the home screen.
    display_override: ["fullscreen", "standalone", "browser"],
    orientation: "any",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
