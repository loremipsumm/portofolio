// Reviewer cursors on a case study shown as a home board (html.embed). Each cursor belongs to one part of the page
// (src/data/cursors.ts) and acts when that part scrolls into view, in one of three ways so they do not all look alike:
//   select   a marquee drag from a chosen corner, a selection frame with handles, then its line in cursor chat
//   comment  goes to a spot beside the block and only says its line
//   react    goes to a spot on the block and only drops an emote
// Nothing follows the reader. Cursors live in the page, so they scroll and zoom with it. Positions are document px
// taken from the offset chain (same as board-sections.ts), which the board's html zoom does not affect.
import type { Scene } from "../data/cursors";

type Data = { people: Record<string, { name: string; color: string }>; scenes?: Scene[] };
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Corner = "nw" | "ne" | "sw" | "se";
interface Actor {
  scene: Scene;
  el: HTMLElement; // cursor with name chip and chat bubble
  chat: HTMLElement;
  marq: HTMLElement;
  sel: HTMLElement;
  target: HTMLElement | null;
  box: Box | null;
  x: number; // where the cursor is, document px
  y: number;
  end: Corner | null; // the corner a select scene is holding the cursor on
  playedAt: number;
  seenOut: boolean;
}

const PLAY_AGAIN_MS = 45000;
const MIN_W = 240;
const MIN_H = 70;
const MAX_W = 1300; // the content column is 1200 wide, so full-width rows are fine; MAX_H keeps whole sections out
const MAX_H = 640;
const CANCEL = Symbol("cancel");
const OPPOSITE: Record<Corner, Corner> = { nw: "se", ne: "sw", sw: "ne", se: "nw" };
// A rectangle collapsed onto the corner the drag starts from.
const COLLAPSED: Record<Corner, string> = {
  nw: "inset(0 100% 100% 0)",
  ne: "inset(0 0 100% 100%)",
  sw: "inset(100% 100% 0 0)",
  se: "inset(100% 0 0 100%)",
};

