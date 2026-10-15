// FigJam-style annotations shown on each case study, only inside the home board (?embed): sticky notes,
// stickers and comment threads, plus what the fake collaborators say in cursor chat.
// Every fact here is taken from the case study page itself. The reviewers (Recruiter, Hiring Manager, Design Lead),
// their questions and the cursor chat are EXAMPLES written for this portfolio, not real comments, and the UI says so.
// They carry no timestamps for the same reason.
// Placement: `at` is a section id on that page (or "hero" for the first section); `side` picks the left or
// right margin of the content column (see global.css); `y` is px down from the section's top (stickers use a
// negative y so they straddle the section's top edge, over its padding).

export type Who = "RA" | "RC" | "HM" | "DL";
export const people: Record<Who, { name: string; color: string }> = {
  RA: { name: "Rafif Aditya", color: "#0d99ff" },
  RC: { name: "Recruiter", color: "#f24822" },
  HM: { name: "Hiring Manager", color: "#14ae5c" },
  DL: { name: "Design Lead", color: "#9747ff" },
};

export type StickyColor = "yellow" | "green" | "blue" | "pink" | "purple" | "orange";

interface Placed {
  at: string;
  side: "left" | "right";
  y: number;
}
export interface Sticky extends Placed {
  text: string;
  color: StickyColor;
  by: Who;
  stamps?: { e: string; by: Who }[];
}
export interface Sticker extends Placed {
  text: string;
  tone: "blue" | "green" | "orange" | "purple" | "ink";
}
export interface Thread extends Placed {
  id: string;
  messages: { by: Who; text: string; ago: string }[];
}
export interface Board {
  stickies: Sticky[];
  stickers: Sticker[];
  threads: Thread[];
  chat: { by: Who; text: string }[];
}

