// Post-export fixups for hosting the static site under a sub-path
// (GitHub Pages project site: https://<user>.github.io/hebrew-word-clock/).
//
// Next.js does not apply basePath to the <link rel="manifest"> href it injects
// from app/manifest.ts, so it ends up pointing at /manifest.webmanifest (the
// domain root) instead of /hebrew-word-clock/manifest.webmanifest. We rewrite it here
// across every exported HTML file. Runs as part of `npm run build`.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = "out";
const BASE_PATH = "/hebrew-word-clock"; // must match basePath in next.config.mjs

const NEEDLE = 'rel="manifest" href="/manifest.webmanifest"';
const REPLACEMENT = `rel="manifest" href="${BASE_PATH}/manifest.webmanifest"`;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith(".html")) yield full;
  }
}

let patched = 0;
for await (const file of htmlFiles(OUT_DIR)) {
  const html = await readFile(file, "utf8");
  if (!html.includes(NEEDLE)) continue;
  await writeFile(file, html.replaceAll(NEEDLE, REPLACEMENT));
  patched++;
}

console.log(`postbuild: patched manifest href in ${patched} HTML file(s)`);
