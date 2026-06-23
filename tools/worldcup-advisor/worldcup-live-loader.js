(() => {
  const sources = [
    "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json",
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
  ];

  const refreshIntervalMs = 5 * 60 * 1000;
  let refreshTimer = null;
  let inFlight = null;

  async function fetchLiveData() {
    for (const url of sources) {
      try {
        const response = await fetch(url, { cache: "no-store" });

        if (!response.ok) continue;
        const data = await response.json();
        if (!Array.isArray(data.matches) || data.matches.length < 100) continue;
        return { url, data };
      } catch {
        continue;
      }
    }
    return null;
  }

  async function refreshWorldCupData() {
    if (inFlight) return inFlight;

    inFlight = fetchLiveData()
      .then((result) => {
        if (!result) return null;
        const payload = {
          name: result.data.name,
          source: { name: result.url, url: result.url },
          fallbackSources: sources.filter((source) => source !== result.url).map((url) => ({ name: url, url })),
          syncedAt: new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Asia/Shanghai",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }).format(new Date()).replace(" ", " ") + " Asia/Shanghai",
          totalMatches: Array.isArray(result.data.matches) ? result.data.matches.length : 0,
          completedMatches: Array.isArray(result.data.matches)
            ? result.data.matches.filter((match) => Array.isArray(match.score?.ft)).length
            : 0,
          matches: result.data.matches
        };

        window.worldCupAdvisorData = payload;
        window.dispatchEvent(new CustomEvent("worldcup-advisor-data-ready", { detail: payload }));
        return payload;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  function scheduleRefresh() {
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(refreshWorldCupData, refreshIntervalMs);
  }

  refreshWorldCupData().finally(scheduleRefresh);
})();
