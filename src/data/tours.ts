// Spotlight tours for the home boards: Rafif's cursor walks the visitor through each case study and explains
// it in cursor chat, like following a presenter in FigJam. `at` is a section id ("" = the top of the page);
// every line restates something the case study page itself says.
export interface TourStep {
  at: string;
  say: string;
}

const hello = (name: string) => ({ at: "", say: `Hi, I'm Rafif. Follow me through ${name}, it takes about a minute.` });
const bye = { at: "", say: "That's the tour. Leave a comment (C) if anything's unclear, or share the file with your team." };

export const tours: Record<string, TourStep[]> = {
  equiteam: [
    hello("EquiTeam"),
    { at: "overview", say: "EquiTeam turns a research algorithm, Edu2Com, into a workflow lecturers and students actually use." },
    { at: "research", say: "I started with interviews: lecturers and students at ITERA, and five key findings." },
    { at: "edu2com", say: "The engine scores every candidate team on skills, personality, gender and motivation." },
    { at: "features", say: "Nine features follow a real semester, from setting up a class to seeing why a team is fair." },
    { at: "evaluation", say: "Two rounds of testing took SUS from 78 to 87.5." },
    { at: "impact", say: "The fairness Edu2Com computes is now visible, checkable and adjustable." },
    bye,
  ],
  satya: [
    hello("SATYA"),
    { at: "brief", say: "Indonesia scored 37/100 on the 2020 Corruption Perceptions Index. We picked accountability." },
    { at: "process", say: "Design Thinking: a survey with 10 respondents, an affinity diagram, then wireframes." },
    { at: "prototype", say: "Seven features: follow a programme, see who's responsible, discuss it, report it." },
    { at: "test", say: "Two rounds of testing took SUS from 68.5, marginal, to 80.5, acceptable." },
    { at: "iterate", say: "Six suggestions from testers, six fixes. Drag the cards to compare before and after." },
    bye,
  ],
  "sister-bkd": [
    hello("SISTER BKD"),
    { at: "case", say: "My job: make BKD data readable, and the design buildable, repeatable and testable." },
    { at: "planning", say: "7 sprints, 25 epics, 316 tasks. Design followed the same plan as the build." },
    { at: "sprints", say: "Design shipped alongside the build, one small part per sprint." },
    { at: "dashboard", say: "One template, 13 tabs, five data distributions, so developers build it once." },
    { at: "learnings", say: "The lesson I'd keep: design in components, not screens." },
    bye,
  ],
  sia: [
    hello("SIA"),
    { at: "story", say: "Before drawing a screen, I mapped every step from ledger import to the tax report." },
    { at: "roles", say: "Four roles with very different levels of trust. The access matrix shaped the sidebar." },
    { at: "flow", say: "One pipeline, from General Ledger to the corporate tax report. The whole UI hangs off it." },
    { at: "features", say: "50+ high-fidelity frames, with colour used only for meaning." },
    { at: "takeaways", say: "What I'd tell my past self: write the spec, then draw." },
    bye,
  ],
  teachtechai: [
    hello("TeachTechAI"),
    { at: "discover", say: "Teacher training fails in three ways: no time, one size fits all, and hard to reach." },
    { at: "define", say: "Four principles shaped every screen, starting with: never a blank box." },
    { at: "flows", say: "Three user flows, mapped before any pixels." },
    { at: "design", say: "Short lessons, then practice with an AI coach." },
    { at: "delivery", say: "I designed it, then built the Android client myself." },
    bye,
  ],
  "bsi-bewize": [
    hello("BEWIZE"),
    { at: "context", say: "One platform, three products for corporate banking: Cash Management, Value Chain and Trade Finance." },
    { at: "work", say: "My scope: research, requirements, flows, wireframes, prototypes and UI." },
    { at: "details", say: "This one is ongoing, so the details are best over a call." },
    bye,
  ],
  "great-giant-foods": [
    hello("Great Giant Foods"),
    { at: "context", say: "Drone AI covers 33,000 hectares; SPKMobile serves about 25,000 field workers." },
    { at: "work", say: "Field research first, then maps, analytics and mobile workflows." },
    { at: "details", say: "This one is ongoing, so the details are best over a call." },
    bye,
  ],
};
