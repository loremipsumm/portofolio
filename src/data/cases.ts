// Text case studies, written from the facts on the LinkedIn profile (no screens yet).
// Pages are generated from this list by src/pages/work/[slug].astro.
export interface CaseSection {
  heading: string;
  intro?: string;
  points: string[];
}

export interface CaseStudy {
  slug: string;
  title: string;
  full: string;
  client: string;
  period: string;
  role: string;
  place: string;
  sector: string;
  blurb: string;
  tags: string[];
  context: string;
  stats: { n: string; l: string }[];
  sections: CaseSection[];
}

// Newest first, by when the work happened.
export const cases: CaseStudy[] = [
  {
    slug: "bsi-bewize",
    title: "BEWIZE",
    full: "Wholesale digital banking",
    client: "PT Bank Syariah Indonesia Tbk.",
    period: "Sep 2026 – Present",
    role: "UI/UX Designer",
    place: "Jakarta Pusat",
    sector: "Banking & Finance",
    blurb:
      "Interface and UX research across three products of BSI's integrated wholesale banking platform: Cash Management, Value Chain and Trade Finance.",
    tags: ["UX Research", "Banking", "Prototyping", "B2B"],
    context:
      "I work in the Digital Banking Wholesale Group, a unit building digital solutions for corporate and institutional customers. Its team runs BEWIZE, an integrated platform that gives centralised access to transaction banking services and supports more efficient, connected financial operations.",
    stats: [
      { n: "3", l: "products in the ecosystem" },
      { n: "B2B", l: "corporate and institutional users" },
    ],
    sections: [
      {
        heading: "Cash Management, Value Chain and Trade Finance",
        intro: "One platform, three products, each with its own users and processes.",
        points: [
          "Responsible for interface development and user experience research across all three products.",
          "Work covers user research, requirement analysis, user flow development, wireframing, prototyping and interface design.",
          "Collaborate across functions to simplify complex banking processes into intuitive digital experiences.",
        ],
      },
    ],
  },
  {
    slug: "great-giant-foods",
    title: "Great Giant Foods",
    full: "Drone AI and SPKMobile",
    client: "Great Giant Foods",
    period: "Feb 2026 – Present",
    role: "Product Designer",
    place: "Indonesia",
    sector: "Agriculture",
    blurb:
      "Digital products for plantation operations: AI crop-health maps across 33,000 hectares, and a mobile workflow for roughly 25,000 field workers.",
    tags: ["Product Design", "Field research", "Mobile", "Data-heavy UI"],
    context:
      "Plantation work runs on specialised terminology, field workflows and large volumes of operational data. I translated all of that, plus business requirements, into usable interfaces and clear product specifications for two products.",
    stats: [
      { n: "33,000", l: "hectares in Drone AI" },
      { n: "7", l: "crop-health parameters" },
      { n: "200", l: "system users on SPKMobile" },
      { n: "25,000", l: "field workers managed" },
    ],
    sections: [
      {
        heading: "Drone AI",
        intro: "Maps and analytics that turn AI-generated insights into something plantation teams can act on.",
        points: [
          "Ran field research and stakeholder validation to learn plantation workflows, terminology, monitoring needs and operational pain points.",
          "Designed maps and analytics experiences across five plantation levels and seven crop-health parameters, covering 33,000 hectares.",
          "Prepared product documentation and developer handoff materials for a China-based engineering team that had limited access to business users.",
        ],
      },
      {
        heading: "SPKMobile",
        intro: "Task entry, reporting and payroll for the people who supervise the field.",
        points: [
          "Analysed the task-entry, reporting and payroll workflows used by 200 system users and 100+ supervisors managing approximately 25,000 field workers.",
          "Worked with stakeholders to define product requirements and turn complex operational processes into clearer mobile workflows.",
          "Ran usability validation and refined product flows from user and business feedback.",
        ],
      },
    ],
  },
  {
    slug: "sister-bkd",
    title: "SISTER-BKD",
    full: "National lecturer-workload dashboard",
    client: "Kemdiktisaintek",
    period: "Aug – Dec 2024",
    role: "UI/UX Designer",
    place: "Jakarta Pusat",
    sector: "Government",
    blurb:
      "A BKD management dashboard in SISTER: 13 tabs, five data distributions and an interactive map, shipped in seven Agile sprints.",
    tags: ["Dashboard", "Data viz", "Government", "UAT"],
    context:
      "The Ministry of Higher Education, Science and Technology needed one place to monitor lecturer-workload (BKD) reporting. The audience was a small, expert group: roughly 20 to 30 internal SISTER BKD administrators making national-level decisions.",
    stats: [
      { n: "15+", l: "dashboard pages" },
      { n: "20–30", l: "administrators" },
      { n: "4", l: "team roles coordinated" },
    ],
    sections: [
      {
        heading: "Designing the dashboard",
        points: [
          "Translated national lecturer-workload reporting needs into a centralised BKD analytics dashboard.",
          "Structured multi-layered datasets into 15+ pages with filters, charts, interactive maps and workload classifications.",
          "Validated data hierarchy, reporting terminology, dashboard structure and readability with project PICs and administrators.",
        ],
      },
      {
        heading: "Working with the team",
        points: [
          "Coordinated with Product Managers, QA, database engineers and full-stack developers.",
          "Supported UAT and handoff for national-level monitoring and decision making.",
        ],
      },
    ],
  },
];