function init() {
  const root = document.documentElement;
  const dataEl = document.getElementById("board-notes");
  if (!root.classList.contains("embed") || !dataEl || root.classList.contains("lite")) return;
  if (document.querySelector(".bc-layer")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let data: Data;
  try {
    data = JSON.parse(dataEl.textContent || "{}");
  } catch {
    return;
  }
  if (!data.scenes?.length) return;

  const layer = document.createElement("div");
  layer.className = "bc-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  const zoom = () => Number(root.style.zoom || 1);
  const viewW = () => root.clientWidth;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const tr = (s: string) => window.__i18n?.t(s) ?? s;

  // Document position in CSS px (offset chain), unaffected by the board's html zoom.
  const boxOf = (el: HTMLElement): Box => {
    let x = 0,
      y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  // The block holding `find`: the smallest element with that text, widened to its parents until it is a block big
  // enough to read as one thing (a card, a group of paragraphs), but never as big as a whole section. The text is
  // matched against its English original, so this works in Indonesian mode too (the page text is then translated).
  function resolve(scene: Scene): HTMLElement | null {
    const sec = scene.at === "hero" ? document.querySelector<HTMLElement>("main section") : document.getElementById(scene.at);
    if (!sec) return null;
    const want = norm(scene.find);
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    let hit: HTMLElement | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (norm(window.__i18n?.orig(n) ?? n.textContent ?? "").includes(want)) {
        hit = n.parentElement;
        break;
      }
    }
    if (!hit) return null;
    let el = hit;
    while (el !== sec && el.parentElement && el.parentElement !== sec && (el.offsetWidth < MIN_W || el.offsetHeight < MIN_H)) {
      const up = el.parentElement;
      if (up.offsetWidth > MAX_W || up.offsetHeight > MAX_H) break;
      el = up;
    }
    return el.offsetWidth ? el : null;
  }

  const pointer = (c: string) =>
    `<svg class="bc-ptr" width="18" height="18" viewBox="0 0 16 16"><path d="M2 1.5 13.5 7l-4.8 1.6L6.8 13.5z" fill="${c}" stroke="#fff" stroke-width="1"/></svg>`;

  const actors: Actor[] = data.scenes.map((scene) => {
    const p = data.people[scene.who];
    const mk = (cls: string, html = "") => {
      const d = document.createElement("div");
      d.className = cls;
      d.style.setProperty("--bc", p.color);
      d.innerHTML = html;
      layer.append(d);
      return d;
    };
    const marq = mk("bc-marq");
    const sel = mk("bc-sel", `<i></i><i></i><i></i><i></i><span>${p.name}</span>`);
    const el = mk("bc-cur", `${pointer(p.color)}<span class="bc-name">${p.name}</span><div class="bc-chat"></div>`);
    return { scene, el, chat: el.querySelector<HTMLElement>(".bc-chat")!, marq, sel, target: null, box: null, x: 0, y: 0, end: null, playedAt: 0, seenOut: true };
  });

  const modeOf = (a: Actor) => a.scene.mode ?? "select";
  const clampX = (x: number) => Math.max(8, Math.min(x, viewW() - 130));
  const place = (a: Actor, x: number, y: number, ms = 0) => {
    a.x = x;
    a.y = y;
    a.el.style.setProperty("--bc-t", `${ms}ms`);
    a.el.style.transform = `translate(${x}px, ${y}px)`;
    a.el.classList.toggle("is-left", x > viewW() - 300);
  };
  // Move and return how long it takes (longer for a longer way, within limits).
  const glide = (a: Actor, x: number, y: number) => {
    const ms = Math.round(Math.min(900, Math.max(350, Math.hypot(x - a.x, y - a.y) * 0.8)));
    place(a, x, y, ms);
    return ms + 40;
  };
  const corner = (b: Box, c: Corner) => ({ x: b.x + (c === "ne" || c === "se" ? b.w : 0), y: b.y + (c === "sw" || c === "se" ? b.h : 0) });
  // Where a cursor waits: below its block, on the side away from where it will act.
  const parkOf = (a: Actor, b: Box) => {
    const mode = modeOf(a);
    const toRight = mode === "select" ? a.scene.from !== "ne" && a.scene.from !== "se" : a.scene.side !== "right";
    return { x: clampX(toRight ? b.x + b.w - 36 : b.x + 36), y: b.y + b.h + 8 };
  };
  // Where a comment or a reaction happens: on one side of the block, part-way down.
  const anchorOf = (a: Actor, b: Box) => ({
    x: clampX(a.scene.side === "left" ? b.x + 30 : b.x + b.w - 30),
    y: b.y + b.h * (a.scene.y ?? 0.4),
  });

  const playing = new Set<Actor>();
  const measure = (a: Actor) => {
    a.target = a.target?.isConnected ? a.target : resolve(a.scene);
    a.box = a.target ? boxOf(a.target) : null;
    return a.box;
  };

  // Where each block is. Run again whenever the page reflows (images load, window resizes, zoom, language).
  function layout() {
    for (const a of actors) {
      measure(a);
      a.el.hidden = a.sel.hidden = a.marq.hidden = !a.box;
      if (a.box && !playing.has(a)) {
        const k = parkOf(a, a.box);
        place(a, k.x, k.y);
      }
    }
  }

  // Keeps a selection that is on screen glued to its block when the block changes size (a language switch, an image).
  function track(a: Actor) {
    const b = measure(a);
    if (!b) return;
    for (const r of [a.sel, a.marq]) Object.assign(r.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    if (a.end) {
      const k = corner(b, a.end);
      place(a, k.x, k.y, 200);
    }
  }

  // ---- one scene --------------------------------------------------------------------------------
  let epoch = 0;
  let timers: number[] = [];
  const sleep = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));
  const guard = (mine: number) => {
    if (mine !== epoch) throw CANCEL;
  };

  function reset(a: Actor) {
    a.end = null;
    a.el.classList.remove("is-chatting");
    a.chat.textContent = "";
    a.marq.classList.remove("is-on");
    a.sel.classList.remove("is-on");
    if (a.box) {
      const k = parkOf(a, a.box);
      place(a, k.x, k.y, 600);
    }
  }

  // Emojis float up from the cursor; `n` of them.
  function emote(a: Actor, glyph: string, n = 3) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "bc-emo";
      s.textContent = glyph;
      s.style.left = `${a.x + 8 + i * 15}px`;
      s.style.top = `${a.y - 6}px`;
      s.style.animationDelay = `${i * 140}ms`;
      s.style.setProperty("--dx", `${(i - (n - 1) / 2) * 16}px`);
      layer.append(s);
      s.addEventListener("animationend", () => s.remove());
      window.setTimeout(() => s.remove(), 3200);
    }
  }
  // A ring that spreads from the cursor, as if it had clicked.
  function ping(a: Actor) {
    const s = document.createElement("span");
    s.className = "bc-ping";
    s.style.setProperty("--bc", a.el.style.getPropertyValue("--bc"));
    s.style.left = `${a.x + 2}px`;
    s.style.top = `${a.y + 2}px`;
    layer.append(s);
    s.addEventListener("animationend", () => s.remove());
    window.setTimeout(() => s.remove(), 1500);
  }

  // The line, typed out in cursor chat.
  async function say(a: Actor, mine: number) {
    const line = tr(a.scene.say ?? "");
    const tag = tr("Example comment");
    a.el.classList.add("is-chatting");
    for (let i = 1; i <= line.length; i++) {
      a.chat.innerHTML = `${line.slice(0, i).replace(/&/g, "&amp;").replace(/</g, "&lt;")}<small>${tag}</small>`;
      await sleep(26);
      guard(mine);
    }
    await sleep(2400 + line.length * 28);
    guard(mine);
  }

  async function play(a: Actor) {
    const mine = epoch;
    const b = measure(a);
    if (!b) return;
    playing.add(a);
    a.playedAt = Date.now();
    a.seenOut = false;
    try {
      const mode = modeOf(a);
      if (mode === "select") {
        const from = a.scene.from ?? "nw";
        const to = OPPOSITE[from];
        // 1. glide to the corner the drag starts from
        const s = corner(b, from);
        await sleep(glide(a, s.x - 2, s.y - 2));
        guard(mine);
        // 2. drag a marquee to the opposite corner: the rectangle opens from that corner as the cursor travels
        track(a);
        a.marq.style.clipPath = COLLAPSED[from];
        a.marq.classList.add("is-on");
        await sleep(40);
        guard(mine);
        a.marq.style.clipPath = "inset(0 0 0 0)";
        const e = corner(b, to);
        place(a, e.x, e.y, 650);
        a.end = to;
        await sleep(700);
        guard(mine);
        // 3. release: the marquee becomes a selection frame with handles
        a.marq.classList.remove("is-on");
        a.sel.classList.add("is-on");
        await sleep(350);
        guard(mine);
        // 4. say it, then react
        if (a.scene.say) await say(a, mine);
        if (a.scene.react) {
          emote(a, a.scene.react);
          await sleep(1400);
          guard(mine);
        }
      } else {
        // comment / react: go to a spot beside or on the block
        const p = anchorOf(a, b);
        await sleep(glide(a, p.x, p.y));
        guard(mine);
        if (mode === "comment") {
          if (a.scene.say) await say(a, mine);
          if (a.scene.react) emote(a, a.scene.react);
        } else {
          ping(a);
          emote(a, a.scene.react ?? "👍", 5);
          await sleep(2000);
          guard(mine);
        }
      }
      // let go and go back to waiting beside the block
      reset(a);
      await sleep(700);
    } catch (e) {
      if (e !== CANCEL) throw e;
    } finally {
      playing.delete(a);
      a.playedAt = Date.now();
      if (mine === epoch) kick();
    }
  }

  // ---- when to play -----------------------------------------------------------------------------
  const hidden = () =>
    root.classList.contains("bn-off") ||
    root.classList.contains("present") ||
    root.classList.contains("bi-on") ||
    document.hidden ||
    innerWidth < 900;

  // How much of the block is on screen (0..1), against whichever is smaller: the block or the screen.
  const visibility = (b: Box) => {
    const z = zoom();
    const top = window.scrollY / z;
    const vh = window.innerHeight / z;
    const overlap = Math.min(b.y + b.h, top + vh) - Math.max(b.y, top);
    return Math.max(0, overlap) / Math.max(1, Math.min(b.h, vh));
  };

  // Plays the most visible scene that is due. Blocks are measured again here, so a page that was still loading when
  // the cursors were laid out does not hold them back.
  function kick() {
    if (hidden() || playing.size) return;
    const now = Date.now();
    let best: Actor | null = null;
    let bestV = 0;
    for (const a of actors) {
      const b = measure(a);
      if (!b) continue;
      const v = visibility(b);
      if (v < 0.3) a.seenOut = true;
      const due = !a.playedAt || (a.seenOut && now - a.playedAt > PLAY_AGAIN_MS);
      if (due && v >= 0.4 && v > bestV) {
        best = a;
        bestV = v;
      }
    }
    if (best) void play(best);
  }

  function stopAll() {
    epoch++;
    timers.forEach(clearTimeout);
    timers = [];
    layer.querySelectorAll(".bc-emo, .bc-ping").forEach((n) => n.remove());
    playing.forEach((a) => (a.playedAt = 0)); // a scene that was cut short plays again
    playing.clear();
    actors.forEach(reset);
  }

  let raf = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // Scrolled away from the scene that is playing: drop it and let a visible one go instead.
        const cur = [...playing][0];
        if (cur) {
          const b = measure(cur);
          if (b && visibility(b) < 0.12) stopAll();
        }
        kick();
      });
    },
    { passive: true },
  );

  const relayout = () => {
    if (playing.size) {
      playing.forEach(track);
      return;
    }
    layout();
    kick();
  };
  window.addEventListener("resize", relayout);
  new ResizeObserver(relayout).observe(document.body);
  // The host switches the notes, Present mode and Dev Mode by classes on <html>.
  let wasHidden = hidden();
  new MutationObserver(() => {
    const h = hidden();
    if (h === wasHidden) return;
    wasHidden = h;
    if (h) stopAll();
    else {
      layout();
      kick();
    }
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => (document.hidden ? stopAll() : kick()));
  // A language switch changes the text and so the size of every block: start the scenes over on the new layout.
  document.addEventListener("langchange", () => {
    stopAll();
    window.setTimeout(() => {
      layout();
      kick();
    }, 200);
  });

  layout();
  window.addEventListener("load", () => setTimeout(relayout, 300));
  void document.fonts?.ready.then(relayout);
  setTimeout(kick, 500);
  window.setInterval(kick, 800); // in case a scroll event was missed (smooth scrolls, anchors)
}

init();
document.addEventListener("astro:page-load", init);
