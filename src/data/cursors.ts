// Reviewer cursors on a case study shown as a home board (see board-cursors.ts). Each scene is one cursor that sits
// at the part of the page it is talking about, and acts when that part scrolls into view. Three modes, so they do not
// all look the same:
//   select   drags a marquee over the block, selects it with a frame, then says its line (and may react)
//   comment  goes to a spot beside the block and just says its line, no selection
//   react    goes to a spot on the block and only drops an emote
// `from` is the corner a select drag starts from, `side` and `y` (0 to 1 down the block) place a comment or a reaction.
// What each persona cares about decides where it goes:
//   RC (Recruiter)       scope and role, numbers and impact, the team and timeline.
//   HM (Hiring Manager)  process rigour, decisions and trade-offs, validation, handoff to engineers.
//   DL (Design Lead)     research quality, structure, the design system and UI craft, iteration after testing.
// Scenes sit on parts that add something the headings alone do not say (a trade-off, a constraint, a detail), not on
// every section. `at` is a section id on the page and `find` a piece of text inside it; the block that holds that text
// is the one used. Every fact is taken from the page itself. The comments are EXAMPLES written for this portfolio, not
// real reviews, and the cursor says so. Keep `find` short and exact: it must sit in a single piece of text on the page.
import type { Who } from "./annotations";

export interface Scene {
  who: Exclude<Who, "RA">;
  at: string;
  find: string;
  mode?: "select" | "comment" | "react";
  from?: "nw" | "ne" | "sw" | "se";
  side?: "left" | "right";
  y?: number;
  say?: string;
  react?: string;
}

