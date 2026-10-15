// FigJam sections on a case study shown as a home board (html.embed): each section in the page's section
// bar (SectionDock) gets a FigJam section frame with a coloured title tab. Frames live in one layer over the
// page, positioned from each section's box in CSS px, so they never clip and survive the board's html zoom.
// The host (figma-app.ts) reads window.__boardSections for Present mode: the slide list, jumping, hiding.
interface Slide {
  id: string;
  label: string;
}
interface SectionsApi {
  slides(): Slide[];
  go(i: number, smooth?: boolean): void;
  current(): number;
  setVisible(on: boolean): void;
  layout(): void;
}
declare global {
  interface Window {
    __boardSections?: SectionsApi;
  }
}

// FigJam's section colours: [frame, title tab, title text].
const COLORS: [string, string, string][] = [
  ["#9747ff", "#efe5ff", "#5a26a6"], // violet
  ["#0d99ff", "#e5f4ff", "#0b5ea8"], // blue
  ["#14ae5c", "#e3f7eb", "#0a6e39"], // green
  ["#ffa629", "#fff1dc", "#9a5600"], // orange
  ["#f24822", "#ffe7e1", "#a12a0f"], // red
  ["#ff24bd", "#ffe3f6", "#a1107a"], // pink
];

function init() {
  const root = document.documentElement;
  if (!root.classList.contains("embed") || window.__boardSections) return;
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-ns-nav] [data-section]")];
  const items = links
    .map((a) => ({ el: document.getElementById(a.dataset.section!), label: a.textContent!.trim(), id: a.dataset.section! }))
    .filter((x): x is { el: HTMLElement; label: string; id: string } => !!x.el);
  if (!items.length) return;

  const layer = document.createElement("div");
  layer.className = "bs-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  const frames = items.map((it, i) => {
    const [line, tab, ink] = COLORS[i % COLORS.length];
    const f = document.createElement("div");
    f.className = "bs-frame";
    f.style.setProperty("--bs-line", line);
    f.style.setProperty("--bs-tab", tab);
    f.style.setProperty("--bs-ink", ink);
    f.innerHTML = `<span class="bs-title">${it.label.replace(/[<>&]/g, "")}</span><span class="bs-size"></span>`;
    layer.append(f);
    return f;
  });

  // Document position in CSS px (offset chain), unaffected by the board's html zoom.
  const box = (el: HTMLElement) => {
    let x = 0,
      y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };
  const INSET = 6;
  const layout = () => {
    items.forEach((it, i) => {
      const b = box(it.el);
      const s = frames[i].style;
      s.left = `${b.x + INSET}px`;
      s.top = `${b.y + INSET}px`;
      s.width = `${Math.max(0, b.w - INSET * 2)}px`;
      s.height = `${Math.max(0, b.h - INSET * 2)}px`;
    });
  };
  layout();

  // Hovering a section outlines it in blue and shows its size, like hovering a frame in Figma. The pointer
  // is compared with each section's real box (so it works at any board zoom), once per animation frame.
  let hovered = -1;
  let ticking = false;
  let px = -1;
  let py = -1;
  const setHover = (i: number) => {
    if (i === hovered) return;
    if (hovered >= 0) frames[hovered].classList.remove("is-hover");
    hovered = i;
    if (i < 0) return;
    const b = box(items[i].el);
    frames[i].classList.add("is-hover");
    frames[i].querySelector(".bs-size")!.textContent = `${Math.round(b.w)} × ${Math.round(b.h)}`;
  };
  const pick = () => {
    ticking = false;
    let hit = -1;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].el.getBoundingClientRect();
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
        hit = i;
        break;
      }
    }
    setHover(hit);
  };
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(pick);
      }
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => setHover(-1));
  window.addEventListener("scroll", () => !ticking && px >= 0 && ((ticking = true), requestAnimationFrame(pick)), { passive: true });
  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  document.fonts?.ready.then(layout);
  // Images and pinned sections change heights after load.
  new ResizeObserver(() => layout()).observe(document.body);

  // Slides for Present mode: the opening (top of the page), then every section.
  const slides: Slide[] = [{ id: "", label: "Intro" }, ...items.map((it) => ({ id: it.id, label: it.label }))];
  const topOf = (i: number) => (i === 0 ? 0 : box(items[i - 1].el).y - 24);
  const current = () => {
    // The last slide whose top has passed a third of the way down the screen.
    const z = Number(root.style.zoom || 1);
    const line = window.scrollY / z + window.innerHeight / z / 3;
    let c = 0;
    for (let i = 1; i < slides.length; i++) if (topOf(i) <= line) c = i;
    return c;
  };

  window.__boardSections = {
    slides: () => slides,
    current,
    go(i, smooth = true) {
      const z = Number(root.style.zoom || 1);
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, topOf(i)) * z, behavior: smooth && !reduce ? "smooth" : "auto" });
    },
    setVisible: (on) => root.classList.toggle("bs-off", !on),
    layout,
  };
}

init();
document.addEventListener("astro:page-load", init);
