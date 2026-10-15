// Language switch (English / Bahasa Indonesia) for every page, including the case-study boards shown in iframes.
// The pages are written in English. In Indonesian mode the strings in src/i18n/id.ts (English -> Indonesian) are applied
// to every text node and to the placeholder / aria-label / title / alt attributes, and kept up to date for anything the
// app renders later (a MutationObserver). Switching back restores the English originals. The choice is kept in
// localStorage, and the 'storage' event carries a change from the app to the board iframes.
// Text that is typed out by script (cursor chat, tours) goes through window.__i18n.t() instead.
import type { Dict } from "../i18n/id";
import type { Pattern } from "../i18n/patterns";

export type Lang = "en" | "id";
declare global {
  interface Window {
    __i18n?: { lang(): Lang; set(l: Lang): void; t(s: string): string; orig(n: Node): string | null; ready: Promise<void> };
  }
}

const KEY = "lang";
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "KBD"]);

const read = (): Lang => {
  try {
    return localStorage.getItem(KEY) === "id" ? "id" : "en";
  } catch {
    return "en";
  }
};

let lang: Lang = read();
let dict: Dict | null = null;
let patterns: Pattern[] = [];
let groups: Record<string, string[]> = {};
let loading: Promise<void> | null = null;
let applied = false; // true while the page holds Indonesian text that restoreAll() would have to undo

const origText = new WeakMap<Node, string>(); // text node -> English original
const written = new WeakMap<Node, string>(); // text node -> what we last wrote (to ignore our own mutations)
const origAttr = new WeakMap<Element, Record<string, string>>();
const writtenAttr = new WeakMap<Element, Record<string, string>>();

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// Translate one string. Leading and trailing whitespace is kept, inner whitespace is matched collapsed.
function lookup(core: string): string | undefined {
  if (dict && Object.prototype.hasOwnProperty.call(dict, core)) return dict[core];
  for (const [re, fn] of patterns) {
    const m = core.match(re);
    if (m) return fn(m, (x) => lookup(norm(x)) ?? x);
  }
  return undefined;
}
function t(s: string): string {
  if (lang !== "id" || !dict) return s;
  const core = norm(s);
  if (!core) return s;
  const out = lookup(core);
  if (out === undefined) return s;
  const lead = s.match(/^\s*/)![0];
  const trail = s.match(/\s*$/)![0];
  return lead + out + trail;
}

const skipped = (el: Element | null) => {
  for (let n = el; n; n = n.parentElement) {
    if (SKIP.has(n.tagName) || n.hasAttribute("translate") && n.getAttribute("translate") === "no") return true;
  }
  return false;
};

function doText(node: Text) {
  if (!node.data.trim() || skipped(node.parentElement)) return;
  const cur = node.data;
  if (written.get(node) === cur) return; // our own write
  const next = t(cur);
  if (next === cur) {
    origText.delete(node);
    return;
  }
  origText.set(node, cur);
  written.set(node, next);
  node.data = next;
}

// A heading or short sentence split over several text nodes by styled spans ("Design" + "System"). Its fragments, joined
// with "|", are a key in the groups table; the value has one translation per fragment, so the word order can change.
function doGroup(el: Element) {
  if (!el.firstElementChild || (el.textContent?.length ?? 0) > 240 || skipped(el)) return;
  if (![...el.childNodes].some((c) => c.nodeType === 3 && c.data.trim())) return;
  const nodes: Text[] = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if ((n as Text).data.trim()) nodes.push(n as Text);
  if (nodes.length < 2) return;
  if (nodes.some((n) => written.get(n) === n.data)) return;
  const to = groups[nodes.map((n) => norm(n.data)).join("|")];
  if (!to || to.length !== nodes.length) return;
  nodes.forEach((n, i) => {
    const lead = n.data.match(/^\s*/)![0];
    const trail = n.data.match(/\s*$/)![0];
    origText.set(n, n.data);
    const next = lead + to[i] + trail;
    written.set(n, next);
    n.data = next;
  });
}

function doAttrs(el: Element) {
  if (skipped(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v === null) continue;
    if (writtenAttr.get(el)?.[a] === v) continue;
    const next = t(v);
    if (next === v) continue;
    (origAttr.get(el) ?? origAttr.set(el, {}).get(el)!)[a] = v;
    (writtenAttr.get(el) ?? writtenAttr.set(el, {}).get(el)!)[a] = next;
    el.setAttribute(a, next);
  }
}

function applyAll(root: Node) {
  if (root.nodeType === 3) return doText(root as Text);
  if (root.nodeType !== 1 && root.nodeType !== 9) return;
  const el = root.nodeType === 9 ? (root as Document).documentElement : (root as Element);
  if (el.nodeType === 1) {
    doAttrs(el);
    doGroup(el);
  }
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) doText(n as Text);
    else {
      doAttrs(n as Element);
      doGroup(n as Element);
    }
  }
}

// Back to English: walk the page and restore every node we changed.
function restoreAll() {
  const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) {
      const o = origText.get(n);
      if (o !== undefined && written.get(n) === (n as Text).data) (n as Text).data = o;
      origText.delete(n);
      written.delete(n);
    } else {
      const el = n as Element;
      const o = origAttr.get(el);
      if (o) {
        for (const a in o) if (writtenAttr.get(el)?.[a] === el.getAttribute(a)) el.setAttribute(a, o[a]);
        origAttr.delete(el);
        writtenAttr.delete(el);
      }
    }
  }
}

const observer = new MutationObserver((list) => {
  if (lang !== "id" || !dict) return;
  for (const m of list) {
    if (m.type === "childList") m.addedNodes.forEach((n) => applyAll(n));
    else if (m.type === "characterData") doText(m.target as Text);
    else if (m.type === "attributes") doAttrs(m.target as Element);
  }
});

function load(): Promise<void> {
  loading ??= import("../i18n/id").then((mod) => {
    dict = mod.id;
    patterns = mod.patterns;
    groups = mod.groups;
  });
  return loading;
}

function show() {
  document.documentElement.classList.remove("i18n-pending");
}

async function apply(next: Lang, announce = false) {
  lang = next;
  document.documentElement.lang = next;
  if (next === "id") {
    await load();
    if (lang !== "id") return;
    applyAll(document.documentElement);
    applied = true;
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  } else {
    observer.disconnect();
    if (applied) restoreAll();
    applied = false;
  }
  show();
  if (announce) document.dispatchEvent(new CustomEvent("langchange", { detail: next }));
}

function set(next: Lang) {
  if (next === lang) return;
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  void apply(next, true);
}

// Another document (the app, a board iframe, another tab) changed the language.
window.addEventListener("storage", (e) => {
  if (e.key !== KEY) return;
  const next = read();
  if (next !== lang) void apply(next, true);
});

if (!window.__i18n) {
  const ready = apply(lang);
  window.__i18n = { lang: () => lang, set, t, orig: (n) => origText.get(n) ?? n.textContent, ready };
  document.dispatchEvent(new CustomEvent("langready")); // lets switches that loaded earlier read the language
  // Never leave the page hidden if the dictionary fails to load.
  setTimeout(show, 1500);
}
// A client-side page swap brings a new <html>; the observer translates the new nodes, this restores the lang attribute.
document.addEventListener("astro:after-swap", () => {
  document.documentElement.lang = lang;
  if (lang === "id") applyAll(document.documentElement);
});
