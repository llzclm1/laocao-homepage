export function createConfiguredSearchProvider(environment = process.env, fetchImpl = fetch) {
  const name = String(environment.SOCIAL_DISCOVERY_SEARCH_PROVIDER || "").trim();
  const endpoint = String(environment.SOCIAL_DISCOVERY_SEARCH_ENDPOINT || "").trim();
  const apiKey = String(environment.SOCIAL_DISCOVERY_SEARCH_API_KEY || "").trim();
  if (!name || !endpoint || !apiKey) return null;

  return {
    name,
    status: "configured",
    async search({ query, platform }) {
      try {
        const url = new URL(endpoint);
        url.searchParams.set("q", query);
        url.searchParams.set("platform", platform);
        const response = await fetchImpl(url, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.results) ? payload.results : [];
        return { status: "success", items, error: null };
      } catch (error) {
        return { status: "failed", items: [], error: String(error.message || error).slice(0, 240) };
      }
    }
  };
}
