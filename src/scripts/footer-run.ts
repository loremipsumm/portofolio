// A Mario-style chase over the footer illustration. A route follows the tops of the drawn things (paper
// balls, sheet, wireframe, tablet, ledge, screen) with leaps between them. Mario wanders it in either
// direction; enemies pursue him, others cross his path from either side, and he hops or sprints to
// stay ahead, and when a walker closes in he often times a hop to land on its head: a stomped enemy turns grey,
// breaks into its characters and they tumble onto whatever is below. Every minute Bowser, ten times Mario's
// height, stomps in from a side and flattens the drawing under him until Mario has landed on his head five times;
// then the footer is rebuilt. Timers and dice decide everything else.

import { BOWSER_ART } from "./footer-bowser";

type Seg = { len: number; walk: boolean; at: (u: number) => [number, number] };
type Stages = Record<"hills" | "sheet" | "wire" | "tablet" | "ledge" | "monitor", Record<string, number>>;

// Sprites: the art, and a same-shaped palette. Letters: r red, b blue, s skin, y yellow, n brown,
// d dark brown, g green, w white, p pink, x grey, k a hole (the background shows through).
interface Sprite {
  a: string[];
  c: string[];
}
const sp = (a: string[], c: string[]): Sprite => ({ a, c });
const S = {
  mario: [
    sp(["_M_", "(o)", "[#]", "/ \\"], ["rrr", "yky", "bbb", "ddd"]),
    sp(["_M_", "(o)", "[#]", "|-|"], ["rrr", "yky", "bbb", "ddd"]),
  ],
  marioJump: [sp(["_M_", "\\o/", "[#]", "< >"], ["rrr", "yky", "bbb", "ddd"])],
  goomba: [
    sp([" __ ", "(oo)", "/__\\"], ["nnnn", "nwwn", "dddd"]),
    sp([" __ ", "(oo)", "\\__/"], ["nnnn", "nwwn", "dddd"]),
  ],
  koopa: [
    sp(["(o>", "[#]", "/ \\"], ["yky", "wgw", "yyy"]),
    sp(["(o>", "[#]", "|-|"], ["yky", "wgw", "yyy"]),
  ],
  boo: [
    sp([" __ ", "(oO)", "\\vv/"], ["wwww", "wkkw", "wppw"]),
    sp([" __ ", "(oO)", "/vv\\"], ["wwww", "wkkw", "wppw"]),
  ],
  booShy: [sp([" __ ", "(><)", "\\vv/"], ["wwww", "wwww", "wppw"])],
  bullet: [sp(["<=#=o"], ["xxxxw"])],
  item: [sp([" /\\ ", "(**)", "/__\\"], ["yyyy", "ykky", "yyyy"]), sp([" /\\ ", "(**)", "/__\\"], ["oooo", "okko", "oooo"])],
  superWalk: [
    sp(["_MM_", "(oo)", "[##]", "/  \\"], ["rrrr", "sksk", "rrrr", "dddd"]),
    sp(["_MM_", "(oo)", "[##]", "|--|"], ["rrrr", "sksk", "rrrr", "dddd"]),
  ],
  superJump: [sp(["_MM_", "\\oo/", "[##]", "<  >"], ["rrrr", "sksk", "rrrr", "dddd"])],
  shell: [sp(["[#]"], ["wgw"]), sp(["[+]"], ["wgw"])],
};
const SWAP: Record<string, string> = { "(": ")", ")": "(", "/": "\\", "\\": "/", "<": ">", ">": "<", "[": "]", "]": "[" };
const flipped = new WeakMap<Sprite, Sprite>();
const flip = (s: Sprite): Sprite => {
  let f = flipped.get(s);
  if (!f) {
    f = {
      a: s.a.map((r) => [...r].reverse().map((c) => SWAP[c] ?? c).join("")),
      c: s.c.map((r) => [...r].reverse().join("")),
    };
    flipped.set(s, f);
  }
  return f;
};

