// Strings with numbers or dates in them, which a plain dictionary cannot hold. Each rule is tried when the exact
// string is not in the dictionary. (RegExp, builder) pairs; the builder gets the match and returns Indonesian.
// The builder also gets `tr`, which translates a piece of the match with the dictionary (for "Before: <caption>").
export type Pattern = [RegExp, (m: RegExpMatchArray, tr: (s: string) => string) => string];

const MONTH: Record<string, string> = { May: "Mei", Aug: "Agu", Oct: "Okt", Dec: "Des" };
const unit = (u: string, n: number) => ({ day: "hari", week: "minggu", month: "bulan", year: "tahun", hour: "jam", minute: "menit" })[u] ?? u;

export const patterns: Pattern[] = [
  // "Jul – Oct 2025", "Feb 2026 – Present", "Aug 2023 – Aug 2024": only month names, years and separators.
  [
    /^(?=.*\d{4})(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|\d{4}|Present|[–\-·, ]+)+$/,
    (m) => m[0].replace(/\b(May|Aug|Oct|Dec)\b/g, (x) => MONTH[x]).replace(/\bPresent\b/g, "Sekarang"),
  ],
  [/^Edited (\d+) (day|week|month|year|hour|minute)s? ago$/, (m) => `Diedit ${m[1]} ${unit(m[2], +m[1])} lalu`],
  [/^Edited this (month|year)$/, (m) => `Diedit ${m[1] === "year" ? "tahun" : "bulan"} ini`],
  // app
  [/^(.+) added to favorites$/, (m) => `${m[1]} ditambahkan ke favorit`],
  [/^(.+) removed from favorites$/, (m) => `${m[1]} dihapus dari favorit`],
  [/^Close (.+)$/, (m, tr) => `Tutup ${tr(m[1])}`],
  [/^Open (.+)$/, (m, tr) => `Buka ${tr(m[1])}`],
  [/^Share (.+)$/, (m) => `Bagikan ${m[1]}`],
  [/^Copy (#[0-9a-fA-F]{3,8})$/, (m) => `Salin ${m[1]}`],
  [/^Copied (.+)$/, (m) => `Disalin ${m[1]}`],
  [/^No results for "(.*)"$/, (m) => `Tidak ada hasil untuk "${m[1]}"`],
  [/^(\d+) repl(?:y|ies)$/, (m) => `${m[1]} balasan`],
  [/^(.+) · Click to open$/, (m, tr) => `${tr(m[1])} · Klik untuk membuka`],
  [/^Example question from (.+?): (.*) (No replies yet|\d+ repl(?:y|ies))\. Open thread\.$/, (m, tr) => `Contoh pertanyaan dari ${m[1]}: ${tr(m[2])} ${tr(m[3])}. Buka thread.`],
  [/^Your comment: (.*)\. Open thread\.$/, (m) => `Komentar Anda: ${m[1]}. Buka thread.`],
  [/^Hi, I'm Rafif\. Follow me through (.+), it takes about a minute\.$/, (m) => `Hai, saya Rafif. Ikuti saya menelusuri ${m[1]}, hanya sekitar satu menit.`],
  [/^Illustrated avatar of (.+)$/, (m) => `Avatar ilustrasi ${m[1]}`],
  [/^([A-Z]{4}) mascot$/, (m) => `Maskot ${m[1]}`],
  [/^R(\d+) round (\d): (.+)$/, (m) => `R${m[1]} putaran ${m[2]}: ${m[3]}`],
  [/^(Role-based onboarding|Class & task setup|Questionnaire & sharing|Student questionnaire|Answer review|AI team formation|Incomplete classes & regrouping|Group quality analysis|Personality & profile): (.+)$/, (m, tr) => `${tr(m[1])}: ${tr(m[2])}`],
  [/^avg (.+)$/, (m) => `rata-rata ${m[1]}`],
  [/^Round (\d): (.+)$/, (m) => `Putaran ${m[1]}: ${m[2]}`],
  [/^(Before|After): (.+)$/, (m, tr) => `${m[1] === "Before" ? "Sebelum" : "Sesudah"}: ${tr(m[2])}`],
  [/^Compare before and after: (.+)$/, (m, tr) => `Bandingkan sebelum dan sesudah: ${tr(m[1])}`],
];
