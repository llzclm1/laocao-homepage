(() => {
  const sources = [
    "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json",
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
  ];

  let refreshTimer = null;
  let inFlight = null;
  let latestPayload = window.worldCupAdvisorData ?? null;
  let recentlyCompletedUntil = 0;

  function getRefreshIntervalMs(payload) {
    const now = Date.now();
    const completedMatches = Number.isFinite(payload?.completedMatches) ? payload.completedMatches : null;
    if (completedMatches !== null && recentlyCompletedUntil > now) return 60 * 1000;

    const nextMatch = (payload?.matches ?? [])
      .filter((match) => !Array.isArray(match.score?.ft))
      .map((match) => parseBeijingKickoff(match))
      .filter((time) => time && time > now)
      .sort((a, b) => a - b)[0];

    const liveOrStartedMatch = (payload?.matches ?? []).some((match) => {
      if (Array.isArray(match.score?.ft)) return false;
      const kickoff = parseBeijingKickoff(match);
      return kickoff !== null && kickoff <= now;
    });

    if (liveOrStartedMatch) return 60 * 1000;
    if (!nextMatch) return 5 * 60 * 1000;
    const minutesToKickoff = (nextMatch - now) / 60000;
    if (minutesToKickoff <= 30) return 60 * 1000;
    if (minutesToKickoff <= 180) return 3 * 60 * 1000;
    return 5 * 60 * 1000;
  }

  function parseBeijingKickoff(match) {
    const timeMatch = /北京时间开赛：(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/.exec(match?.timeLabel ?? match?.date ?? "");
    if (!timeMatch) return null;
    const [, dateText, hourText, minuteText] = timeMatch;
    return new Date(`${dateText}T${hourText}:${minuteText}:00+08:00`).getTime();
  }

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
          lastRefreshAt: new Date().toISOString(),
          totalMatches: Array.isArray(result.data.matches) ? result.data.matches.length : 0,
          completedMatches: Array.isArray(result.data.matches)
            ? result.data.matches.filter((match) => Array.isArray(match.score?.ft)).length
            : 0,
          matches: result.data.matches
        };

        if (
          Number.isFinite(latestPayload?.completedMatches) &&
          payload.completedMatches > latestPayload.completedMatches
        ) {
          recentlyCompletedUntil = Date.now() + 5 * 60 * 1000;
        }

        latestPayload = payload;
        window.worldCupAdvisorData = payload;
        window.dispatchEvent(new CustomEvent("worldcup-advisor-data-ready", { detail: payload }));
        window.WorldCupAdvisorRefresh?.(payload);
        return payload;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  function scheduleRefresh() {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    const interval = getRefreshIntervalMs(latestPayload);
    refreshTimer = window.setTimeout(() => {
      refreshWorldCupData().finally(scheduleRefresh);
    }, interval);
  }

  refreshWorldCupData().finally(scheduleRefresh);
})();