export const scenes: Record<string, Scene[]> = {
  equiteam: [
    { who: "RC", at: "overview", find: "As a sole developer", mode: "comment", side: "right", y: 0.4, say: "Designer and sole developer, clearly split. Easy to see who owned what." },
    { who: "DL", at: "research", find: "Input needs to be simple, without lowering grouping quality", mode: "comment", side: "left", y: 0.5, say: "Simple input without losing quality is the hard constraint of this product." },
    { who: "HM", at: "edu2com", find: "Why not just solve it exactly?", mode: "select", from: "ne", say: "NP-complete, so a heuristic. Good that the trade-off is explained, not hidden.", react: "👍" },
    { who: "DL", at: "features", find: "These charts were added after round 1", mode: "react", side: "right", y: 0.5, react: "🔥" },
    { who: "HM", at: "evaluation", find: "Average across Nielsen's 10 heuristics", mode: "comment", side: "right", y: 0.3, say: "Heuristics, SUS and UEQ: three lenses on usability, not one score." },
    { who: "RC", at: "impact", find: "Explainability is a feature, not a footnote.", mode: "select", from: "sw", say: "SUS 78 → 87.5 traced to one specific fix. That is a strong story.", react: "🎉" },
  ],
  sia: [
    { who: "HM", at: "story", find: "Share it, and everyone sees everything.", mode: "comment", side: "right", y: 0.3, say: "All-or-nothing access is the bigger risk here, more than the version mess." },
    { who: "DL", at: "roles", find: "Colour should carry meaning in dense data", mode: "react", side: "left", y: 0.5, react: "🔥" },
    { who: "RC", at: "flow", find: "Written module by module as an SRS", mode: "comment", side: "left", y: 0.5, say: "16 numbered SRS modules. The paper trail clients ask for." },
    { who: "DL", at: "features", find: "Every field error is designed inline", mode: "comment", side: "right", y: 0.4, say: "Inline errors and the OTP timer, designed rather than left to the developer." },
    { who: "HM", at: "features", find: "Fully written into the SKPL, but there are no hi-fi screens", mode: "select", from: "se", say: "Honest about what has no hi-fi yet. I prefer that to a polished fake.", react: "👍" },
    { who: "DL", at: "takeaways", find: "Colour is for meaning in data UI.", mode: "react", side: "right", y: 0.4, react: "❤️" },
  ],
  satya: [
    { who: "RC", at: "brief", find: "Complaint portals exist", mode: "comment", side: "right", y: 0.5, say: "The gap is trust: people cannot see where the money goes. Sharp framing." },
    { who: "HM", at: "prototype", find: "Anonymity for reporters is part of the concept", mode: "comment", side: "left", y: 0.5, say: "Anonymity as part of the concept, not a setting. Reporters need that." },
    { who: "DL", at: "test", find: "Each dot is one tester", mode: "react", side: "right", y: 0.5, react: "👍" },
    { who: "DL", at: "iterate", find: "Six suggestions, six fixes", mode: "select", from: "sw", say: "Every tester comment traced to a screen change. Rare to see the loop closed.", react: "❤️" },
    { who: "RC", at: "impact", find: "Scope: Indonesian citizens aged 18+", mode: "react", side: "left", y: 0.5, react: "👀" },
    { who: "HM", at: "impact", find: "Police, KPK, the Supreme Court", mode: "comment", side: "right", y: 0.5, say: "Thinks about who acts on a report, not only who files it." },
  ],
  teachtechai: [
    { who: "RC", at: "discover", find: "of teachers feel they need more training", mode: "react", side: "right", y: 0.5, react: "👀" },
    { who: "HM", at: "flows", find: "Branch early on", mode: "comment", side: "right", y: 0.5, say: "A recovery path instead of a dead end. Small decision, big difference." },
    { who: "DL", at: "design", find: "Solves: no time, blank-box anxiety", mode: "select", from: "ne", say: "Prompt cards remove the blank box. Each screen names the problem it solves.", react: "🔥" },
    { who: "HM", at: "delivery", find: "All resource access is private", mode: "comment", side: "left", y: 0.5, say: "Private by default, no public IP. Unusual care for a design-led build." },
    { who: "RC", at: "delivery", find: "I designed the flows and UI, then built the Android client", mode: "react", side: "right", y: 0.4, react: "🎉" },
    { who: "DL", at: "reflection", find: "This project leaned on secondary research", mode: "comment", side: "right", y: 0.5, say: "Prompt cards not yet tested with teachers, and it is flagged. Good." },
  ],
  "sister-bkd": [
    { who: "RC", at: "case", find: "Hundreds of thousands of reports", mode: "react", side: "left", y: 0.5, react: "👀" },
    { who: "HM", at: "planning", find: "Every epic broken down until each task could be tracked", mode: "comment", side: "left", y: 0.5, say: "Design tasks tracked like engineering tasks. That is how design gets planned." },
    { who: "RC", at: "sprints", find: "Learn Agile on a deliberately light sprint", mode: "comment", side: "right", y: 0.4, say: "Most teams skip learning the process. Over 70% delivered anyway." },
    { who: "DL", at: "dashboard", find: "States are part of the component", mode: "select", from: "nw", say: "Tooltips and dimmed states as components. QA can test those.", react: "🔥" },
    { who: "HM", at: "learnings", find: "Two recommendations for whoever picks this up.", mode: "comment", side: "right", y: 0.3, say: "Ends with a handover and a paused idea explained. Mature." },
  ],
  "bsi-bewize": [
    { who: "RC", at: "context", find: "Digital Banking Wholesale Group", mode: "comment", side: "right", y: 0.5, say: "Corporate customers, not consumers. Different users, different stakes." },
    { who: "HM", at: "work", find: "One platform, three products, each with its own users", mode: "select", from: "nw", say: "Three products on one platform. Prioritising across them is the hard part.", react: "👀" },
    { who: "DL", at: "work", find: "Collaborate across functions to simplify", mode: "react", side: "right", y: 0.5, react: "👍" },
  ],
  "great-giant-foods": [
    { who: "RC", at: "context", find: "Plantation work runs on specialised terminology", mode: "comment", side: "left", y: 0.5, say: "Domain-heavy. The first job is learning the vocabulary." },
    { who: "DL", at: "work", find: "Maps and analytics that turn AI-generated insights", mode: "select", from: "ne", say: "AI output only matters if teams can act on it. Maps do that.", react: "🔥" },
    { who: "HM", at: "work", find: "Analysed the task-entry, reporting and payroll workflows", mode: "comment", side: "right", y: 0.5, say: "200 users and 100+ supervisors: a workflow used daily, not a demo." },
    { who: "RC", at: "work", find: "Prepared product documentation and developer handoff", mode: "comment", side: "left", y: 0.5, say: "Handoff docs for a team with little access to users. That is hard." },
  ],
};
