import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const promptsFile = path.join(root, "docs/growth-os/monitoring/geo-monitoring.md");
const prompts = fs
  .readFileSync(promptsFile, "utf8")
  .split(/\r?\n/)
  .filter((line) => /^\d+\.\s/.test(line.trim()))
  .map((line) => line.replace(/^\d+\.\s*/, "").trim());

console.log("# GEO Monitoring Report");
console.log("");
console.log(`Prompt count: ${prompts.length}`);
console.log("");
console.log("| Platform | Prompt | Mentioned | Citation | Accuracy | Boundary correct | Notes |");
console.log("|---|---|---|---|---|---|---|");

for (const platform of ["ChatGPT", "Perplexity", "Gemini"]) {
  for (const prompt of prompts) {
    console.log(`| ${platform} | ${prompt.replaceAll("|", "\\|")} |  |  |  |  |  |`);
  }
}
