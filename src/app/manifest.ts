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
