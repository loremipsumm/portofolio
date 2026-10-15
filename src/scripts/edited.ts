// "Edited ..." lines on the home file cards, like Figma's file browser. They come from each project's real
// end month (src/data/profile.ts), never a made-up timestamp; ongoing work says "In progress".
import { featured } from "../data/profile";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "Jul – Oct 2025" -> "2025-10"; "Feb 2026 – Present" -> "present".
const endOf = (when: string) => {
  if (/present/i.test(when)) return "present";
  const year = when.match(/(\d{4})(?!.*\d{4})/)?.[1];
  const month = when.replace(/\d{4}/g, "").split(/[–-]/).pop()?.trim().slice(0, 3).toLowerCase();
  const m = month ? MONTHS.indexOf(month) + 1 : 0;
  return year ? (m ? `${year}-${String(m).padStart(2, "0")}` : year) : "";
};

// Project slug -> end ("2025-10", "2024" or "present"). Projects without a CV entry fall back to their year.
export const edited: Record<string, string> = Object.fromEntries(
  featured.filter((f) => f.case).map((f) => [f.case!, endOf(f.when)]),
);

const ago = (n: number, unit: string) => `Edited ${n} ${unit}${n === 1 ? "" : "s"} ago`;

export function editedLabel(end: string, now = new Date()) {
  if (end === "present") return "In progress";
  const [y, m] = end.split("-").map(Number);
  if (!y) return "";
  if (!m) return y >= now.getFullYear() ? "Edited this year" : ago(now.getFullYear() - y, "year");
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (months <= 0) return "Edited this month";
  return months < 12 ? ago(months, "month") : ago(Math.floor(months / 12), "year");
}
