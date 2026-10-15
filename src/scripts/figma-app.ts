// The home page behaves like the Figma desktop home: tabs you can open and close, a file viewer,
// filters and sort, grid/list, search (Cmd/Ctrl+K), context menus, favourites and a few fake collaborators.
// Everything is progressive: without this script the cards are plain links to the case studies.
import { navigate } from "astro:transitions/client";
import { icon } from "./figma-icons";
import { editedLabel } from "./edited";
import type { InspectInfo, Tokens } from "./board-inspect";

interface FileItem {
  id: string;
  tab: string;
  title: string;
  full: string;
  sub: string;
  blurb: string;
  tags: string[];
  year: number;
  area: string;
  type: string;
  href: string;
  meta: [string, string][];
  stats: { n: string; l: string }[];
}
interface MenuItem {
  label?: string;
  icon?: string;
  kbd?: string;
  href?: string;
  download?: boolean;
  checked?: boolean;
  sep?: boolean;
  text?: boolean;
  html?: string; // pre-escaped markup for a non-interactive block (e.g. the account header)
  run?: () => void;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// No fake collaborator cursors or cursor chat on low-power devices (Base.astro sets html.lite) or on touch
// and narrow screens: there is no pointer to imitate, and the labels would sit on top of the content.
const lite = () =>
  document.documentElement.classList.contains("lite") || window.matchMedia("(hover: none)").matches || window.innerWidth < 720;
const store = {
  get(k: string): string | null {
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

// Every case study opens in place as a FigJam board ("Open case study"); their pages style ?embed for it.
const isBoard = (href: string) => href.startsWith("/work/");
// Boards on FigJam's dark canvas (pages that are dark throughout; global.css darkens their embed too).
const DARK_BOARDS = new Set(["sia"]);

let ctl: AbortController | null = null;
let stopBoardFx = () => {};
let raf = 0;

function init() {
  const root = document.querySelector<HTMLElement>("[data-fb]");
  const dataEl = document.getElementById("fb-data");
  if (!root || !dataEl) return;
  ctl?.abort();
  cancelAnimationFrame(raf);
  ctl = new AbortController();
  const { signal } = ctl;
  const on = <K extends keyof DocumentEventMap>(t: EventTarget, type: string, fn: (e: any) => void) =>
    t.addEventListener(type, fn, { signal });

  const data = JSON.parse(dataEl.textContent || "{}") as {
    files: FileItem[];
    openTabs: string[];
    email: string;
    linkedin: string;
    behance: string;
    role: string;
    versions: Record<string, { title: string; meta: string; summary: string; changes?: string[]; at: string }[]>;
    tours: Record<string, { at: string; say: string }[]>;
    inbox: { file: string; title: string; thread: string; name: string; color: string; initials: string; text: string; ago: string }[];
  };
  const byId = new Map(data.files.map((f) => [f.id, f]));
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const qa = <T extends HTMLElement = HTMLElement>(s: string) => [...root.querySelectorAll<T>(s)];

  const homeView = q("[data-fb-view=home]");
  const fileView = q("[data-fb-view=file]");
  const tabsEl = q("[data-fb-tabs]");
  const homeBtn = q("[data-fb-home]");
  const grid = q("[data-fb-grid]");
  const empty = q("[data-fb-empty]");
  const titleEl = q("[data-fb-title]");
  const search = q<HTMLInputElement>("[data-fb-search]");
  const menuEl = q("[data-fb-menu]");
  const toastEl = q("[data-fb-toast]");
  const cursorsEl = q("[data-fb-cursors]");
  const favFilterBtn = q("[data-fb-favfilter]");
  const profileDlg = q<HTMLDialogElement>("[data-fb-profile]");

  let favs: string[] = [];
  try {
    favs = JSON.parse(store.get("fb-fav") || "[]");
  } catch {}
  const state = {
    tabs: [...data.openTabs],
    active: "home",
    area: "",
    type: "All types",
    sort: "recent",
    view: "grid",
    search: "",
    favOnly: false,
    fav: new Set<string>(favs),
    untitled: 0,
    collab: store.get("fb-collab") !== "off",
    board: new Set<string>(), // tabs showing the case study itself as a FigJam board
    zoom: 1,
    notes: store.get("fj-notes") !== "off", // board annotations, collaborators and comments
  };
  const types = ["All types", ...new Set(data.files.map((f) => f.type))];
  const sorts: [string, string][] = [
    ["recent", "Last modified"],
    ["name", "Name"],
    ["client", "Client"],
  ];

  // ---- toast, clipboard, menus -----------------------------------------------------------------
  let toastTimer = 0;
  const toast = (msg: string) => {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  };
  const copy = async (text: string, ok = "Copied to clipboard") => {
    let done = false;
    try {
      await navigator.clipboard.writeText(text);
      done = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.append(ta);
      ta.select();
      try {
        done = document.execCommand("copy");
      } catch {}
      ta.remove();
    }
    toast(done ? ok : "Copy failed");
  };
  const abs = (href: string) => new URL(href, location.origin).href;

  let menuOwner: unknown = null;
  let closedOwner: unknown = null;
  let closedAt = 0;
  let menuItems: MenuItem[] = [];
  const closeMenu = () => {
    if (menuEl.hidden) return;
    menuEl.hidden = true;
    closedOwner = menuOwner;
    closedAt = Date.now();
    menuOwner = null;
  };
  const openMenu = (
    items: MenuItem[],
    at: HTMLElement | { x: number; y: number },
    opts: { right?: boolean; up?: boolean; variant?: string } = {},
  ) => {
    if (at === closedOwner && Date.now() - closedAt < 250) return;
    menuItems = items;
    menuEl.className = opts.variant ? `fb-menu fb-menu--${opts.variant}` : "fb-menu";
    menuEl.innerHTML = items
      .map((it, i) => {
        if (it.sep) return "<hr />";
        if (it.html) return it.run ? `<button role="menuitem" class="fb-mi-block" data-mi="${i}">${it.html}</button>` : it.html;
        const inner = `<span class="fb-tick">${it.checked ? icon("check", 14) : ""}</span>${it.icon ? icon(it.icon, 14) : ""}<span class="fb-mi-label">${esc(it.label ?? "")}</span>${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ""}`;
        if (it.text) return `<div class="fb-mi-text"><span class="fb-mi-label">${esc(it.label ?? "")}</span>${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ""}</div>`;
        const noTick = items.every((x) => x.checked === undefined);
        const body = noTick ? inner.replace(/<span class="fb-tick">.*?<\/span>/, "") : inner;
        return it.href
          ? `<a role="menuitem" data-mi="${i}" href="${esc(it.href)}"${it.download ? " download" : /^https?:/.test(it.href) ? ' target="_blank" rel="noopener"' : ""}>${body}</a>`
          : `<button role="menuitem" data-mi="${i}">${body}</button>`;
      })
      .join("");
    menuEl.hidden = false;
    menuOwner = at;
    const w = menuEl.offsetWidth;
    const h = menuEl.offsetHeight;
    let x: number;
    let y: number;
    if (at instanceof HTMLElement) {
      const r = at.getBoundingClientRect();
      x = opts.right ? r.right - w : r.left;
      y = opts.up ? r.top - h - 6 : r.bottom + 6;
    } else {
      x = at.x;
      y = at.y;
    }
    menuEl.style.left = `${Math.max(8, Math.min(x, window.innerWidth - w - 8))}px`;
    menuEl.style.top = `${Math.max(8, Math.min(y, window.innerHeight - h - 8))}px`;
  };
  on(menuEl, "click", (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-mi]");
    if (!el) return;
    const it = menuItems[Number(el.dataset.mi)];
    closeMenu();
    if (it?.run) {
      e.preventDefault();
      it.run();
    }
  });
  on(document, "pointerdown", (e: PointerEvent) => {
    if (!menuEl.hidden && !menuEl.contains(e.target as Node)) closeMenu();
  });

  // ---- favourites -----------------------------------------------------------------------------
  const syncFavs = () => {
    qa("[data-fb-star]").forEach((b) => b.setAttribute("aria-pressed", String(state.fav.has(b.dataset.fbStar!))));
    store.set("fb-fav", JSON.stringify([...state.fav]));
  };
  const toggleFav = (id: string) => {
    const f = byId.get(id)!;
    if (state.fav.has(id)) state.fav.delete(id);
    else state.fav.add(id);
    toast(state.fav.has(id) ? `${f.title} added to favorites` : `${f.title} removed from favorites`);
    syncFavs();
    if (state.favOnly) applyFilters();
  };

  // ---- home: filters, sort, view ----------------------------------------------------------------
  function applyFilters() {
    const term = state.search.trim().toLowerCase();
    const cards = qa(".fb-card");
    const order = [...data.files]
      .map((f, i) => ({ f, i }))
      .sort((a, b) => {
        if (state.sort === "name") return a.f.title.localeCompare(b.f.title);
        if (state.sort === "client") return a.f.sub.localeCompare(b.f.sub) || a.i - b.i;
        return b.f.year - a.f.year || a.i - b.i;
      })
      .map((x) => x.f.id);
    let shown = 0;
    for (const card of cards) {
      const f = byId.get(card.dataset.id!)!;
      const hay = [f.title, f.full, f.sub, f.tags.join(" "), f.area, f.type].join(" ").toLowerCase();
      const ok =
        (!state.area || f.area === state.area) &&
        (state.type === "All types" || f.type === state.type) &&
        (!term || hay.includes(term)) &&
        (!state.favOnly || state.fav.has(f.id));
      card.hidden = !ok;
      card.style.order = String(order.indexOf(f.id));
      if (ok) shown++;
    }
    empty.hidden = shown > 0;
    titleEl.textContent = state.area || "My Work";
    qa("[data-fb-area]").forEach((b) => b.classList.toggle("is-on", b.dataset.fbArea === state.area));
    q("[data-fb-type-label]").textContent = state.type;
    q("[data-fb-sort-label]").textContent = sorts.find((s) => s[0] === state.sort)![1];
    grid.classList.toggle("is-list", state.view === "list");
    qa("[data-fb-view-btn]").forEach((b) => {
      const onBtn = b.dataset.fbViewBtn === state.view;
      b.classList.toggle("is-on", onBtn);
      b.setAttribute("aria-pressed", String(onBtn));
    });
    favFilterBtn.setAttribute("aria-pressed", String(state.favOnly));
  }

  // ---- tabs and views -------------------------------------------------------------------------
  const tabName = (id: string) => byId.get(id)?.tab ?? "Untitled";
  function renderTabs() {
    tabsEl.innerHTML = state.tabs
      .map(
        (id) =>
          `<button class="fb-tab${state.active === id ? " is-active" : ""}" role="tab" title="${esc(tabName(id))}" aria-selected="${state.active === id}" data-tab="${esc(id)}"><span class="fb-tab-ico">${icon("file", 14)}</span><span class="fb-tab-label">${esc(tabName(id))}</span><span class="fb-tab-x" data-close role="button" aria-label="Close ${esc(tabName(id))}">${icon("close", 12)}</span></button>`,
      )
      .join("");
    homeBtn.classList.toggle("is-active", state.active === "home");
    tabsEl.querySelector(".is-active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  // Project suggestions for an untitled tab: a search field over the projects in list view, newest first.
  function suggestHTML() {
    const rows = [...data.files]
      .map((f, i) => ({ f, i }))
      .sort((a, b) => b.f.year - a.f.year || a.i - b.i)
      .map(({ f }) => {
        const card = root.querySelector<HTMLElement>(`.fb-card[data-id="${CSS.escape(f.id)}"]`);
        if (!card) return "";
        const c = card.cloneNode(true) as HTMLElement;
        c.hidden = false;
        c.style.order = "";
        return c.outerHTML;
      })
      .join("");
    return `<section class="fb-suggest" aria-labelledby="fb-suggest-h"><h3 id="fb-suggest-h">Project suggestions</h3>
      <div class="fb-search">${icon("search")}<input type="search" placeholder="Search my projects" aria-label="Search my projects" data-fb-suggest-q autocomplete="off" /></div>
      <div class="fb-grid is-list" data-fb-suggest-list>${rows}</div>
      <p class="fb-empty" data-fb-suggest-empty hidden>No projects match. Try another search.</p></section>`;
  }
  function viewerHTML(id: string) {
    if (!byId.has(id)) {
      return `<div class="fb-crumb"><button data-fb-gohome>My Work</button>${icon("chevronRight", 12)}<b>Untitled</b></div>
        <div class="fb-canvas fb-untitled"><div><h2>Let's make something together.</h2><p>This canvas is empty. Fill it with a project, a question or a hello.</p>
        <div class="fb-cta"><a class="is-primary" href="mailto:${esc(data.email)}">${icon("mail")}Email me</a><button data-fb-copy-email>${icon("copy")}Copy email</button><a href="${esc(data.linkedin)}" target="_blank" rel="noopener">${icon("linkedin")}LinkedIn</a></div></div></div>${suggestHTML()}`;
    }
    const f = byId.get(id)!;
    return `<div class="fb-crumb"><button data-fb-gohome>My Work</button>${icon("chevronRight", 12)}<b>${esc(f.title)}</b></div>
      <div class="fb-file"><div class="fb-canvas">${thumbOf(id)}</div><div>${detailsHTML(f)}</div></div>`;
  }
  const thumbOf = (id: string) => root.querySelector(`.fb-card[data-id="${CSS.escape(id)}"] .fb-thumb`)?.innerHTML ?? "";
  // A file's details: shared by the file view and the board's side panel (where the case is already open,
  // so the main action becomes "Open as full page").
  function detailsHTML(f: FileItem, inBoard = false) {
    const cta = inBoard
      ? `<a class="is-primary" href="${esc(f.href)}">Open as full page ${icon("external")}</a>`
      : `<a class="is-primary" href="${esc(f.href)}"${isBoard(f.href) ? ` data-fb-board="${esc(f.id)}"` : ""}>${f.id === "about" ? "Read more" : "Open case study"} ${icon("external")}</a>`;
    return `<h2>${esc(f.title)}</h2><p class="fb-lead">${esc(f.full)}</p><p class="fb-blurb">${esc(f.blurb)}</p>
      <div class="fb-chips">${f.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      ${f.stats.length ? `<div class="fb-stats">${f.stats.map((s) => `<div><b>${esc(s.n)}</b><span>${esc(s.l)}</span></div>`).join("")}</div>` : ""}
      <dl class="fb-meta">${f.meta.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      <div class="fb-cta">${cta}<button data-fb-copylink="${esc(f.href)}">${icon("copy")}Copy link</button></div>`;
  }
  // The case study page in an iframe (?embed strips the site chrome, see Base.astro), framed by FigJam's
  // floating bars: file menu and name top-left, people, Share and zoom top-right.
  const FIGJAM_LOGO = `<svg width="16" height="16" viewBox="0 0 38 57" aria-hidden="true"><path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/><path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/><path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/><path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/><path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/></svg>`;
  function boardHTML(id: string) {
    const f = byId.get(id)!;
    return `<div class="fj${DARK_BOARDS.has(id) ? " fj--dark" : ""}" data-fj>
      <iframe class="fj-frame" src="${esc(f.href)}?embed" title="${esc(f.title)} case study"></iframe>
      <div class="fj-loading" data-fj-loading><span></span>Loading board…</div>
      <div class="fj-bar fj-tl">
        <button class="fj-btn fj-menu" data-fj-menu aria-label="Main menu" aria-haspopup="menu">${FIGJAM_LOGO}${icon("chevron", 12)}</button>
        <span class="fj-sep"></span>
        <p class="fj-name"><span>Rafif Aditya /</span> <b>${esc(f.tab)}</b></p>
        ${data.versions[id]?.length ? `<button class="fj-btn fj-icon" data-fj-history aria-label="Version history" aria-pressed="false" title="Version history"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg></button>` : ""}
      </div>
      <div class="fj-bar fj-tr">
        <span class="fj-people" aria-label="People on this board">${data.tours[id] ? `<button class="fj-follow-btn" data-fj-follow style="background:#0d99ff" title="Follow Rafif: a guided tour" aria-label="Follow Rafif Aditya: guided tour">RA</button>` : `<span style="background:#0d99ff">RA</span>`}<span style="background:#f24822">RC</span><span style="background:#14ae5c">HM</span><span style="background:#9747ff">DL</span></span>
        <button class="fj-btn fj-icon" data-fj-emote aria-label="Send an emote" aria-haspopup="menu" title="Emote"><span aria-hidden="true">😊</span></button>
        <button class="fj-btn fj-icon" data-fj-comment-mode aria-label="Add comment" aria-pressed="false" title="Add comment (C)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V11a8 8 0 1 1 8 8H6z"/><path d="M12 7.5v7M8.5 11h7"/></svg></button>
        <button class="fj-btn fj-icon" data-fj-comments aria-label="Comments" aria-pressed="false" title="Comments">${icon("chat", 16)}<b class="fj-count" data-fj-count hidden></b></button>
        <button class="fj-btn fj-icon" data-fj-dev aria-label="Dev Mode" aria-pressed="false" title="Dev Mode (Shift+D)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg></button>
        <button class="fj-btn fj-present" data-fj-present title="Present (Ctrl+Alt+Enter)"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg><span>Present</span></button>
        <button class="fj-share" data-fj-share>Share</button>
        <button class="fj-btn fj-zoom" data-fj-zoom aria-haspopup="menu" aria-label="Zoom"><span data-fj-zoom-label>${Math.round(state.zoom * 100)}%</span>${icon("chevron", 12)}</button>
      </div>
      <aside class="fj-panel" data-fj-panel aria-label="File details" hidden>
        <header class="fj-panel-head"><b>File details</b><button class="fj-btn" data-fj-panel-close aria-label="Close file details">${icon("close", 14)}</button></header>
        <div class="fj-panel-body fb-file"><div class="fb-canvas">${thumbOf(id)}</div><div>${detailsHTML(f, true)}</div></div>
      </aside>
      <aside class="fj-comments fj-history" data-fj-history-panel aria-label="Version history" hidden>
        <header class="fj-panel-head"><b>Version history</b><button class="fj-btn" data-fj-history-close aria-label="Close version history">${icon("close", 14)}</button></header>
        <ol class="fj-vlist">${(data.versions[id] ?? [])
          .map(
            (v, i) => `<li><button class="fj-ver" data-fj-ver="${i}" aria-expanded="false">
              <span class="fj-vdot" aria-hidden="true"></span>
              <span class="fj-vbody"><span class="fj-vtitle"><b>${esc(v.title)}</b>${i === 0 ? `<em>Current version</em>` : ""}</span>
              <span class="fj-vmeta">${esc(v.meta)}</span>
              <span class="fj-vby"><span class="fj-vav">RA</span>Rafif Aditya</span>
              <span class="fj-vmore"><span>${esc(v.summary)}</span>${v.changes?.length ? `<ul>${v.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}<span class="fj-vgo">Show on board →</span></span></span>
            </button></li>`,
          )
          .join("")}</ol>
      </aside>
      <aside class="fj-comments fj-dev" data-fj-dev-panel aria-label="Dev Mode inspector" hidden>
        <header class="fj-panel-head"><b>Dev Mode</b><button class="fj-btn" data-fj-dev-close aria-label="Exit Dev Mode">${icon("close", 14)}</button></header>
        <div class="fj-dev-body" data-fj-dev-body></div>
      </aside>
      <aside class="fj-comments" data-fj-comments-panel aria-label="Comments" hidden>
        <header class="fj-panel-head"><b>Comments</b><button class="fj-btn" data-fj-comments-close aria-label="Close comments">${icon("close", 14)}</button></header>
        <p class="fj-cmt-note">Example questions and reactions, written for this portfolio. Your own comments stay in this browser.</p>
        <div class="fj-comments-body" data-fj-comments-list></div>
      </aside>
      <div class="fj-cursors" data-fj-cursors aria-hidden="true"></div>
      <div class="fj-emotes" data-fj-emotes aria-hidden="true"></div>
      <div class="fj-follow-frame" data-fj-follow-frame hidden>
        <p class="fj-follow-tag"><span class="fj-follow-av">RA</span>Following Rafif Aditya<button data-fj-tour-stop>Stop</button></p>
      </div>
      <div class="fj-tour-cur" data-fj-tour-cur aria-hidden="true" hidden>
        <svg width="18" height="18" viewBox="0 0 16 16"><path d="M2 1.5 13.5 7l-4.8 1.6L6.8 13.5z" fill="#0d99ff" stroke="#fff" stroke-width="1"/></svg>
        <span class="fj-tour-chat" data-fj-tour-chat>Rafif Aditya</span>
      </div>
      <div class="fj-pbar fj-tourbar" data-fj-tourbar role="toolbar" aria-label="Guided tour" hidden>
        <button data-fj-tour-prev aria-label="Previous step">${icon("chevron", 16)}</button>
        <p aria-live="polite"><b data-fj-tour-count>1 / 1</b><span data-fj-tour-say class="sr-only"></span></p>
        <button data-fj-tour-next aria-label="Next step">${icon("chevron", 16)}</button>
        <span class="fj-psep"></span>
        <button class="fj-pexit" data-fj-tour-stop>Stop <kbd>Esc</kbd></button>
      </div>
      <div class="fj-pbar" data-fj-pbar role="toolbar" aria-label="Presentation" hidden>
        <button data-fj-prev aria-label="Previous section">${icon("chevron", 16)}</button>
        <p aria-live="polite"><b data-fj-pcount>1 / 1</b><span data-fj-plabel></span></p>
        <button data-fj-next aria-label="Next section">${icon("chevron", 16)}</button>
        <span class="fj-psep"></span>
        <button class="fj-pexit" data-fj-pexit>Exit <kbd>Esc</kbd></button>
      </div>
    </div>`;
  }
  // ---- board annotations (the page draws them, see board-notes.ts) and collaborators -------------
  const boardApi = () => {
    try {
      return frame()?.contentWindow?.__board;
    } catch {
      return undefined;
    }
  };
  const commentsPanel = () => fileView.querySelector<HTMLElement>("[data-fj-comments-panel]");
  function renderComments() {
    const list = fileView.querySelector<HTMLElement>("[data-fj-comments-list]");
    const count = fileView.querySelector<HTMLElement>("[data-fj-count]");
    const threads = boardApi()?.threads() ?? [];
    const openCount = threads.filter((t) => !t.resolved).length;
    if (count) {
      count.hidden = !openCount || !state.notes;
      count.textContent = String(openCount);
    }
    if (!list) return;
    list.innerHTML = threads.length
      ? threads
          .map((t) => {
            const [first, ...rest] = t.messages;
            return `<button class="fj-cmt${t.resolved ? " is-resolved" : ""}" data-fj-thread="${esc(t.id)}">
              <span class="fj-cmt-av" style="background:${first.color}">${esc(first.initials)}</span>
              <span class="fj-cmt-body"><span class="fj-cmt-meta"><b>${esc(first.name)}</b><span>${esc([first.ago || (first.initials === "Y" ? "" : "Example"), t.resolved ? "Resolved" : ""].filter(Boolean).join(" · "))}</span></span>
              <span class="fj-cmt-text">${esc(first.text)}</span>
              ${rest.map((m) => `<span class="fj-cmt-reply"><b>${esc(m.name)}</b> ${esc(m.text)}</span>`).join("")}</span></button>`;
          })
          .join("")
      : `<p class="fj-cmt-empty">No comments on this board.</p>`;
  }
  // Version history (right side, like Figma's): one of it and Comments is open at a time.
  const historyPanel = () => fileView.querySelector<HTMLElement>("[data-fj-history-panel]");
  const toggleHistory = (open = historyPanel()?.hidden ?? false) => {
    const p = historyPanel();
    if (!p) return;
    if (open && commentsPanel() && !commentsPanel()!.hidden) toggleComments(false);
    if (open && dev.on) dev.exit();
    p.hidden = !open;
    fileView.querySelector("[data-fj-history]")?.setAttribute("aria-pressed", String(open));
    if (open) p.querySelector<HTMLElement>("[data-fj-history-close]")?.focus();
  };
  const pickVersion = (i: number) => {
    const p = historyPanel();
    const v = data.versions[state.active]?.[i];
    if (!p || !v) return;
    p.querySelectorAll<HTMLElement>("[data-fj-ver]").forEach((b) => {
      const on = Number(b.dataset.fjVer) === i;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-expanded", String(on));
    });
    try {
      const target = frame()?.contentDocument?.getElementById(v.at);
      target?.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
    } catch {}
  };
  const toggleComments = (open = commentsPanel()?.hidden ?? false) => {
    const p = commentsPanel();
    if (!p) return;
    if (open && historyPanel() && !historyPanel()!.hidden) toggleHistory(false);
    if (open && dev.on) dev.exit();
    p.hidden = !open;
    fileView.querySelector("[data-fj-comments]")?.setAttribute("aria-pressed", String(open));
    if (open) {
      renderComments();
      p.querySelector<HTMLElement>("[data-fj-comments-close]")?.focus();
    }
  };
  function setNotes(on: boolean) {
    state.notes = on;
    store.set("fj-notes", on ? "on" : "off");
    boardApi()?.setVisible(on);
    renderComments();
    boardFx.cursors(on);
  }
  on(window, "message", (e: MessageEvent) => {
    if (e.origin !== location.origin) return;
    if (e.data?.type === "board-notes") renderComments();
    if (e.data?.type === "board-dev-exit") dev.exit();
    if (e.data?.type === "board-comment-mode") {
      fileView.querySelector("[data-fj-comment-mode]")?.setAttribute("aria-pressed", String(!!e.data.on));
      if (e.data.on) {
        if (!state.notes) setNotes(true);
        frame()?.contentWindow?.focus(); // so the next click and Esc reach the page
        toast("Click anywhere to leave a comment · Esc to cancel");
      }
    }
  });

  // Collaborators wander over the board and chat (FigJam cursor chat), with lines from annotations.ts.
  // Emotes float up from the bottom. Both stop when the tab changes.
  const boardFx = (() => {
    let timers: number[] = [];
    let frameId = 0;
    const stop = () => {
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(frameId);
      frameId = 0;
    };
    function cursors(on: boolean) {
      stop();
      const layer = fileView.querySelector<HTMLElement>("[data-fj-cursors]");
      if (!layer) return;
      layer.innerHTML = "";
      if (!on || reduce() || lite()) return;
      let notes: { chat: { by: string; text: string }[]; people: Record<string, { name: string; color: string }> } | null = null;
      try {
        notes = JSON.parse(frame()?.contentDocument?.getElementById("board-notes")?.textContent || "null");
      } catch {}
      if (!notes?.chat.length) return;
      const by = [...new Set(notes.chat.map((c) => c.by))];
      const cs = by.map((w) => {
        const p = notes!.people[w];
        const el = document.createElement("div");
        el.className = "fb-cur fj-cur";
        el.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 1.5 13.5 7l-4.8 1.6L6.8 13.5z" fill="${p.color}" stroke="#fff" stroke-width="1"/></svg><span style="background:${p.color}">${esc(p.name)}</span>`;
        layer.append(el);
        return { w, el, label: el.querySelector("span")!, name: p.name, x: rand(200, 700), y: rand(120, 400), tx: 0, ty: 0, wait: rand(0.3, 2) };
      });
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const box = layer.getBoundingClientRect();
        for (const c of cs) {
          c.wait -= dt;
          if (c.wait <= 0) {
            c.tx = rand(80, Math.max(81, box.width - 260));
            c.ty = rand(90, Math.max(91, box.height - 120));
            c.wait = rand(2.5, 5);
          }
          const k = 1 - Math.exp(-dt * 1.8);
          c.x += (c.tx - c.x) * k;
          c.y += (c.ty - c.y) * k;
          c.el.style.transform = `translate(${c.x}px, ${c.y}px)`;
        }
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
      // Cursor chat: one line at a time, typed out, then back to the name label.
      let i = 0;
      const say = () => {
        const line = notes!.chat[i++ % notes!.chat.length];
        const c = cs.find((x) => x.w === line.by)!;
        c.el.classList.add("is-chatting");
        let n = 0;
        const type = () => {
          c.label.textContent = line.text.slice(0, ++n);
          if (n < line.text.length) timers.push(window.setTimeout(type, 45));
          else
            timers.push(
              window.setTimeout(() => {
                c.el.classList.remove("is-chatting");
                c.label.textContent = c.name;
                timers.push(window.setTimeout(say, rand(2500, 5000)));
              }, 3200),
            );
        };
        type();
      };
      timers.push(window.setTimeout(say, 1800));
    }
    function emote(e: string) {
      const layer = fileView.querySelector<HTMLElement>("[data-fj-emotes]");
      if (!layer) return;
      const n = reduce() ? 1 : 5;
      for (let k = 0; k < n; k++) {
        const el = document.createElement("span");
        el.className = "fj-emote";
        el.textContent = e;
        el.style.left = `${rand(35, 65)}%`;
        el.style.animationDelay = `${k * 120}ms`;
        el.style.setProperty("--drift", `${rand(-60, 60)}px`);
        layer.append(el);
        el.addEventListener("animationend", () => el.remove());
      }
    }
    return { cursors, emote, stop };
  })();
  stopBoardFx = boardFx.stop;

  // ---- Spotlight: follow Rafif through the case (FigJam's "following" a presenter) ---------------
  // His cursor moves to each section's heading and explains it in cursor chat. Steps advance on their own
  // after a reading pause, or with the bar / arrow keys; scrolling the board yourself stops following.
  const tour = (() => {
    let active = false;
    let i = 0;
    let timers: number[] = [];
    let unbind: (() => void) | null = null;
    const steps = () => data.tours[state.active] ?? [];
    const el = <T extends HTMLElement = HTMLElement>(sel: string) => fileView.querySelector<T>(sel);
    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    // Where to point: the section's heading (or the page's first heading), in board coordinates.
    const pointAt = (at: string) => {
      const ifr = frame();
      const doc = ifr?.contentDocument;
      if (!ifr || !doc) return null;
      const sec = at ? doc.getElementById(at) : doc.querySelector<HTMLElement>("main section");
      const h = sec?.querySelector<HTMLElement>("h1, h2") ?? sec;
      if (!h) return null;
      const r = h.getBoundingClientRect();
      const z = Number(doc.documentElement.style.zoom || 1);
      const box = el("[data-fj]")!.getBoundingClientRect();
      const f = ifr.getBoundingClientRect();
      // Text width rather than the block's, so the cursor lands just after the words.
      const range = doc.createRange();
      range.selectNodeContents(h);
      const tr = range.getBoundingClientRect();
      const right = Math.min(tr.right || r.right, r.right) * z;
      return {
        x: Math.min(f.left - box.left + right + 14, box.width - 300),
        y: Math.min(Math.max(80, f.top - box.top + (r.top + r.height / 2) * z), box.height - 160),
      };
    };
    const say = (text: string) => {
      const chat = el("[data-fj-tour-chat]")!;
      const cur = el("[data-fj-tour-cur]")!;
      cur.classList.add("is-chatting");
      if (reduce()) {
        chat.textContent = text;
        return;
      }
      let n = 0;
      const type = () => {
        chat.textContent = text.slice(0, ++n);
        if (n < text.length) later(type, 28);
      };
      type();
    };
    function show(k: number) {
      const list = steps();
      if (!active || !list.length) return;
      i = Math.max(0, Math.min(list.length - 1, k));
      clear();
      const step = list[i];
      el("[data-fj-tour-count]")!.textContent = `${i + 1} / ${list.length}`;
      el("[data-fj-tour-say]")!.textContent = step.say;
      el<HTMLButtonElement>("[data-fj-tour-prev]")!.disabled = i === 0;
      el<HTMLButtonElement>("[data-fj-tour-next]")!.disabled = i === list.length - 1;
      const cur = el("[data-fj-tour-cur]")!;
      cur.classList.remove("is-chatting");
      el("[data-fj-tour-chat]")!.textContent = "Rafif Aditya";
      // Scroll the board to the section (marked as ours, so it doesn't count as the visitor scrolling).
      const doc = frame()?.contentDocument;
      const win = frame()?.contentWindow;
      ignoreScroll = true;
      if (step.at) doc?.getElementById(step.at)?.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
      else win?.scrollTo({ top: 0, behavior: reduce() ? "auto" : "smooth" });
      // Wait for the scroll to settle (smooth scrolls over long pages take a while) before pointing.
      let lastY = -1;
      let still = 0;
      const settle = (tries: number) => {
        const y = win?.scrollY ?? 0;
        still = y === lastY ? still + 1 : 0;
        lastY = y;
        if (still < 2 && tries < 25) return later(() => settle(tries + 1), 80);
        ignoreScroll = false;
        const p = pointAt(step.at);
        if (p) cur.style.transform = `translate(${p.x}px, ${p.y}px)`;
        later(() => say(step.say), reduce() ? 0 : 700);
        // Reading time, then on to the next step; the last step ends the tour.
        later(() => (i < list.length - 1 ? show(i + 1) : stop()), 2600 + step.say.length * 55);
      };
      later(() => settle(0), 120);
    }
    let ignoreScroll = false;
    function start() {
      const ifr = frame();
      const win = ifr?.contentWindow;
      if (active || !win || !steps().length) return;
      if (present.on) present.exit();
      if (dev.on) dev.exit();
      active = true;
      closeMenu();
      el("[data-fj]")!.classList.add("is-following");
      el("[data-fj-follow-frame]")!.hidden = false;
      el("[data-fj-tourbar]")!.hidden = false;
      const cur = el("[data-fj-tour-cur]")!;
      cur.hidden = false;
      cur.style.transform = `translate(${el("[data-fj]")!.clientWidth / 2}px, 120px)`;
      boardFx.cursors(false);
      // Taking over the board yourself (wheel, touch, keys) stops following, as in FigJam.
      const takeOver = (e: Event) => {
        if (e.type === "keydown") {
          const k = (e as KeyboardEvent).key;
          if (k === "ArrowRight" || k === "ArrowLeft" || k === "Escape") return;
        }
        if (!ignoreScroll) stop();
      };
      const keys = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") show(i + 1);
        else if (e.key === "ArrowLeft") show(i - 1);
        else if (e.key === "Escape") stop();
        else return;
        e.preventDefault();
        e.stopPropagation();
      };
      win.addEventListener("wheel", takeOver, { passive: true });
      win.addEventListener("touchstart", takeOver, { passive: true });
      win.addEventListener("keydown", takeOver);
      win.addEventListener("keydown", keys, true);
      window.addEventListener("keydown", keys, true);
      unbind = () => {
        win.removeEventListener("wheel", takeOver);
        win.removeEventListener("touchstart", takeOver);
        win.removeEventListener("keydown", takeOver);
        win.removeEventListener("keydown", keys, true);
        window.removeEventListener("keydown", keys, true);
      };
      show(0);
    }
    function stop() {
      if (!active) return;
      active = false;
      clear();
      unbind?.();
      unbind = null;
      const box = el("[data-fj]");
      box?.classList.remove("is-following");
      for (const s of ["[data-fj-follow-frame]", "[data-fj-tourbar]", "[data-fj-tour-cur]"]) {
        const n = el(s);
        if (n) n.hidden = true;
      }
      boardFx.cursors(state.notes);
    }
    return { start, stop, go: (d: number) => show(i + d) };
  })();


  // ---- Present mode: the case full screen, one section per step, FigJam chrome and annotations hidden ----
  const present = (() => {
    let active = false;
    let unbind: (() => void) | null = null;
    const fj = () => fileView.querySelector<HTMLElement>("[data-fj]");
    const sections = () => {
      try {
        return frame()?.contentWindow?.__boardSections;
      } catch {
        return undefined;
      }
    };
    const render = () => {
      const api = sections();
      if (!api) return;
      const slides = api.slides();
      const i = api.current();
      const count = fileView.querySelector("[data-fj-pcount]");
      const label = fileView.querySelector("[data-fj-plabel]");
      if (count) count.textContent = `${i + 1} / ${slides.length}`;
      if (label) label.textContent = slides[i]?.label ?? "";
      fileView.querySelector<HTMLButtonElement>("[data-fj-prev]")!.disabled = i === 0;
      fileView.querySelector<HTMLButtonElement>("[data-fj-next]")!.disabled = i === slides.length - 1;
    };
    const step = (d: number | "first" | "last") => {
      const api = sections();
      if (!api) return;
      const n = api.slides().length;
      const i = d === "first" ? 0 : d === "last" ? n - 1 : Math.min(n - 1, Math.max(0, api.current() + d));
      api.go(i);
    };
    const keys = (e: KeyboardEvent) => {
      if (!active) return;
      const k = e.key;
      if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.shiftKey)) step(1);
      else if (k === "ArrowLeft" || k === "PageUp" || (k === " " && e.shiftKey)) step(-1);
      else if (k === "Home") step("first");
      else if (k === "End") step("last");
      else if (k === "Escape") exit();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    function enter() {
      if (dev.on) dev.exit();
      const el = fj();
      const win = frame()?.contentWindow;
      if (!el || !win || active || !sections()) return;
      active = true;
      el.classList.add("is-presenting");
      win.document.documentElement.classList.add("present");
      boardApi()?.setVisible(false);
      sections()!.setVisible(false);
      boardFx.cursors(false);
      closeMenu();
      fileView.querySelector<HTMLElement>("[data-fj-pbar]")!.hidden = false;
      el.requestFullscreen?.().catch(() => {}); // falls back to filling the window
      const onScroll = () => render();
      win.addEventListener("scroll", onScroll, { passive: true });
      win.addEventListener("keydown", keys, true);
      window.addEventListener("keydown", keys, true);
      unbind = () => {
        win.removeEventListener("scroll", onScroll);
        win.removeEventListener("keydown", keys, true);
        window.removeEventListener("keydown", keys, true);
      };
      render();
      win.focus();
    }
    function exit() {
      if (!active) return;
      active = false;
      unbind?.();
      unbind = null;
      const el = fj();
      el?.classList.remove("is-presenting");
      try {
        frame()?.contentDocument?.documentElement.classList.remove("present");
      } catch {}
      boardApi()?.setVisible(state.notes);
      sections()?.setVisible(true);
      sections()?.layout();
      boardFx.cursors(state.notes);
      const bar = fileView.querySelector<HTMLElement>("[data-fj-pbar]");
      if (bar) bar.hidden = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      fileView.querySelector<HTMLElement>("[data-fj-present]")?.focus();
    }
    // Leaving full screen with the browser's own Esc ends the presentation too.
    on(document, "fullscreenchange", () => {
      if (active && !document.fullscreenElement) exit();
    });
    return {
      enter,
      exit,
      step,
      get on() {
        return active;
      },
    };
  })();
  const panel = () => fileView.querySelector<HTMLElement>("[data-fj-panel]");
  const togglePanel = (open = panel()?.hidden ?? false) => {
    const p = panel();
    if (!p) return;
    p.hidden = !open;
    if (open) p.querySelector<HTMLElement>("[data-fj-panel-close]")?.focus();
  };
  const ZOOMS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5];
  const frame = () => fileView.querySelector<HTMLIFrameElement>(".fj-frame");
  function setZoom(z: number) {
    state.zoom = Math.min(ZOOMS.at(-1)!, Math.max(ZOOMS[0], z));
    try {
      const doc = frame()?.contentDocument;
      if (doc) doc.documentElement.style.zoom = String(state.zoom);
    } catch {}
    boardApi()?.layout();
    const label = fileView.querySelector("[data-fj-zoom-label]");
    if (label) label.textContent = `${Math.round(state.zoom * 100)}%`;
  }
  // Zoom to fit: the page's 1280px content column plus its gutters fills the board's width.
  const zoomFit = () => setZoom((frame()?.clientWidth ?? 1360) / 1360);
  const zoomStep = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((z) => z >= state.zoom - 0.001);
    setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + dir))]);
  };
  function activate(id: string) {
    state.active = id;
    const home = id === "home";
    const board = state.board.has(id);
    homeView.hidden = !home;
    fileView.hidden = home;
    root.classList.toggle("is-board", board);
    dev.exit();
    present.exit();
    tour.stop();
    boardFx.stop();
    if (!home) {
      fileView.innerHTML = board ? boardHTML(id) : viewerHTML(id);
      fileView.scrollTop = 0;
      const ifr = frame();
      if (ifr)
        on(ifr, "load", () => {
          setZoom(state.zoom);
          fileView.querySelector("[data-fj-loading]")?.remove();
          boardApi()?.setVisible(state.notes);
          try {
            const win = ifr.contentWindow!;
            const doc = win.document;
            // Ctrl/Cmd + scroll zooms the board (not the browser), as on Figma's canvas.
            win.addEventListener(
              "wheel",
              (e: WheelEvent) => {
                if (!(e.ctrlKey || e.metaKey)) return;
                e.preventDefault();
                setZoom(state.zoom * Math.exp(-e.deltaY * 0.0015));
              },
              { passive: false },
            );
            // Space + drag pans (hand tool). The click that ends a drag is swallowed.
            let space = false;
            let panning = false;
            let moved = false;
            let px = 0;
            let py = 0;
            const html = doc.documentElement;
            const field = (t: EventTarget | null) => /^(input|textarea|select)$/i.test((t as HTMLElement)?.tagName ?? "");
            win.addEventListener("keydown", (e: KeyboardEvent) => {
              if (e.code !== "Space" || field(e.target) || present.on || e.ctrlKey || e.metaKey || e.altKey) return;
              e.preventDefault();
              space = true;
              html.classList.add("fj-pan");
            });
            const endSpace = () => {
              space = false;
              panning = false;
              html.classList.remove("fj-pan", "fj-panning");
            };
            win.addEventListener("keyup", (e: KeyboardEvent) => e.code === "Space" && endSpace());
            win.addEventListener("blur", endSpace);
            doc.addEventListener(
              "pointerdown",
              (e: PointerEvent) => {
                if (!space || e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                panning = true;
                moved = false;
                px = e.clientX;
                py = e.clientY;
                html.classList.add("fj-panning");
              },
              true,
            );
            doc.addEventListener("pointermove", (e: PointerEvent) => {
              if (!panning) return;
              if (e.buttons === 0) return endSpace();
              win.scrollBy(px - e.clientX, py - e.clientY);
              px = e.clientX;
              py = e.clientY;
              moved = true;
            });
            doc.addEventListener("pointerup", () => {
              panning = false;
              html.classList.remove("fj-panning");
            });
            doc.addEventListener(
              "click",
              (e) => {
                if (!moved) return;
                moved = false;
                e.preventDefault();
                e.stopPropagation();
              },
              true,
            );
          } catch {}
          try {
            ifr.contentWindow?.addEventListener("keydown", (e: KeyboardEvent) => {
              const inField = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? "");
              if (e.shiftKey && !inField && !e.metaKey && !e.ctrlKey && !e.altKey && (e.code === "Digit1" || e.code === "Digit0")) {
                e.preventDefault();
                if (e.code === "Digit1") zoomFit();
                else setZoom(1);
                return;
              }
              if (e.shiftKey && !inField && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "d") {
                e.preventDefault();
                if (dev.on) dev.exit();
                else dev.enter();
                return;
              }
              if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "k" || e.key === "/")) {
                e.preventDefault();
                quick.open();
              }
            });
          } catch {}
          renderComments();
          boardFx.cursors(state.notes);
          if (state.notes && boardApi()?.tight()) toast("Zoom out (Ctrl −) to see the sticky notes");
          if (pendingThread) {
            const t = pendingThread;
            pendingThread = null;
            if (!state.notes) setNotes(true);
            setTimeout(() => boardApi()?.focus(t), 500); // after pins are placed
          }
        });
    }
    renderTabs();
    syncCursors();
  }
  // Open a case study straight as a board (used by notifications), optionally focusing a comment thread.
  let pendingThread: string | null = null;
  const openBoard = (id: string, thread?: string) => {
    pendingThread = thread ?? null;
    state.board.add(id);
    openFile(id);
  };
  // Recents: the last few files opened, newest first, remembered in this browser.
  let recent: string[] = [];
  try {
    recent = (JSON.parse(store.get("fb-recent") || "[]") as string[]).filter((id) => byId.has(id));
  } catch {}
  const renderRecents = () => {
    const box = q("[data-fb-recents]");
    box.hidden = recent.length === 0;
    q("[data-fb-recents-list]").innerHTML = recent
      .slice(0, 3)
      .map((id) => `<a class="fb-item" href="${esc(byId.get(id)!.href)}" data-fb-open="${esc(id)}">${icon("file")}<span>${esc(byId.get(id)!.title)}</span></a>`)
      .join("");
  };
  const openFile = (id: string) => {
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 5);
    store.set("fb-recent", JSON.stringify(recent));
    renderRecents();
    if (!state.tabs.includes(id)) state.tabs.push(id);
    activate(id);
    closeDrawer();
  };
  const closeTab = (id: string) => {
    const i = state.tabs.indexOf(id);
    if (i < 0) return;
    state.tabs.splice(i, 1);
    state.board.delete(id);
    if (state.active === id) activate(state.tabs[i - 1] ?? state.tabs[i] ?? "home");
    else renderTabs();
  };
  const newTab = () => {
    const id = `new-${++state.untitled}`;
    state.tabs.push(id);
    activate(id);
  };
  const goHome = () => activate("home");

  on(tabsEl, "click", (e: MouseEvent) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-tab]");
    if (!tab) return;
    if ((e.target as HTMLElement).closest("[data-close]")) closeTab(tab.dataset.tab!);
    else activate(tab.dataset.tab!);
  });
  on(tabsEl, "auxclick", (e: MouseEvent) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-tab]");
    if (tab && e.button === 1) closeTab(tab.dataset.tab!);
  });
  on(homeBtn, "click", goHome);
  on(q("[data-fb-newtab]"), "click", newTab);
  on(fileView, "input", (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.matches?.("[data-fb-suggest-q]")) return;
    const term = input.value.trim().toLowerCase();
    let shown = 0;
    fileView.querySelectorAll<HTMLElement>("[data-fb-suggest-list] .fb-card").forEach((card) => {
      const f = byId.get(card.dataset.id!)!;
      const ok = !term || [f.title, f.full, f.sub, f.tags.join(" "), f.area, f.type].join(" ").toLowerCase().includes(term);
      card.hidden = !ok;
      if (ok) shown++;
    });
    const none = fileView.querySelector<HTMLElement>("[data-fb-suggest-empty]");
    if (none) none.hidden = shown > 0;
  });
  on(fileView, "click", (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    // "Open case study" keeps you in this tab and turns it into the board (modifier-clicks still follow the link).
    const boardLink = t.closest<HTMLElement>("[data-fb-board]");
    if (boardLink && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      e.preventDefault();
      state.board.add(boardLink.dataset.fbBoard!);
      activate(boardLink.dataset.fbBoard!);
      return;
    }
    if (t.closest("[data-fj-menu]")) {
      const f = byId.get(state.active)!;
      openMenu(
        [
          { label: "Back to files", icon: "home", run: goHome },
          { label: panel()?.hidden === false ? "Hide file details" : "File details", icon: "file", run: () => togglePanel() },
          { label: "Open as full page", icon: "external", href: f.href },
          { sep: true },
          ...(data.tours[f.id] ? [{ label: "Follow Rafif (guided tour)", run: () => tour.start() }] : []),
          { label: "Dev Mode", run: () => dev.enter() },
          { label: "Show annotations", checked: state.notes, run: () => setNotes(!state.notes) },
          { label: "Comments", run: () => toggleComments(true) },
          ...(data.versions[f.id]?.length ? [{ label: "Version history", run: () => toggleHistory(true) }] : []),
          { sep: true },
          { label: "Copy link", icon: "copy", run: () => copy(abs(f.href), "Link copied") },
        ],
        t.closest<HTMLElement>("[data-fj-menu]")!,
      );
    }
    if (t.closest("[data-fj-follow]")) tour.start();
    if (t.closest("[data-fj-tour-stop]")) tour.stop();
    if (t.closest("[data-fj-tour-prev]")) tour.go(-1);
    if (t.closest("[data-fj-tour-next]")) tour.go(1);
    if (t.closest("[data-fj-present]")) present.enter();
    if (t.closest("[data-fj-pexit]")) present.exit();
    if (t.closest("[data-fj-prev]")) present.step(-1);
    if (t.closest("[data-fj-next]")) present.step(1);
    if (t.closest("[data-fj-history]")) toggleHistory();
    if (t.closest("[data-fj-history-close]")) {
      toggleHistory(false);
      fileView.querySelector<HTMLElement>("[data-fj-history]")?.focus();
    }
    const ver = t.closest<HTMLElement>("[data-fj-ver]");
    if (ver) pickVersion(Number(ver.dataset.fjVer));
    if (t.closest("[data-fj-comment-mode]")) boardApi()?.commentMode();
    if (t.closest("[data-fj-comments]")) toggleComments();
    if (t.closest("[data-fj-comments-close]")) {
      toggleComments(false);
      fileView.querySelector<HTMLElement>("[data-fj-comments]")?.focus();
    }
    const th = t.closest<HTMLElement>("[data-fj-thread]");
    if (th) {
      if (!state.notes) setNotes(true);
      boardApi()?.focus(th.dataset.fjThread!);
    }
    if (t.closest("[data-fj-emote]"))
      openMenu(
        ["👍", "❤️", "🔥", "🎉", "👀", "😂"].map((e) => ({ label: e, run: () => boardFx.emote(e) })),
        t.closest<HTMLElement>("[data-fj-emote]")!,
        { variant: "emote" },
      );
    if (t.closest("[data-fj-panel-close]")) {
      togglePanel(false);
      fileView.querySelector<HTMLElement>("[data-fj-menu]")?.focus();
    }
    if (t.closest("[data-fj-share]")) {
      const f = byId.get(state.active)!;
      share.open(abs(f.href), f.title, t.closest<HTMLElement>("[data-fj-share]")!);
    }
    if (t.closest("[data-fj-zoom]")) {
      openMenu(
        [
          { label: "Zoom in", kbd: "Ctrl +", run: () => zoomStep(1) },
          { label: "Zoom out", kbd: "Ctrl −", run: () => zoomStep(-1) },
          { label: "Zoom to 100%", kbd: "Shift 0", run: () => setZoom(1) },
          { label: "Zoom to fit", kbd: "Shift 1", run: zoomFit },
          { sep: true },
          ...[0.5, 0.75, 1, 1.25, 1.5].map((z) => ({ label: `${z * 100}%`, checked: Math.abs(state.zoom - z) < 0.001, run: () => setZoom(z) })),
        ],
        t.closest<HTMLElement>("[data-fj-zoom]")!,
        { right: true },
      );
    }
    if (t.closest("[data-fb-gohome]")) goHome();
    const cl = t.closest<HTMLElement>("[data-fb-copylink]");
    if (cl) copy(abs(cl.dataset.fbCopylink!), "Link copied");
    if (t.closest("[data-fb-copy-email]")) copy(data.email, "Email copied");
  });

  // ---- opening files: cards and sidebar items ----------------------------------------------------
  on(root, "click", (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    const star = t.closest<HTMLElement>("[data-fb-star]");
    if (star) {
      toggleFav(star.dataset.fbStar!);
      return;
    }
    const link = t.closest<HTMLAnchorElement>("[data-fb-open]");
    if (link && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) {
      e.preventDefault();
      openFile(link.dataset.fbOpen!);
      return;
    }
    const collapse = t.closest("[data-fb-collapse]");
    if (collapse) {
      e.stopPropagation();
      collapse.closest(".fb-team")?.classList.toggle("is-collapsed");
      return;
    }
    const area = t.closest<HTMLElement>("[data-fb-area]");
    if (area) {
      state.area = state.area === area.dataset.fbArea ? "" : area.dataset.fbArea!;
      area.closest(".fb-team")?.classList.remove("is-collapsed");
      applyFilters();
      goHome();
      if (window.innerWidth < 1024) closeDrawer();
    }
  });
  on(grid, "dblclick", (e: MouseEvent) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".fb-card");
    if (card) navigate(byId.get(card.dataset.id!)!.href);
  });

  // ---- sidebar drawer (narrow screens) -----------------------------------------------------------
  const closeDrawer = () => root.classList.remove("is-drawer");
  on(q("[data-fb-burger]"), "click", () => root.classList.toggle("is-drawer"));
  on(q("[data-fb-scrim]"), "click", closeDrawer);
  on(q("[data-fb-collapse-social]"), "click", (e: MouseEvent) => {
    const b = e.currentTarget as HTMLElement;
    const open = b.getAttribute("aria-expanded") === "false";
    b.setAttribute("aria-expanded", String(open));
    q("[data-fb-social]").hidden = !open;
  });

  // ---- search ---------------------------------------------------------------------------------
  on(search, "input", () => {
    state.search = search.value;
    if (state.active !== "home") goHome();
    applyFilters();
  });
  on(search, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      search.value = "";
      state.search = "";
      applyFilters();
      search.blur();
    }
  });
  const focusSearch = () => {
    if (window.innerWidth < 1024) root.classList.add("is-drawer");
    search.focus();
    search.select();
  };
  on(document, "keydown", (e: KeyboardEvent) => {
    if (profileDlg.open || quickDlg.open || shareDlg.open) return; // dialogs handle their own keys (Esc closes them)
    if (state.board.has(state.active) && (e.ctrlKey || e.metaKey) && e.altKey && e.key === "Enter") {
      e.preventDefault();
      if (present.on) present.exit();
      else present.enter();
      return;
    }
    const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? "");
    if (state.board.has(state.active) && (e.metaKey || e.ctrlKey) && ["=", "+", "-", "0"].includes(e.key)) {
      e.preventDefault(); // board zoom instead of the browser's
      if (e.key === "0") setZoom(1);
      else zoomStep(e.key === "-" ? -1 : 1);
      return;
    }
    if (state.board.has(state.active) && e.shiftKey && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.code === "Digit1" || e.code === "Digit0")) {
      e.preventDefault();
      if (e.code === "Digit1") zoomFit();
      else setZoom(1);
    } else if (state.board.has(state.active) && e.shiftKey && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      if (dev.on) dev.exit();
      else dev.enter();
    } else if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "k" || e.key === "/")) {
      e.preventDefault();
      quick.open();
    } else if ((e.key === "c" || e.key === "C") && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && state.board.has(state.active)) {
      e.preventDefault();
      boardApi()?.commentMode();
    } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      focusSearch();
    } else if (e.key === "Escape") {
      if (!menuEl.hidden) closeMenu();
      else if (dev.on) dev.exit();
      else if (panel() && !panel()!.hidden) togglePanel(false);
      else if (commentsPanel() && !commentsPanel()!.hidden) toggleComments(false);
      else if (historyPanel() && !historyPanel()!.hidden) toggleHistory(false);
      else if (root.classList.contains("is-drawer")) closeDrawer();
      else if (state.active !== "home" && !typing) goHome();
    }
  });

  // ---- toolbar: filters, sort, view toggle, favourites -------------------------------------------
  on(q("[data-fb-type]"), "click", (e: MouseEvent) =>
    openMenu(
      types.map((t) => ({ label: t, checked: t === state.type, run: () => ((state.type = t), applyFilters()) })),
      e.currentTarget as HTMLElement,
    ),
  );
  on(q("[data-fb-sort]"), "click", (e: MouseEvent) =>
    openMenu(
      sorts.map(([k, l]) => ({ label: l, checked: k === state.sort, run: () => ((state.sort = k), applyFilters()) })),
      e.currentTarget as HTMLElement,
    ),
  );
  qa("[data-fb-view-btn]").forEach((b) =>
    on(b, "click", () => {
      state.view = b.dataset.fbViewBtn!;
      applyFilters();
    }),
  );
  on(favFilterBtn, "click", () => {
    if (!state.favOnly && state.fav.size === 0) return toast("Star a file first (hover a card, tap the star)");
    state.favOnly = !state.favOnly;
    applyFilters();
    goHome();
  });

  // ---- top bar and floating menus ----------------------------------------------------------------
  on(q("[data-fb-talk]"), "click", (e: MouseEvent) =>
    openMenu(
      [
        { label: "Send an email", icon: "mail", href: `mailto:${data.email}` },
        { label: "Copy email address", icon: "copy", run: () => copy(data.email, "Email copied") },
        { sep: true },
        { label: "LinkedIn", icon: "linkedin", href: data.linkedin },
        { label: "Behance", icon: "behance", href: data.behance },
      ],
      e.currentTarget as HTMLElement,
      { right: true },
    ),
  );
  // ---- notifications: the bell lists comment threads; opening one goes to it on its board --------------
  const seen = new Set<string>();
  try {
    (JSON.parse(store.get("fb-seen") || "[]") as string[]).forEach((x) => seen.add(x));
  } catch {}
  const renderBell = () => {
    const n = data.inbox.filter((x) => !seen.has(x.thread)).length;
    const b = q("[data-fb-bell-n]");
    b.hidden = n === 0;
    b.textContent = n > 9 ? "9+" : String(n);
  };
  on(q("[data-fb-bell]"), "click", (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const items: MenuItem[] = [{ html: `<p class="fb-inbox-head">Notifications<small>Example questions, written for this portfolio</small></p>` }];
    if (!data.inbox.length) items.push({ html: `<p class="fb-inbox-empty">Nothing new.</p>` });
    for (const n of data.inbox) {
      items.push({
        html: `<span class="fb-nt${seen.has(n.thread) ? "" : " is-new"}"><span class="fb-nt-av" style="background:${esc(n.color)}">${esc(n.initials)}</span><span class="fb-nt-text"><span><b>${esc(n.name)}</b> (example) on <b>${esc(n.title)}</b></span><small>${esc(n.text)}</small></span></span>`,
        run: () => openBoard(n.file, n.thread),
      });
    }
    openMenu(items, btn, { right: true, variant: "inbox" });
    data.inbox.forEach((n) => seen.add(n.thread)); // shown now, so they count as seen
    store.set("fb-seen", JSON.stringify([...seen]));
    renderBell();
  });
  on(q("[data-fb-share]"), "click", (e: MouseEvent) => share.open(location.href, "Rafif Aditya's portfolio", e.currentTarget as HTMLElement));
  const settingsMenu = (): MenuItem[] => [
    { label: "Show collaborators", checked: state.collab, run: () => ((state.collab = !state.collab), store.set("fb-collab", state.collab ? "on" : "off"), syncCursors()) },
    { label: state.view === "grid" ? "Switch to list view" : "Switch to grid view", run: () => ((state.view = state.view === "grid" ? "list" : "grid"), applyFilters()) },
    {
      label: "Reset filters",
      run: () => {
        Object.assign(state, { area: "", type: "All types", sort: "recent", search: "", favOnly: false });
        search.value = "";
        applyFilters();
        goHome();
      },
    },
  ];
  on(q("[data-fb-settings]"), "click", (e: MouseEvent) => openMenu(settingsMenu(), e.currentTarget as HTMLElement, { right: true }));
  // ---- account settings modal (native <dialog>: focus trap, Esc and top layer for free) -----------
  const ptabs = qa("[data-fb-ptab]");
  const ppanels = qa("[data-fb-ppanel]");
  let profileReturn: HTMLElement | null = null;
  const showPtab = (i: number, focus = false) => {
    ptabs.forEach((t, k) => {
      t.setAttribute("aria-selected", String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    ppanels.forEach((p, k) => (p.hidden = k !== i));
    q(".fb-modal-body").scrollTop = 0;
    if (focus) ptabs[i].focus();
  };
  function openProfile(from: HTMLElement) {
    if (profileDlg.open) return;
    profileReturn = from;
    showPtab(0);
    profileDlg.showModal();
  }
  ptabs.forEach((t, i) => on(t, "click", () => showPtab(i)));
  on(q(".fb-modal-tabs"), "keydown", (e: KeyboardEvent) => {
    const cur = ptabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const next = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: ptabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    showPtab((next + ptabs.length) % ptabs.length, true);
  });
  on(q("[data-fb-profile-close]"), "click", () => profileDlg.close());
  // Clicking the dimmed backdrop (the dialog element itself, outside its content) closes it.
  on(profileDlg, "click", (e: MouseEvent) => {
    if (e.target === profileDlg) profileDlg.close();
  });
  on(profileDlg, "close", () => profileReturn?.focus());
  // The toast sits under the modal's top layer, so the button itself says "Copied".
  qa("[data-fb-copy]").forEach((b) =>
    on(b, "click", () => {
      copy(b.dataset.fbCopy!, "Email copied");
      b.textContent = "Copied";
      setTimeout(() => (b.textContent = "Copy"), 1500);
    }),
  );

  // Account menu, laid out like Figma's: who you are, then the workspace you're in, then account actions.
  on(q("[data-fb-user]"), "click", (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const name = btn.querySelector(".fb-user-name")?.textContent?.trim() ?? "";
    const initials = btn.querySelector(".fb-avatar")?.textContent?.trim() ?? "";
    openMenu(
      [
        {
          html: `<span class="fb-acct"><span class="fb-acct-av">${esc(initials)}</span><span class="fb-acct-text"><b>${esc(name)}</b><span>${esc(data.email)}</span></span></span>`,
          run: () => openProfile(btn),
        },
        { sep: true },
        { html: `<p class="fb-acct-label">Workspace</p>` },
        {
          html: `<div class="fb-acct-team"><span class="fb-acct-team-ico">${esc(initials.charAt(0))}</span><span class="fb-acct-text"><b>${esc(name)}'s portfolio</b><span>${esc(data.role)}</span></span><span class="fb-acct-badge">Open to work</span><span class="fb-acct-check">${icon("check", 14)}</span></div>`,
        },
        { sep: true },
        { label: "Account settings", icon: "user", run: () => openProfile(btn) },
        { label: "Download CV", icon: "download", href: "/rafif-aditya-cv.pdf", download: true },
        { label: "Copy email address", icon: "copy", run: () => copy(data.email, "Email copied") },
      ],
      btn,
      { variant: "account" },
    );
  });
  on(q("[data-fb-help]"), "click", (e: MouseEvent) =>
    openMenu(
      [
        { label: "Shortcuts", text: true },
        { label: "Search files", kbd: "⌘K  or  /", text: true },
        { label: "Back to My Work", kbd: "Esc", text: true },
        { label: "Context menu", kbd: "Right-click", text: true },
        { label: "Open page", kbd: "Double-click", text: true },
        { label: "Close tab", kbd: "Middle-click", text: true },
      ],
      e.currentTarget as HTMLElement,
      { right: true, up: true },
    ),
  );
  qa("[data-fb-win]").forEach((b) =>
    on(b, "click", () => {
      const k = b.dataset.fbWin!;
      if (k === "Close" || k === "Minimize") toast("Nice try, this window stays open");
      else toast("Already full screen");
    }),
  );

  // ---- right-click ------------------------------------------------------------------------------
  on(root, "contextmenu", (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    const at = { x: e.clientX, y: e.clientY };
    const card = t.closest<HTMLElement>(".fb-card");
    if (card) {
      e.preventDefault();
      const id = card.dataset.id!;
      const f = byId.get(id)!;
      openMenu(
        [
          { label: "Open", icon: "file", run: () => openFile(id) },
          { label: "Open page", icon: "external", kbd: "↵", href: f.href },
          { sep: true },
          { label: "Copy link", icon: "copy", run: () => copy(abs(f.href), "Link copied") },
          { label: state.fav.has(id) ? "Remove from favorites" : "Add to favorites", icon: "star", run: () => toggleFav(id) },
        ],
        at,
      );
    } else if (t.closest("[data-fb-view=home]")) {
      e.preventDefault();
      openMenu(
        [
          { label: "New file", icon: "plus", run: newTab },
          { label: state.view === "grid" ? "List view" : "Grid view", icon: state.view === "grid" ? "list" : "grid", run: () => ((state.view = state.view === "grid" ? "list" : "grid"), applyFilters()) },
          { sep: true },
          { label: "Share this page", icon: "copy", run: () => copy(location.href, "Link to this page copied") },
        ],
        at,
      );
    }
  });
  on(window, "resize", closeMenu);
  on(window, "blur", closeMenu);

  // ---- fake collaborators -----------------------------------------------------------------------
  const people = [
    { name: "Recruiter", color: "#f24822" },
    { name: "Hiring Manager", color: "#14ae5c" },
    { name: "Design Lead", color: "#9747ff" },
  ];
  const cur = people.map((p) => {
    const el = document.createElement("div");
    el.className = "fb-cur";
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 1.5 13.5 7l-4.8 1.6L6.8 13.5z" fill="${p.color}" stroke="#fff" stroke-width="1"/></svg><span style="background:${p.color}">${p.name}</span>`;
    cursorsEl.append(el);
    return { el, x: rand(100, 500), y: rand(40, 300), tx: 0, ty: 0, wait: rand(0.2, 1.5) };
  });
  let inView = true;
  let last = 0;
  const pick = (c: (typeof cur)[number]) => {
    const box = cursorsEl.getBoundingClientRect();
    const cards = qa(".fb-card").filter((k) => !k.hidden);
    if (cards.length && Math.random() < 0.65) {
      const r = cards[Math.floor(Math.random() * cards.length)].getBoundingClientRect();
      c.tx = r.left - box.left + rand(24, Math.max(25, r.width - 24));
      c.ty = r.top - box.top + rand(24, Math.max(25, r.height - 24));
    } else {
      c.tx = rand(24, Math.max(25, box.width - 80));
      c.ty = rand(24, Math.max(25, box.height - 80));
    }
    c.tx = Math.min(Math.max(c.tx, 8), box.width - 90);
    c.ty = Math.min(Math.max(c.ty, 8), box.height - 40);
    c.wait = rand(1.4, 3.8);
  };
  const tick = (now: number) => {
    raf = 0;
    if (!(state.collab && state.active === "home" && inView && !document.hidden && !reduce())) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    for (const c of cur) {
      c.wait -= dt;
      if (c.wait <= 0) pick(c);
      const k = 1 - Math.exp(-dt * 2.2);
      c.x += (c.tx - c.x) * k;
      c.y += (c.ty - c.y) * k;
      c.el.style.transform = `translate(${c.x + Math.sin(now / 420 + c.tx) * 1.5}px, ${c.y + Math.cos(now / 520 + c.ty) * 1.5}px)`;
    }
    raf = requestAnimationFrame(tick);
  };
  function syncCursors() {
    const show = state.collab && state.active === "home" && !reduce() && !lite();
    cursorsEl.hidden = !show;
    if (show && inView && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      syncCursors();
    },
    { threshold: 0.05 },
  ).observe(root);
  on(document, "visibilitychange", syncCursors);

  // ---- Dev Mode: inspect the case study like Figma's Dev Mode (see board-inspect.ts) ----------------
  // Annotations and section frames step aside, the board goes to 100%, and clicking any element shows its
  // size, layout, type, colours and CSS in a panel; with nothing selected the panel lists the page's tokens.
  const dev = (() => {
    let active = false;
    let prevZoom = 1;
    let css = "";
    let tokens: Tokens | null = null;
    const inspect = () => {
      try {
        return frame()?.contentWindow?.__boardInspect;
      } catch {
        return undefined;
      }
    };
    const sectionsApi = () => {
      try {
        return frame()?.contentWindow?.__boardSections;
      } catch {
        return undefined;
      }
    };
    const panelEl = () => fileView.querySelector<HTMLElement>("[data-fj-dev-panel]");
    const bodyEl = () => fileView.querySelector<HTMLElement>("[data-fj-dev-body]");
    const sw = (hex?: string) => (hex ? `<i class="fj-dv-sw" style="background:${esc(hex)}"></i>` : "");

    const renderTokens = () => {
      const b = bodyEl();
      if (!b) return;
      css = "";
      const t = tokens;
      b.innerHTML = `<p class="fj-dv-hint">${icon("search", 14)}<span>Click any element on the page to inspect it. Values are read from what is drawn.</span></p>
        ${
          t
            ? `<section class="fj-dv-group"><h4>Colours in this case study</h4><div class="fj-dv-colors">${t.colors
                .map((c) => `<button class="fj-dv-color" data-copy="${esc(c.hex)}" title="Copy ${esc(c.hex)}">${sw(c.hex)}<span>${esc(c.hex)}</span></button>`)
                .join("")}</div></section>
              <section class="fj-dv-group"><h4>Typography</h4><dl>${t.fonts
                .map((f) => `<button class="fj-dv-row" data-copy="${esc(f.family)}"><dt>Family</dt><dd>${esc(f.family)}</dd></button>`)
                .join("")}<button class="fj-dv-row" data-copy="${t.sizes.map((s) => s.size + "px").join(", ")}"><dt>Sizes</dt><dd>${t.sizes.map((s) => s.size).join(" · ")}</dd></button></dl></section>`
            : `<p class="fj-dv-hint"><span>Reading the page…</span></p>`
        }`;
    };
    const renderInfo = (i: InspectInfo) => {
      const b = bodyEl();
      if (!b) return;
      css = i.css;
      b.innerHTML = `<div class="fj-dv-layer"><b>${esc(i.tag)}</b>${i.text ? `<span>${esc(i.text)}</span>` : ""}</div>
        ${i.groups
          .map(
            (g) => `<section class="fj-dv-group"><h4>${esc(g.title)}</h4><dl>${g.rows
              .map((r) => `<button class="fj-dv-row" data-copy="${esc(r.v)}" title="Copy"><dt>${esc(r.k)}</dt><dd>${sw(r.swatch)}${esc(r.v)}</dd></button>`)
              .join("")}</dl></section>`,
          )
          .join("")}
        <section class="fj-dv-group"><h4>Code <button class="fj-dv-copy" data-fj-dv-copycss>Copy CSS</button></h4><pre class="fj-dv-code"><code>${esc(i.css)}</code></pre></section>`;
      b.scrollTop = 0;
    };

    function enter() {
      const insp = inspect();
      if (!insp || active) return;
      present.exit();
      tour.stop();
      boardApi()?.commentMode(false);
      toggleHistory(false);
      toggleComments(false);
      closeMenu();
      active = true;
      prevZoom = state.zoom;
      setZoom(1); // measurements are read at 100%
      boardApi()?.setVisible(false);
      sectionsApi()?.setVisible(false);
      boardFx.cursors(false);
      insp.enable(true);
      insp.onSelect = (info) => (info ? renderInfo(info) : renderTokens());
      const p = panelEl();
      if (p) p.hidden = false;
      renderTokens();
      fileView.querySelector("[data-fj-dev]")?.setAttribute("aria-pressed", "true");
      if (!tokens) {
        const run = () => {
          tokens = insp.tokens();
          if (active && !css) renderTokens();
        };
        if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 800 });
        else setTimeout(run, 50);
      }
      frame()?.contentWindow?.focus();
    }
    function exit() {
      if (!active) return;
      active = false;
      css = "";
      const insp = inspect();
      insp?.enable(false);
      if (insp) insp.onSelect = null;
      const p = panelEl();
      if (p) p.hidden = true;
      fileView.querySelector("[data-fj-dev]")?.setAttribute("aria-pressed", "false");
      setZoom(prevZoom);
      boardApi()?.setVisible(state.notes);
      sectionsApi()?.setVisible(true);
      sectionsApi()?.layout();
      boardFx.cursors(state.notes);
    }
    on(fileView, "click", (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-fj-dev]")) active ? exit() : enter();
      if (t.closest("[data-fj-dev-close]")) {
        exit();
        fileView.querySelector<HTMLElement>("[data-fj-dev]")?.focus();
      }
      if (t.closest("[data-fj-dv-copycss]")) copy(css, "CSS copied");
      const c = t.closest<HTMLElement>("[data-copy]");
      if (c && panelEl()?.contains(c)) copy(c.dataset.copy!, `Copied ${c.dataset.copy!.slice(0, 40)}`);
    });
    return {
      enter,
      exit,
      get on() {
        return active;
      },
    };
  })();

  // ---- quick actions: one palette for files and actions (Cmd/Ctrl+K, Ctrl+/) ----------------------
  const quickDlg = q<HTMLDialogElement>("[data-fb-qa]");
  const quick = (() => {
    const input = q<HTMLInputElement>("[data-fb-qa-input]");
    const list = q("[data-fb-qa-list]");
    type Action = { label: string; hint?: string; icon: string; group: string; keys?: string; run: () => void };
    let items: Action[] = [];
    let shown: Action[] = [];
    let sel = 0;
    let back: Element | null = null;
    // Built each time it opens, so board actions only appear while a board is open.
    const build = (): Action[] => {
      const a: Action[] = [];
      const f = byId.get(state.active);
      if (f && state.board.has(f.id)) {
        a.push({ group: "This file", icon: "chevronRight", label: "Present", keys: "Ctrl Alt Enter", run: () => present.enter() });
        if (data.tours[f.id]) a.push({ group: "This file", icon: "user", label: "Follow Rafif (guided tour)", run: () => tour.start() });
        a.push({ group: "This file", icon: "settings", label: "Dev Mode", keys: "Shift D", run: () => dev.enter() });
        if (data.versions[f.id]?.length) a.push({ group: "This file", icon: "list", label: "Version history", run: () => toggleHistory(true) });
        a.push(
          { group: "This file", icon: "chat", label: "Add a comment", keys: "C", run: () => boardApi()?.commentMode(true) },
          { group: "This file", icon: "chat", label: "Comments", run: () => toggleComments(true) },
          { group: "This file", icon: "file", label: "File details", run: () => togglePanel(true) },
          { group: "This file", icon: "star", label: state.notes ? "Hide annotations" : "Show annotations", run: () => setNotes(!state.notes) },
          { group: "This file", icon: "external", label: "Open as full page", run: () => (location.href = f.href) },
          { group: "This file", icon: "home", label: "Back to files", run: goHome },
        );
      }
      data.files.forEach((x) => a.push({ group: "Files", icon: "file", label: `Open ${x.title}`, hint: x.sub, run: () => openFile(x.id) }));
      a.push(
        { group: "Rafif", icon: "copy", label: "Copy email address", hint: data.email, run: () => copy(data.email, "Email copied") },
        { group: "Rafif", icon: "mail", label: "Send an email", run: () => (location.href = `mailto:${data.email}`) },
        { group: "Rafif", icon: "download", label: "Download CV", run: () => window.open("/rafif-aditya-cv.pdf", "_blank") },
        { group: "Rafif", icon: "linkedin", label: "Open LinkedIn", run: () => window.open(data.linkedin, "_blank", "noopener") },
        { group: "Rafif", icon: "behance", label: "Open Behance", run: () => window.open(data.behance, "_blank", "noopener") },
        { group: "Rafif", icon: "user", label: "Account settings", run: () => openProfile(q("[data-fb-user]")) },
        {
          group: "View",
          icon: state.view === "grid" ? "list" : "grid",
          label: state.view === "grid" ? "Switch to list view" : "Switch to grid view",
          run: () => ((state.view = state.view === "grid" ? "list" : "grid"), applyFilters(), goHome()),
        },
        {
          group: "View",
          icon: "settings",
          label: state.collab ? "Hide collaborators" : "Show collaborators",
          run: () => ((state.collab = !state.collab), store.set("fb-collab", state.collab ? "on" : "off"), syncCursors()),
        },
      );
      return a;
    };
    const render = () => {
      const term = input.value.trim().toLowerCase();
      shown = term ? items.filter((x) => `${x.label} ${x.hint ?? ""} ${x.group}`.toLowerCase().includes(term)) : items;
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      let lastGroup = "";
      list.innerHTML = shown.length
        ? shown
            .map((x, i) => {
              const head = x.group !== lastGroup ? `<li class="fb-qa-group" role="presentation">${esc(x.group)}</li>` : "";
              lastGroup = x.group;
              return `${head}<li role="option" id="fb-qa-${i}" class="fb-qa-item" aria-selected="${i === sel}" data-qa="${i}">${icon(x.icon, 14)}<span class="fb-qa-label">${esc(x.label)}</span>${x.hint ? `<span class="fb-qa-hint">${esc(x.hint)}</span>` : ""}${x.keys ? `<kbd>${esc(x.keys)}</kbd>` : ""}</li>`;
            })
            .join("")
        : `<li class="fb-qa-empty" role="presentation">No results for "${esc(input.value)}"</li>`;
      input.setAttribute("aria-activedescendant", shown.length ? `fb-qa-${sel}` : "");
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    };
    const run = (i: number) => {
      const x = shown[i];
      if (!x) return;
      back = null; // the action decides where focus goes
      quickDlg.close();
      x.run();
    };
    function open() {
      if (quickDlg.open) return;
      closeMenu();
      back = document.activeElement;
      items = build();
      input.value = "";
      sel = 0;
      render();
      quickDlg.showModal();
      input.focus();
    }
    on(input, "input", () => {
      sel = 0;
      render();
    });
    on(input, "keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        run(sel);
        return;
      }
      if (e.key === "ArrowDown") sel = Math.min(shown.length - 1, sel + 1);
      else if (e.key === "ArrowUp") sel = Math.max(0, sel - 1);
      else return;
      e.preventDefault();
      render();
    });
    on(list, "click", (e: MouseEvent) => {
      const li = (e.target as HTMLElement).closest<HTMLElement>("[data-qa]");
      if (li) run(Number(li.dataset.qa));
    });
    on(list, "mousemove", (e: MouseEvent) => {
      const li = (e.target as HTMLElement).closest<HTMLElement>("[data-qa]");
      if (li && Number(li.dataset.qa) !== sel) {
        sel = Number(li.dataset.qa);
        render();
      }
    });
    on(quickDlg, "click", (e: MouseEvent) => {
      if (e.target === quickDlg) quickDlg.close();
    });
    on(quickDlg, "close", () => (back as HTMLElement | null)?.focus?.());
    return { open };
  })();
  // The search field's shortcut hint opens the palette too.
  on(q(".fb-search kbd"), "click", () => quick.open());

  // ---- share dialog, like Figma's -----------------------------------------------------------------
  const shareDlg = q<HTMLDialogElement>("[data-fb-share-modal]");
  const share = (() => {
    const url = q<HTMLInputElement>("[data-fb-share-url]");
    const label = q("[data-fb-share-copy-label]");
    let back: HTMLElement | null = null;
    function open(link: string, title: string, from: HTMLElement) {
      back = from;
      q("[data-fb-share-title]").textContent = `Share ${title}`;
      url.value = link;
      label.textContent = "Copy link";
      q<HTMLAnchorElement>("[data-fb-share-linkedin]").href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
      q<HTMLAnchorElement>("[data-fb-share-email]").href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(link)}`;
      closeMenu();
      shareDlg.showModal();
      q<HTMLElement>("[data-fb-share-copy]").focus();
    }
    on(q("[data-fb-share-copy]"), "click", () => {
      copy(url.value, "Link copied");
      label.textContent = "Copied"; // the toast sits under the dialog
      url.select();
    });
    on(url, "focus", () => url.select());
    on(q("[data-fb-share-close]"), "click", () => shareDlg.close());
    on(shareDlg, "click", (e: MouseEvent) => {
      if (e.target === shareDlg) shareDlg.close();
    });
    on(shareDlg, "close", () => back?.focus());
    return { open };
  })();

  // ---- go ---------------------------------------------------------------------------------------
  qa("[data-fb-edited]").forEach((el) => (el.textContent = editedLabel(el.dataset.fbEdited!)));
  renderRecents();
  renderBell();
  syncFavs();
  applyFilters();
  renderTabs();
  syncCursors();
  reveal();

  // Keep the skeleton up until fonts and the visible covers are ready (at least briefly, so it never just flickers).
  function reveal() {
    if (!root!.classList.contains("is-loading")) return;
    root!.setAttribute("aria-busy", "true");
    const imgs = qa<HTMLImageElement>(".fb-grid img").slice(0, 8);
    const ready = Promise.all([
      document.fonts?.ready,
      ...imgs.map((img) => (img.complete ? null : img.decode().catch(() => {}))),
      new Promise((r) => setTimeout(r, 700)),
    ]);
    Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]).then(() => {
      if (signal.aborted) return;
      root!.classList.remove("is-loading");
      root!.classList.add("is-ready");
      root!.removeAttribute("aria-busy");
      setTimeout(() => root!.classList.remove("is-ready"), 1200);
    });
  }
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", () => {
  ctl?.abort();
  stopBoardFx();
  cancelAnimationFrame(raf);
  raf = 0;
});
