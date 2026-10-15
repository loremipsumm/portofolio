// FigJam annotations on a case study shown as a home board (html.embed): sticky notes with stamps, stickers
// and comment pins with threads. Data comes from src/data/annotations.ts via #board-notes (see Base.astro).
// Each object is placed inside its section, so it scrolls and zooms with the page. The host page (figma-app.ts)
// drives it through window.__board: listing threads for its Comments panel, jumping to one, hiding everything.
import type { Board, Who } from "../data/annotations";

type Data = Board & { people: Record<Who, { name: string; color: string }> };

interface BoardApi {
  threads(): { id: string; resolved: boolean; messages: { name: string; color: string; initials: string; text: string; ago: string }[] }[];
  focus(id: string): void;
  setVisible(on: boolean): void;
  layout(): void;
  tight(): boolean;
  commentMode(on?: boolean): boolean;
}
declare global {
  interface Window {
    __board?: BoardApi;
  }
}

const STICKY: Record<string, string> = {
  yellow: "#ffe99a",
  green: "#b3efbd",
  blue: "#a8daff",
  pink: "#ffc2ec",
  purple: "#d3bdff",
  orange: "#ffc498",
};
// Remembered per browser: which threads were opened (unread dots) and whether the first-time hint was seen.
const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function init() {
  const root = document.documentElement;
  const dataEl = document.getElementById("board-notes");
  if (!root.classList.contains("embed") || !dataEl || window.__board) return;
  const data = JSON.parse(dataEl.textContent || "{}") as Data;
  const who = (w: Who | "YOU") =>
    w === "YOU" ? { name: "You", color: "#757575", initials: "Y" } : { ...data.people[w], initials: w === "RA" ? "RA" : w };

  const anchor = (id: string) => (id === "hero" ? document.querySelector<HTMLElement>("main section") : document.getElementById(id));
  // Objects live inside their section (so they scroll and zoom with it) but are positioned against the
  // window: the page's content column is 1200px wide and centred, and each object sits in the margin
  // beside it. Sections differ in width (full-bleed, inset, or the narrow .wrap itself), so the offset is
  // worked out per object from where its section sits. All in CSS px, so the board's html zoom is fine.
  const placed: { el: HTMLElement; host: HTMLElement; side: "left" | "right" }[] = [];
  const viewW = () => root.clientWidth;
  const gutter = () => viewW() / 2 - 600;
  const docLeft = (el: HTMLElement) => {
    let x = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) x += n.offsetLeft;
    return x;
  };
  // Distance from the window edge for each kind of object.
  const edgeFor = (el: HTMLElement) => {
    const g = gutter();
    if (el.classList.contains("bn-sticky")) {
      const w = Math.min(176, Math.max(132, g - 28));
      el.style.setProperty("--bn-w", `${w}px`);
      return Math.max(8, g - w - 10);
    }
    if (el.classList.contains("bn-sticker")) return Math.max(0, g) + 32;
    return Math.max(8, g - 46); // pins, threads, the hint
  };
  const position = (el: HTMLElement, host: HTMLElement, side: "left" | "right") => {
    const fromLeft = docLeft(host);
    const hostEdge = side === "left" ? fromLeft : viewW() - fromLeft - host.offsetWidth;
    el.style[side] = `${edgeFor(el) - hostEdge}px`;
  };
  const place = (el: HTMLElement, at: string, side: "left" | "right", y: number, host = anchor(at)) => {
    if (!host) return false;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    el.style.top = `${y}px`;
    el.dataset.side = side;
    host.append(el);
    placed.push({ el, host, side });
    position(el, host, side);
    return true;
  };
  // Sticky notes need a real margin; when it is too narrow (at this zoom) they would cover text, so they
  // hide and the host suggests zooming out.
  const tight = () => gutter() < 140;
  const layout = () => {
    root.classList.toggle("bn-tight", tight());
    placed.forEach((p) => p.el.isConnected && position(p.el, p.host, p.side));
  };
  root.classList.toggle("bn-tight", tight());
  window.addEventListener("resize", layout);
  // Fonts and images can shift where sections sit.
  window.addEventListener("load", layout);
  document.fonts?.ready.then(layout);
  const avatar = (w: Who | "YOU", cls = "bn-av") => {
    const p = who(w);
    return `<span class="${cls}" style="background:${p.color}" title="${esc(p.name)}">${esc(p.initials)}</span>`;
  };

  // ---- sticky notes (draggable, like the real thing) -------------------------------------------
  data.stickies.forEach((s, i) => {
    const el = document.createElement("div");
    el.className = "bn bn-sticky";
    el.style.setProperty("--bn-bg", STICKY[s.color]);
    el.style.setProperty("--bn-tilt", `${i % 2 ? 1.6 : -1.8}deg`);
    el.innerHTML = `<p>${esc(s.text)}</p><footer><span class="bn-by">${esc(who(s.by).name)}</span>${(s.stamps ?? [])
      .map((st) => `<span class="bn-stamp" aria-label="${esc(who(st.by).name)}: ${esc(st.e)}"><span aria-hidden="true">${st.e}</span>${avatar(st.by, "bn-stamp-av")}</span>`)
      .join("")}</footer>`;
    if (!place(el, s.at, s.side, s.y)) return;
    drag(el);
  });

  // ---- stickers (decorative) -------------------------------------------------------------------
  data.stickers.forEach((s, i) => {
    const el = document.createElement("div");
    el.className = `bn bn-sticker bn-sticker--${s.tone}`;
    el.style.setProperty("--bn-tilt", `${i % 2 ? 4 : -5}deg`);
    el.setAttribute("aria-hidden", "true");
    el.textContent = s.text;
    if (place(el, s.at, s.side, s.y)) drag(el);
  });

  // ---- comment pins and threads ----------------------------------------------------------------
  const replies = new Map<string, { by: Who | "YOU"; text: string; ago: string }[]>();
  const resolved = new Set<string>();
  const pins = new Map<string, HTMLButtonElement>();
  let open: { id: string; el: HTMLElement } | null = null;

  // The visitor's own comments (comment mode): kept in this browser only, per case study.
  type Mine = { id: string; host: string; x: number; y: number; text: string; at: number };
  const MINE_KEY = `bn-mine:${location.pathname}`;
  let mine: Mine[] = [];
  try {
    mine = JSON.parse(store.get(MINE_KEY) || "[]");
  } catch {}
  const saveMine = () => store.set(MINE_KEY, JSON.stringify(mine));
  const since = (t: number) => {
    const m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  };
  const threadMsgs = (id: string) => {
    const t = data.threads.find((x) => x.id === id);
    const own = mine.find((x) => x.id === id);
    const base = t ? t.messages : own ? [{ by: "YOU" as const, text: own.text, ago: since(own.at) }] : [];
    return [...base, ...(replies.get(id) ?? [])];
  };
  const notifyHost = () => window.parent?.postMessage({ type: "board-notes" }, location.origin);

  // Pins tell people they can be opened: unread ones carry a pulsing blue dot (like Figma), hovering or
  // focusing one previews the comment with "Click to open", and the first pin seen gets a one-time hint.
  let read: string[] = [];
  try {
    read = JSON.parse(store.get("bn-read") || "[]");
  } catch {}
  const markRead = (id: string) => {
    pins.get(id)?.classList.remove("is-unread");
    if (!read.includes(id)) store.set("bn-read", JSON.stringify((read = [...read, id])));
  };
  data.threads.forEach((t) => {
    const first = t.messages[0];
    const n = t.messages.length - 1;
    const replyText = n ? `${n} ${n === 1 ? "reply" : "replies"}` : "No replies yet";
    const pin = document.createElement("button");
    pin.className = `bn bn-pin${read.includes(t.id) ? "" : " is-unread"}`;
    pin.style.setProperty("--bn-c", data.people[first.by].color);
    pin.setAttribute("aria-label", `Example question from ${who(first.by).name}: ${first.text} ${replyText}. Open thread.`);
    pin.setAttribute("aria-expanded", "false");
    pin.innerHTML = `<span>${esc(who(first.by).initials)}</span>${n ? `<b>${n}</b>` : ""}<i class="bn-dot" aria-hidden="true"></i>
      <span class="bn-peek" aria-hidden="true"><span class="bn-peek-meta"><b>${esc(who(first.by).name)}</b><span>${esc(first.ago || "Example question")}</span></span>
      <span class="bn-peek-text">${esc(first.text)}</span><span class="bn-peek-cta">${esc(replyText)} · Click to open</span></span>`;
    if (!place(pin, t.at, t.side, t.y)) return;
    pins.set(t.id, pin);
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      if (open?.id === t.id) closeThread();
      else openThread(t.id);
    });
  });

  // First-time hint, next to the first pin that scrolls fully into view. Gone for good after "Got it" or
  // after any thread is opened.
  let coach: HTMLElement | null = null;
  const dismissCoach = () => {
    store.set("bn-coach", "done");
    coach?.remove();
    coach = null;
    root.querySelector(".bn-pin.is-hinted")?.classList.remove("is-hinted");
  };
  if (store.get("bn-coach") !== "done" && pins.size) {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting && !root.classList.contains("bn-off"));
        if (!hit || store.get("bn-coach") === "done" || open) return; // not while a thread is open
        io.disconnect();
        const pin = hit.target as HTMLElement;
        coach = document.createElement("div");
        coach.className = "bn bn-coach";
        coach.setAttribute("role", "note");
        coach.innerHTML = `<p><b>Comments are clickable</b>Open a pin to read the question and my answer.</p><button type="button">Got it</button>`;
        coach.addEventListener("click", (e) => e.stopPropagation());
        coach.querySelector("button")!.addEventListener("click", dismissCoach);
        place(coach, "", pin.dataset.side as "left" | "right", parseFloat(pin.style.top) + 46, pin.parentElement!);
        pin.classList.add("is-hinted");
      },
      { threshold: 1 },
    );
    pins.forEach((p) => io.observe(p));
  }

  function renderThread(id: string) {
    const example = !id.startsWith("mine-");
    return `<header><b>${example ? "Example question" : "Comment"}</b><span class="bn-spacer"></span>
        <button data-bn-resolve title="Resolve" aria-label="Resolve comment"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg></button>
        <button data-bn-close title="Close" aria-label="Close comment"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
      <ol>${threadMsgs(id)
        .map((m) => {
          const p = who(m.by);
          return `<li>${avatar(m.by)}<div><p class="bn-meta"><b>${esc(p.name)}</b>${m.ago ? `<span>${esc(m.ago)}</span>` : ""}</p><p>${esc(m.text)}</p></div></li>`;
        })
        .join("")}</ol>
      <form data-bn-reply>${avatar("YOU")}<input type="text" placeholder="Reply" aria-label="Reply" autocomplete="off" /><button type="submit" aria-label="Send reply" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>`;
  }
  function openThread(id: string) {
    closeThread();
    const pin = pins.get(id);
    if (!pin) return;
    const el = document.createElement("div");
    el.className = "bn bn-thread";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Comment thread");
    el.innerHTML = renderThread(id);
    if (pin.dataset.mine) placeBeside(el, pin);
    else place(el, "", pin.dataset.side as "left" | "right", parseFloat(pin.style.top), pin.parentElement!);
    pin.setAttribute("aria-expanded", "true");
    markRead(id);
    if (coach) dismissCoach();
    else store.set("bn-coach", "done"); // opening a thread shows they know pins are clickable
    open = { id, el };
    wireThread(id, el);
    el.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }
  function wireThread(id: string, el: HTMLElement) {
    el.addEventListener("click", (e) => e.stopPropagation());
    el.querySelector("[data-bn-close]")?.addEventListener("click", () => closeThread(true));
    el.querySelector("[data-bn-resolve]")?.addEventListener("click", () => {
      if (mine.some((m) => m.id === id)) {
        mine = mine.filter((m) => m.id !== id);
        saveMine();
        closeThread();
        pins.get(id)?.remove();
        pins.delete(id);
      } else {
        resolved.add(id);
        pins.get(id)!.hidden = true;
        closeThread();
      }
      notifyHost();
    });
    const form = el.querySelector<HTMLFormElement>("[data-bn-reply]")!;
    const input = form.querySelector("input")!;
    const send = form.querySelector<HTMLButtonElement>("button")!;
    input.addEventListener("input", () => (send.disabled = !input.value.trim()));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      // Replies stay on this screen only: nothing is sent anywhere.
      replies.set(id, [...(replies.get(id) ?? []), { by: "YOU", text, ago: "now" }]);
      el.innerHTML = renderThread(id);
      wireThread(id, el);
      el.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      notifyHost();
    });
  }
  function closeThread(refocus = false) {
    if (!open) return;
    const pin = pins.get(open.id);
    pin?.setAttribute("aria-expanded", "false");
    open.el.remove();
    open = null;
    if (refocus) pin?.focus({ preventScroll: true });
  }
  document.addEventListener("click", () => closeThread());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) closeThread(true);
  });

  // ---- comment mode (C): click anywhere on the page to leave a comment, like Figma's comment tool ----
  // Pins are anchored to the section they were dropped on (by id, or by position among the page's sections),
  // at the click point relative to it, so they stay put as the page reflows or zooms.
  const sectionsOf = () => [...document.querySelectorAll<HTMLElement>("main section")];
  const hostKey = (el: HTMLElement) => (el.id ? `#${el.id}` : `@${sectionsOf().indexOf(el)}`);
  const hostFrom = (key: string) => (key.startsWith("#") ? document.getElementById(key.slice(1)) : sectionsOf()[Number(key.slice(1))]);
  const pinFor = (m: Mine) => {
    const host = hostFrom(m.host);
    if (!host) return null;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const pin = document.createElement("button");
    pin.className = "bn bn-pin bn-pin--mine";
    pin.dataset.mine = "1";
    pin.style.setProperty("--bn-c", "#757575");
    pin.style.left = `${m.x}px`;
    pin.style.top = `${m.y}px`;
    pin.setAttribute("aria-expanded", "false");
    pin.setAttribute("aria-label", `Your comment: ${m.text}. Open thread.`);
    pin.innerHTML = `<span>Y</span>`;
    host.append(pin);
    pins.set(m.id, pin);
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      if (open?.id === m.id) closeThread();
      else openThread(m.id);
    });
    return pin;
  };
  mine.forEach(pinFor);

  // Threads for these pins sit beside the pin, flipping to its left near the right edge.
  function placeBeside(el: HTMLElement, pin: HTMLElement) {
    const host = pin.parentElement!;
    const x = parseFloat(pin.style.left);
    el.style.top = pin.style.top;
    el.style.left = x + 344 > host.clientWidth ? `${Math.max(8, x - 312)}px` : `${x + 44}px`;
    el.style.marginLeft = "0";
    host.append(el);
  }

  let commenting = false;
  let draft: { pin: HTMLElement; box: HTMLElement } | null = null;
  const dropDraft = () => {
    draft?.pin.remove();
    draft?.box.remove();
    draft = null;
  };
  function commentMode(on = !commenting) {
    commenting = on;
    root.classList.toggle("bn-commenting", on);
    if (on) setVisible(true);
    else dropDraft();
    window.parent?.postMessage({ type: "board-comment-mode", on }, location.origin);
    return on;
  }
  // In comment mode the next click on the page drops a pin there, with a box to write the comment.
  document.addEventListener(
    "click",
    (e) => {
      if (!commenting) return;
      const t = e.target as HTMLElement;
      if (t.closest(".bn-composer, .bn-pin, .bn-thread")) return;
      const host = t.closest<HTMLElement>("main section") ?? sectionsOf().find((s) => s.contains(t));
      if (!host) return;
      e.preventDefault();
      e.stopPropagation();
      closeThread();
      dropDraft();
      const z = Number(root.style.zoom || 1);
      const r = host.getBoundingClientRect();
      // getBoundingClientRect and clientX are in zoomed px; the pin is placed in the page's own px.
      const x = Math.round((e.clientX - r.left) / z) - 4;
      const y = Math.round((e.clientY - r.top) / z) - 34;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      const pin = document.createElement("span");
      pin.className = "bn bn-pin bn-pin--mine is-draft";
      pin.style.setProperty("--bn-c", "#757575");
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      pin.innerHTML = `<span>Y</span>`;
      host.append(pin);
      const box = document.createElement("form");
      box.className = "bn bn-thread bn-composer";
      box.setAttribute("aria-label", "New comment");
      box.innerHTML = `<header><b>New comment</b><span class="bn-spacer"></span><button type="button" data-bn-cancel aria-label="Cancel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
        <div class="bn-compose">${avatar("YOU")}<input type="text" placeholder="Add a comment" aria-label="Add a comment" autocomplete="off" /><button type="submit" aria-label="Post comment" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></div>
        <p class="bn-compose-note">Saved in this browser only. Nothing is sent anywhere.</p>`;
      placeBeside(box, pin);
      draft = { pin, box };
      const input = box.querySelector("input")!;
      const post = box.querySelector<HTMLButtonElement>("button[type=submit]")!;
      input.addEventListener("input", () => (post.disabled = !input.value.trim()));
      box.addEventListener("click", (ev) => ev.stopPropagation());
      box.querySelector("[data-bn-cancel]")!.addEventListener("click", dropDraft);
      box.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        const m: Mine = { id: `mine-${Date.now()}`, host: hostKey(host), x, y, text, at: Date.now() };
        mine = [...mine, m];
        saveMine();
        dropDraft();
        const real = pinFor(m);
        commentMode(false);
        notifyHost();
        if (real) {
          markRead(m.id);
          openThread(m.id);
        }
      });
      input.focus({ preventScroll: true });
    },
    true,
  );
  // C toggles comment mode (not while typing); Esc leaves it.
  document.addEventListener("keydown", (e) => {
    const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? "");
    if (typing || e.metaKey || e.ctrlKey || e.altKey) {
      if (e.key === "Escape" && draft) dropDraft();
      return;
    }
    if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      commentMode();
    } else if (e.key === "Escape" && commenting) commentMode(false);
  });


  // ---- dragging (stickies and stickers), pointer only ------------------------------------------
  function drag(el: HTMLElement) {
    let sx = 0,
      sy = 0,
      ox = 0,
      oy = 0,
      on = false;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      on = true;
      sx = e.clientX;
      sy = e.clientY;
      ox = Number(el.dataset.dx || 0);
      oy = Number(el.dataset.dy || 0);
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (!on) return;
      // The page may be zoomed by the board (html zoom); pointer deltas are in screen px.
      const z = Number(root.style.zoom || 1);
      const dx = ox + (e.clientX - sx) / z;
      const dy = oy + (e.clientY - sy) / z;
      el.dataset.dx = String(dx);
      el.dataset.dy = String(dy);
      el.style.translate = `${dx}px ${dy}px`;
    });
    const end = () => {
      on = false;
      el.classList.remove("is-dragging");
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  window.__board = {
    threads: () =>
      [...data.threads, ...mine].map((t) => ({
        id: t.id,
        resolved: resolved.has(t.id),
        messages: threadMsgs(t.id).map((m) => ({ ...who(m.by), text: m.text, ago: m.ago })),
      })),
    focus(id) {
      const pin = pins.get(id);
      if (!pin) return;
      resolved.delete(id);
      pin.hidden = false;
      setVisible(true);
      pin.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      setTimeout(() => openThread(id), 350);
      notifyHost();
    },
    setVisible,
    layout,
    tight,
    commentMode,
  };
  function setVisible(on: boolean) {
    root.classList.toggle("bn-off", !on);
    if (!on) closeThread();
  }
  notifyHost();
}

init();
document.addEventListener("astro:page-load", init);
