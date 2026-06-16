import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const githubPagesHostSuffix = ["github", "io"].join(".");

assert.ok(fs.existsSync(path.join(dist, "index.html")), "dist/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "game", "worldcup", "index.html")), "dist/game/worldcup/index.html is missing");
assert.equal(fs.readFileSync(path.join(dist, "CNAME"), "utf8").trim(), "gewuji.dev", "dist/CNAME should keep the custom domain");

const textFiles = [
  "index.html",
  "game/worldcup/index.html",
  "stats.html",
  "sitemap.xml",
  "robots.txt",
  "llms.txt"
];

for (const file of textFiles) {
  const text = fs.readFileSync(path.join(dist, file), "utf8");
  assert.equal(text.includes(githubPagesHostSuffix), false, `${file} should not hard-code GitHub Pages`);
}

const home = fs.readFileSync(path.join(dist, "index.html"), "utf8");
assert.ok(home.includes('href="game/worldcup/index.html"'), "homepage should link to the worldcup index with a relative URL");
assert.ok(home.includes("工位突围：世界杯摸鱼版"), "homepage should include the world cup event banner");
assert.ok(home.includes('src="assets/projects/worldcup-game-preview.png"'), "homepage should use the world cup preview image");
assert.equal(home.includes('href="/'), false, "homepage should not use root-relative href paths");
assert.equal(home.includes('src="/'), false, "homepage should not use root-relative src paths");

const stats = fs.readFileSync(path.join(dist, "stats.html"), "utf8");
assert.ok(stats.includes('href="./"'), "stats page should use a relative home link");

const worldcup = fs.readFileSync(path.join(dist, "game", "worldcup", "index.html"), "utf8");
assert.ok(worldcup.includes('assets/worldcup/worldcup_player_idle.png'), "worldcup page should use relative worldcup assets");
assert.equal(worldcup.includes(githubPagesHostSuffix), false, "worldcup page should not hard-code GitHub Pages");
assert.equal(worldcup.includes('src="/'), false, "worldcup page should not use root-relative src paths");
assert.equal(worldcup.includes('href="/'), false, "worldcup page should not use root-relative href paths");
assert.equal(worldcup.includes("../wechat-game/"), false, "worldcup page should not request old wechat-game fallback assets");
assert.equal(worldcup.includes("手机APP版"), false, "worldcup page should not request old local app fallback assets");
assert.equal(worldcup.includes("assets/premium/"), false, "worldcup page should not request missing premium fallback assets");
assert.equal(worldcup.includes("if (simplified && !e.boss && !e.elite)"), false, "low quality should not draw old simple enemy colors");
assert.ok(worldcup.includes("function defaultQualityMode()"), "worldcup page should choose quality defaults per device");
assert.ok(worldcup.includes("const narrowViewport = width > 0 && width <= 820;"), "mobile-width browser should default to auto quality");
assert.ok(worldcup.includes('return coarsePointer || narrowViewport || lowMemory ? "auto" : "high";'), "desktop browser should default to high quality");

const requiredAssets = [
  "game/worldcup/assets/office_survivor_atlas.png",
  "game/worldcup/assets/worldcup/worldcup_player_idle.png",
  "game/worldcup/assets/worldcup/worldcup_player_run.png",
  "game/worldcup/assets/worldcup/worldcup_patrol_colleague.png",
  "game/worldcup/assets/worldcup/worldcup_hr.png",
  "game/worldcup/assets/worldcup/worldcup_boss.png",
  "game/worldcup/assets/worldcup/worldcup_message_supervisor.png",
  "game/worldcup/assets/worldcup/worldcup_meeting_notice.png",
  "assets/projects/worldcup-game-preview.png"
];

for (const file of requiredAssets) {
  const asset = path.join(dist, file);
  assert.ok(fs.existsSync(asset), `${file} is missing`);
  const bytes = fs.readFileSync(asset);
  assert.equal(bytes.slice(1, 4).toString("ascii"), "PNG", `${file} should be PNG`);
}

const sitemap = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8");
assert.ok(sitemap.includes("/game/worldcup/"), "sitemap should include /game/worldcup/");

console.log("static hosting audit ok");
