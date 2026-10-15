// Custom cursor.
//  - A large solid dot (48px) follows the pointer exactly (no lag, so it never feels like it is running away). It is
//    white with a difference blend, which keeps it visible on light and dark media alike.
//  - Over anything clickable or hoverable the dot disappears and that element "leans" toward the
//    pointer, wobbling slightly while the pointer stays inside its box.
// Fine pointers only; skipped for touch and reduced motion.
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const blend = document.getElementById("cursor-blend");
const dot = document.getElementById("cursor-dot");

// Not inside the home board embed, which uses the native cursor like FigJam.
const embed = document.documentElement.classList.contains("embed");

if (fine && !reduce && !embed && blend && dot) {
  document.documentElement.classList.add("has-cursor");

  const interactive = "a, button, summary, [role='button'], [data-cursor], [data-tilt], label[for]";
  const textual = "input:not([type='button']):not([type='submit']):not([type='range']):not([type='checkbox']):not([type='radio']), textarea, select";

  const pos = { x: -100, y: -100 };
  let shown = false;

  // ---- wobble state -------------------------------------------------------------------------
  // The hit-test box is captured once, before the element moves, and used for every later check. Judging
  // "is the pointer still on it" from the moving element itself is what made buttons run away.
  type Wig = { el: HTMLElement; rect: DOMRect; x: number; y: number; r: number; tx: number; ty: number; tr: number };
  const wigs = new Map<HTMLElement, Wig>();
  let active: Wig | null = null;
  const ACTIVATE_INSET = 3; // must be this far inside to start...
  const RELEASE_OUTSET = 3; // ...and this far outside to stop, so the edge never flickers

  const inside = (r: DOMRect, inset: number) =>
    pos.x >= r.left + inset && pos.x <= r.right - inset && pos.y >= r.top + inset && pos.y <= r.bottom - inset;

  const aim = (w: Wig) => {
    const r = w.rect;
    const nx = (pos.x - (r.left + r.width / 2)) / (r.width / 2 || 1); // -1..1 across the box
    const ny = (pos.y - (r.top + r.height / 2)) / (r.height / 2 || 1);
    const reach = Math.min(Math.max(Math.min(r.width, r.height) * 0.16, 4), 9); // px
    w.tx = Math.max(-1, Math.min(1, nx)) * reach;
    w.ty = Math.max(-1, Math.min(1, ny)) * reach;
    w.tr = Math.max(-1, Math.min(1, nx)) * 2.2; // degrees
  };

  let looping = false;
  let prev = 0;
  const loop = (now: number) => {
    const dt = prev ? Math.min(now - prev, 50) : 16;
    prev = now;
    const k = 1 - Math.exp(-dt / 70); // soft, slightly springy follow
    for (const w of wigs.values()) {
      w.x += (w.tx - w.x) * k;
      w.y += (w.ty - w.y) * k;
      w.r += (w.tr - w.r) * k;
      w.el.style.translate = `${w.x.toFixed(2)}px ${w.y.toFixed(2)}px`;
      w.el.style.rotate = `${w.r.toFixed(2)}deg`;
      if (w !== active && Math.abs(w.x) + Math.abs(w.y) + Math.abs(w.r) < 0.06) {
        w.el.style.translate = "";
        w.el.style.rotate = "";
        wigs.delete(w.el);
      }
    }
    if (wigs.size) requestAnimationFrame(loop);
    else {
      looping = false;
      prev = 0;
    }
  };
  const startLoop = () => {
    if (looping) return;
    looping = true;
    requestAnimationFrame(loop);
  };

  const release = () => {
    if (active) {
      active.tx = active.ty = active.tr = 0;
      active = null;
    }
    blend.classList.remove("is-hover", "is-grow");
    startLoop();
  };

  const activate = (el: HTMLElement) => {
    const known = wigs.get(el);
    const w: Wig = known ?? { el, rect: el.getBoundingClientRect(), x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0 };
    // If it is still easing back from an earlier visit, remove its current offset to recover the resting box.
    if (known) {
      const cur = el.getBoundingClientRect();
      w.rect = new DOMRect(cur.left - w.x, cur.top - w.y, cur.width, cur.height);
    }
    wigs.set(el, w);
    active = w;
    if (getComputedStyle(el).display === "inline") {
      // translate/rotate don't apply to inline boxes: they keep a smaller dot but no wobble.
      blend.classList.add("is-grow");
      blend.classList.remove("is-hover");
    } else {
      blend.classList.add("is-hover");
      blend.classList.remove("is-grow");
    }
    aim(w);
    startLoop();
  };

  // ---- pointer ------------------------------------------------------------------------------
  const resolve = () => {
    queued = false;
    if (!shown) return;
    if (active) {
      if (inside(active.rect, -RELEASE_OUTSET)) {
        aim(active);
        return;
      }
      release();
    }
    const under = document.elementFromPoint(pos.x, pos.y);
    if (under?.closest?.(textual) || under?.closest?.("[data-native-cursor]")) {
      blend.classList.add("is-text");
      return;
    }
    blend.classList.remove("is-text");
    const el = under?.closest?.<HTMLElement>(interactive);
    if (el && inside(el.getBoundingClientRect(), ACTIVATE_INSET)) activate(el);
  };
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(resolve);
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      dot.style.transform = `translate3d(${pos.x}px,${pos.y}px,0)`;
      if (!shown) {
        shown = true;
        blend.classList.add("is-on");
      }
      queue();
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    blend.classList.remove("is-on");
    release();
  });
  document.documentElement.addEventListener("pointerenter", () => shown && blend.classList.add("is-on"));
  window.addEventListener("pointerdown", () => blend.classList.add("is-down"));
  window.addEventListener("pointerup", () => blend.classList.remove("is-down"));

  // Content moving under a still pointer (scrolling, layout change, page swap) invalidates the captured box.
  window.addEventListener(
    "scroll",
    () => {
      release();
      queue();
    },
    { passive: true, capture: true },
  );
  document.addEventListener("astro:before-swap", () => {
    release();
    wigs.forEach((w) => {
      w.el.style.translate = "";
      w.el.style.rotate = "";
    });
    wigs.clear();
  });
  document.addEventListener("astro:page-load", queue);
}
