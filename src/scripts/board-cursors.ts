// Reviewer cursors on a case study shown as a home board (html.embed). Each cursor belongs to one part of the page
// (src/data/cursors.ts) and acts when that part scrolls into view, in one of three ways so they do not all look alike:
//   select   a marquee drag from a chosen corner (the rectangle follows the cursor, with a live size label as in Figma),
//            then a selection frame with handles, then its line in cursor chat
//   comment  goes to a spot outside the block and only says its line
//   react    goes to a spot outside the block and only drops an emote
// A cursor heads for its block before the reader gets there, so it is already waiting when the block comes into
// view. Bubbles open away from the block they talk about, never over it. Cursors live in the page, so they scroll
// and zoom with it. Positions are document px taken from the offset chain (same as board-sections.ts), which the
// board's html zoom does not affect.
import type { Scene } from "../data/cursors";

type Data = { people: Record<string, { name: string; color: string }>; scenes?: Scene[] };
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Corner = "nw" | "ne" | "sw" | "se";
type Face = { h: "r" | "l"; v: "d" | "u" }; // which way the name chip and the bubble open
interface Actor {
  scene: Scene;
  idx: number;
  el: HTMLElement; // cursor with name chip and chat bubble
  chat: HTMLElement;
  marq: HTMLElement;
  sel: HTMLElement;
  target: HTMLElement | null;
  box: Box | null;
  x: number; // where the cursor is, document px
  y: number;
  mv: number; // id of the latest move; an older one stops when a newer one starts
  primed: boolean; // already heading for (or waiting at) its starting spot
  end: Corner | null; // the corner a select scene is holding the cursor on
  playedAt: number;
  seenOut: boolean;
}

