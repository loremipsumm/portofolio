# Rafif Aditya · Portfolio (Figma edition)

The portfolio presented as the Figma desktop app. The home page (`/`) is Figma's "My Work" file browser, and every
case study opens in place as a FigJam board.

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # production site in ./dist
pnpm preview    # serve the build
```

## How it fits together

| Where | What |
| :-- | :-- |
| `src/pages/index.astro` | The home: tab bar, sidebar, file grid/list, quick actions (Ctrl/⌘ K), share and settings dialogs |
| `src/scripts/figma-app.ts` | All home and board behaviour: tabs, menus, boards, Present mode, guided tour, version history, comments |
| `src/pages/work/*.astro` | The case studies. A board loads one in an iframe with `?embed`, which strips the site chrome and styles it as FigJam; opened directly, it is a normal page |
| `src/data/annotations.ts` | Sticky notes, stickers, comment threads and cursor chat on each board |
| `src/data/versions.ts`, `src/data/tours.ts` | Version history entries and the "Follow Rafif" tour steps |
| `src/data/site.ts`, `cases.ts`, `profile.ts` | Site info, the text case studies and the CV data used in the account dialog |
| `src/scripts/board-notes.ts`, `board-sections.ts` | Run inside a case page when it is shown as a board: annotations, comment mode, section frames |

Content for each case study comes from the case study page itself; keep the data files in sync when a page changes.
