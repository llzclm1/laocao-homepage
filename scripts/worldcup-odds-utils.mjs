const disclaimer = "盘口、赔率和市场情绪只作为观赛参考，不构成投注建议，不承诺结果。";

export function buildEmptyOddsPayload({ reason, syncedAt }) {
  return {
    available: false,
    reason,
    source: {
      name: "The Odds API",
      url: "https://the-odds-api.com/"
    },
    syncedAt,
    disclaimer,
    events: []
  };
}

export function buildOddsPayload({ events, syncedAt }) {
  const normalizedEvents = normalizeOddsEvents(events);
  return {
    available: normalizedEvents.length > 0,
    reason: normalizedEvents.length > 0 ? null : "no_events",
    source: {
      name: "The Odds API",
      url: "https://the-odds-api.com/"
    },
    syncedAt,
    sportKey: "soccer_fifa_world_cup",
    markets: ["h2h", "spreads", "totals"],
    disclaimer,
    events: normalizedEvents
  };
}

export function normalizeOddsEvents(events) {
  if (!Array.isArray(events)) return [];

  return events.map((event) => {
    const bookmakers = Array.isArray(event.bookmakers) ? event.bookmakers : [];
    return {
      id: event.id,
      sportKey: event.sport_key,
      commenceTime: event.commence_time,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      markets: {
        h2h: normalizeH2hMarket(bookmakers),
        spreads: normalizePointMarket(bookmakers, "spreads", ["home", "away"], event),
        totals: normalizePointMarket(bookmakers, "totals", ["over", "under"], event)
      },
      source: {
        bookmakers: bookmakers.length,
        lastUpdate: getLatestBookmakerUpdate(bookmakers)
      }
    };
  });
}

function normalizeH2hMarket(bookmakers) {
  const outcomes = collectMarketOutcomes(bookmakers, "h2h");
  return {
    label: "胜平负",
    outcomes: summarizeOutcomes(outcomes)
  };
}

function normalizePointMarket(bookmakers, marketKey, lineKeys, event) {
  const outcomes = collectMarketOutcomes(bookmakers, marketKey);
  const summarizedOutcomes = summarizeOutcomes(outcomes);
  const line = {};

  for (const outcome of summarizedOutcomes) {
    const name = normalizeOutcomeName(outcome.name);
    if (marketKey === "spreads") {
      if (sameTeamName(name, event.home_team)) line.home = outcome.point;
      if (sameTeamName(name, event.away_team)) line.away = outcome.point;
    }
    if (marketKey === "totals") {
      if (name === "over") line.over = outcome.point;
      if (name === "under") line.under = outcome.point;
    }
  }

  return {
    label: marketKey === "spreads" ? "让球" : "大小球",
    line: lineKeys.reduce((result, key) => {
      if (Object.hasOwn(line, key)) result[key] = line[key];
      return result;
    }, {}),
    outcomes: summarizedOutcomes
  };
}

function collectMarketOutcomes(bookmakers, marketKey) {
  return bookmakers.flatMap((bookmaker) => {
    const markets = Array.isArray(bookmaker.markets) ? bookmaker.markets : [];
    const market = markets.find((item) => item.key === marketKey);
    if (!market || !Array.isArray(market.outcomes)) return [];

    return market.outcomes
      .filter((outcome) => Number.isFinite(Number(outcome.price)))
      .map((outcome) => ({
        name: outcome.name,
        price: Number(outcome.price),
        point: Number.isFinite(Number(outcome.point)) ? Number(outcome.point) : undefined,
        bookmaker: bookmaker.title || bookmaker.key || "Bookmaker",
        lastUpdate: bookmaker.last_update
      }));
  });
}

function summarizeOutcomes(outcomes) {
  const grouped = new Map();
  for (const outcome of outcomes) {
    const key = `${normalizeOutcomeName(outcome.name)}__${outcome.point ?? ""}`;
    const current = grouped.get(key) ?? {
      name: outcome.name,
      point: outcome.point,
      prices: [],
      bookmakers: []
    };
    current.prices.push(outcome.price);
    current.bookmakers.push(outcome.bookmaker);
    grouped.set(key, current);
  }

  return [...grouped.values()].map((item) => ({
    name: item.name,
    point: item.point,
    averagePrice: roundToTwo(average(item.prices)),
    bestPrice: roundToTwo(Math.max(...item.prices)),
    bookmakers: [...new Set(item.bookmakers)].slice(0, 4)
  }));
}

function getLatestBookmakerUpdate(bookmakers) {
  return bookmakers
    .map((bookmaker) => bookmaker.last_update)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function normalizeOutcomeName(name) {
  return String(name ?? "").trim().toLowerCase();
}

function sameTeamName(left, right) {
  return normalizeOutcomeName(left) === normalizeOutcomeName(right);
}
