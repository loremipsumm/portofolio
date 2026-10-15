// Light WebGL accents (OGL). Two effects, both optional:
//   [data-gl="gradient"]  soft violet/lime blobs that drift and lean toward the pointer
//   [data-gl="gem"]       a faceted 3D sparkle that turns toward the pointer
// Skipped entirely for reduced motion or when WebGL is unavailable; the CSS
// fallbacks marked [data-gl-fallback] stay in place in that case.

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let disposers: Array<() => void> = [];
const mouse = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
window.addEventListener(
  "pointermove",
  (e) => {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = 1 - e.clientY / window.innerHeight;
  },
  { passive: true },
);

const gradientFrag = /* glsl */ `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
out vec4 fragColor;

float blob(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return smoothstep(r, 0.0, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = uTime * 0.12;
  vec2 m = (uMouse - 0.5) * 0.12;

  float v = blob(p, vec2(0.05 * asp + 0.12 * sin(t * 1.3), 0.15 + 0.10 * cos(t)) + m, 0.75);
  float l = blob(p, vec2(0.95 * asp + 0.10 * cos(t * 1.1), 0.78 + 0.08 * sin(t * 0.9)) - m, 0.55);
  float v2 = blob(p, vec2(0.55 * asp + 0.15 * sin(t * 0.7 + 2.0), 0.1 + 0.05 * cos(t * 1.6)), 0.4);

  vec3 violet = vec3(0.412, 0.220, 0.937);
  vec3 lime = vec3(0.784, 0.945, 0.412);
  float av = clamp(v + v2 * 0.6, 0.0, 1.0) * 0.28;
  float al = l * 0.55;
  float a = av + al;
  vec3 col = (violet * av + lime * al) / max(a, 0.0001);
  fragColor = vec4(col, a); // OGL canvas is not premultiplied
}
`;

