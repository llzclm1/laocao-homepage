import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const githubPagesHostSuffix = ["github", "io"].join(".");

assert.ok(fs.existsSync(path.join(dist, "index.html")), "dist/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "m", "index.html")), "dist/m/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "b", "index.html")), "dist/b/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "trade.css")), "dist/trade.css is missing");
assert.ok(fs.existsSync(path.join(dist, "nav", "index.html")), "dist/nav/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "game", "worldcup", "index.html")), "dist/game/worldcup/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "tools", "photo-booth", "index.html")), "dist/tools/photo-booth/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "tools", "photo-booth", "camera.html")), "dist/tools/photo-booth/camera.html is missing");
assert.ok(fs.existsSync(path.join(dist, "tools", "content-assistant", "index.html")), "dist/tools/content-assistant/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "tools", "content-assistant", "admin", "index.html")), "dist/tools/content-assistant/admin/index.html is missing");
assert.equal(fs.readFileSync(path.join(dist, "CNAME"), "utf8").trim(), "gewuji.dev", "dist/CNAME should keep the custom domain");

const textFiles = [
  "index.html",
  "game/worldcup/index.html",
  "stats.html",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "ai-sitemap.json"
];

for (const file of textFiles) {
  const text = fs.readFileSync(path.join(dist, file), "utf8");
  assert.equal(text.includes(githubPagesHostSuffix), false, `${file} should not hard-code GitHub Pages`);
}

const home = fs.readFileSync(path.join(dist, "index.html"), "utf8");
assert.ok(home.includes('href="for-buyers/"'), "homepage should link to the buyers page");
assert.ok(home.includes('href="for-factories/"'), "homepage should link to the factories page");
assert.ok(home.includes('href="field-materials/"'), "homepage should link to field materials");
assert.ok(home.includes('href="tools/"'), "homepage should keep a low-priority lab link");
assert.ok(home.includes('href="ai-sitemap.json"'), "homepage should expose the AI sitemap");
assert.equal(home.includes('id="guide"'), false, "homepage should not embed the utility navigation section");
assert.equal(home.includes("工位突围：世界杯摸鱼版"), false, "homepage should not feature the world cup event banner");
assert.equal(home.includes('href="tools/worldcup-advisor/"'), false, "homepage should not directly feature World Cup Advisor");
assert.equal(home.includes('src="assets/projects/worldcup-game-preview.png"'), false, "homepage should not use the old world cup PNG preview image");
assert.equal(home.includes('href="/'), false, "homepage should not use root-relative href paths");
assert.equal(home.includes('src="/'), false, "homepage should not use root-relative src paths");

const stats = fs.readFileSync(path.join(dist, "stats.html"), "utf8");
assert.ok(stats.includes('href="./"'), "stats page should use a relative home link");

const navPage = fs.readFileSync(path.join(dist, "nav", "index.html"), "utf8");
assert.ok(navPage.includes("实用工具导航"), "navigation page should keep its title copy");
assert.ok(navPage.includes('href="https://squoosh.app/"'), "navigation page should link to external utility tools");
assert.ok(navPage.includes('target="_blank" rel="noopener noreferrer"'), "navigation external links should open safely");
assert.equal(navPage.includes('href="/'), false, "navigation page should not use root-relative href paths");
assert.equal(navPage.includes('src="/'), false, "navigation page should not use root-relative src paths");

const contentAssistant = fs.readFileSync(path.join(dist, "tools", "content-assistant", "index.html"), "utf8");
assert.ok(contentAssistant.includes('src="./assets/'), "content assistant should use relative asset paths");
assert.equal(contentAssistant.includes('src="/'), false, "content assistant should not use root-relative src paths");
assert.equal(contentAssistant.includes('href="/'), false, "content assistant should not use root-relative href paths");

const contentAssistantAdmin = fs.readFileSync(path.join(dist, "tools", "content-assistant", "admin", "index.html"), "utf8");
assert.match(contentAssistantAdmin, /href="\.\/styles\.css(?:\?[^"]*)?"/, "content assistant admin should use relative stylesheet paths");
assert.match(contentAssistantAdmin, /src="\.\/script\.js(?:\?[^"]*)?"/, "content assistant admin should use relative script paths");
assert.equal(contentAssistantAdmin.includes('src="/'), false, "content assistant admin should not use root-relative src paths");
assert.equal(contentAssistantAdmin.includes('href="/'), false, "content assistant admin should not use root-relative href paths");

const worldcupAdvisor = fs.readFileSync(path.join(dist, "tools", "worldcup-advisor", "advisor", "index.html"), "utf8");
assert.ok(worldcupAdvisor.includes("../data/worldcup-odds.js"), "worldcup advisor should load odds cache");
assert.ok(worldcupAdvisor.includes("AI 摘要口径"), "worldcup advisor should expose GEO summary facts");
assert.ok(worldcupAdvisor.includes("世界杯最近比赛预测"), "worldcup advisor should use updated SEO schema");
assert.ok(fs.existsSync(path.join(dist, "tools", "worldcup-advisor", "data", "worldcup-odds.js")), "worldcup odds cache should be copied");

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
assert.ok(worldcup.includes('return lowMemory ? "auto" : "high";'), "browser H5 should default to high quality unless memory is constrained");
assert.ok(worldcup.includes("@media (max-width: 820px), (pointer: coarse)"), "mobile browser should fill the viewport height");
assert.ok(worldcup.includes("premiumName && premiumSources[premiumName]"), "worldcup characters should not fall back to old atlas sprites");

