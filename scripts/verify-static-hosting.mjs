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
assert.ok(fs.existsSync(path.join(dist, "contact", "index.html")), "dist/contact/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "en", "field-materials", "index.html")), "dist/en/field-materials/index.html is missing");
assert.ok(fs.existsSync(path.join(dist, "favicon.ico")), "dist/favicon.ico is missing");
assert.ok(fs.existsSync(path.join(dist, "lab", "index.html")), "dist/lab/index.html is missing");
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
assert.ok(home.includes('href="https://factory.gewuji.dev/for-factories/"'), "homepage should link to the factory-side entrance");
assert.ok(home.includes('href="https://factory.gewuji.dev/for-buyers/"'), "homepage should link to the buyer-side entrance");
assert.ok(home.includes('href="https://factory.gewuji.dev/free-supplier-reply-review/"'), "homepage should link to the supplier reply review action");
assert.ok(home.includes('href="field-materials/"'), "homepage should link to field materials");
assert.ok(home.includes('href="tools/"'), "homepage should keep a low-priority lab link");
assert.ok(home.includes('href="ai-sitemap.json"'), "homepage should expose the AI sitemap");
assert.equal(home.includes('id="guide"'), false, "homepage should not embed the utility navigation section");
assert.equal(home.includes("工位突围：世界杯摸鱼版"), false, "homepage should not feature the world cup event banner");
assert.equal(home.includes('href="tools/worldcup-advisor/"'), false, "homepage should not directly feature World Cup Advisor");
assert.equal(home.includes('src="assets/projects/worldcup-game-preview.png"'), false, "homepage should not use the old world cup PNG preview image");
assert.equal(home.includes('href="/'), false, "homepage should not use root-relative href paths");
assert.equal(home.includes('src="/'), false, "homepage should not use root-relative src paths");

const englishHome = fs.readFileSync(path.join(dist, "en", "index.html"), "utf8");
assert.ok(englishHome.includes("Factory Bridge"), "English homepage should follow the Factory Bridge positioning");
assert.ok(englishHome.includes("Field Evidence"), "English homepage should link to field evidence");
assert.ok(englishHome.includes('href="field-materials/"'), "English homepage should link to English field materials");
assert.ok(englishHome.includes("https://gewuji.dev/en/field-materials/"), "English homepage structured data should link to English field materials");
assert.equal(englishHome.includes("Personal Product Lab"), false, "English homepage should not use the old product lab positioning");
assert.equal(englishHome.includes("Selected Work"), false, "English homepage should not feature the old project grid");

function extractMatches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function extractBlocks(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

function normalizeEnglishHomeHref(href) {
  return href.replace(/^\.\.\//, "").replace(/^#top$/, "#top");
}

function isCoreHomeLink(href) {
  return href !== "" && href !== "en/";
}

function assertSameItems(actual, expected, message) {
  assert.deepEqual([...new Set(actual)].sort(), [...new Set(expected)].sort(), message);
}

const homeSections = extractMatches(home, /<section\b[^>]*\bid="([^"]+)"/g);
const englishHomeSections = extractMatches(englishHome, /<section\b[^>]*\bid="([^"]+)"/g);
assertSameItems(englishHomeSections, homeSections, "English homepage sections should match Chinese homepage sections");

const homeNavLinks = extractBlocks(home, /<nav\b[\s\S]*?<\/nav>/g)
  .flatMap((nav) => extractMatches(nav, /href="([^"]+)"/g))
  .filter(isCoreHomeLink);
const englishHomeNavLinks = extractBlocks(englishHome, /<nav\b[\s\S]*?<\/nav>/g)
  .flatMap((nav) => extractMatches(nav, /href="([^"]+)"/g))
  .map(normalizeEnglishHomeHref)
  .filter(isCoreHomeLink);
assertSameItems(englishHomeNavLinks, homeNavLinks, "English homepage nav links should match Chinese homepage nav links");

const homeHeroLinks = extractBlocks(home, /<div class="hero-actions"[\s\S]*?<\/div>/g)
  .flatMap((block) => extractMatches(block, /href="([^"]+)"/g));
const englishHomeHeroLinks = extractBlocks(englishHome, /<div class="hero-actions"[\s\S]*?<\/div>/g)
  .flatMap((block) => extractMatches(block, /href="([^"]+)"/g))
  .map(normalizeEnglishHomeHref);
assertSameItems(englishHomeHeroLinks, homeHeroLinks, "English homepage hero CTAs should match Chinese homepage hero CTAs");

const homeFooterLinks = extractBlocks(home, /<footer\b[\s\S]*?<\/footer>/g)
  .flatMap((footer) => extractMatches(footer, /href="([^"]+)"/g));
const englishHomeFooterLinks = extractBlocks(englishHome, /<footer\b[\s\S]*?<\/footer>/g)
  .flatMap((footer) => extractMatches(footer, /href="([^"]+)"/g))
  .map(normalizeEnglishHomeHref);
assertSameItems(englishHomeFooterLinks, homeFooterLinks, "English homepage footer links should match Chinese homepage footer links");

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
assert.ok(sitemap.includes("/tools/"), "sitemap should include /tools/");
assert.ok(sitemap.includes("/ai-sitemap.json"), "sitemap should include /ai-sitemap.json");
assert.ok(sitemap.includes("/for-factories/"), "sitemap should include /for-factories/");
assert.ok(sitemap.includes("/for-buyers/"), "sitemap should include /for-buyers/");
assert.ok(sitemap.includes("/field-materials/"), "sitemap should include /field-materials/");
assert.ok(sitemap.includes("/en/field-materials/"), "sitemap should include /en/field-materials/");
assert.ok(sitemap.includes("/contact/"), "sitemap should include /contact/");
assert.equal(sitemap.includes("/game/worldcup/"), false, "sitemap should not include old game pages");
assert.equal(sitemap.includes("/tools/photo-booth/"), false, "sitemap should not include old tool pages");
assert.equal(sitemap.includes("/tools/content-assistant/"), false, "sitemap should not include temporary tool pages");
assert.equal(sitemap.includes("/tools/content-assistant/admin/"), false, "sitemap should not include admin tool pages");
assert.equal(sitemap.includes("/nav/"), false, "sitemap should not include old navigation helper pages");
assert.equal(sitemap.includes("/m/"), false, "sitemap should not include standalone trade manufacturer page");
assert.equal(sitemap.includes("/b/"), false, "sitemap should not include standalone trade buyer page");

const llms = fs.readFileSync(path.join(dist, "llms.txt"), "utf8");
assert.ok(llms.includes("ai-sitemap.json"), "llms.txt should link to the AI sitemap");
assert.equal(llms.includes("https://gewuji.dev/m/"), false, "llms should not link standalone trade manufacturer page");
assert.equal(llms.includes("https://gewuji.dev/b/"), false, "llms should not link standalone trade buyer page");
assert.ok(llms.includes("贴贴研究所"), "llms.txt should include the photo booth project");
assert.ok(llms.includes("世界杯盘口情绪"), "llms.txt should include worldcup market sentiment keywords");
assert.ok(llms.includes("基准、保守、开放三种比分情景"), "llms.txt should explain worldcup score scenarios");
assert.ok(llms.includes("Factory Bridge by Gewuji"), "llms.txt should include the unified Factory Bridge brand");
assert.ok(llms.includes("工厂对外资料重构"), "llms.txt should include factory-side material rewrite keywords");
assert.ok(llms.includes("clearer factory information"), "llms.txt should include auxiliary buyer-context keywords");

const robots = fs.readFileSync(path.join(dist, "robots.txt"), "utf8");
assert.equal(robots.includes("AI-Sitemap:"), false, "robots should not include non-standard AI-Sitemap directives");
assert.equal(robots.includes("LLMs:"), false, "robots should not include non-standard LLMs directives");

const aiSitemap = JSON.parse(fs.readFileSync(path.join(dist, "ai-sitemap.json"), "utf8"));
const aiSitemapPaths = aiSitemap.pages.map((page) => new URL(page.url).pathname.replace(/^\/laocao-homepage/, ""));
assert.equal(aiSitemap.site.name, "格物集", "AI sitemap should describe the site");
assert.equal(aiSitemapPaths.includes("/m/"), false, "AI sitemap should not include standalone trade manufacturer page");
assert.equal(aiSitemapPaths.includes("/b/"), false, "AI sitemap should not include standalone trade buyer page");
assert.ok(aiSitemapPaths.includes("/tools/"), "AI sitemap should include the Lab / Tools index");
assert.equal(aiSitemapPaths.includes("/tools/photo-booth/"), false, "AI sitemap should not elevate old photo booth pages");
assert.equal(aiSitemapPaths.includes("/tools/worldcup-advisor/advisor/"), false, "AI sitemap should not elevate World Cup Advisor pages");
assert.ok(aiSitemapPaths.includes("/for-factories/"), "AI sitemap should include the factory bridge factory page");
assert.ok(aiSitemapPaths.includes("/for-buyers/"), "AI sitemap should include the factory bridge buyer page");
assert.ok(aiSitemapPaths.includes("/field-materials/"), "AI sitemap should include field materials");
assert.ok(JSON.stringify(aiSitemap).includes("不是正式审厂"), "AI sitemap should include factory bridge service boundaries");

const factoryPage = fs.readFileSync(path.join(dist, "for-factories/index.html"), "utf8");
const buyerPage = fs.readFileSync(path.join(dist, "for-buyers/index.html"), "utf8");
const fieldMaterialsPage = fs.readFileSync(path.join(dist, "field-materials/index.html"), "utf8");
const englishFieldMaterialsPage = fs.readFileSync(path.join(dist, "en/field-materials/index.html"), "utf8");
assert.ok(factoryPage.includes('rel="canonical" href="https://gewuji.dev/for-factories/"'), "factory page should expose canonical URL");
assert.ok(factoryPage.includes("工厂对外资料重构"), "factory page should include factory material rewrite SEO copy");
assert.ok(factoryPage.includes('id="material-rewrite"'), "factory page should expose material rewrite anchor");
assert.ok(factoryPage.includes('id="outreach-content"'), "factory page should expose outreach content anchor");
assert.ok(factoryPage.includes("GEWUJI"), "factory page should use the unified Gewuji brand shell");
assert.ok(factoryPage.includes('application/ld+json'), "factory page should include JSON-LD");
assert.ok(buyerPage.includes('rel="canonical" href="https://gewuji.dev/for-buyers/"'), "buyer page should expose canonical URL");
assert.ok(buyerPage.includes("Clearer Factory Information for Overseas Buyers"), "buyer page should include auxiliary buyer context SEO copy");
assert.ok(buyerPage.includes("GEWUJI"), "buyer page should use the unified Gewuji brand shell");
assert.ok(buyerPage.includes('application/ld+json'), "buyer page should include JSON-LD");
assert.ok(fieldMaterialsPage.includes('rel="canonical" href="https://gewuji.dev/field-materials/"'), "field materials page should expose canonical URL");
assert.ok(fieldMaterialsPage.includes('hreflang="en" href="https://gewuji.dev/en/field-materials/"'), "Chinese field materials page should link to English alternate");
assert.ok(fieldMaterialsPage.includes("Factory Bridge / 实拍素材背书"), "Chinese field materials page should use the localized hero label");
assert.ok(fieldMaterialsPage.includes("这里不是审厂证据，也不是验厂证明。"), "Chinese field materials page should expose the audit boundary");
assert.ok(fieldMaterialsPage.includes('application/ld+json'), "field materials page should include JSON-LD");
assert.ok(englishFieldMaterialsPage.includes('rel="canonical" href="https://gewuji.dev/en/field-materials/"'), "English field materials page should expose canonical URL");
assert.ok(englishFieldMaterialsPage.includes('hreflang="zh-CN" href="https://gewuji.dev/field-materials/"'), "English field materials page should link to Chinese alternate");
assert.ok(englishFieldMaterialsPage.includes("Factory Bridge / Field Evidence"), "English field materials page should use the unified hero label");
assert.ok(englishFieldMaterialsPage.includes("../../field-materials/fastener-workshop-01.jpg"), "English field materials page should reuse existing field material images");
assert.ok(englishFieldMaterialsPage.includes('application/ld+json'), "English field materials page should include JSON-LD");

console.log("static hosting audit ok");