const quadVert = /* glsl */ `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const gemVert = /* glsl */ `#version 300 es
in vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out vec3 vPos;
void main() {
  // Pinch a sphere into a flattened four-pointed star.
  vec3 d = normalize(position);
  float k = 0.55;
  float a = pow(abs(d.x), k) + pow(abs(d.y), k) + pow(abs(d.z) * 2.4, k);
  vec3 p = d * pow(a, -1.0 / k);
  vPos = (modelViewMatrix * vec4(p, 1.0)).xyz;
  gl_Position = projectionMatrix * vec4(vPos, 1.0);
}
`;

const gemFrag = /* glsl */ `#version 300 es
precision highp float;
uniform float uTime;
in vec3 vPos;
out vec4 fragColor;
void main() {
  // Flat facets from screen-space derivatives.
  vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
  vec3 v = normalize(-vPos);
  if (dot(n, v) < 0.0) n = -n;
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.0);
  vec3 L = normalize(vec3(-0.4, 0.7, 0.8));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-L, n), v), 0.0, 1.0), 28.0);

  vec3 violet = vec3(0.412, 0.220, 0.937);
  vec3 lime = vec3(0.784, 0.945, 0.412);
  float h = 0.5 + 0.5 * sin(n.x * 2.2 + n.y * 1.7 + uTime * 0.6);
  vec3 base = mix(violet, lime, smoothstep(0.35, 0.95, h * 0.6 + fres * 0.7));
  vec3 col = base * (0.55 + 0.6 * diff) + spec * 0.9 + fres * 0.18;
  fragColor = vec4(col, 1.0);
}
`;

// Weak hardware or data-saver users start at lower resolution.
const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
const lowEnd =
  (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || nav.connection?.saveData === true;

// Resolution steps tried (as a fraction of the starting one) when frames run slow.
const QUALITY = [1, 0.7, 0.5, 0.35];
const SLOW_MS = 22; // sustained frame time worse than this (~45 fps) steps quality down

function visibleOnly(el: HTMLElement, onChange: (v: boolean) => void) {
  const io = new IntersectionObserver(([e]) => onChange(e.isIntersecting));
  io.observe(el);
  return io;
}

async function start() {
  const hosts = Array.from(document.querySelectorAll<HTMLElement>("[data-gl]"));
  if (!hosts.length) return;
  const { Renderer, Program, Mesh, Triangle, Sphere, Transform, Camera } = await import("ogl");

  for (const host of hosts) {
    if (!host.isConnected) continue; // page already swapped away
    const kind = host.dataset.gl;
    let renderer: InstanceType<typeof Renderer>;
    // The gradient is soft blobs, so a low resolution is invisible there.
    const baseDpr = kind === "gem" ? Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 2) : lowEnd ? 0.4 : 0.6;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: kind === "gem",
        dpr: baseDpr,
      });
    } catch {
      continue; // no WebGL: leave the CSS fallback
    }
    const gl = renderer.gl;
    if (!(gl instanceof WebGL2RenderingContext)) {
      gl?.getExtension("WEBGL_lose_context")?.loseContext(); // free the WebGL1 context we can't use
      continue;
    }
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.className = "size-full";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    const fallbacks = host.parentElement?.querySelectorAll<HTMLElement>("[data-gl-fallback]") ?? [];
    fallbacks.forEach((n) => (n.hidden = true));

    const resize = () => renderer.setSize(host.clientWidth, host.clientHeight);
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let draw: (t: number) => void;

    if (kind === "gradient") {
      const program = new Program(gl, {
        vertex: quadVert,
        fragment: gradientFrag,
        uniforms: { uTime: { value: 0 }, uRes: { value: [1, 1] }, uMouse: { value: [0.5, 0.5] } },
      });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
      draw = (t) => {
        program.uniforms.uTime.value = t;
        program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
        program.uniforms.uMouse.value = [mouse.sx, mouse.sy];
        renderer.render({ scene: mesh });
      };
    } else {
      const camera = new Camera(gl, { fov: 30 });
      camera.position.z = 4.2;
      const scene = new Transform();
      const program = new Program(gl, {
        vertex: gemVert,
        fragment: gemFrag,
        uniforms: { uTime: { value: 0 } },
      });
      const mesh = new Mesh(gl, { geometry: new Sphere(gl, { radius: 1, widthSegments: 28, heightSegments: 20 }), program });
      mesh.setParent(scene);
      draw = (t) => {
        camera.perspective({ aspect: gl.drawingBufferWidth / gl.drawingBufferHeight });
        program.uniforms.uTime.value = t;
        mesh.rotation.y = t * 0.35 + (mouse.sx - 0.5) * 1.2;
        mesh.rotation.x = -(mouse.sy - 0.5) * 0.9;
        mesh.rotation.z = 0.12 * Math.sin(t * 0.5);
        renderer.render({ scene, camera });
      };
    }

    let on = true;
    let raf = 0;
    let last = 0;
    let ema = 16;
    let frames = 0;
    let level = 0;
    const io = visibleOnly(host, (v) => {
      on = v;
      last = 0; // don't count the time spent off-screen as a slow frame
    });
    const giveUp = () => {
      cancelAnimationFrame(raf);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      fallbacks.forEach((n) => (n.hidden = false));
    };
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (!on || document.hidden) {
        last = 0;
        return;
      }
      mouse.sx += (mouse.x - mouse.sx) * 0.05;
      mouse.sy += (mouse.y - mouse.sy) * 0.05;
      draw(ms / 1000);

      // Adaptive quality: sample frame times, step resolution down, then fall back to CSS.
      if (last && ms - last < 250) {
        ema += (ms - last - ema) * 0.1;
        if (++frames > 40 && ema > SLOW_MS) {
          frames = 0;
          if (level < QUALITY.length - 1) {
            level++;
            renderer.dpr = baseDpr * QUALITY[level];
            resize();
          } else {
            giveUp();
            return;
          }
        }
      }
      last = ms;
    };
    raf = requestAnimationFrame(loop);
    disposers.push(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    });
  }
}

function stop() {
  disposers.forEach((d) => d());
  disposers = [];
}

function mount() {
  // Also skipped in lite mode (low-power devices, see Base.astro) and inside home boards (?embed), where the
  // whole case study already runs in an iframe; the CSS fallbacks show instead.
  const root = document.documentElement;
  if (reduce || root.classList.contains("lite") || root.classList.contains("embed")) return;
  const go = () => start().catch(() => {});
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 200);
}

document.addEventListener("site:enter", mount);
document.addEventListener("astro:before-swap", stop);
