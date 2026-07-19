import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

// GitHub Pages serves a project repo under /<repo-name>/, so in production the
// app lives at https://<user>.github.io/wordsWatch/. basePath/assetPrefix make
// Next emit every asset URL with that prefix. In dev we stay at the root.
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/wordsWatch" : "";

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