export const boards: Record<string, Board> = {
  "sister-bkd": {
    stickies: [
      { at: "case", side: "right", y: 110, color: "yellow", by: "RA", text: "Design once, fill 13 times: one template, five distributions, four interactions.", stamps: [{ e: "👍", by: "HM" }] },
      { at: "planning", side: "right", y: 120, color: "blue", by: "RA", text: "7 sprints · 25 epics · 316 tasks. Every screen had a story and a sprint." },
      { at: "sprints", side: "right", y: 110, color: "green", by: "RA", text: "Sprint 1 was for learning Agile, and still delivered over 70%.", stamps: [{ e: "🔥", by: "DL" }] },
    ],
    stickers: [{ at: "dashboard", side: "right", y: -22, text: "13 tabs shipped", tone: "green" }],
    threads: [
      {
        id: "sbkd-1", at: "case", side: "left", y: 96,
        messages: [
          { by: "HM", ago: "", text: "How did you keep 13 tabs consistent?" },
          { by: "RA", ago: "", text: "One page template with the same five data distributions on every tab, and chart components with their states built in. Developers build it once and fill it 13 times." },
        ],
      },
      {
        id: "sbkd-2", at: "sprints", side: "left", y: 96,
        messages: [
          { by: "DL", ago: "", text: "How could QA test the design without going back to the developers?" },
          { by: "RA", ago: "", text: "Every user story carried acceptance criteria and a definition of done, so QA could check a story on its own." },
        ],
      },
    ],
    chat: [
      { by: "RC", text: "One template for 13 tabs? Smart 👀" },
      { by: "HM", text: "Love the sprint breakdown" },
      { by: "DL", text: "States built into components 🙌" },
    ],
  },

  equiteam: {
    stickies: [
      { at: "overview", side: "right", y: 120, color: "yellow", by: "RA", text: "Equity had to be visible: a fair result can't stay hidden inside the model." },
      { at: "research", side: "right", y: 120, color: "pink", by: "RA", text: "Student persona: “If a system groups me, I want to know why I ended up there.”", stamps: [{ e: "❤️", by: "DL" }] },
      { at: "impact", side: "right", y: 110, color: "green", by: "RA", text: "SUS 78 → 87.5, from “good” to “excellent”. All ten testers scored it higher.", stamps: [{ e: "👍", by: "HM" }, { e: "🎉", by: "RC" }] },
    ],
    stickers: [{ at: "evaluation", side: "right", y: -22, text: "Heuristic severity −26%", tone: "purple" }],
    threads: [
      {
        id: "eq-1", at: "evaluation", side: "left", y: 80,
        messages: [
          { by: "RC", ago: "", text: "How did you evaluate it?" },
          { by: "RA", ago: "", text: "Two rounds. Each had a heuristic review by three product designers, plus SUS and UEQ with ten real users running task scenarios." },
        ],
      },
      {
        id: "eq-3", at: "edu2com", side: "left", y: 96,
        messages: [
          { by: "HM", ago: "", text: "How does the algorithm actually decide the teams?" },
          { by: "RA", ago: "", text: "Edu2Com treats every student as an agent with skills, a personality, a gender and preferences. It scores any candidate team with one number, collegiality: a weighted sum of skill coverage, personality and gender diversity, motivation for the task, and cohesion." },
          { by: "RA", ago: "", text: "Then it searches: it fills the hardest tasks first (the ones fewest students can cover), and keeps swapping members between teams while the score improves. It's an anytime search, so it can stop at any point and still return the best teams found so far." },
          { by: "DL", ago: "", text: "Why not just solve it exactly?" },
          { by: "RA", ago: "", text: "Giving every student one team is NP-complete, so an exact solver stalls as classes grow. In the thesis, Edu2Com matched the exact solver's best result on synthetic tests, far faster." },
        ],
      },
      {
        id: "eq-2", at: "features", side: "left", y: 96,
        messages: [
          { by: "DL", ago: "", text: "Where did the analysis charts come from?" },
          { by: "RA", ago: "", text: "Teams were technically balanced in round 1, but testers couldn't say why. The analysis charts and MBTI icons came from that gap." },
        ],
      },
    ],
    chat: [
      { by: "HM", text: "78 → 87.5 SUS, nice" },
      { by: "DL", text: "Explainability as a feature 👌" },
      { by: "RC", text: "Love the mascots" },
    ],
  },

  sia: {
    stickies: [
      { at: "story", side: "right", y: 110, color: "yellow", by: "RA", text: "Spec first: 16 modules and 34 functional requirements signed off with TDG.", stamps: [{ e: "👍", by: "HM" }] },
      { at: "roles", side: "right", y: 110, color: "orange", by: "RA", text: "Four roles, very different levels of trust. The access matrix shaped the sidebar." },
    ],
    stickers: [{ at: "flow", side: "right", y: -22, text: "Debit = Credit ✓", tone: "green" }],
    threads: [
      {
        id: "sia-1", at: "flow", side: "left", y: 90,
        messages: [
          { by: "HM", ago: "", text: "Why number every requirement?" },
          { by: "RA", ago: "", text: "It made reviews with TDG fast. “Is 09.05 in?” beats “is the green thing done?”" },
        ],
      },
      {
        id: "sia-2", at: "takeaways", side: "left", y: 90,
        messages: [
          { by: "DL", ago: "", text: "Why keep the interface so grey?" },
          { by: "RA", ago: "", text: "Keeping the chrome grey let orange (audit), green (control) and red (unbalanced) do real work." },
        ],
      },
    ],
    chat: [
      { by: "DL", text: "Colour only for meaning 👌" },
      { by: "RC", text: "Accounting UX, brave 😄" },
      { by: "HM", text: "The access matrix is great" },
    ],
  },

  satya: {
    stickies: [
      { at: "brief", side: "right", y: 90, color: "yellow", by: "RA", text: "37/100: Indonesia's 2020 Corruption Perceptions Index score. We picked accountability." },
      { at: "process", side: "right", y: 110, color: "blue", by: "RA", text: "10/10 respondents want detail on programmes, budgets and who's responsible.", stamps: [{ e: "👍", by: "DL" }] },
    ],
    stickers: [{ at: "test", side: "right", y: -22, text: "SUS 68.5 → 80.5", tone: "orange" }],
    threads: [
      {
        id: "satya-1", at: "test", side: "left", y: 90,
        messages: [
          { by: "RC", ago: "", text: "How did you test it?" },
          { by: "RA", ago: "", text: "Five testers per round ran five scenarios and answered the 10-question System Usability Scale. Two rounds took it from marginal to acceptable." },
        ],
      },
      {
        id: "satya-2", at: "iterate", side: "left", y: 90,
        messages: [
          { by: "DL", ago: "", text: "Did the feedback actually change the screens?" },
          { by: "RA", ago: "", text: "Six suggestions, six fixes. Each card shows the screen before and after." },
        ],
      },
    ],
    chat: [
      { by: "HM", text: "Civic tech 🙌" },
      { by: "DL", text: "Before/after slider is neat" },
      { by: "RC", text: "GEMASTIK entry, nice" },
    ],
  },

  teachtechai: {
    stickies: [
      { at: "discover", side: "right", y: 100, color: "yellow", by: "RA", text: "Three gaps, three requirements: no time, one size fits all, hard to reach." },
      { at: "define", side: "right", y: 110, color: "green", by: "RA", text: "Never a blank box: prompt cards give teachers a first message to send.", stamps: [{ e: "❤️", by: "HM" }] },
    ],
    stickers: [{ at: "delivery", side: "right", y: -22, text: "Designed it, then built it", tone: "blue" }],
    threads: [
      {
        id: "tt-1", at: "delivery", side: "left", y: 90,
        messages: [
          { by: "HM", ago: "", text: "Did you only design the app?" },
          { by: "RA", ago: "", text: "I designed the flows and UI, then built the Android client myself, so nothing was lost in handoff." },
        ],
      },
      {
        id: "tt-2", at: "reflection", side: "left", y: 90,
        messages: [
          { by: "DL", ago: "", text: "What would you do next?" },
          { by: "RA", ago: "", text: "This project leaned on secondary research. Next I would interview teachers directly and usability-test the prompt cards before shipping more topics." },
        ],
      },
    ],
    chat: [
      { by: "RC", text: "Designer who ships Kotlin 👀" },
      { by: "DL", text: "Prompt cards = great idea" },
      { by: "HM", text: "Watching the demo now" },
    ],
  },

  "bsi-bewize": {
    stickies: [
      { at: "context", side: "right", y: 90, color: "yellow", by: "RA", text: "One platform, three products: Cash Management, Value Chain and Trade Finance." },
    ],
    stickers: [{ at: "work", side: "right", y: -22, text: "B2B banking", tone: "purple" }],
    threads: [
      {
        id: "bw-1", at: "work", side: "left", y: 90,
        messages: [
          { by: "RC", ago: "", text: "What does your role cover?" },
          { by: "RA", ago: "", text: "User research, requirement analysis, user flows, wireframing, prototyping and interface design across all three products." },
        ],
      },
    ],
    chat: [
      { by: "HM", text: "Corporate banking, tough domain" },
      { by: "RC", text: "Three products at once 👀" },
    ],
  },

  "great-giant-foods": {
    stickies: [
      { at: "context", side: "right", y: 90, color: "green", by: "RA", text: "Drone AI: 33,000 hectares, five plantation levels, seven crop-health parameters.", stamps: [{ e: "🔥", by: "HM" }] },
      { at: "work", side: "right", y: 110, color: "yellow", by: "RA", text: "SPKMobile: 200 system users and 100+ supervisors managing about 25,000 field workers." },
    ],
    stickers: [{ at: "context", side: "left", y: -22, text: "Field research", tone: "orange" }],
    threads: [
      {
        id: "ggf-1", at: "work", side: "left", y: 90,
        messages: [
          { by: "DL", ago: "", text: "How did you hand off to the engineers?" },
          { by: "RA", ago: "", text: "Product documentation and handoff materials for a China-based engineering team that had limited access to business users." },
        ],
      },
    ],
    chat: [
      { by: "RC", text: "33,000 hectares 🤯" },
      { by: "DL", text: "Data-heavy UI done right" },
    ],
  },
};
