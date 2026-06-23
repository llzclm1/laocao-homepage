import fs from "node:fs/promises";
import path from "node:path";

const outputPath = path.join(process.cwd(), "tools", "worldcup-advisor", "data", "worldcup-2026.js");
const sources = [
  {
    name: "upbound-web/worldcup-live.json",
    url: "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json"
  },
  {
    name: "openfootball/worldcup.json",
    url: "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
  }
];

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "gewuji-worldcup-advisor/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`${source.name} returned ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.matches) || data.matches.length < 100) {
    throw new Error(`${source.name} did not return a full match list`);
  }

  return data;
}

let selectedSource;
let data;
const errors = [];

for (const source of sources) {
  try {
    data = await fetchSource(source);
    selectedSource = source;
    break;
  } catch (error) {
    errors.push(`${source.name}: ${error.message}`);
  }
}

if (!data || !selectedSource) {
  throw new Error(`No world cup data source available. ${errors.join("; ")}`);
}

const syncedAt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
}).format(new Date()).replace(" ", " ");

const payload = {
  name: data.name,
  source: selectedSource,
  fallbackSources: sources.filter((source) => source.name !== selectedSource.name),
  syncedAt: `${syncedAt} Asia/Shanghai`,
  totalMatches: data.matches.length,
  completedMatches: data.matches.filter((match) => Array.isArray(match.score?.ft)).length,
  matches: data.matches
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  `window.worldCupAdvisorData = ${JSON.stringify(payload, null, 2)};\n`,
  "utf8"
);

console.log(`Synced ${payload.completedMatches}/${payload.totalMatches} matches from ${selectedSource.name}`);