const godotWorldcup = path.join(dist, "game", "worldcup-godot", "index.html");
if (fs.existsSync(godotWorldcup)) {
  const godot = fs.readFileSync(godotWorldcup, "utf8");
  assert.equal(godot.includes(githubPagesHostSuffix), false, "godot worldcup page should not hard-code GitHub Pages");
  assert.equal(godot.includes('src="/'), false, "godot worldcup page should not use root-relative src paths");
  assert.equal(godot.includes('href="/'), false, "godot worldcup page should not use root-relative href paths");
  assert.ok(fs.existsSync(path.join(dist, "game", "worldcup-godot", "index.js")), "godot worldcup JS is missing");
  assert.ok(fs.existsSync(path.join(dist, "game", "worldcup-godot", "index.wasm")), "godot worldcup WASM is missing");
  assert.ok(fs.existsSync(path.join(dist, "game", "worldcup-godot", "index.pck")), "godot worldcup pack is missing");
}

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
assert.ok(sitemap.includes("/tools/photo-booth/"), "sitemap should include /tools/photo-booth/");
assert.ok(sitemap.includes("/nav/"), "sitemap should include /nav/");
assert.ok(sitemap.includes("/ai-sitemap.json"), "sitemap should include /ai-sitemap.json");
assert.ok(sitemap.includes("/tools/content-assistant/"), "sitemap should include /tools/content-assistant/");
assert.ok(sitemap.includes("/tools/content-assistant/admin/"), "sitemap should include /tools/content-assistant/admin/");
assert.ok(sitemap.includes("/for-factories/"), "sitemap should include /for-factories/");
assert.ok(sitemap.includes("/for-buyers/"), "sitemap should include /for-buyers/");
assert.equal(sitemap.includes("/m/"), false, "sitemap should not include standalone trade manufacturer page");
assert.equal(sitemap.includes("/b/"), false, "sitemap should not include standalone trade buyer page");

const llms = fs.readFileSync(path.join(dist, "llms.txt"), "utf8");
assert.ok(llms.includes("ai-sitemap.json"), "llms.txt should link to the AI sitemap");
assert.equal(llms.includes("https://gewuji.dev/m/"), false, "llms should not link standalone trade manufacturer page");
assert.equal(llms.includes("https://gewuji.dev/b/"), false, "llms should not link standalone trade buyer page");
assert.ok(llms.includes("贴贴研究所"), "llms.txt should include the photo booth project");
assert.ok(llms.includes("世界杯盘口情绪"), "llms.txt should include worldcup market sentiment keywords");
assert.ok(llms.includes("基准、保守、开放三种比分情景"), "llms.txt should explain worldcup score scenarios");
assert.ok(llms.includes("China Factory Bridge"), "llms.txt should include China Factory Bridge");
assert.ok(llms.includes("外贸开发信改写"), "llms.txt should include factory-side long-tail keywords");
assert.ok(llms.includes("China supplier verification"), "llms.txt should include buyer-side long-tail keywords");

const robots = fs.readFileSync(path.join(dist, "robots.txt"), "utf8");
assert.equal(robots.includes("AI-Sitemap:"), false, "robots should not include non-standard AI-Sitemap directives");
assert.equal(robots.includes("LLMs:"), false, "robots should not include non-standard LLMs directives");

const aiSitemap = JSON.parse(fs.readFileSync(path.join(dist, "ai-sitemap.json"), "utf8"));
const aiSitemapPaths = aiSitemap.pages.map((page) => new URL(page.url).pathname.replace(/^\/laocao-homepage/, ""));
assert.equal(aiSitemap.site.name, "格物集", "AI sitemap should describe the site");
assert.equal(aiSitemapPaths.includes("/m/"), false, "AI sitemap should not include standalone trade manufacturer page");
assert.equal(aiSitemapPaths.includes("/b/"), false, "AI sitemap should not include standalone trade buyer page");
assert.ok(aiSitemapPaths.includes("/tools/photo-booth/"), "AI sitemap should include the photo booth page");
assert.ok(aiSitemapPaths.includes("/tools/worldcup-advisor/advisor/"), "AI sitemap should include the worldcup advisor page");
assert.ok(aiSitemapPaths.includes("/for-factories/"), "AI sitemap should include the factory bridge factory page");
assert.ok(aiSitemapPaths.includes("/for-buyers/"), "AI sitemap should include the factory bridge buyer page");
assert.ok(JSON.stringify(aiSitemap).includes("不构成投注建议"), "AI sitemap should include the worldcup safety boundary");

const factoryPage = fs.readFileSync(path.join(dist, "for-factories/index.html"), "utf8");
const buyerPage = fs.readFileSync(path.join(dist, "for-buyers/index.html"), "utf8");
assert.ok(factoryPage.includes('rel="canonical" href="https://gewuji.dev/for-factories/"'), "factory page should expose canonical URL");
assert.ok(factoryPage.includes("外贸工厂资料诊断"), "factory page should include long-tail SEO copy");
assert.ok(factoryPage.includes('application/ld+json'), "factory page should include JSON-LD");
assert.ok(buyerPage.includes('rel="canonical" href="https://gewuji.dev/for-buyers/"'), "buyer page should expose canonical URL");
assert.ok(buyerPage.includes("China supplier verification"), "buyer page should include long-tail SEO copy");
assert.ok(buyerPage.includes('application/ld+json'), "buyer page should include JSON-LD");

console.log("static hosting audit ok");
