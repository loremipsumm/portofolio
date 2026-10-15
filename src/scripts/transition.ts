// Page transitions: a full-screen veil (WebGL noise wipe, CSS fallback) sweeps up to cover the
// old page, Astro swaps the DOM underneath, then the veil lifts and the new page animates in.
// Everything else listens for "site:enter", which fires once the next page is ready to animate.
import { animate } from "motion";
import type { Renderer as OglRenderer } from "ogl";
import { site, projects } from "../data/site";
import { cases } from "../data/cases";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// The veil takes the colours of the page it leads to, and names it while it covers the screen.
interface Look {
  a: string; // body, top
  b: string; // body, bottom
  rim: string; // leading edge
  label: string;
}
const DEFAULT: Look = { a: "#6938ef", b: "#0e0f12", rim: "#c8f169", label: site.name };
const brands: Record<string, Partial<Look>> = {
  teachtechai: { a: "#b42318", b: "#3b0a07", rim: "#fdb022" },
  equiteam: { a: "#025098", b: "#021c38", rim: "#fec84b" },
  satya: { a: "#1e2a66", b: "#0c1233", rim: "#f37125" },
  sia: { a: "#414651", b: "#0e0f12", rim: "#d5d7da" },
};

function lookFor(pathname: string): Look {
  const path = pathname.replace(/\/$/, "") || "/";
  const slug = path.startsWith("/work/") ? path.slice(6) : undefined;
  if (!slug) return DEFAULT;
  const title = [...projects, ...cases].find((p) => p.slug === slug)?.title ?? DEFAULT.label;
  return { ...DEFAULT, ...brands[slug], label: title };
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

type Painter = (progress: number, dir: number) => void;

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform float uP;      // 0 = clear, 1 = covered
uniform float uDir;    // 0 sweeps in from the bottom, 1 leaves toward the top
uniform vec2 uRes;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uRim;
out vec4 fragColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float n = noise(vec2(uv.x * asp, uv.y) * 3.2) * 0.6 + noise(vec2(uv.x * asp, uv.y) * 7.0) * 0.4;
  float y = mix(uv.y, 1.0 - uv.y, uDir);
  float field = y * 0.62 + n * 0.38;          // 0..1, low where the sweep starts
  float edge = uP * 1.25 - 0.12;
  float cover = smoothstep(edge + 0.04, edge - 0.04, field);
  float rim = smoothstep(edge + 0.14, edge, field) - cover;

  vec3 body = mix(uA, uB, smoothstep(0.0, 1.0, uv.y * 0.8 + n * 0.3));
  vec3 col = mix(body, uRim, clamp(rim * 3.0, 0.0, 1.0));
  float a = clamp(cover + rim * 0.9, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

const vert = /* glsl */ `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const veil = document.getElementById("veil") as HTMLElement | null;
let painter: Painter | undefined; // the WebGL wipe, once it has been set up
let renderer: OglRenderer | undefined;
let covered = false;
let look: Look = DEFAULT;
let setLook: (l: Look) => void = () => {};
const labelEl = document.getElementById("veil-label");

// Tries the WebGL wipe. A failure isn't remembered: WebGL can be briefly unavailable (e.g. after the
// GPU process restarts under memory pressure), so the next navigation tries again.
async function setup(): Promise<Painter | undefined> {
  if (!veil) return;
  try {
    const { Renderer, Program, Mesh, Triangle } = await import("ogl");
    renderer = new Renderer({ alpha: true, dpr: 1 });
    const gl = renderer.gl;
    if (!(gl instanceof WebGL2RenderingContext)) {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      throw new Error("webgl2");
    }
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.className = "size-full";
    veil.querySelector("canvas")?.remove();
    veil.appendChild(canvas);
    veil.classList.remove("veil-css");
    veil.style.clipPath = "";
    // If the context is lost, drop this painter so the next navigation builds a fresh one.
    canvas.addEventListener("webglcontextlost", () => {
      painter = undefined;
      canvas.remove();
    });
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      transparent: true,
      uniforms: {
        uP: { value: 0 },
        uDir: { value: 0 },
        uRes: { value: [1, 1] },
        uA: { value: rgb(DEFAULT.a) },
        uB: { value: rgb(DEFAULT.b) },
        uRim: { value: rgb(DEFAULT.rim) },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    setLook = (l) => {
      program.uniforms.uA.value = rgb(l.a);
      program.uniforms.uB.value = rgb(l.b);
      program.uniforms.uRim.value = rgb(l.rim);
    };
    return (p, dir) => {
      const r = renderer!;
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        r.setSize(window.innerWidth, window.innerHeight);
      }
      program.uniforms.uP.value = p;
      program.uniforms.uDir.value = dir;
      program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      r.render({ scene: mesh });
    };
  } catch {
    return;
  }
}

// CSS fallback for this navigation only: a plain gradient panel that wipes up and away.
function cssPainter(el: HTMLElement): Painter {
  el.classList.add("veil-css");
  setLook = (l) => {
    el.style.setProperty("--veil-a", l.a);
    el.style.setProperty("--veil-b", l.b);
  };
  return (p, dir) => {
    el.style.clipPath = dir ? `inset(0 0 ${p * 100}% 0)` : `inset(${100 - p * 100}% 0 0 0)`;
  };
}

let current: Painter | undefined; // what this navigation paints with

async function run(from: number, to: number, dir: number, duration: number) {
  if (!veil) return;
  // Pick the painter when the veil starts covering, and keep it until the veil has lifted.
  if (dir === 0 || !current) {
    painter ??= await setup();
    current = painter ?? cssPainter(veil);
  }
  const paint = current;
  setLook(look);
  if (labelEl) labelEl.textContent = look.label;
  veil.style.visibility = "visible";
  veil.style.pointerEvents = "auto";
  // Background tabs pause animation frames; don't let that strand the navigation.
  await Promise.race([
    animate(from, to, {
      duration,
      ease: [0.76, 0, 0.24, 1],
      onUpdate: (v) => {
        paint(v, dir);
        if (labelEl) {
          // The name fades in once the sweep reaches the middle and out again as it lifts.
          const o = Math.min(1, Math.max(0, (v - 0.55) / 0.3));
          labelEl.style.opacity = String(o);
          labelEl.style.transform = `translateY(${(1 - o) * 18}px)`;
        }
      },
    }),
    new Promise((resolve) => setTimeout(resolve, duration * 1000 + 400)),
  ]);
}

function hide() {
  if (!veil) return;
  veil.style.visibility = "hidden";
  veil.style.pointerEvents = "none";
}

const enter = () => document.dispatchEvent(new Event("site:enter"));

if (!reduce && veil) {
  document.addEventListener("astro:before-preparation", (e) => {
    // The home page is an app with its own navigation (tabs, boards, Back/Forward); no veil over it.
    if (document.querySelector("[data-fb]")) return;
    const ev = e as Event & { loader: () => Promise<void>; from?: URL; sourceElement?: Element };
    const original = ev.loader;
    const to = (ev as Event & { to?: URL }).to;
    ev.loader = async () => {
      look = lookFor(to?.pathname ?? "/");
      covered = true;
      await run(0, 1, 0, 0.7);
      try {
        await original();
      } catch (err) {
        covered = false; // navigation failed: let the user back in
        hide();
        throw err;
      }
    };
  });
}

// The router swaps <html> attributes too, so put back the ones we rely on.
document.addEventListener("astro:after-swap", () => {
  document.documentElement.classList.add("js");
  if (finePointer && !reduce) document.documentElement.classList.add("has-cursor");
});

document.addEventListener("astro:page-load", async () => {
  if (!covered) {
    enter();
    return;
  }
  covered = false;
  setTimeout(enter, 250); // new content starts rising while the veil is still leaving
  await run(1, 0, 1, 0.8);
  hide();
});