const PLAY_AGAIN_MS = 15000;
const START_AT = 0.3; // how much of a block must be on screen before its scene starts
const DROP_AT = 0.08; // below this the scene is dropped
const MIN_W = 240;
const MIN_H = 70;
const MAX_W = 1300; // the content column is 1200 wide, so full-width rows are fine; MAX_H keeps whole sections out
const MAX_H = 640;
const ROOM = 260; // width a bubble needs
const CANCEL = Symbol("cancel");
const OPPOSITE: Record<Corner, Corner> = { nw: "se", ne: "sw", sw: "ne", se: "nw" };

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

  const actors: Actor[] = data.scenes.map((scene, idx) => {
    const p = data.people[scene.who];
    const mk = (cls: string, html = "") => {
      const d = document.createElement("div");
      d.className = cls;
      d.style.setProperty("--bc", p.color);
      d.innerHTML = html;
      layer.append(d);
      return d;
    };
    const marq = mk("bc-marq", `<span class="bc-dim"></span>`);
    const sel = mk("bc-sel", `<i></i><i></i><i></i><i></i><span class="bc-tag">${p.name}</span><span class="bc-dim"></span>`);
    const el = mk("bc-cur", `${pointer(p.color)}<span class="bc-name">${p.name}</span><div class="bc-chat"></div>`);
    return { scene, idx, el, chat: el.querySelector<HTMLElement>(".bc-chat")!, marq, sel, target: null, box: null, x: 0, y: 0, mv: 0, primed: false, end: null, playedAt: 0, seenOut: true };
  });

  const modeOf = (a: Actor) => a.scene.mode ?? "select";
  const clampX = (x: number) => Math.max(8, Math.min(x, viewW() - 130));
  const face = (a: Actor, f: Face) => {
    a.el.classList.toggle("is-left", f.h === "l");
    a.el.classList.toggle("is-up", f.v === "u");
  };
  const setPos = (a: Actor, x: number, y: number) => {
    a.x = x;
    a.y = y;
    a.el.style.transform = `translate(${x}px, ${y}px)`;
  };

  // Moves the cursor like a hand would: along a slight curve, easing in and out. A newer move replaces an older one.
  // With `mine` it throws CANCEL if the scene is dropped meanwhile; `line` is a straight drag; `frame` sees every step.
  function move(a: Actor, x: number, y: number, ms: number, o: { mine?: number; line?: boolean; frame?: (x: number, y: number) => void } = {}) {
    const id = ++a.mv;
    const x0 = a.x,
      y0 = a.y;
    const dx = x - x0,
      dy = y - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 1 || ms <= 0) {
      setPos(a, x, y);
      o.frame?.(x, y);
      return Promise.resolve();
    }
    const bow = o.line ? 0 : Math.min(60, dist * 0.12) * (a.idx % 2 ? 1 : -1);
    const cx = (x0 + x) / 2 - (dy / dist) * bow;
    const cy = (y0 + y) / 2 + (dx / dist) * bow;
    return new Promise<void>((res, rej) => {
      const t0 = performance.now();
      const step = (now: number) => {
        if (o.mine !== undefined && o.mine !== epoch) return rej(CANCEL);
        if (a.mv !== id) return res();
        const t = Math.min(1, (now - t0) / ms);
        const k = o.line ? (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2) : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const u = 1 - k;
        const px = u * u * x0 + 2 * u * k * cx + k * k * x;
        const py = u * u * y0 + 2 * u * k * cy + k * k * y;
        setPos(a, px, py);
        o.frame?.(px, py);
        if (t < 1) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
  }
  const travel = (a: Actor, x: number, y: number) => Math.round(Math.min(900, Math.max(320, Math.hypot(x - a.x, y - a.y) * 0.7)));

  const corner = (b: Box, c: Corner) => ({ x: b.x + (c === "ne" || c === "se" ? b.w : 0), y: b.y + (c === "sw" || c === "se" ? b.h : 0) });
  // Where a cursor waits when it has nothing to do: just outside its block, in the gap below it.
  const parkOf = (a: Actor, b: Box) => {
    const toRight = modeOf(a) === "select" ? a.scene.from !== "ne" && a.scene.from !== "se" : a.scene.side !== "right";
    return { x: clampX(toRight ? b.x + b.w - 20 : b.x + 24), y: b.y + b.h + 12 };
  };
  // Where a comment or a reaction happens, always outside the block: in the margin beside it when there is room for
  // the bubble, otherwise in the gap below (right-hand scenes) or above (left-hand scenes).
  const anchorOf = (a: Actor, b: Box): Face & { x: number; y: number } => {
    const spaceR = viewW() - (b.x + b.w);
    const spaceL = b.x;
    const y = b.y + b.h * (a.scene.y ?? 0.4);
    const order = a.scene.side === "left" ? (["left", "right"] as const) : (["right", "left"] as const);
    for (const side of order) {
      if (side === "right" && spaceR >= ROOM) return { x: b.x + b.w + 10, y, h: "r", v: "d" };
      if (side === "left" && spaceL >= ROOM) return { x: b.x - 10, y, h: "l", v: "d" };
    }
    if (a.scene.side === "left") return { x: clampX(b.x + 40), y: b.y - 8, h: "r", v: "u" };
    const x = clampX(b.x + b.w - 120);
    return { x, y: b.y + b.h + 10, h: viewW() - x < ROOM ? "l" : "r", v: "d" };
  };
  // Where a cursor stands while it waits for the reader: a little short of where it will act.
  const primeOf = (a: Actor, b: Box) => {
    if (modeOf(a) === "select") {
      const c = corner(b, a.scene.from ?? "nw");
      return { x: c.x + (c.x > b.x ? 30 : -30), y: c.y + (c.y > b.y ? 24 : -24) };
    }
    const p = anchorOf(a, b);
    return { x: clampX(p.x + (p.h === "r" ? 90 : -90)), y: p.y + 36 };
  };

  const playing = new Set<Actor>();
  const measure = (a: Actor) => {
    a.target = a.target?.isConnected ? a.target : resolve(a.scene);
    a.box = a.target ? boxOf(a.target) : null;
    return a.box;
  };
  const home = (a: Actor, b: Box) => (a.primed ? primeOf(a, b) : parkOf(a, b));

  // Where each block is. Run again whenever the page reflows (images load, window resizes, zoom, language).
  function layout() {
    for (const a of actors) {
      measure(a);
      a.el.hidden = a.sel.hidden = a.marq.hidden = !a.box;
      if (a.box && !playing.has(a)) {
        const k = home(a, a.box);
        a.mv++;
        setPos(a, k.x, k.y);
      }
    }
  }

  // Draws the rectangle between two points, with its size label (Figma shows the size while you drag and once selected).
  function setRect(el: HTMLElement, p: { x: number; y: number }, q: { x: number; y: number }) {
    const w = Math.abs(q.x - p.x);
    const h = Math.abs(q.y - p.y);
    Object.assign(el.style, { left: `${Math.min(p.x, q.x)}px`, top: `${Math.min(p.y, q.y)}px`, width: `${w}px`, height: `${h}px` });
    const dim = el.querySelector<HTMLElement>(".bc-dim");
    if (dim) dim.textContent = `${Math.round(w)} × ${Math.round(h)}`;
  }

  // Keeps a selection that is on screen glued to its block when the block changes size (a language switch, an image).
  function track(a: Actor) {
    const b = measure(a);
    if (!b) return;
    const p = { x: b.x, y: b.y };
    const q = { x: b.x + b.w, y: b.y + b.h };
    setRect(a.sel, p, q);
    if (a.end) {
      const k = corner(b, a.end);
      void move(a, k.x, k.y, 200);
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
    a.primed = false;
    a.el.classList.remove("is-chatting", "is-active", "is-down");
    a.chat.textContent = "";
    a.marq.classList.remove("is-on");
    a.sel.classList.remove("is-on");
    face(a, { h: "r", v: "d" });
    if (a.box) {
      const k = parkOf(a, a.box);
      void move(a, k.x, k.y, 600);
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
      await sleep(22);
      guard(mine);
    }
    await sleep(2200 + line.length * 26);
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
      a.el.classList.add("is-active");
      if (mode === "select") {
        const from = a.scene.from ?? "nw";
        const to = OPPOSITE[from];
        const s = corner(b, from);
        const e = corner(b, to);
        // 1. up to the corner the drag starts from, press the mouse
        await move(a, s.x, s.y, a.primed ? 280 : travel(a, s.x, s.y), { mine });
        a.el.classList.add("is-down");
        await sleep(110);
        guard(mine);
        // 2. drag to the opposite corner: the rectangle is drawn between the start and the cursor, as in Figma
        face(a, { h: viewW() - e.x < ROOM ? "l" : "r", v: e.y > b.y + b.h / 2 ? "d" : "u" });
        setRect(a.marq, s, s);
        a.marq.classList.add("is-on");
        a.end = to;
        await move(a, e.x, e.y, 560, { mine, line: true, frame: (x, y) => setRect(a.marq, s, { x, y }) });
        // 3. release: the marquee gives way to a selection frame with handles and its size
        a.el.classList.remove("is-down");
        setRect(a.sel, { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h });
        a.marq.classList.remove("is-on");
        a.sel.classList.add("is-on");
        await sleep(240);
        guard(mine);
        // 4. say it, then react
        if (a.scene.say) await say(a, mine);
        if (a.scene.react) {
          emote(a, a.scene.react);
          await sleep(1300);
          guard(mine);
        }
      } else {
        // comment / react: walk to a spot outside the block
        const p = anchorOf(a, b);
        face(a, p);
        await move(a, p.x, p.y, a.primed ? 420 : travel(a, p.x, p.y), { mine });
        if (mode === "comment") {
          if (a.scene.say) await say(a, mine);
          if (a.scene.react) emote(a, a.scene.react);
        } else {
          ping(a);
          emote(a, a.scene.react ?? "👍", 5);
          await sleep(1800);
          guard(mine);
        }
      }
      // let go and go back to waiting beside the block
      reset(a);
      await sleep(500);
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
    innerWidth < 760;

  // How much of the block is on screen (0..1), against whichever is smaller: the block or the screen.
  const visibility = (b: Box) => {
    const z = zoom();
    const top = window.scrollY / z;
    const vh = window.innerHeight / z;
    const overlap = Math.min(b.y + b.h, top + vh) - Math.max(b.y, top);
    return Math.max(0, overlap) / Math.max(1, Math.min(b.h, vh));
  };
  // Within about a screen of the viewport: close enough for the cursor to start heading for its block.
  const near = (b: Box) => {
    const z = zoom();
    const top = window.scrollY / z;
    const vh = window.innerHeight / z;
    return b.y < top + vh * 2 && b.y + b.h > top - vh * 0.5;
  };

  // Sends cursors on their way to blocks that are coming up, and plays the most visible scene that is due. Blocks are
  // measured again here, so a page that was still loading when the cursors were laid out does not hold them back.
  function kick() {
    if (hidden()) return;
    const now = Date.now();
    let best: Actor | null = null;
    let bestV = 0;
    for (const a of actors) {
      const b = measure(a);
      if (!b) continue;
      const v = visibility(b);
      if (v < 0.3) a.seenOut = true;
      if (playing.has(a)) continue;
      const due = !a.playedAt || (a.seenOut && now - a.playedAt > PLAY_AGAIN_MS);
      if (!due) continue;
      if (!a.primed && near(b)) {
        a.primed = true;
        const k = primeOf(a, b);
        void move(a, k.x, k.y, travel(a, k.x, k.y) + 300);
      }
      if (v >= START_AT && v > bestV) {
        best = a;
        bestV = v;
      }
    }
    if (best && !playing.size) void play(best);
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
          if (b && visibility(b) < DROP_AT) stopAll();
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
  setTimeout(kick, 300);
  window.setInterval(kick, 600); // in case a scroll event was missed (smooth scrolls, anchors)
}

init();
document.addEventListener("astro:page-load", init);
