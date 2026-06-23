import fs from "node:fs/promises";
import path from "node:path";

import {
  buildEmptyOddsPayload,
  buildOddsPayload
} from "./worldcup-odds-utils.mjs";

const outputPath = path.join(process.cwd(), "tools", "worldcup-advisor", "data", "worldcup-odds.js");
const apiKey = process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY || "";
const sportKey = "soccer_fifa_world_cup";
const markets = "h2h,spreads,totals";
const regions = process.env.WORLDCUP_ODDS_REGIONS || "us,uk,eu";

const syncedAt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
}).format(new Date()).replace(" ", " ");

let payload;

if (!apiKey) {
  payload = buildEmptyOddsPayload({
    reason: "missing_api_key",
    syncedAt: `${syncedAt} Asia/Shanghai`
  });
} else {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", regions);
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "gewuji-worldcup-advisor/1.0"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`The Odds API returned ${response.status}: ${errorText.slice(0, 180)}`);
  }

  payload = buildOddsPayload({
    events: await response.json(),
    syncedAt: `${syncedAt} Asia/Shanghai`
  });
  payload.regions = regions.split(",").map((region) => region.trim()).filter(Boolean);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  `window.worldCupAdvisorOdds = ${JSON.stringify(payload, null, 2)};\n`,
  "utf8"
);

console.log(payload.available
  ? `Synced ${payload.events.length} world cup odds events from The Odds API`
  : `World cup odds unavailable: ${payload.reason}`);
