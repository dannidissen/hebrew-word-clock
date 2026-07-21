import withPWAInit, { runtimeCaching as defaultRuntimeCaching } from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // next-pwa's default cacheStartUrl rule matches the literal basePath
  // ("/wordsWatch") with no trailing slash, but trailingSlash: true below
  // means the app is actually served at "/wordsWatch/" — so that rule never
  // matches and the start page never gets cached for offline use. Replace it
  // with a trailing-slash-agnostic rule that matches any navigation request.
  cacheStartUrl: false,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "start-url",
          expiration: { maxEntries: 1 },
        },
      },
      ...defaultRuntimeCaching,
    ],
  },
});

// GitHub Pages serves a project repo under /<repo-name>/, so in production the
// app lives at https://<user>.github.io/hebrew-word-clock/. basePath/assetPrefix make
// Next emit every asset URL with that prefix. In dev we stay at the root.
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/hebrew-word-clock" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // emit a fully static site into out/
  basePath,
  images: {
    unoptimized: true, // the Next image optimizer needs a server; static export has none
  },
  trailingSlash: true, // GitHub Pages serves /path/ -> /path/index.html
};

export default withPWA(nextConfig);
