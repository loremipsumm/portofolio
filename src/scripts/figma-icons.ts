// 16px line icons for the home page, shared by the Astro markup and the client script.
// Each value is the inner SVG; wrap it with `icon()` (stroke icons inherit `currentColor`).
export const ICONS: Record<string, string> = {
  home: `<path d="M2.5 7.2 8 2.8l5.5 4.4V13a.5.5 0 0 1-.5.5H9.5V9.5h-3v4H3a.5.5 0 0 1-.5-.5z" fill="currentColor" stroke="none"/>`,
  plus: `<path d="M8 3v10M3 8h10"/>`,
  chevron: `<path d="m4.5 6.5 3.5 3.5 3.5-3.5"/>`,
  chevronRight: `<path d="m6.5 4.5 3.5 3.5-3.5 3.5"/>`,
  folder: `<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.8l1.4 1.5h4.8A1.5 1.5 0 0 1 14 6v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12z" fill="currentColor" stroke="none"/>`,
  grid: `<rect x="2.5" y="2.5" width="4.5" height="4.5" rx=".8"/><rect x="9" y="2.5" width="4.5" height="4.5" rx=".8"/><rect x="2.5" y="9" width="4.5" height="4.5" rx=".8"/><rect x="9" y="9" width="4.5" height="4.5" rx=".8"/>`,
  list: `<path d="M6 4h7.5M6 8h7.5M6 12h7.5M2.6 4h.01M2.6 8h.01M2.6 12h.01"/>`,
  settings: `<path d="M2.5 5h5M11.5 5h2M2.5 11h2M8.5 11h5"/><circle cx="9.5" cy="5" r="1.8"/><circle cx="6.5" cy="11" r="1.8"/>`,
  star: `<path d="m8 2.2 1.8 3.6 4 .6-2.9 2.8.7 4L8 11.3l-3.6 1.9.7-4L2.2 6.4l4-.6z"/>`,
  search: `<circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/>`,
  file: `<path d="M4 2.5h5l3 3v8H4z"/><path d="M9 2.5v3h3"/>`,
  close: `<path d="m4 4 8 8M12 4l-8 8"/>`,
  min: `<path d="M3.5 8h9"/>`,
  max: `<rect x="3.5" y="3.5" width="9" height="9" rx="1"/>`,
  menu: `<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>`,
  linkedin: `<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M5.6 7v3.5M5.6 5.3v.01M8.2 10.5V7M8.2 8.6c0-1 .7-1.6 1.5-1.6s1.3.6 1.3 1.6v1.9"/>`,
  behance: `<path d="M2.5 4.5h3.2a1.5 1.5 0 0 1 0 3H2.5zM2.5 7.5h3.6a1.6 1.6 0 0 1 0 3.2H2.5zM9 5h4M9 9.2h4a2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 3.7 1"/>`,
  mail: `<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.6 5 5.4 4 5.4-4"/>`,
  copy: `<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5v-1a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1"/>`,
  external: `<path d="M9 3h4v4M13 3 7.5 8.5M11 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3"/>`,
  check: `<path d="m3.5 8.5 3 3 6-7"/>`,
  user: `<circle cx="8" cy="5.5" r="2.5"/><path d="M3 13.5c.5-2.5 2.5-4 5-4s4.5 1.5 5 4"/>`,
  download: `<path d="M8 2.5v7M5 7l3 3 3-3M3 12.5h10"/>`,
  bell: `<path d="M4 10.5V8a4 4 0 0 1 8 0v2.5l1 2H3z"/><path d="M6.6 14a1.5 1.5 0 0 0 2.8 0"/>`,
  chat: `<path d="M2.5 4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H6.5l-3 2.5V11H4a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M5.5 6.2h5M5.5 8.2h3"/>`,
};

export const icon = (name: string, size = 16, cls = "") =>
  `<svg class="fb-i ${cls}" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
