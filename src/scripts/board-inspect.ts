// Dev Mode on a case study shown as a board (html.embed): hover outlines an element with its size, a click
// selects it and hands the host (figma-app.ts) its measurements and styles for the Inspect panel, as in
// Figma's Dev Mode. Everything is read from the page's computed styles, so it always matches what is drawn.
export interface InspectRow {
  k: string;
  v: string;
  swatch?: string;
}
export interface InspectInfo {
  tag: string;
  text: string;
  selector: string;
  w: number;
  h: number;
  groups: { title: string; rows: InspectRow[] }[];
  css: string;
}
export interface Tokens {
  colors: { hex: string; n: number }[];
  fonts: { family: string; n: number }[];
  sizes: { size: number; n: number }[];
}
interface InspectApi {
  enable(on: boolean): void;
  clear(): void;
  tokens(): Tokens;
  onSelect: ((info: InspectInfo | null) => void) | null;
}
declare global {
  interface Window {
    __boardInspect?: InspectApi;
  }
}

function init() {
  const root = document.documentElement;
  if (!root.classList.contains("embed") || window.__boardInspect) return;

  // ---- colours: any CSS colour (rgb, oklch, lab...) to #rrggbb through a 1x1 canvas ---------------
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  const cache = new Map<string, { hex: string; a: number } | null>();
  const parse = (css: string) => {
    if (cache.has(css)) return cache.get(css)!;
    let out: { hex: string; a: number } | null = null;
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a > 0) out = { hex: "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join(""), a: a / 255 };
    } catch {}
    cache.set(css, out);
    return out;
  };
  const colour = (css: string) => {
    const c = parse(css);
    if (!c) return null;
    return c.a < 0.995 ? `${c.hex} ${Math.round(c.a * 100)}%` : c.hex;
  };

  // ---- overlay (document coordinates, so it stays put while scrolling) ----------------------------
  const layer = document.createElement("div");
  layer.className = "bi-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `<div class="bi-hover"><span class="bi-size"></span></div><div class="bi-sel"><i></i><i></i><i></i><i></i><span class="bi-size"></span></div>`;
  document.body.append(layer);
  const hoverBox = layer.querySelector<HTMLElement>(".bi-hover")!;
  const selBox = layer.querySelector<HTMLElement>(".bi-sel")!;
  const zoom = () => Number(root.style.zoom || 1);
  const place = (box: HTMLElement, el: Element | null) => {
    if (!el) {
      box.style.display = "none";
      return;
    }
    const r = el.getBoundingClientRect();
    const z = zoom();
    box.style.display = "block";
    box.style.left = `${(r.left + window.scrollX) / z}px`;
    box.style.top = `${(r.top + window.scrollY) / z}px`;
    box.style.width = `${r.width / z}px`;
    box.style.height = `${r.height / z}px`;
    box.querySelector(".bi-size")!.textContent = `${Math.round(r.width / z)} × ${Math.round(r.height / z)}`;
  };

  // ---- reading an element -------------------------------------------------------------------------
  const skip = (t: Element | null) => !t || !!t.closest(".bi-layer, .bn, .ns-dock") || t === root || t === document.body;
  const px = (v: string) => (v.endsWith("px") ? `${Math.round(parseFloat(v) * 100) / 100}px` : v);
  const four = (t: string, r: string, b: string, l: string) => {
    const a = [t, r, b, l].map(px);
    if (a.every((x) => x === a[0])) return a[0];
    if (a[0] === a[2] && a[1] === a[3]) return `${a[0]} ${a[1]}`;
    return a.join(" ");
  };
  const zero = (v: string) => parseFloat(v) === 0 || v === "auto" || v === "" || v === "normal";
  const hasText = (el: Element) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
  const selectorOf = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    const cls = Array.from(el.classList).find((c) => /^[a-z_][\w-]{1,24}$/i.test(c) && !/^(flex|grid|block|hidden|relative|absolute|text|font|mt|mb|p|px|py|gap|w|h|rounded|bg)-/.test(c));
    return cls ? `${tag}.${cls}` : tag;
  };
  const rewriteColours = (s: string) => s.replace(/(?:rgba?|oklch|oklab|lab|lch|hsla?|color)\([^)]*\)/g, (m) => colour(m) ?? m);

  function read(el: Element): InspectInfo {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const z = zoom();
    const w = Math.round(r.width / z);
    const h = Math.round(r.height / z);
    const groups: InspectInfo["groups"] = [];
    const css: string[] = [`width: ${w}px;`, `height: ${h}px;`];

    // Layout
    const layout: InspectRow[] = [];
    const display = cs.display;
    if (display.includes("flex")) {
      layout.push({ k: "Display", v: `flex · ${cs.flexDirection}` });
      if (!zero(cs.columnGap) || !zero(cs.rowGap)) layout.push({ k: "Gap", v: px(cs.rowGap === cs.columnGap ? cs.rowGap : `${cs.rowGap} ${cs.columnGap}`) });
      css.push(`display: flex;`, `flex-direction: ${cs.flexDirection};`);
      if (!zero(cs.gap)) css.push(`gap: ${px(cs.gap)};`);
    } else if (display.includes("grid")) {
      layout.push({ k: "Display", v: "grid" });
      if (!zero(cs.gap)) layout.push({ k: "Gap", v: px(cs.rowGap === cs.columnGap ? cs.rowGap : `${cs.rowGap} ${cs.columnGap}`) });
      css.push(`display: grid;`);
      if (!zero(cs.gap)) css.push(`gap: ${px(cs.gap)};`);
    } else if (display !== "block" && display !== "inline") layout.push({ k: "Display", v: display });
    const pad = four(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft);
    if (pad !== "0px") {
      layout.push({ k: "Padding", v: pad });
      css.push(`padding: ${pad};`);
    }
    const mar = four(cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft);
    if (!/^(0px|auto)( (0px|auto))*$/.test(mar)) {
      layout.push({ k: "Margin", v: mar });
      css.push(`margin: ${mar};`);
    }
    if (cs.position !== "static") layout.push({ k: "Position", v: cs.position });
    groups.push({ title: "Layout", rows: [{ k: "Size", v: `${w} × ${h}` }, ...layout] });

    // Typography
    if (hasText(el)) {
      const family = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      const lh = cs.lineHeight === "normal" ? "normal" : px(cs.lineHeight);
      const ls = cs.letterSpacing === "normal" || parseFloat(cs.letterSpacing) === 0 ? "" : px(cs.letterSpacing);
      const col = colour(cs.color);
      const rows: InspectRow[] = [
        { k: "Font", v: family },
        { k: "Size", v: `${px(cs.fontSize)} / ${lh}` },
        { k: "Weight", v: cs.fontWeight },
      ];
      if (ls) rows.push({ k: "Letter spacing", v: ls });
      if (cs.textAlign !== "start" && cs.textAlign !== "left") rows.push({ k: "Align", v: cs.textAlign });
      if (col) rows.push({ k: "Colour", v: col, swatch: col.split(" ")[0] });
      groups.push({ title: "Typography", rows });
      css.push(`font-family: "${family}";`, `font-size: ${px(cs.fontSize)};`, `font-weight: ${cs.fontWeight};`);
      if (lh !== "normal") css.push(`line-height: ${lh};`);
      if (ls) css.push(`letter-spacing: ${ls};`);
      if (col) css.push(`color: ${col.split(" ")[0]};`);
    }

    // Fill, stroke, radius, effects
    const fill: InspectRow[] = [];
    const bg = colour(cs.backgroundColor);
    if (bg) {
      fill.push({ k: "Fill", v: bg, swatch: bg.split(" ")[0] });
      css.push(`background: ${bg.split(" ")[0]};`);
    }
    if (cs.backgroundImage.includes("gradient")) fill.push({ k: "Fill", v: "Gradient" });
    else if (cs.backgroundImage.includes("url(")) fill.push({ k: "Fill", v: "Image" });
    const bw = cs.borderTopWidth;
    if (!zero(bw) && cs.borderTopStyle !== "none") {
      const bc = colour(cs.borderTopColor);
      fill.push({ k: "Stroke", v: `${px(bw)} ${cs.borderTopStyle}${bc ? " " + bc : ""}`, swatch: bc?.split(" ")[0] });
      css.push(`border: ${px(bw)} ${cs.borderTopStyle} ${bc ? bc.split(" ")[0] : "currentColor"};`);
    }
    // "rounded-full" computes to a huge number (33554400px); show it as a pill.
    const big = (x: string) => parseFloat(x) > 5000;
    const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((x) => (big(x) ? "9999px" : px(x)));
    if (radii.some((x) => parseFloat(x) !== 0)) {
      const rad = radii.every((x) => x === radii[0]) ? radii[0] : radii.join(" ");
      fill.push({ k: "Radius", v: rad === "9999px" ? "9999px (full)" : rad });
      css.push(`border-radius: ${rad};`);
    }
    if (cs.boxShadow !== "none") {
      const sh = rewriteColours(cs.boxShadow);
      fill.push({ k: "Shadow", v: sh.length > 70 ? sh.slice(0, 68) + "…" : sh });
      css.push(`box-shadow: ${sh};`);
    }
    if (parseFloat(cs.opacity) < 1) {
      fill.push({ k: "Opacity", v: `${Math.round(parseFloat(cs.opacity) * 100)}%` });
      css.push(`opacity: ${cs.opacity};`);
    }
    if (cs.backdropFilter && cs.backdropFilter !== "none") fill.push({ k: "Backdrop", v: cs.backdropFilter.replace(/\([^)]*\)/, "") + " (blur)" });
    if (fill.length) groups.push({ title: "Appearance", rows: fill });

    const sel = selectorOf(el);
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    return {
      tag: el.tagName.toLowerCase(),
      text: text.length > 48 ? text.slice(0, 46) + "…" : text,
      selector: sel,
      w,
      h,
      groups,
      css: `${sel} {\n${css.map((l) => "  " + l).join("\n")}\n}`,
    };
  }

  // ---- design tokens: what the page actually uses ------------------------------------------------
  function tokens(): Tokens {
    const colors = new Map<string, number>();
    const fonts = new Map<string, number>();
    const sizes = new Map<number, number>();
    const els = document.querySelectorAll("main *");
    const max = Math.min(els.length, 5000);
    for (let i = 0; i < max; i++) {
      const el = els[i];
      if (el.closest(".bi-layer, .bn")) continue;
      const cs = getComputedStyle(el);
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0.5) colors.set(bg.hex, (colors.get(bg.hex) ?? 0) + 1);
      if (hasText(el)) {
        const c = parse(cs.color);
        if (c && c.a > 0.5) colors.set(c.hex, (colors.get(c.hex) ?? 0) + 1);
        const f = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
        fonts.set(f, (fonts.get(f) ?? 0) + 1);
        const s = Math.round(parseFloat(cs.fontSize));
        sizes.set(s, (sizes.get(s) ?? 0) + 1);
      }
    }
    const top = <K,>(m: Map<K, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    return {
      colors: top(colors, 10).map(([hex, n]) => ({ hex, n })),
      fonts: top(fonts, 4).map(([family, n]) => ({ family, n })),
      sizes: top(sizes, 40)
        .map(([size, n]) => ({ size, n }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 9),
    };
  }

  // ---- interaction --------------------------------------------------------------------------------
  let on = false;
  let selected: Element | null = null;
  let ticking = false;
  let last: Element | null = null;
  const api: InspectApi = {
    onSelect: null,
    tokens,
    clear() {
      selected = null;
      place(selBox, null);
      api.onSelect?.(null);
    },
    enable(v) {
      on = v;
      root.classList.toggle("bi-on", v);
      if (!v) {
        selected = null;
        place(hoverBox, null);
        place(selBox, null);
      }
    },
  };
  const hover = (e: PointerEvent) => {
    last = e.target as Element;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      place(hoverBox, on && !skip(last) && last !== selected ? last : null);
    });
  };
  document.addEventListener("pointermove", (e) => on && hover(e), { passive: true });
  document.addEventListener("pointerleave", () => on && place(hoverBox, null));
  document.addEventListener(
    "click",
    (e) => {
      if (!on) return;
      const t = e.target as Element;
      if (skip(t)) return;
      e.preventDefault();
      e.stopPropagation();
      selected = t;
      place(hoverBox, null);
      place(selBox, t);
      api.onSelect?.(read(t));
    },
    true,
  );
  window.addEventListener("resize", () => on && selected && place(selBox, selected));
  document.addEventListener("keydown", (e) => {
    if (!on) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (selected) api.clear();
      else window.parent?.postMessage({ type: "board-dev-exit" }, location.origin);
    }
  });
  window.__boardInspect = api;
}

init();
document.addEventListener("astro:page-load", init);
