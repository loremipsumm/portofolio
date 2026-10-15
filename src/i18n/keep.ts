// English strings that stay as they are in Indonesian mode: names, product and tool names, codes, numbers and
// terms that are normally left in English. scripts/i18n-coverage.mjs does not report these.
export const keep: string[] = [
  // switcher
  "EN", "ID", "English", "Bahasa Indonesia",
  // names, projects, organisations, places
  "RA", "Rafif Aditya", "SATYA", "SISTER-BKD", "EquiTeam", "TeachTechAI", "SIA", "BEWIZE", "Great Giant Foods",
  "LinkedIn", "Behance", "Esc", "Enter", "TeachTech", "SPKMobile", "sister", "bkd", "SUS", "AI", "Android", "Kotlin", "Figma", "Photoshop", "Illustrator",
  "rafif.aditya777@gmail.com", "linkedin.com/in/rafif-aditya", "behance.net/rafif-aditya",
  "Product Designer / Business Analyst / UX Researcher",
  "· Institut Teknologi Sumatera", "Institut Teknologi Sumatera", "· Tata Data Global", "· GEMASTIK XVII", "GEMASTIK XVII · 2024",
  "· Kaizen Room × Bangkit Academy", "· PT Bank Syariah Indonesia Tbk.", "· Great Giant Foods", "· Kemdiktisaintek",
  "PT Bank Syariah Indonesia Tbk. · Jakarta Pusat", "Great Giant Foods · Indonesia", "Université de Genève · Geneva, Switzerland",
  "PT Tata Data Global · Jakarta", "Kemdiktisaintek · Jakarta Pusat", "Kabinet KM ITERA · Indonesia", "Kaizen Room · Jakarta Pusat",
  // roles, skills and tags that are normally left in English
  "UI/UX Designer", "Product Designer", "UI/UX Engineer, SISTER-BKD", "UI/UX of IT Ministry", "//UI/UX · UX engineering",
  "UX", "UI Design", "Research", "UX Design", "Usability testing", "UX · UI Design · Research", "UX Design · Research · Usability testing",
  "Control to GL · TRUE", "SEA-LION 7B · fine-tuned", "Mobile Dev · Android · AI", "UX Research · Banking · Prototyping · B2B",
  "Drone AI · SPKMobile", "Product Design · Field research · Mobile · Data-heavy UI", "Dashboard · Data viz · Government · UAT",
  "tabs ·", "Android (Kotlin)", "Cash Management", "Value Chain", "Trade Finance",
  // certification titles are Indonesian already
  "Belajar Pengembangan Aplikasi Android Intermediate", "Belajar Penerapan Machine Learning untuk Android",
  "Belajar Fundamental Aplikasi Android", "Memulai Pemrograman dengan Kotlin",
  // case study pages
  "UX Research", "Banking", "Prototyping", "Mobile", "Product Design", "Field research", "Drone AI", "Indonesia", "Jakarta Pusat",
  "01/ideas", "02/sketch", "03/wireframe", "04/prototype", "05/shipped", "© 2026 Rafif Aditya",
  "· Product Designer / Business Analyst / UX Researcher", "Drone AI and SPKMobile", "PT Bank Syariah Indonesia Tbk.",
  "Cash Management, Value Chain and Trade Finance",
  "Case 03 · GEMASTIK XVII · 2024", "Pantau. Evaluasi.", "Laporkan.", "Figma, FigJam, Google Forms", "Empathize", "Ideate", "Prototype", "Test",
  "Beranda", "Daftar Pejabat", "Kasus Terlapor", "Program Kerja", "Diskusi Publik", "Form Pelaporan", "Akun & Profil",
  "UI/UX", "C241-TA01", "SEA-LION-7B-Instruct", "Kaizen Room × Bangkit", "Kaizen Room",
  // SISTER-BKD: display words, Agile terms, role titles and dataset names that stay as they are
  "planning", "team", "features", "learnings", "sia", "Sprints", "Epics", "Tasks", "WBS", "Product Manager", "Database Engineer",
  "Fullstack Developer", "QA Engineer", "daily stand-up", "backlog refinement", "acceptance criteria", "definition of done",
  "sprint review", "retrospective", "kick-off", "sprint 1", "Hover", "Download", "Filter",
  "Penelitian Dosen", "Pengabdian Dosen", "Pelaporan BKD", "Kesimpulan LKD BKD", "Kewajiban Khusus", "Lokasi PT", "Usia Dosen",
  "Baby Boomer", "Gen X", "Millennial", "Gen Z", "Jenis PT", "Akademik", "Vokasi", "Akreditasi PT", "Unggul", "Baik Sekali", "Baik",
  "Status PT", "PTN-BH", "PTN-BLU", "PTN-SATKER", "PTN", "PTS · LLDIKTI 1–17", "PT-KL", "PTA",
  // SIA: accounting terms, people, roles and spec codes
  "Tata Data Global", "General Ledger", "Worksheet", "Journal", "Adjustment", "Balance Sheet", "PPh Badan", "· Sistem Informasi Akuntansi",
  "Rioga", "Project Manager", "Daffa", "System Analyst", "Hafiz", "Rafif", "Bimo", "Raihan", "Nabila", "Ilham", "Quality Assurance",
  "Admin · Team TDG", "Tim KAP", "External Auditor", "Income Stmt", "TDG", "Admin", "KPP", "KAP", "Bank", "KAP Adjustment", "Admin TDG",
  "Akses Kontrol", "Ganti kata sandi", "FN.26", "FN.13", "SRS.SIA.09.05", "SRS.SIA.01 Register", "SRS.SIA.02 Login",
  "SRS.SIA.03 Forgot Password", "SRS.SIA.16 Logout", "SRS.SIA.04 Dashboard", "SRS.SIA.05 Manage Access", "SRS.SIA.06 Profile",
  "SRS.SIA.07 Change Password", "SRS.SIA.08 General Ledger", "SRS.SIA.09 Worksheet", "SRS.SIA.10 Journal Tracking",
  "SRS.SIA.11 Adjustment", "SRS.SIA.12 KAP Adjustment", "SRS.SIA.13 Balance Sheet", "SRS.SIA.14 Income Statement", "SRS.SIA.15 Laporan PPh Badan",
  // EquiTeam: MBTI codes and type names, names in the example teams, formulas
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "The Architect", "The Logician", "The Commander", "The Debater", "The Advocate", "The Mediator", "The Protagonist", "The Campaigner", "The Logistician", "The Defender", "The Executive", "The Consul", "The Virtuoso", "The Adventurer", "The Entrepreneur", "The Entertainer", "INTJ, The Architect (Analysts)", "INTP, The Logician (Analysts)", "ENTJ, The Commander (Analysts)", "ENTP, The Debater (Analysts)", "INFJ, The Advocate (Diplomats)", "INFP, The Mediator (Diplomats)", "ENFJ, The Protagonist (Diplomats)", "ENFP, The Campaigner (Diplomats)", "ISTJ, The Logistician (Sentinels)", "ISFJ, The Defender (Sentinels)", "ESTJ, The Executive (Sentinels)", "ESFJ, The Consul (Sentinels)", "ISTP, The Virtuoso (Explorers)", "ISFP, The Adventurer (Explorers)", "ESTP, The Entrepreneur (Explorers)", "ESFP, The Entertainer (Explorers)", "Equi", "Tentang", "Masalah", "Solusi", "Manfaat", "informatika@itera.ac.id", "Edu2Com", "Galin Nichola Gibran", "Andi", "Frontend · ♂", "Bima", "Dika", "Backend · ♂", "Raka", "Sari", "UI/UX · ♀", "Nina", "Putri", "PM · ♀", "Lala", "Tia", "Yoga", "Fajar", "Rio", "PM · ♂", "coverage ∈ [0, 1]", "SN, TF, EI, JP ∈ [−1, 1]", "sat = (m − pos + 1) / m", "collegiality(K, τ) = α·affinity + β·congeniality + γ·motivation + δ·cohesion", "Low-Fidelity",
  "Novelty", "Marginal",
  // data modules: names and tags that stay; the sister-bkd entry in cases.ts is not shown anywhere (its page is hand-written)
  "Testing", "Sistem Informasi Akuntansi", "Pantau, Evaluasi, Laporkan", "GEMASTIK XVII", "Kaizen Room × Bangkit Academy",
  "Product Designer | Business Analyst", "Jakarta", "Kemdiktisaintek", "Data viz", "UAT", "Recruiter", "Hiring Manager", "Design Lead", "Design system",
  "The Ministry of Higher Education, Science and Technology needed one place to monitor lecturer-workload (BKD) reporting. The audience was a small, expert group: roughly 20 to 30 internal SISTER BKD administrators making national-level decisions.",
  "Designing the dashboard", "Working with the team",
  "Translated national lecturer-workload reporting needs into a centralised BKD analytics dashboard.",
  "Structured multi-layered datasets into 15+ pages with filters, charts, interactive maps and workload classifications.",
  "Validated data hierarchy, reporting terminology, dashboard structure and readability with project PICs and administrators.",
  "Coordinated with Product Managers, QA, database engineers and full-stack developers.",
  "Supported UAT and handoff for national-level monitoring and decision making.",
];
