// Version history for each case study's home board, newest first, like Figma's version history panel.
// Every entry is taken from that case study page; `at` is the section id the board jumps to when it's picked.
export interface Version {
  title: string;
  meta: string; // a short line under the title: round, score, dates
  summary: string;
  changes?: string[];
  at: string;
}

export const versions: Record<string, Version[]> = {
  equiteam: [
    {
      title: "Final design",
      meta: "After testing round 2",
      summary: "The tested design, finished for hand-off with the flows a real semester needs.",
      changes: [
        "Hover tooltips with exact numbers on every analysis chart",
        "Lecturers confirm their role with a token",
        "Grouping method: number of groups or students per group",
        "Flows for incomplete classes and regrouping",
      ],
      at: "features",
    },
    {
      title: "Iteration 2",
      meta: "Round 2 · SUS 87.5 · severity 0.95",
      summary: "Teams were balanced in round 1, but testers couldn't say why. This version made the balance visible.",
      changes: ["Analysis charts for personality, skills, preferences and gender", "MBTI mascot icons", "Reviewers left only cosmetic issues; all ten testers scored it higher"],
      at: "evaluation",
    },
    {
      title: "Iteration 1",
      meta: "Round 1 · SUS 78 · severity 1.29",
      summary: "The first high-fidelity prototype for both roles, tested with a heuristic review by three designers and SUS + UEQ with ten users.",
      at: "evaluation",
    },
    {
      title: "Design system",
      meta: "Components + mascot cast",
      summary: "A system to make complex workflows lighter and easier to scan, and a mascot cast that makes personality data feel human.",
      at: "design-system",
    },
    {
      title: "Low-fidelity",
      meta: "Structure before visuals",
      summary: "Information hierarchy, what each screen is for, and workflow clarity across the platform.",
      at: "design",
    },
    {
      title: "Requirements",
      meta: "19 functional requirements",
      summary: "Interviews with lecturers and students turned into validated needs, use cases and requirements for both roles.",
      at: "research",
    },
  ],

  satya: [
    {
      title: "Final",
      meta: "Fixes from round 2",
      summary: "The two suggestions from the second round of testing, built in.",
      changes: ["Confirm-password field added to registration", "Inline notice when a username is already taken"],
      at: "iterate",
    },
    {
      title: "Round 2",
      meta: "SUS 80.5 · acceptable",
      summary: "Round 1's four suggestions were built in and tested again with five testers.",
      changes: [
        "Full name moved to the top of registration",
        "A declaration step and a confirmation before a report is sent",
        "Report history at the top of Kasus Terlapor",
        "Report straight from a programme's detail page",
      ],
      at: "test",
    },
    {
      title: "Round 1",
      meta: "SUS 68.5 · marginal",
      summary: "Five testers ran five scenarios and answered the 10-question System Usability Scale.",
      at: "test",
    },
    {
      title: "High-fidelity prototype",
      meta: "Seven features",
      summary: "Every flow designed in Figma, from following a programme to filing a report.",
      at: "prototype",
    },
    {
      title: "Research & ideation",
      meta: "Survey · 20–21 June 2024",
      summary: "An online survey with 10 respondents, an affinity diagram in FigJam, then low-fi wireframes for every flow.",
      at: "process",
    },
  ],

  "sister-bkd": [
    {
      title: "Merged to staging",
      meta: "Close-out · 30 Dec 2024",
      summary: "Final revisions from the stakeholder presentation, then a merge request into staging.",
      at: "sprints",
    },
    {
      title: "Sprints 2–7",
      meta: "Stable delivery",
      summary: "Approved wireframes became hi-fi screens built from one component set, and every user story got acceptance criteria and a definition of done.",
      at: "dashboard",
    },
    {
      title: "Sprint 1",
      meta: "Over 70% delivered",
      summary: "A deliberately light sprint for learning Agile. Wireframes were validated with the PM and stakeholders before any hi-fi.",
      at: "sprints",
    },
    {
      title: "Kick-off",
      meta: "6 Sep 2024",
      summary: "Plan with stakeholders, then research per role. I mapped the multi-layered BKD data to chart types.",
      at: "planning",
    },
  ],

  sia: [
    {
      title: "High-fidelity",
      meta: "50+ frames",
      summary: "Every flow at high fidelity, with colour kept for meaning: orange for audit, green for control, red for unbalanced.",
      at: "features",
    },
    {
      title: "The pipeline",
      meta: "Ledger to tax report",
      summary: "One pipeline from General Ledger to the corporate tax report, with the UI hung off it.",
      at: "flow",
    },
    {
      title: "Roles & access",
      meta: "4 roles",
      summary: "Every party mapped against every feature before any screen was drawn.",
      at: "roles",
    },
    {
      title: "Specification",
      meta: "16 modules · 34 requirements",
      summary: "Every step written as a numbered requirement and signed off with TDG.",
      at: "story",
    },
  ],

  teachtechai: [
    {
      title: "Built and delivered",
      meta: "Android client",
      summary: "I designed the flows and UI, then built the Android client myself, so nothing was lost in handoff.",
      at: "delivery",
    },
    {
      title: "Screens",
      meta: "Short lessons, then an AI coach",
      summary: "Authentication, the Discover dashboard and a profile area, each screen answering a problem from research.",
      at: "design",
    },
    {
      title: "User flows",
      meta: "3 flows",
      summary: "Three user flows mapped before any pixels.",
      at: "flows",
    },
    {
      title: "Design principles",
      meta: "4 principles",
      summary: "Never a blank box, learn in context, low-friction entry, and their language.",
      at: "define",
    },
    {
      title: "Discovery",
      meta: "Secondary research",
      summary: "Three ways teacher training fails, each turned into a design requirement.",
      at: "discover",
    },
  ],

  "bsi-bewize": [
    {
      title: "In progress",
      meta: "Sep 2026 – present",
      summary: "Interface and UX research across Cash Management, Value Chain and Trade Finance. This file is still being worked on.",
      at: "context",
    },
  ],

  "great-giant-foods": [
    {
      title: "In progress",
      meta: "Feb 2026 – present",
      summary: "Drone AI and SPKMobile for plantation operations. This file is still being worked on.",
      at: "context",
    },
  ],
};