// Bowser, traced from a pixel-art reference and recoloured to the site's palette (violet shell, lime body, pale
// violet mane, off-white spikes and teeth); see footer-bowser.ts. Letters beyond the cast's: v violet, u light
// violet, l lime, e off-white. The second walking frame shifts the feet; `hurt` is the grey stun flash.
const BH = BOWSER_ART.a.length;
const BW = BOWSER_ART.a[0].length;
const FEET = 8; // rows of legs that swing between steps
// Where the two feet part: the widest empty run across the bottom rows (falls back to the middle).
const SPLIT = (() => {
  const rowsLow = BOWSER_ART.a.slice(BH - 3);
  let best = BW >> 1;
  let run = 0;
  let bestRun = 0;
  const first = Math.min(...rowsLow.map((r) => r.search(/\S/)));
  const last = Math.max(...rowsLow.map((r) => r.trimEnd().length));
  for (let x = first; x < last; x++) {
    run = rowsLow.every((r) => r[x] === " ") ? run + 1 : 0;
    if (run > bestRun) { bestRun = run; best = x - (run >> 1); }
  }
  return best;
})();
// Walk cycle. Phase 0: one foot lifted and swung forward; 1: passing, both down; 2: the other foot; 3: passing.
function bowserFrame(phase: number, grey: boolean): Sprite {
  const a = BOWSER_ART.a.map((r) => [...r]);
  const c = BOWSER_ART.c.map((r) => [...r]);
  const foot = phase === 0 ? 0 : phase === 2 ? 1 : -1;
  if (foot >= 0) {
    const moved: [number, number, string, string][] = [];
    for (let y = BH - FEET; y < BH; y++)
      for (let x = 0; x < BW; x++) {
        if ((x < SPLIT ? 0 : 1) !== foot || a[y][x] === " ") continue;
        moved.push([x, y, a[y][x], c[y][x]]);
        a[y][x] = " ";
        c[y][x] = " ";
      }
    for (const [x, y, ch, co] of moved) {
      const nx = x + 3;
      const ny = y - 3;
      if (nx < BW && ny >= 0) { a[ny][nx] = ch; c[ny][nx] = co; }
    }
  }
  return {
    a: a.map((r) => r.join("")),
    c: c.map((r) => r.join("").replace(grey ? /[^ k]/g : /$^/, "x")),
  };
}
const BOWSER = {
  frames: [0, 1, 2, 3].map((p) => bowserFrame(p, false)),
  hurt: [0, 1, 2, 3].map((p) => bowserFrame(p, true)),
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// The painted cells of a sprite whose bottom-centre sits at (x, y).
function cells(sprite: Sprite, x: number, y: number, face: 1 | -1 = 1) {
  const s = face === -1 ? flip(sprite) : sprite;
  const bottom = Math.round(y);
  const left = Math.round(x) - Math.floor(s.a[0].length / 2);
  const out: { x: number; y: number; ch: string; col: string }[] = [];
  s.a.forEach((row, i) =>
    [...row].forEach((ch, j) => {
      if (ch !== " ") out.push({ x: left + j, y: bottom - (s.a.length - 1 - i), ch, col: s.c[i][j] });
    }),
  );
  return out;
}

interface Hooks {
  smash: (cells: [number, number][]) => void; // Bowser flattened these art cells
  restore: (cells: [number, number][]) => void; // these scraps are home again
}

export function createRunner(rows: string[], stages: Stages, W: number, H: number, hooks?: Hooks) {
  const art = rows.map((r) => [...r]); // the drawing as it is now; Bowser eats into it
  // ----- Route -----
  const { hills, sheet, wire, tablet, ledge, monitor } = stages;
  const top = Array.from({ length: hills.x1 + 1 }, (_, x) => {
    for (let y = hills.y0; y <= hills.y1; y++) if (rows[y]?.[x] && rows[y][x] !== " ") return y;
    return hills.y1;
  });
  const hillY = (x: number) => {
    let sum = 0;
    let n = 0;
    for (let i = x - 3; i <= x + 3; i++) {
      sum += top[Math.min(hills.x1, Math.max(0, Math.round(i)))];
      n++;
    }
    return sum / n - 1;
  };
  const segs: Seg[] = [];
  const walk = (x0: number, x1: number, y: (x: number) => number) =>
    segs.push({ len: x1 - x0, walk: true, at: (u) => { const x = x0 + (x1 - x0) * u; return [x, y(x)]; } });
  const leap = (x0: number, y0: number, x1: number, y1: number) => {
    const h = Math.max(3, Math.max(0, y0 - y1) * 0.5 + 3);
    segs.push({
      len: Math.hypot(x1 - x0, y1 - y0) + h * 1.5,
      walk: false,
      at: (u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - 4 * h * u * (1 - u)],
    });
  };
  const flat = (y: number) => () => y;
  walk(-16, 0, () => hillY(0));
  walk(0, hills.x1, hillY);
  leap(hills.x1, hillY(hills.x1), sheet.x0 + 1, sheet.y - 1);
  walk(sheet.x0 + 1, sheet.x1 - 1, flat(sheet.y - 1));
  leap(sheet.x1 - 1, sheet.y - 1, wire.x0 + 1, wire.y - 1);
  walk(wire.x0 + 1, wire.x1 - 1, flat(wire.y - 1));
  leap(wire.x1 - 1, wire.y - 1, tablet.x0 + 1, tablet.y - 1);
  walk(tablet.x0 + 1, tablet.x1 - 1, flat(tablet.y - 1));
  leap(tablet.x1 - 1, tablet.y - 1, ledge.x0 + 1, ledge.y - 1);
  walk(ledge.x0 + 1, ledge.x1 - 1, flat(ledge.y - 1));
  leap(ledge.x1 - 1, ledge.y - 1, monitor.x0 + 1, monitor.y - 1);
  walk(monitor.x0 + 1, monitor.x1 - 1, flat(monitor.y - 1));
  leap(monitor.x1 - 1, monitor.y - 1, W + 10, H + 8);

  const starts: number[] = [];
  let L = 0;
  for (const s of segs) {
    starts.push(L);
    L += s.len;
  }
  const locate = (s: number) => {
    const p = Math.min(Math.max(s, 0), L - 1e-6);
    let i = segs.length - 1;
    while (starts[i] > p) i--;
    const u = (p - starts[i]) / segs[i].len;
    const [x, y] = segs[i].at(u);
    return { x, y, walk: segs[i].walk, u };
  };

  // ----- Cast -----
  type Kind = "goomba" | "koopa" | "boo" | "shell";
  interface Agent {
    kind: Kind;
    s: number;
    v: number;
    face: 1 | -1;
    // pursuers only
    chase: boolean;
    base: number;
    amp: number;
    w: number;
    ph: number;
    vmax: number;
  }
  const pursuer = (kind: Kind): Agent => ({
    kind,
    s: 0,
    v: 0,
    face: 1,
    chase: true,
    base: rand(5, 18),
    amp: rand(2, 6),
    w: rand(0.4, 1.4),
    ph: rand(0, 6.3),
    vmax: kind === "boo" ? 15 : rand(17, 23),
  });

  const KEEP = 3.6; // the closest an enemy may get to Mario's feet, unless he is landing on it
  let t = 0;
  let sM = 0;
  let dir: 1 | -1 = 1;
  let sprint = 0;
  let hop = -1; // 0..1 while hopping, -1 when not
  let hopDur = 0.7; // seconds per hop, and how high (rows), both re-rolled for every hop
  let hopH = 24;
  let speedMod = 1;
  let speedTarget = 1;
  let speedIn = 2;
  let turnIn = rand(6, 12);
  let jumpIn = rand(2.5, 6);
  const rollHop = () => {
    hopDur = rand(0.45, 0.85);
    hopH = rand(14, 34);
  };
  let intruderIn = 3;
  let bulletIn = 5;
  let pursuers: Agent[] = [];
  let intruders: Agent[] = [];
  let bullet: { x: number; y: number; vx: number } | null = null;
  // Stomp aftermath: grey characters that tumble down, points that float up, and pursuers waiting to return.
  interface Bit { x: number; y: number; vx: number; vy: number; ch: string; wait: number; rest: boolean; life: number }
  let debris: Bit[] = [];
  let pops: { x: number; y: number; life: number; text: string; still?: boolean }[] = [];
  let returning: { kind: Kind; in: number }[] = [];
  const settled = new Set<number>();
  // Boss fight: loose scraps of the drawing (st 0 falling, 1 lying about, 2 flying home, 3 home), fire and rockets.
  interface Scrap { x: number; y: number; ox: number; oy: number; vx: number; vy: number; ch: string; st: 0 | 1 | 2 | 3; e: number; dur: number; sx: number; sy: number }
  interface Flame { x: number; y: number; vx: number; vy: number; life: number; floor: boolean; ch: string; col: string }
  interface Rocket { x: number; y: number; vx: number; vy: number; life?: number }
  let scraps: Scrap[] = [];
  let flames: Flame[] = [];
  let rockets: Rocket[] = [];
  let shots: Shot[] = [];
  const heap = new Int16Array(W);
  const solid = (x: number, y: number) => (art[y]?.[x] ?? " ") !== " " || settled.has(y * W + x);

  const gapOf = (a: Agent) => Math.max(KEEP + 1, a.base + a.amp * Math.sin(a.w * t + a.ph));

  function reset() {
    sM = 0;
    dir = 1;
    sprint = 0;
    hop = -1;
    turnIn = rand(6, 12);
    jumpIn = rand(2.5, 6);
    intruderIn = 2.5;
    bulletIn = 4;
    intruders = [];
    bullet = null;
    debris = [];
    pops = [];
    returning = [];
    settled.clear();
    scraps = [];
    flames = [];
    rockets = [];
    shots = [];
    heap.fill(0);
    const kinds: Kind[] = ["goomba", "koopa", "boo", "goomba"];
    pursuers = kinds.sort(() => Math.random() - 0.5).map(pursuer);
    pursuers.forEach((a) => (a.s = sM - gapOf(a)));
  }
  reset();

  function stomp(a: Agent, list: Agent[], x: number, y: number) {
    const frame = Math.floor(t / 0.16) % 2;
    for (const c of cells(S[a.kind as "goomba" | "koopa"][frame], x, y, a.face))
      debris.push({ x: c.x, y: c.y, vx: rand(-9, 9), vy: -rand(5, 17), ch: c.ch, wait: rand(0, 0.4), rest: false, life: rand(3.5, 6) });
    if (debris.length > 1400) debris.splice(0, debris.length - 1400).forEach((d) => d.rest && settled.delete(Math.round(d.y) * W + Math.round(d.x)));
    pops.push({ x, y: y - 4, life: 1, text: "+100" });
    list.splice(list.indexOf(a), 1);
    if (list === pursuers) returning.push({ kind: a.kind, in: rand(2.5, 5) });
    hop = 0.25; // bounce off the head
  }

  // Falling pieces, floating points and returning pursuers.
  function fx(dt: number) {
    for (const d of debris) {
      if (d.wait > 0) { d.wait -= dt; continue; }
      if (d.rest) { d.life -= dt; continue; }
      d.vy += 60 * dt;
      d.x += d.vx * dt;
      d.vx *= 1 - Math.min(1, dt * 0.8);
      const n = Math.max(1, Math.ceil(Math.abs(d.vy * dt)));
      for (let i = 0; i < n; i++) {
        const cx = Math.round(d.x);
        if (d.vy > 0 && (Math.round(d.y) >= H - 1 || solid(cx, Math.round(d.y) + 1))) {
          d.rest = true;
          d.x = cx;
          d.y = Math.round(d.y);
          settled.add(d.y * W + cx);
          break;
        }
        d.y += (d.vy * dt) / n;
      }
    }
    debris = debris.filter((d) => {
      const dead = d.life <= 0 || d.x < -2 || d.x > W + 2;
      if (dead && d.rest) settled.delete(Math.round(d.y) * W + Math.round(d.x));
      return !dead;
    });
    pops.forEach((p) => { if (!p.still) p.y -= dt * 4; p.life -= dt; });
    pops = pops.filter((p) => p.life > 0);
    for (const r of returning) r.in -= dt;
    for (const r of returning.filter((r) => r.in <= 0)) {
      const a = pursuer(r.kind);
      a.s = Math.min(L - 4, Math.max(-14, sM - dir * 40));
      pursuers.push(a);
    }
    returning = returning.filter((r) => r.in > 0);
  }

  // ----- Bowser -----
  const BOSS_EVERY = 25;
  const VB = 7; // cols per second
  const G = 110; // rows per second squared, for Mario's boss jumps
  const HEAD_DX = BOWSER_ART.headDx; // the mane, ahead of Bowser's middle
  const TOP = H - 1 - (BH - 1); // the row Bowser's head tops out at
  const HEAD_Y = TOP + BOWSER_ART.headRow; // where Mario's feet land on the head
  const MOUTH_Y = TOP + 20;
  const MID = BW >> 1;
  // Where on Bowser Mario can stand: the top of the shell and of the hand, read from the sprite itself.
  const surface = (col: number) => {
    for (let d = 0; d < 8; d++)
      for (const c of [col - d, col + d]) {
        const r = BOWSER_ART.a.findIndex((row) => row[c] !== undefined && row[c] !== " ");
        if (r >= 0 && c >= 0 && c < BW) return { dx: c - MID, y: TOP + r };
      }
    return { dx: HEAD_DX, y: HEAD_Y };
  };
  const SHELL = surface(Math.round(BW * 0.25));
  const HAND = surface(Math.round(BW * 0.92));
  type Perch = { rel: true; dx: number; y: number } | { rel: false; x: number; y: number };
  const frontOf = (b: Boss) => b.x + b.dir * (BW / 2 - 2);
  interface Mar {
    x: number; y: number; face: 1 | -1; air: boolean;
    x0: number; y0: number; x1: number; y1: number; apex: number; ta: number; td: number; e: number;
    head: boolean; wait: number; gx: number; hurt: number; react: number;
    rel: boolean; tdx: number; riding: boolean; rdx: number; ry: number; plan: Perch[];
    power: number; charge: number;
  }
  interface Item { x: number; y: number; e: number }
  interface Shot { x: number; y: number; vx: number; vy: number; dead?: boolean }
  // Bowser's attacks: a punch that slams the floor in front of him, a breath of fire, and rockets.
  interface Atk { kind: "punch" | "fire" | "rocket"; e: number; tel: number; dur: number; dodge: boolean; did: boolean; acc: number; shots: number }
  interface Boss { x: number; dir: 1 | -1; hp: number; flash: number; given: boolean; item: Item | null; stun: number; alive: boolean; over: number; rebuilt: boolean; atk: Atk | null; atkIn: number; sp: number; step: number; ph: number; resume: number; mar: Mar }
  let boss: Boss | null = null;
  let bossIn = BOSS_EVERY;

  // Where a spot `off` cols ahead of Bowser's middle will be in `after` seconds, as he walks toward Mario's last ground spot.
  function predictAt(b: Boss, after: number, off: number) {
    const gap = b.mar.gx - b.x;
    const dir = Math.abs(gap) > 2 ? (Math.sign(gap) as 1 | -1) : b.dir;
    const walked = Math.min(Math.abs(gap), VB * Math.max(0, after - b.stun));
    return b.x + Math.sign(gap) * walked + dir * off;
  }
  // Start a ballistic leap from Mario's spot to (x1, y1), peaking `lift` rows above the higher end.
  function launch(m: Mar, x1: number, y1: number, lift: number, head: boolean) {
    m.x0 = m.x;
    m.y0 = m.y;
    m.x1 = x1;
    m.y1 = y1;
    m.apex = Math.min(m.y0, y1) - lift;
    m.ta = Math.sqrt((2 * (m.y0 - m.apex)) / G);
    m.td = Math.sqrt((2 * (y1 - m.apex)) / G);
    m.e = 0;
    m.air = true;
    m.head = head;
    m.rel = false;
    if (x1 !== m.x) m.face = x1 > m.x ? 1 : -1;
  }
  function startBoss() {
    const m = locate(sM);
    const fromRight = m.x < W / 2;
    pursuers.forEach((a) => returning.push({ kind: a.kind, in: 999 }));
    pursuers = [];
    intruders = [];
    bullet = null;
    const mar: Mar = {
      x: m.x, y: m.y, face: 1, air: true, x0: 0, y0: 0, x1: 0, y1: 0, apex: 0, ta: 1, td: 1, e: 0,
      head: false, wait: 0, gx: m.x, hurt: 0, react: 0, rel: false, tdx: 0, riding: false, rdx: 0, ry: 0, plan: [],
      power: 0, charge: 0,
    };
    boss = {
      x: fromRight ? W + BW / 2 + 2 : -BW / 2 - 2, dir: fromRight ? -1 : 1, hp: 100, flash: 0, given: false, item: null, stun: 0, alive: true, over: 0,
      rebuilt: false, atk: null, atkIn: 3, sp: 0, step: 0, ph: 1, resume: -1, mar,
    };
    launch(mar, m.x, H - 1, 4, false);
  }
  const STRIDE = 3.4; // cols walked per phase of the cycle
  const phaseOf = (b: Boss) => (b.sp < 0.5 ? 1 : Math.floor(b.step / STRIDE) % 4);
  const bobOf = (b: Boss) => (b.sp >= 0.5 && b.ph % 2 === 1 ? 1 : 0); // the body rises as the feet pass
  const bossSprite = (b: Boss, grey: boolean) => (grey ? BOWSER.hurt : BOWSER.frames)[b.ph];
  const bossCells = (b: Boss) => cells(bossSprite(b, false), b.x, H - 1 - bobOf(b), b.dir);
  function breakBowser(b: Boss) {
    for (const c of bossCells(b)) {
      if (c.x < 0 || c.x >= W) continue;
      debris.push({ x: c.x, y: c.y, vx: rand(-14, 14), vy: -rand(4, 22), ch: c.ch, wait: rand(0, 0.5), rest: false, life: rand(3, 6) });
    }
    b.alive = false;
    b.atk = null;
    b.item = null;
    b.mar.riding = false;
    b.mar.plan = [];
    b.mar.power = 0;
    shots = [];
    flames = [];
    rockets = [];
    b.over = 2.5; // a breather before the scraps fly home
    pops.push({ x: Math.min(W - 6, Math.max(6, b.x)), y: 12, life: 2.5, text: "K.O.!" });
  }
  // Bowser's health is a bar of 100: a stomp takes 5, a super shot 10.
  function damage(b: Boss, pct: number, x: number, y: number) {
    b.hp = Math.max(0, b.hp - pct);
    b.flash = 0.25;
    pops.push({ x, y: y - 3, life: 1.1, text: `-${pct}%` });
    if (b.hp <= 0 && b.alive) breakBowser(b);
  }
  // How Mario gets up there: straight at the head, via the shell or the hand, or down from a building.
  function planRoute(b: Boss, m: Mar) {
    const head: Perch = { rel: true, dx: HEAD_DX, y: HEAD_Y };
    const spots: Perch[] = [];
    for (const st of [stages.sheet, stages.wire, stages.tablet, stages.ledge, stages.monitor]) {
      let solidCells = 0;
      for (let x = st.x0; x <= st.x1; x++) if ((art[st.y]?.[x] ?? " ") !== " ") solidCells++;
      const mid = (st.x0 + st.x1) / 2;
      if (solidCells > (st.x1 - st.x0) * 0.6 && Math.abs(mid - b.x) < 75)
        spots.push({ rel: false, x: Math.min(st.x1 - 2, Math.max(st.x0 + 2, b.x)), y: st.y - 1 });
    }
    const r = Math.random();
    if (r < 0.3) m.plan = [head];
    else if (r < 0.55) m.plan = [{ rel: true, ...SHELL }, head];
    else if (r < 0.75) m.plan = [{ rel: true, ...HAND }, head];
    else if (spots.length) m.plan = [spots[Math.floor(Math.random() * spots.length)], head];
    else m.plan = [head];
  }
  function leapStep(b: Boss, m: Mar) {
    const next = m.plan.shift()!;
    const final = m.plan.length === 0;
    const lift = final ? 8 : 6;
    const apex = Math.min(m.y, next.y) - lift;
    const T = Math.sqrt((2 * (m.y - apex)) / G) + Math.sqrt((2 * (next.y - apex)) / G);
    if (next.rel) {
      launch(m, predictAt(b, T, next.dx), next.y, lift, final);
      m.rel = true;
      m.tdx = next.dx;
    } else launch(m, next.x, next.y, lift, false);
  }
  function hurtMario(b: Boss, m: Mar) {
    if (m.hurt > 0) return;
    m.hurt = 1.8;
    m.plan = [];
    m.riding = false;
    pops.push({ x: m.x, y: m.y - 5, life: 1, text: "OUCH!" });
    const away = Math.sign(m.x - b.x) || 1;
    m.gx = Math.min(W - 5, Math.max(4, m.x + away * 16));
    launch(m, m.gx, H - 1, 7, false);
  }
  function startAttack(b: Boss) {
    const m = b.mar;
    b.dir = m.x >= b.x ? 1 : -1; // turn to face him
    const inFront = (m.x - b.x) * b.dir;
    const near = inFront < BW / 2 + 26;
    const kind = near ? (Math.random() < 0.6 ? "punch" : "fire") : Math.random() < 0.5 ? "rocket" : "fire";
    const spec = { punch: [0.7, 0.45], fire: [0.8, 1.3], rocket: [0.55, 0.75] }[kind];
    b.atk = { kind, e: 0, tel: spec[0], dur: spec[1], dodge: Math.random() < 0.85, did: false, acc: 0, shots: 0 };
    pops.push({ x: frontOf(b), y: MOUTH_Y - 4, life: spec[0], text: "!!", still: true });
  }
  // The fist: an arm that slams out along the floor and back.
  const fistLen = (a: Atk) => (a.e < a.tel ? 0 : 26 * Math.sin(Math.PI * Math.min(1, (a.e - a.tel) / a.dur)));

  function updateBoss(b: Boss, dt: number) {
    const m = b.mar;
    if (b.alive) {
      // Walk toward where Mario last stood, flattening the drawing under the body into loose scraps.
      b.stun = Math.max(0, b.stun - dt);
      b.flash = Math.max(0, b.flash - dt);
      const dx = m.gx - b.x;
      // He builds up speed, eases off near his target, and has to stop before he can turn round.
      const want = (dx > 0 ? 1 : -1) as 1 | -1;
      const walking = b.stun <= 0 && !b.atk && Math.abs(dx) > 2;
      let goal = walking ? Math.min(VB, Math.abs(dx) * 0.9) : 0;
      if (walking && want !== b.dir) {
        goal = 0;
        if (b.sp < 0.3 && !m.riding) b.dir = want;
      }
      b.sp += Math.max(-26 * dt, Math.min(10 * dt, goal - b.sp));
      b.x += b.dir * b.sp * dt;
      b.step += b.sp * dt;
      const ph = phaseOf(b);
      if (ph !== b.ph && b.sp > 1.5 && (ph === 0 || ph === 2)) {
        // a foot comes down: kick up dust
        const fx0 = b.x + b.dir * (ph === 0 ? -10 : 8);
        for (let i = 0; i < 6; i++)
          debris.push({ x: fx0 + rand(-4, 4), y: H - 1, vx: rand(-7, 7), vy: -rand(2, 6), ch: ".:'"[i % 3], wait: 0, rest: false, life: 0.7 });
      }
      b.ph = ph;
      const hit: [number, number][] = [];
      for (const c of bossCells(b)) {
        if (c.x < 0 || c.x >= W || c.y < 0 || c.y >= H || art[c.y][c.x] === " ") continue;
        scraps.push({
          x: c.x, y: c.y, ox: c.x, oy: c.y, vx: b.dir * rand(2, 16) + rand(-3, 3), vy: -rand(2, 12),
          ch: art[c.y][c.x], st: 0, e: 0, dur: 1, sx: 0, sy: 0,
        });
        art[c.y][c.x] = " ";
        hit.push([c.x, c.y]);
      }
      if (hit.length) hooks?.smash(hit);

      // Attacks: only while Mario is on his feet.
      if (b.atk) {
        const a = b.atk;
        a.e += dt;
        const front = frontOf(b);
        const away = (Math.sign(m.x - b.x) || 1) as 1 | -1;
        if (a.kind === "punch") {
          if (a.dodge && !a.did && a.e >= a.tel - 0.32 && !m.air && Math.abs(m.x - front) < 34) {
            a.did = true;
            launch(m, m.x, H - 1, 12, false); // hop over the fist
          }
          const len = fistLen(a);
          if (len > 0 && (m.x - front) * b.dir > -8 && (m.x - front) * b.dir < len + 2 && m.y > H - 10) hurtMario(b, m);
        } else if (a.kind === "fire") {
          if (a.dodge && !a.did && !m.air && (m.x - b.x) * b.dir > 0 && (m.x - b.x) * b.dir < BW / 2 + 60) {
            a.did = true;
            const x1 = Math.min(W - 5, Math.max(4, m.x + away * 38));
            if (Math.abs(x1 - m.x) > 14) { m.gx = x1; launch(m, x1, H - 1, 9, false); }
            else launch(m, m.x, H - 1, 11, false);
          }
          if (a.e >= a.tel && a.e < a.tel + a.dur) {
            a.acc += dt;
            while (a.acc > 0.035) {
              a.acc -= 0.035;
              flames.push({
                x: front, y: MOUTH_Y, vx: b.dir * rand(22, 36), vy: rand(-2, 5), life: 3, floor: false,
                ch: "^*~^"[Math.floor(Math.random() * 4)], col: Math.random() < 0.55 ? "y" : "r",
              });
            }
          }
        } else if (a.e >= a.tel + a.shots * 0.4 && a.shots < 2) {
          a.shots++;
          const tx = m.x;
          const d = Math.hypot(tx - front, H - 3 - MOUTH_Y) || 1;
          rockets.push({ x: front, y: MOUTH_Y, vx: ((tx - front) / d) * 36, vy: ((H - 3 - MOUTH_Y) / d) * 36 });
        }
        if (a.e >= a.tel + a.dur) {
          b.atk = null;
          b.atkIn = rand(1.6, 3);
        }
      } else if (b.stun <= 0 && !m.air && !m.riding && m.hurt <= 0 && Math.abs(b.x - m.gx) < 90) {
        b.atkIn -= dt;
        if (b.atkIn <= 0) startAttack(b);
      }
    }

    // Flames arc out of the mouth, land and burn along the floor; rockets fly straight and burst.
    for (const f of flames) {
      if (!f.floor) {
        f.vy += 26 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y >= H - 1) { f.y = H - 1; f.floor = true; f.vx *= 0.3; f.life = rand(0.8, 1.4); }
      } else {
        f.x += f.vx * dt;
        f.vx *= 0.92;
        f.life -= dt;
      }
    }
    flames = flames.filter((f) => f.life > 0 && f.x > -3 && f.x < W + 3);
    for (const r of rockets) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      if (r.y >= H - 2 || r.x < -6 || r.x > W + 6) {
        if (r.x > -2 && r.x < W + 2)
          for (let i = 0; i < 12; i++)
            flames.push({ x: r.x, y: H - 2, vx: rand(-10, 10), vy: -rand(2, 9), life: 3, floor: false, ch: "*^~"[i % 3], col: i % 2 ? "y" : "r" });
        r.vx = 0;
        r.life = -1;
      }
    }
    rockets = rockets.filter((r) => r.life !== -1);
    for (const sh of shots) {
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      if (b.alive && Math.abs(sh.x - b.x) < BW / 2 - 6 && sh.y > TOP + 2) {
        damage(b, 20, sh.x, sh.y);
        sh.dead = true;
      } else if (sh.x < -4 || sh.x > W + 4 || sh.y > H || sh.y < -4) sh.dead = true;
    }
    shots = shots.filter((sh) => !sh.dead);

    // Mario: dodge, then wait on the floor, leap onto the head, bounce off to the far side, repeat.
    m.hurt = Math.max(0, m.hurt - dt);
    m.react = Math.max(0, m.react - dt);
    if (b.alive) {
      const feet = m.y;
      const bodyH = m.power > 0 ? 5 : 3;
      const bodyW = m.power > 0 ? 3 : 2.2;
      if (!m.riding) {
        for (const r of rockets) if (Math.abs(r.x - m.x) < bodyW + 1.3 && Math.abs(r.y - (feet - bodyH / 2)) < bodyH / 2 + 1.5) hurtMario(b, m);
        for (const f of flames) if (Math.abs(f.x - m.x) < bodyW && f.y >= feet - bodyH && f.y <= feet + 0.6) hurtMario(b, m);
      }
      if (!m.air && !m.riding && m.hurt <= 0 && m.react <= 0) {
        // Hop over whatever is about to reach him on the floor (he notices about 80% of the time).
        const near =
          rockets.some((r) => (m.x - r.x) * Math.sign(r.vx) > 0 && (m.x - r.x) * Math.sign(r.vx) < 16) ||
          flames.some((f) => f.floor && Math.abs(f.x - m.x) < 6) ||
          flames.some((f) => !f.floor && f.vy > 0 && f.y > H - 13 && Math.abs(f.x - m.x) < 8);
        if (near) {
          m.react = 0.45;
          if (Math.random() < 0.8) launch(m, m.x, H - 1, 11, false);
        }
      }
    }
    if (b.alive) {
      // At half health a star falls from the sky. Mario fetches it, grows, turns white and orange, and for ten
      // seconds fires a shot every three that costs Bowser 10%.
      if (!b.given && b.hp <= 50) {
        b.given = true;
        b.item = { x: rand(24, W - 24), y: -2, e: 0 };
        pops.push({ x: b.item.x, y: 6, life: 1.6, text: "POWER UP!", still: true });
      }
      const it = b.item;
      if (it) {
        it.e += dt;
        it.y = Math.min(H - 1, it.y + 14 * dt);
        if (!m.power && Math.abs(m.x - it.x) < 4 && Math.abs(m.y - it.y) < 6) {
          b.item = null;
          m.power = 10;
          m.charge = 0;
          pops.push({ x: m.x, y: m.y - 8, life: 1.3, text: "SUPER!" });
        } else if (it.e > 25) b.item = null;
      }
      if (m.power > 0) {
        m.power -= dt;
        m.charge += dt;
        if (m.power <= 0) {
          m.power = 0;
          m.charge = 0;
        } else if (m.charge >= 3) {
          m.charge = 0;
          const side = b.x >= m.x ? 1 : -1;
          const sx = m.x + side * 4;
          const sy = m.y - 4;
          const d = Math.hypot(b.x - sx, H - 15 - sy) || 1;
          m.face = side;
          shots.push({ x: sx, y: sy, vx: ((b.x - sx) / d) * 75, vy: ((H - 15 - sy) / d) * 75 });
        }
      }
    }
    if (m.air) {
      m.e += dt;
      const total = m.ta + m.td;
      const along = Math.min(1, m.e / total);
      if (m.e < m.ta) {
        const k = m.e / m.ta;
        m.y = m.y0 - (m.y0 - m.apex) * (1 - (1 - k) * (1 - k));
        m.x = m.x0 + (m.x1 - m.x0) * along;
      } else {
        const d = Math.min(1, (m.e - m.ta) / m.td);
        m.y = m.apex + (m.y1 - m.apex) * d * d;
        const aim = m.rel && b.alive ? b.x + b.dir * m.tdx : m.x0 + (m.x1 - m.x0) * along;
        m.x += (aim - m.x) * Math.min(1, dt * 6);
      }
      if (m.e >= total) {
        m.y = m.y1;
        m.air = false;
        if (m.head && b.alive) {
          b.stun = 1.2;
          b.atk = null;
          b.atkIn = rand(2, 3.5);
          damage(b, 10, m.x, m.y);
          m.plan = [];
          m.gx = b.x > W / 2 ? rand(10, 44) : rand(W - 44, W - 10);
          launch(m, m.gx, H - 1, 6, false);
        } else if (b.resume >= 0) {
          rejoinRoute(b.resume);
          return;
        } else if (m.rel && b.alive) {
          m.riding = true; // standing on Bowser: the shell or the hand
          m.rdx = m.tdx;
          m.ry = m.y1;
          m.wait = rand(0.3, 0.5);
        } else if (m.plan.length && b.alive) {
          m.wait = rand(0.2, 0.45); // perched on a building, about to drop in
        } else {
          m.gx = m.x;
          m.wait = rand(0.2, 0.5);
        }
      }
    } else if (b.alive) {
      if (m.riding) {
        m.x = b.x + b.dir * m.rdx;
        m.y = m.ry - bobOf(b);
        m.face = b.dir;
      } else if (!m.plan.length) m.face = b.x > m.x ? 1 : -1;
      m.wait -= dt;
      if (!m.air && !m.riding && !m.plan.length && m.hurt <= 0 && m.react <= 0 && Math.random() < dt * 1.1) {
        launch(m, Math.min(W - 8, Math.max(8, m.x + rand(-7, 7))), H - 1, rand(3, 8), false); // restless: a sidestep hop
      }
      if (m.wait <= 0 && m.hurt <= 0) {
        if (b.item && !m.power && !m.riding) {
          m.plan = [];
          launch(m, b.item.x, H - 1, 6, false);
        } else if (m.plan.length || (!b.atk && Math.abs(b.x - m.gx) < 60 && b.x > -8 && b.x < W + 8)) {
          if (!m.plan.length) planRoute(b, m);
          m.riding = false;
          leapStep(b, m);
        }
      }
    } else {
      m.wait -= dt;
      if (m.wait <= 0) {
        m.wait = rand(0.5, 0.9); // celebrate with little hops
        launch(m, m.x, H - 1, 5, false);
      }
    }

    // The scraps of the drawing: tumble to the floor, lie in heaps, then fly back to where they came from.
    const arrived: [number, number][] = [];
    for (const s of scraps) {
      if (s.st === 0) {
        s.vy += 60 * dt;
        s.x += s.vx * dt;
        s.vx *= 1 - Math.min(1, dt * 0.8);
        if (s.x < 0 || s.x > W - 1) { s.x = Math.min(W - 1, Math.max(0, s.x)); s.vx *= -0.5; }
        const n = Math.max(1, Math.ceil(Math.abs(s.vy * dt)));
        for (let i = 0; i < n; i++) {
          let cx = Math.round(s.x);
          if (s.vy > 0 && Math.round(s.y) >= H - 1 - heap[cx]) {
            for (let k = 1; k <= 8 && heap[cx] > 4; k++) {
              const alt = Math.min(W - 1, Math.max(0, cx + (Math.random() < 0.5 ? -k : k)));
              if (heap[alt] < heap[cx]) cx = alt;
            }
            s.x = cx;
            s.y = H - 1 - heap[cx];
            heap[cx]++;
            s.st = 1;
            break;
          }
          s.y += (s.vy * dt) / n;
        }
      } else if (s.st === 2) {
        s.e += dt;
        if (s.e < 0) continue;
        const u = Math.min(1, s.e / s.dur);
        const k = u * u * (3 - 2 * u);
        s.x = s.sx + (s.ox - s.sx) * k;
        s.y = s.sy + (s.oy - s.sy) * k - 9 * Math.sin(Math.PI * u);
        if (u >= 1) {
          art[s.oy][s.ox] = s.ch;
          arrived.push([s.ox, s.oy]);
          s.st = 3;
        }
      }
    }
    if (arrived.length) {
      hooks?.restore(arrived);
      scraps = scraps.filter((s) => s.st !== 3);
    }
    if (!b.alive && !b.rebuilt) {
      b.over -= dt;
      if (b.over <= 0) {
        b.rebuilt = true;
        b.over = 1;
        for (const s of scraps) { s.st = 2; s.sx = s.x; s.sy = s.y; s.e = -rand(0, 2.4); s.dur = rand(0.9, 1.5); }
      }
    } else if (b.rebuilt && scraps.length === 0) {
      b.over -= dt;
      if (b.over <= 0 && b.resume < 0) {
        // Back to the tour: leap from where he stands to the nearest spot on the route.
        let best = 20;
        let bd = Infinity;
        for (let q = 20; q < L - 30; q += 0.5) {
          const p = locate(q);
          const d = p.walk ? Math.abs(p.x - m.x) : Infinity;
          if (d < bd) { bd = d; best = q; }
        }
        const p = locate(best);
        b.resume = best;
        m.gx = p.x;
        launch(m, p.x, p.y, 6, false);
      }
    }
  }

  // The fight is over and the drawing is whole: Mario carries on along the route with a fresh set of enemies.
  function rejoinRoute(at: number) {
    boss = null;
    bossIn = BOSS_EVERY;
    sM = at;
    dir = at > L - 60 ? -1 : 1;
    sprint = 0;
    hop = -1;
    turnIn = rand(5, 10);
    jumpIn = rand(2, 5);
    intruderIn = 3;
    bulletIn = 5;
    intruders = [];
    bullet = null;
    returning = [];
    const kinds: Kind[] = ["goomba", "koopa", "boo", "goomba"];
    pursuers = kinds.sort(() => Math.random() - 0.5).map(pursuer);
    pursuers.forEach((a) => (a.s = sM - dir * gapOf(a)));
  }

  function update(dt: number) {
    t += dt;
    if (boss) {
      updateBoss(boss, dt);
      fx(dt);
      return;
    }
    bossIn -= dt;
    if (bossIn <= 0) startBoss();
    const m = locate(sM);
    const exiting = dir === 1 && sM > L - 30;

    // --- Mario: a wandering speed, sprints when chased, and now and then turns round or hops for fun.
    speedIn -= dt;
    if (speedIn <= 0) {
      const roll = Math.random();
      speedTarget = roll < 0.12 ? rand(0.1, 0.3) : roll < 0.4 ? rand(1.5, 2.1) : rand(0.7, 1.3); // now and then a stroll or a dash
      speedIn = rand(0.6, 2.4);
    }
    speedMod += (speedTarget - speedMod) * Math.min(1, dt * 3.2);
    sprint = Math.max(0, sprint - dt);
    const vM = dir * 15 * speedMod * (sprint > 0 ? 1.45 : 1);
    sM += vM * dt;

    turnIn -= dt;
    if (!exiting && m.walk && m.u > 0.2 && m.u < 0.8 && (turnIn <= 0 || (dir === -1 && sM < 24))) {
      dir = dir === 1 ? -1 : 1;
      if (dir === -1 && sM < 40) dir = 1; // too close to the left edge to turn back
      turnIn = rand(2.5, 8);
      rollHop();
      hop = 0; // a little hop as he spins round
    }
    jumpIn -= dt;
    if (jumpIn <= 0 && m.walk && hop < 0) {
      rollHop();
      hop = 0;
      jumpIn = rand(0.9, 3.5);
    }

    // --- Pursuers keep to Mario's back and cut across if he turns. Boo only moves while Mario isn't facing it.
    for (const a of pursuers) {
      const ahead = (a.s - sM) * dir > 0;
      const limit = a.kind === "boo" && ahead ? 0 : a.vmax;
      const want = Math.max(-limit, Math.min(limit, (sM - dir * gapOf(a) - a.s) * 2.5));
      a.v += (want - a.v) * Math.min(1, dt * 6);
      a.s += a.v * dt;
      if (Math.abs(a.v) > 0.6) a.face = a.v > 0 ? 1 : -1;
      if (a.kind === "boo") {
        a.face = a.s < sM ? 1 : -1;
        // shy: it backs off rather than touching him, whichever side it is on
        const rel = a.s - sM;
        if (Math.abs(rel) < KEEP + 1.5) a.s += ((rel >= 0 ? 1 : -1) * (KEEP + 1.5) - rel) * Math.min(1, dt * 8);
      }
    }
    const behind = (a: Agent) => (sM - a.s) * dir;
    if (!sprint && !exiting && pursuers.some((a) => a.kind !== "boo" && behind(a) > 0 && behind(a) < 2.6)) sprint = 0.8;

    // --- Strangers come from either side along the route: walkers, or a fast sliding shell.
    intruderIn -= dt;
    if (intruders.length < 2 && intruderIn <= 0 && !exiting) {
      const side = Math.random() < 0.5 ? -1 : 1;
      let s = sM + side * rand(34, 56);
      if (s < 22 || s > L - 30) s = sM - side * rand(34, 56);
      if (s > 22 && s < L - 30) {
        const kind: Kind = Math.random() < 0.3 ? "shell" : Math.random() < 0.5 ? "goomba" : "koopa";
        const speed = kind === "shell" ? rand(19, 24) : rand(7, 11);
        const v = s > sM ? -speed : speed;
        intruders.push({ ...pursuer(kind), chase: false, s, v, face: v > 0 ? 1 : -1 });
      }
      intruderIn = rand(2.5, 5.5);
    }
    for (const a of intruders) a.s += a.v * dt;
    intruders = intruders.filter((a) => a.s > 6 && a.s < L - 4 && Math.abs(a.s - sM) < 70);

    // --- Bullets fly in from either side at about Mario's height.
    bulletIn -= dt;
    if (!bullet && bulletIn <= 0 && m.walk && m.x > 8 && m.x < W - 20 && !exiting) {
      const fromRight = Math.random() < 0.55;
      bullet = { x: fromRight ? W + 6 : -6, y: m.y - 1, vx: fromRight ? -34 : 34 };
    }
    if (bullet) {
      bullet.x += bullet.vx * dt;
      if (bullet.x < -9 || bullet.x > W + 9) {
        bullet = null;
        bulletIn = rand(4, 8);
      }
    }

    // --- Hop over whatever is about to meet him on the ground.
    if (hop >= 0) {
      hop += dt / hopDur;
      if (hop >= 1) hop = -1;
    } else if (m.walk) {
      const meets = (a: Agent) => {
        const d = (a.s - sM) * dir;
        const closing = -(a.v - vM) * dir;
        if (a.kind === "goomba" || a.kind === "koopa") return closing > 4 && Math.abs(d / closing - 0.66) < 0.1; // land on its head
        return d > 5 && d < 14 && closing > 2;
      };
      const bl =
        bullet &&
        (bullet.x - m.x) * Math.sign(-bullet.vx) > 4 &&
        (bullet.x - m.x) * Math.sign(-bullet.vx) < 15 &&
        Math.abs(bullet.y - (m.y - 1)) < 4;
      // anything else closing in is cleared with a hop timed so that it passes underneath at the top of the arc
      const danger = (a: Agent) => {
        if (a.kind === "boo") return false;
        const rel = a.s - sM;
        const closing = -Math.sign(rel) * (a.v - vM);
        return closing > 1 && Math.abs(rel) < 18 && (Math.abs(rel) - KEEP) / closing < 0.4;
      };
      if (intruders.some(meets) || pursuers.some(meets) || bl) {
        hopDur = 0.8;
        hopH = 24;
        hop = 0;
      } else if (intruders.some(danger) || pursuers.some(danger)) {
        hopDur = 0.75;
        hopH = 28;
        hop = 0;
      }
    }

    // --- Landing on a walker's head: it greys out, falls apart and the pieces drop at random.
    if (hop > 0.5) {
      const mm = locate(sM);
      const feet = mm.y - hopH * hop * (1 - hop);
      for (const list of [pursuers, intruders]) {
        for (const a of [...list]) {
          if ((a.kind !== "goomba" && a.kind !== "koopa") || a.s < 0 || a.s >= L || Math.abs(a.s - sM) > 2.8) continue;
          const p = locate(a.s);
          if (feet >= p.y - 3.5 && feet <= p.y + 0.5) stomp(a, list, p.x, p.y);
        }
      }
    }
    {
      const lift = hop >= 0 ? hopH * hop * (1 - hop) : 0;
      if (lift < 3.8) {
        for (const list of [pursuers, intruders]) {
          for (const a of list) {
            if (a.kind === "boo") continue;
            const rel = a.s - sM;
            if (Math.abs(rel) >= KEEP - 0.8) continue;
            const side = rel === 0 ? -dir : Math.sign(rel);
            a.s = sM + side * (KEEP - 0.8);
            a.v = list === intruders ? side * Math.abs(a.v) : 0;
            if (Math.abs(a.v) > 0.6) a.face = a.v > 0 ? 1 : -1;
          }
        }
      }
    }
    fx(dt);

    // --- Off the right edge and everyone has followed: start over.
    if (dir === 1 && sM > L && pursuers.every((a) => a.s > L - 2)) reset();
  }

  // ----- Drawing -----
  function render() {
    const ch: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));
    const cl: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));
    const frame = Math.floor(t / 0.16) % 2;
    const plot = (x: number, y: number, c: string, col: string) => {
      if (x < 0 || x >= W || y < 0 || y >= H) return;
      ch[y][x] = c;
      cl[y][x] = col;
    };
    const put = (sprite: Sprite, x: number, y: number, face: 1 | -1 = 1) => {
      for (const c of cells(sprite, x, y, face)) plot(c.x, c.y, c.ch, c.col);
    };
    const onRoute = (s: number) => (s >= 0 && s < L ? locate(s) : null);
    const draw = (a: Agent) => {
      const p = onRoute(a.s);
      if (!p || p.x < -2) return;
      if (a.kind === "boo") {
        const shy = (a.s - sM) * dir > 0;
        const bob = Math.sin(t * 2.6 + a.ph) * 1.4 + Math.sin(t * 1.1 + a.base) * 1.2;
        put(shy ? S.booShy[0] : S.boo[frame], p.x, p.y - 3.5 - bob, a.face);
      } else put(S[a.kind][frame], p.x, p.y, a.face);
    };

    for (const d of debris) plot(Math.round(d.x), Math.round(d.y), d.ch, "x");
    pursuers.forEach(draw);
    intruders.forEach(draw);
    for (const p of pops) [...p.text].forEach((c, i) => plot(Math.round(p.x) - 2 + i, Math.round(p.y), c, "y"));
    if (bullet) put(S.bullet[0], bullet.x, bullet.y, bullet.vx > 0 ? -1 : 1);
    const m = boss ? null : onRoute(sM);
    if (m) {
      const air = hop >= 0;
      const y = m.y - (air ? hopH * hop * (1 - hop) : 0);
      put(air || !m.walk ? S.marioJump[0] : S.mario[frame], m.x, y, dir);
    }

    if (boss) {
      const b = boss;
      for (const sc of scraps) if (sc.e >= 0 || sc.st !== 2) plot(Math.round(sc.x), Math.round(sc.y), sc.ch, sc.st === 2 ? "l" : "x");
      for (const f of flames) plot(Math.round(f.x), Math.round(f.y), f.ch, f.col);
      if (b.alive) {
        put(bossSprite(b, (b.stun > 0 && Math.floor(t / 0.1) % 2 === 1) || b.flash > 0), b.x, H - 1 - bobOf(b), b.dir);
        const a = b.atk;
        if (a?.kind === "punch" && a.e >= a.tel) {
          // the arm slams out along the floor, ending in a fist
          const front = frontOf(b);
          const len = Math.round(fistLen(a));
          for (let i = -6; i <= len; i++)
            for (let r = H - 8; r <= H - 3; r++) plot(Math.round(front + b.dir * i), r, i > len - 5 ? "@" : "#", i > len - 5 ? "e" : "l");
        }
      }
      for (const r of rockets) put(S.bullet[0], r.x, r.y, r.vx > 0 ? -1 : 1);
      if (b.item) put(S.item[Math.floor(t / 0.2) % 2], b.item.x, b.item.y, 1);
      for (const sh of shots) {
        plot(Math.round(sh.x), Math.round(sh.y), "O", "o");
        plot(Math.round(sh.x - sh.vx * 0.025), Math.round(sh.y - sh.vy * 0.025), "o", "y");
      }
      const mm = b.mar;
      if (mm.hurt <= 0 || Math.floor(t / 0.08) % 2) {
        const powered = mm.power > 0;
        const spr = powered ? (mm.air ? S.superJump[0] : S.superWalk[frame]) : mm.air ? S.marioJump[0] : S.mario[frame];
        put(spr, mm.x, mm.y, mm.face);
      }
      if (mm.power > 0) {
        // the charge towards the next shot, over his head
        const full = Math.min(3, Math.floor((mm.charge / 3) * 4));
        [..."[" + "#".repeat(full) + "-".repeat(3 - full) + "]"].forEach((c, i) => plot(Math.round(mm.x) - 2 + i, Math.round(mm.y) - 9, c, "o"));
      }
      // health bar and, while it lasts, the super power timer
      const BAR = 30;
      const filled = Math.round((b.hp / 100) * BAR);
      const hpCol = b.hp <= 25 ? "r" : "l";
      const line1 = ["BOWSER [", ...Array(BAR).fill("#"), `] ${b.hp}%`];
      line1.flatMap((c) => [...c]).forEach((c, i) => {
        const inBar = i >= 8 && i < 8 + BAR;
        plot(2 + i, 1, c, inBar ? (i - 8 < filled ? hpCol : "x") : "e");
      });
      if (mm.power > 0) {
        const n = Math.ceil((mm.power / 10) * 20);
        [..."SUPER  [" + "#".repeat(n) + "-".repeat(20 - n) + `] ${Math.ceil(mm.power)}s`].forEach((c, i) => plot(2 + i, 2, c, i >= 8 && i < 29 ? "o" : "e"));
      }
    }

    return ch.map((row, y) => {
      let out = "";
      let i = 0;
      while (i < W) {
        const c = cl[y][i];
        let j = i;
        while (j < W && cl[y][j] === c) j++;
        const s = row.slice(i, j).join("").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        out += c === " " ? s : `<span class="fa-s-${c}">${s}</span>`;
        i = j;
      }
      return out;
    });
  }

  return { update, render };
}
