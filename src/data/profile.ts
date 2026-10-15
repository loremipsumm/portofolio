// Profile content shared by the About page and the printable CV (see pages/cv.astro).
export const facts = [
  { k: "Based in", v: "Jakarta Selatan, Indonesia" },
  { k: "Studying", v: "Informatics Engineering, ITERA (2021 – 2026)" },
  { k: "Now", v: "UI/UX Designer at Bank Syariah Indonesia" },
  { k: "Tools", v: "Figma, Photoshop, Illustrator, Kotlin" },
];

// CV profile paragraph, also shown in the account modal on the home page.
export const summary =
  "Product designer and business analyst finishing a degree in Informatics Engineering at Institut Teknologi Sumatera. I work where design meets requirements: banking platforms, plantation operations, accounting systems and learning tools, turning tangled processes into interfaces people can trust.";

export const education = { school: "Institut Teknologi Sumatera", program: "Informatics Engineering", when: "2021 – 2026" };

export const skills = [
  "Requirements Analysis",
  "User Experience (UX)",
  "User Research",
  "Wireframing & Prototyping",
  "Test Execution",
  "Graphic Design",
  "Video Editing",
  "Android (Kotlin)",
];

export const featured = [
  {
    role: "UI/UX Designer",
    org: "PT Bank Syariah Indonesia Tbk.",
    sector: "Banking & Finance",
    case: "bsi-bewize",
    when: "Sep 2026 – Present",
    where: "Jakarta Pusat",
    d: "Digital Banking Wholesale Group. User research and interface design across three BEWIZE products: Cash Management, Value Chain and Trade Finance, turning complex corporate banking processes into clear digital flows.",
  },
  {
    role: "Product Designer",
    org: "Great Giant Foods",
    sector: "Agriculture",
    case: "great-giant-foods",
    when: "Feb 2026 – Present",
    where: "Indonesia",
    d: "Product experiences for plantation operations.",
    points: [
      "Drone AI: maps and analytics for 33,000 hectares, five plantation levels and seven crop-health parameters, with handoff docs for a China-based engineering team.",
      "SPKMobile: task-entry, reporting and payroll workflows for 200 system users and 100+ supervisors managing about 25,000 field workers.",
    ],
  },
  {
    role: "UI/UX Designer",
    org: "Université de Genève",
    sector: "Education",
    case: "equiteam",
    when: "Jul – Oct 2025",
    where: "Geneva, Switzerland",
    d: "A B2B summer-school management platform with an AI-powered LMS for managers, lecturers and students. Led requirements, journey mapping, prototyping and testing across 75 screens.",
  },
  {
    role: "UI/UX Designer",
    org: "PT Tata Data Global",
    sector: "Banking & Finance",
    case: "sia",
    when: "Feb – Jun 2025",
    where: "Jakarta",
    d: "Replaced spreadsheet-based accounting with a web system: General Ledger, Worksheet, Journal, Adjustment, Balance Sheet and Income Statement across five user roles.",
  },
  {
    role: "UI/UX Engineer, SISTER-BKD",
    org: "Kemdiktisaintek",
    sector: "Government",
    case: "sister-bkd",
    when: "Aug – Dec 2024",
    where: "Jakarta Pusat",
    d: "A national lecturer-workload analytics dashboard: 15+ pages of filters, charts and interactive maps for 20–30 administrators, supported through UAT and handoff.",
  },
  {
    role: "UI/UX of IT Ministry",
    org: "Kabinet KM ITERA",
    sector: "Education",
    when: "Jan – Nov 2024",
    where: "Indonesia",
    d: "Campus-platform modules: an e-commerce marketplace with QRIS payment, a podcast CMS and a student-organisation directory.",
  },
  {
    role: "UI/UX Designer (project based)",
    org: "Kaizen Room",
    sector: "Education",
    case: "teachtechai",
    when: "May – Jul 2024",
    where: "Jakarta Pusat",
    d: "An AI-powered chatbot learning app with ML, data and Android engineers. Designed the flows and UI, then helped implement them in Kotlin.",
  },
];

export const earlier = [
  { r: "Creative Designer", o: "Beeme Indonesia", w: "May – Sep 2026" },
  { r: "Assistant Lecturer, Human-Computer Interaction", o: "Institut Teknologi Sumatera", w: "Sep – Dec 2024" },
  { r: "Graphic Designer, AI-NOVAC 2024", o: "LPPM ITERA", w: "Aug – Oct 2024" },
  { r: "Mobile Development Cohort", o: "Bangkit Academy (Google, Tokopedia, Gojek, Traveloka)", w: "Feb – Jul 2024" },
  { r: "Graphic Designer", o: "Humas ITERA", w: "Aug 2023 – Aug 2024" },
  { r: "Graphic Designer", o: "Siebook.id", w: "Aug 2023 – Jan 2024" },
  { r: "Media and Design Staff, Kontes Robot Terbang Indonesia 2023", o: "Pusat Prestasi Nasional", w: "Aug – Sep 2023" },
  { r: "Laboratory Assistant (3 courses)", o: "Institut Teknologi Sumatera", w: "Sep 2022 – Jun 2023" },
  { r: "Graphic Designer", o: "PT Tapis Menuju Dunia", w: "Feb 2022 – Dec 2023" },
  { r: "Video Editor", o: "Executive Career Upgrades", w: "Feb 2022 – Dec 2023" },
];

export const sectors = ["All", "Banking & Finance", "Agriculture", "Education", "Government"];

export const awards = [
  "1st Winner, National Design Poster Competition",
  "2nd Winner, National Design Poster Competition (×2)",
  "Finalist, National UI/UX Design Competition",
  "Finalist, National Infographic Design Poster Competition",
];

export const certs = [
  "Belajar Pengembangan Aplikasi Android Intermediate",
  "Belajar Penerapan Machine Learning untuk Android",
  "Belajar Fundamental Aplikasi Android",
  "Memulai Pemrograman dengan Kotlin",
];

// Career in numbers: general highlights, derived from the lists above so they stay in sync.
// The project-level figures (hectares, workers, screens) live on each case study instead.
const CAREER_START = new Date("2022-02-01");
const months = (Date.now() - CAREER_START.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
const honors = 5; // 1st (1), 2nd (2), finalist (2) in the list above

export const numbers = [
  { n: `${Math.floor(months / 12)}+`, l: "years of design work, since 2022" },
  { n: `${featured.length + earlier.length}`, l: "roles across companies, labs and organisations" },
  { n: `${honors}`, l: "national design honors: 1 win, 2 runners-up, 2 finals" },
  { n: `${sectors.length - 1}`, l: "industries: banking, agriculture, education, government" },
];
