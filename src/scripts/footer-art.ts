// ASCII scene for the footer: a design going from crumpled paper to a shipped screen, left to right.
// Generated at build time from simple shapes; a seeded RNG keeps the output identical between builds.

export const W = 176;
export const H = 49;
const GROUND = 46;
const LABELS = 48;

// Tops of the things the footer characters run across. Keep in sync with the drawing code below.
export const STAGES = {
  hills: { x0: 0, x1: 27, y0: 36, y1: 46 }, // paper balls on the ground; the surface is read from the grid
  sheet: { x0: 31, x1: 49, y: 36 },
  wire: { x0: 65, x1: 91, y: 25 },
  tablet: { x0: 100, x1: 119, y: 21 },
  ledge: { x0: 122, x1: 128, y: 13 },
  monitor: { x0: 132, x1: 172, y: 4 },
};

// Cell classes: p = paper, d = digital, a = accent, g = ground, l = label.
export type Cls = " " | "p" | "d" | "a" | "g" | "l";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildScene() {
  const r = rng(20251014);
  const chars: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));
  const cls: Cls[][] = Array.from({ length: H }, () => Array(W).fill(" "));
  const pick = (s: string) => s[Math.floor(r() * s.length)];
  const set = (x: number, y: number, ch: string, c: Cls) => {
    x = Math.round(x);
    if (x < 0 || x >= W || y < 0 || y >= H || ch === " ") return;
    chars[y][x] = ch;
    cls[y][x] = c;
  };
  const line = (x0: number, x1: number, y: number, s: string, c: Cls, p = 1) => {
    for (let x = x0; x <= x1; x++) if (r() < p) set(x, y, pick(s), c);
  };
  const col = (x: number, y0: number, y1: number, s: string, c: Cls, p = 1) => {
    for (let y = y0; y <= y1; y++) if (r() < p) set(x, y, pick(s), c);
  };
  const box = (x0: number, y0: number, x1: number, y1: number, c: Cls, p = 1, h = "-", v = "|") => {
    line(x0, x1, y0, h, c, p);
    line(x0, x1, y1, h, c, p);
    col(x0, y0 + 1, y1 - 1, v, c, p);
    col(x1, y0 + 1, y1 - 1, v, c, p);
  };
  const fill = (x0: number, y0: number, x1: number, y1: number, s: string, c: Cls, p = 1) => {
    for (let y = y0; y <= y1; y++) line(x0, x1, y, s, c, p);
  };
  const text = (x: number, y: number, s: string, c: Cls) => [...s].forEach((ch, i) => set(x + i, y, ch, c));
  const ground = (x0: number, x1: number) => line(x0, x1, GROUND, "=====%#", "g");

  // 01 ideas: crumpled paper balls.
  const ball = (cx: number, cy: number, rad: number) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
      for (let x = Math.floor(cx - rad * 2); x <= cx + rad * 2; x++) {
        const d = Math.hypot((x - cx) / 2, y - cy) / rad;
        if (d > 1) continue;
        if (d > 0.78) set(x, y, x < cx ? "(" : ")", "p");
        else if (r() < 0.7) set(x, y, pick("~/\\<>,.'^"), "p");
      }
  };
  ball(10, 42.6, 3.2);
  ball(21, 44, 1.9);
  ball(4, 44.6, 1.2);
  ground(1, 26);

  // 02 sketch: a sheet with scribbles and a pencil.
  box(31, 36, 49, 45, "p", 0.88, "-~", "|:");
  text(47, 36, "_.", "p");
  text(48, 37, "|", "p");
  text(33, 38, "( )", "p");
  line(37, 46, 38, "~", "p", 0.8);
  line(33, 44, 40, "~-", "p", 0.75);
  line(33, 40, 41, "~", "p", 0.75);
  text(33, 43, "[_]", "p");
  line(37, 46, 43, "~", "p", 0.7);
  for (let y = 31; y <= 44; y++) {
    const x = 60 - (y - 31) * 0.62;
    if (y <= 32) text(x, y, "##", "a");
    else if (y === 44) set(x, y, "'", "p");
    else if (y === 43) text(x, y, "\\/", "p");
    else text(x, y, "//", "p");
  }
  ground(29, 62);

  // 03 wireframe: a bigger hand-drawn layout.
  box(65, 25, 91, 45, "p", 0.93, "-", "|");
  text(67, 27, "o", "p");
  line(69, 73, 27, "~", "p");
  text(80, 27, "~~ ~~ ~~", "p");
  box(67, 29, 80, 36, "p", 0.95, "-", "|");
  for (let i = 1; i < 6; i++) {
    set(67 + i * 2.1, 29 + i, "\\", "p");
    set(80 - i * 2.1, 29 + i, "/", "p");
  }
  for (const y of [30, 32, 34]) line(82, 89, y, "~", "p", 0.85);
  line(67, 80, 38, "=", "p");
  line(67, 89, 40, "~", "p", 0.8);
  line(67, 84, 41, "~", "p", 0.8);
  text(67, 43, "[ ~~~~ ]", "p");
  text(78, 43, "~~~~", "p");
  ground(63, 94);

  // 04 prototype: a tablet on an easel, half paper and half pixels.
  box(100, 21, 119, 41, "d", 0.8, "=-", "|");
  for (let y = 22; y <= 40; y++)
    for (let x = 101; x <= 118; x++) {
      const t = (x - 101) / 17; // left still paper, right already digital
      if (r() > 0.32) continue;
      if (r() > t) set(x, y, pick("~-.,"), "p");
      else set(x, y, pick("+=:#*"), "d");
    }
  for (let y = 42; y <= 45; y++) {
    set(109 - (y - 41) * 1.5, y, "/", "d");
    set(110 + (y - 41) * 1.5, y, "\\", "d");
  }
  ground(98, 122);
  // A floating pixel block on the way from the tablet up to the screen.
  line(122, 128, 13, "#=%+", "d");
  line(123, 127, 14, "=-", "d", 0.7);

  // Pixels lifting off the tablet and drifting into the screen.
  for (let y = 4; y <= 36; y++)
    for (let x = 110; x <= 134; x++) {
      const along = (x - 110) / 24;
      const lineY = 30 - along * 20;
      const spread = 3 + along * 7;
      const d = Math.abs(y - lineY) / spread;
      if (d < 1 && r() < (1 - d) * (0.12 + along * 0.4)) set(x, y, pick("#%+=*-:."), "d");
    }

  // 05 shipped: a monitor with a finished UI.
  const L = 130, R = 173, T = 4, B = 36;
  for (let y = T; y <= B; y++)
    for (let x = L; x <= R; x++) {
      const edge = y === T || y === B || x <= L + 1 || x >= R - 1;
      if (edge) set(x, y, pick("#%#=#"), "d");
    }
  line(L + 2, R - 2, T + 1, "=", "d", 0.4);
  text(L + 3, T + 2, "o o o", "a");
  text(L + 10, T + 2, "[=====================]", "d");
  line(L + 2, R - 2, T + 3, "-", "d", 0.5);
  text(L + 3, T + 5, "##", "d");
  text(L + 9, T + 5, "--  --  --", "d");
  text(R - 9, T + 5, "[####]", "d");
  // Hero: heading, copy, button, image.
  fill(L + 3, T + 8, L + 19, T + 9, "#%#", "d");
  fill(L + 3, T + 10, L + 13, T + 10, "#%#", "d");
  fill(L + 3, T + 12, L + 20, T + 13, "=-=", "d", 0.9);
  text(L + 3, T + 15, "[########]", "a");
  fill(L + 23, T + 8, R - 4, T + 16, "%*+#=%%", "d", 0.92);
  // Cursor pointing at the button.
  ["#", "##", "###", "####", "##"].forEach((s, i) => text(L + 11, T + 16 + i, s, "a"));
  // Cards.
  for (let i = 0; i < 3; i++) {
    const x0 = L + 3 + i * 13;
    box(x0, T + 21, x0 + 11, T + 28, "d", 1, "-", "|");
    fill(x0 + 1, T + 22, x0 + 10, T + 24, "%#*+", "d", 0.85);
    line(x0 + 2, x0 + 8, T + 26, "=", "d");
    line(x0 + 2, x0 + 6, T + 27, "-", "d");
  }
  line(L + 3, R - 3, T + 30, "- ", "d");
  // Neck and foot.
  for (let y = B + 1; y <= 43; y++) text(150, y, `${pick("=:|")}${pick("==|")}${pick("=:|")}`, "d");
  text(146, 44, "__/=====\\__", "d");
  text(145, 45, "/#%#=#%#=#%#=\\", "d");
  ground(136, 166);

  // The left edge of the screen is still being assembled.
  for (let y = T; y <= B; y++)
    for (let x = L; x <= L + 6; x++) if (r() < (L + 7 - x) / 9) (chars[y][x] = " "), (cls[y][x] = " ");

  // Step labels.
  [["01/ideas", 12], ["02/sketch", 41], ["03/wireframe", 78], ["04/prototype", 110], ["05/shipped", 152]].forEach(([s, x]) =>
    text(Math.round((x as number) - (s as string).length / 2), LABELS, s as string, "l"),
  );

  return { chars, cls };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// One line per row; runs of the same class share a span.
export function rowHtml(chars: string[], cls: Cls[]) {
  let out = "";
  let i = 0;
  while (i < chars.length) {
    const c = cls[i];
    let j = i;
    while (j < chars.length && cls[j] === c) j++;
    const s = esc(chars.slice(i, j).join(""));
    out += c === " " ? s : `<span class="fa-${c}">${s}</span>`;
    i = j;
  }
  return out;
}
