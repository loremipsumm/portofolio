// Section navigation for a case study shown as a home board (html.embed). The sections are the ones in the
// page's section bar (SectionDock). Nothing is drawn over the page; the host (figma-app.ts) reads
// window.__boardSections for Present mode and the guided tour (the slide list and jumping), and for the
// minimap (where every section sits).
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
  map(): { height: number; items: { label: string; y: number; h: number; color: string }[]; view: { y: number; h: number } };
}
declare global {
  interface Window {
    __boardSections?: SectionsApi;
  }
}

// One colour per section, for the minimap blocks.
const COLORS = ["#9747ff", "#0d99ff", "#14ae5c", "#ffa629", "#f24822", "#ff24bd"];

function init() {
  const root = document.documentElement;
  if (!root.classList.contains("embed") || window.__boardSections) return;
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-ns-nav] [data-section]")];
  const items = links
    .map((a) => ({ el: document.getElementById(a.dataset.section!), label: a.textContent!.trim(), id: a.dataset.section! }))
    .filter((x): x is { el: HTMLElement; label: string; id: string } => !!x.el);
  if (!items.length) return;

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
    // Kept so the host can call them; there is nothing drawn to show, hide or reposition any more.
    setVisible: () => {},
    layout: () => {},
    // Physical px (same units as scrollY), for the host's minimap.
    map() {
      const sy = window.scrollY;
      return {
        height: document.documentElement.scrollHeight,
        items: items.map((it, i) => {
          const r = it.el.getBoundingClientRect();
          return { label: it.label, y: r.top + sy, h: r.height, color: COLORS[i % COLORS.length] };
        }),
        view: { y: sy, h: window.innerHeight },
      };
    },
  };
}

init();
document.addEventListener("astro:page-load", init);
