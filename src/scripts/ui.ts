// Small UI behaviours that live in the persistent shell: theme toggle and copy-to-clipboard.
const root = document.documentElement;

function isDark() {
  return root.classList.contains("dark");
}

function apply(dark: boolean) {
  root.classList.toggle("dark", dark && !root.hasAttribute("data-lock") && !root.classList.contains("embed"));
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(dark)));
}

function stored(): boolean {
  try {
    const t = localStorage.getItem("theme");
    if (t) return t === "dark";
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// The router replaces <html> attributes on every navigation, so re-apply the theme afterwards.
document.addEventListener("astro:after-swap", () => apply(stored()));
document.addEventListener("astro:page-load", () => apply(stored()));

document.addEventListener("click", async (e) => {
  const target = e.target as Element | null;

  if (target?.closest("[data-theme-toggle]")) {
    const next = !isDark();
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    apply(next);
    return;
  }

  const copy = target?.closest<HTMLElement>("[data-copy]");
  if (copy) {
    const text = copy.dataset.copy!;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Older browsers or insecure contexts: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    }
    const label = copy.querySelector<HTMLElement>("[data-copy-label]") ?? copy;
    const original = copy.dataset.label ?? (copy.dataset.label = label.textContent ?? "");
    label.textContent = ok ? "Copied ✓" : "Copy failed";
    copy.setAttribute("data-copied", ok ? "true" : "false");
    window.setTimeout(() => {
      label.textContent = original;
      copy.removeAttribute("data-copied");
    }, 1800);
  }
});
