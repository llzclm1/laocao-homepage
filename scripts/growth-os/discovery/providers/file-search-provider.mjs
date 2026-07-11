import fs from "node:fs";

export function createFileSearchProvider(environment = process.env) {
  const file = String(environment.SOCIAL_DISCOVERY_SEARCH_RESULTS_FILE || "").trim();
  if (!file || !fs.existsSync(file)) return null;
  return {
    name: "file",
    status: "configured",
    async search({ query, platform }) {
      try {
        const payload = JSON.parse(fs.readFileSync(file, "utf8"));
        const records = Array.isArray(payload) ? payload : payload.items || payload.results || [];
        return {
          status: "success",
          items: records.filter((item) => !item.platform || item.platform === platform).filter((item) => !item.query || item.query === query),
          error: null
        };
      } catch (error) {
        return { status: "failed", items: [], error: String(error.message || error).slice(0, 240) };
      }
    }
  };
}
