// Lists the English strings in the built pages (dist/) that the Indonesian dictionary does not cover yet.
// Run `npx astro build` first, then `node scripts/i18n-coverage.mjs [page]`.
// Strings listed in src/i18n/keep.ts are meant to stay as they are (names, numbers, code, product terms).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const load = (p) => import(pathToFileURL(join(root, p)).href);
const { id, groups } = await load("src/i18n/id.ts");
// Pieces of a group entry ("Design|System") count as covered.
const grouped = new Set(Object.keys(groups).flatMap((k) => k.split("|")));
const { keep } = await load("src/i18n/keep.ts");
const { patterns } = await load("src/i18n/patterns.ts");

const dist = join(root, "dist");
const pages = { home: join(dist, "index.html"), 404: join(dist, "404.html") };
for (const d of readdirSync(join(dist, "work"))) pages[d] = join(dist, "work", d, "index.html");

const decode = (s) =>
  s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[e.toLowerCase()];
  });
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();
const keepSet = new Set(keep);

const only = process.argv[2];
let total = 0;
const done = new Set();
for (const [name, file] of Object.entries(pages)) {
  if (only && only !== name) continue;
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8").replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "");
  const found = new Set();
  for (const m of html.matchAll(/>([^<>]+)</g)) found.add(norm(m[1]));
  for (const m of html.matchAll(/\b(?:placeholder|aria-label|title|alt)="([^"]*)"/g)) found.add(norm(m[1]));
  const missing = [...found].filter(
    (t) => /[A-Za-z]{2}/.test(t) && !(t in id) && !grouped.has(t) && !keepSet.has(t) && !done.has(t) && !patterns.some(([re]) => re.test(t)),
  );
  missing.forEach((t) => done.add(t));
  total += missing.length;
  console.log(`## ${name}: ${missing.length} missing of ${found.size}`);
  for (const t of missing) console.log("  " + t);
}
console.log(`\ntotal missing: ${total}`);

// ---- strings that reach the page through data modules (rendered by scripts, so not in the built HTML) ----
if (!only || only === "data") {
  // profile.ts is covered by the built HTML (the profile panel is in it); the others reach the page through scripts.
  const modules = ["site", "cases", "annotations", "versions", "tours", "cursors"];
  const strings = new Set();
  const skipKey = new Set(["find", "mode", "from", "react", "slug", "tab", "href", "email", "linkedin", "behance", "url", "id", "at", "color", "side", "tone", "icon", "slug", "by", "who", "ago", "e", "type", "area", "year", "src", "alt"]);
  const walk = (v, key) => {
    if (typeof v === "string") {
      if (key && skipKey.has(key)) return;
      const t = v.replace(/\s+/g, " ").trim();
      if (/[A-Za-z]{3}/.test(t) && !/^(https?:|mailto:|\/|#)/.test(t)) strings.add(t);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  for (const m of modules) {
    try {
      const mod = await load(`src/data/${m}.ts`);
      for (const [k, v] of Object.entries(mod)) if (typeof v !== "function") walk(v, k);
    } catch (e) {
      console.log(`(could not load src/data/${m}.ts: ${e.message.split("\n")[0]})`);
    }
  }
  const missing = [...strings].filter((t) => !(t in id) && !grouped.has(t) && !keepSet.has(t) && !patterns.some(([re]) => re.test(t)));
  console.log(`## data modules: ${missing.length} missing of ${strings.size}`);
  for (const t of missing) console.log("  " + t);
  total += missing.length;
  console.log(`\ntotal missing (with data): ${total}`);
}
