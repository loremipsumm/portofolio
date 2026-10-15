// Indonesian dictionary, assembled from one file per area. Keys are the English strings as the pages show them
// (whitespace collapsed); see scripts/i18n.ts. Semi-formal Indonesian, with common design and tech terms left in English.
import { home } from "./home.ts";
import { common } from "./common.ts";
import { bewize } from "./bewize.ts";
import { ggf } from "./ggf.ts";
import { teachtechai } from "./teachtechai.ts";
import { satya } from "./satya.ts";
import { sisterBkd } from "./sister-bkd.ts";
import { sia } from "./sia.ts";
import { equiteam, equiteamGroups } from "./equiteam.ts";
import { equiteamMbti } from "./equiteam-mbti.ts";
import { app } from "./app.ts";
import { notes } from "./notes.ts";
import { versionsId } from "./versions.ts";
import { toursId } from "./tours.ts";
import { cursorsId } from "./cursors.ts";
import { dataId } from "./data.ts";
import { patterns } from "./patterns.ts";

export type Dict = Record<string, string>;
export const id: Dict = { ...home, ...common, ...bewize, ...ggf, ...teachtechai, ...satya, ...sisterBkd, ...sia, ...equiteam, ...equiteamMbti, ...app, ...notes, ...versionsId, ...toursId, ...cursorsId, ...dataId };
// Elements whose text is split over several nodes by styled spans: "fragment|fragment" -> one translation per fragment.
export const groups: Record<string, string[]> = { ...equiteamGroups };
export { patterns };
