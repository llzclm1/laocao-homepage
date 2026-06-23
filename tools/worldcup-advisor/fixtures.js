(() => {
  let data = window.worldCupAdvisorData ?? {};
  const matches = Array.isArray(data.matches) ? data.matches : [];
  const teamNameMap = {
    "Argentina": "阿根廷",
    "Australia": "澳大利亚",
    "Belgium": "比利时",
    "Brazil": "巴西",
    "Canada": "加拿大",
    "Colombia": "哥伦比亚",
    "Croatia": "克罗地亚",
    "Czech Republic": "捷克",
    "DR Congo": "刚果（金）",
    "England": "英格兰",
    "France": "法国",
    "Germany": "德国",
    "Ghana": "加纳",
    "Japan": "日本",
    "Mexico": "墨西哥",
    "Morocco": "摩洛哥",
    "Netherlands": "荷兰",
    "Nigeria": "尼日利亚",
    "Poland": "波兰",
    "Portugal": "葡萄牙",
    "South Africa": "南非",
    "South Korea": "韩国",
    "Spain": "西班牙",
    "United States": "美国",
    "Uruguay": "乌拉圭",
    "Uzbekistan": "乌兹别克斯坦"
  };
  const focusReasons = new Map([
    ["Portugal|Uzbekistan", "葡萄牙的控球质量对乌兹别克斯坦的防线抗压，是小组赛后段最值得观察的强弱对位。"],
    ["England|Ghana", "英格兰阵地战稳定性和加纳转换速度直接碰撞，比赛节奏可能很快被打开。"],
    ["Colombia|DR Congo", "哥伦比亚前场创造力对刚果（金）的身体对抗，决定这场能不能成为黑马观察样本。"]
  ]);
  const focusPairs = new Set(focusReasons.keys());
  const state = { filter: "all", visible: 30, hydrated: false };

  const grid = document.querySelector("#fixture-grid");
  const searchInput = document.querySelector("#search-input");
  const filterButtons = [...document.querySelectorAll(".filter")];
  const doneCount = document.querySelector("#done-count");
  const upcomingCount = document.querySelector("#upcoming-count");
  const focusCount = document.querySelector("#focus-count");
  const doneFilterCount = document.querySelector("#done-filter-count");
  const dataStatus = document.querySelector("#data-status");
  const loadMoreRow = document.querySelector("#fixture-load-more-row");
  const loadMoreButton = document.querySelector("#fixture-load-more");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatTeamName(team) {
    return teamNameMap[team] ? `${teamNameMap[team]} ${team}` : String(team ?? "待定");
  }

  function formatGroup(group) {
    const match = /Group\s+([A-Z])/.exec(group ?? "");
    return match ? `${match[1]}组` : String(group ?? "小组待定");
  }

  function convertMatchTimeToBeijing(dateText, timeText) {
    const match = /(\d{2}):(\d{2})\s+UTC([+-]\d+)/.exec(timeText ?? "");
    if (!match) {
      return {
        beijingDateTime: `北京时间开赛：${dateText} 00:00`,
        localDateTime: `当地时间：${dateText} ${timeText ?? "待确认"}`
      };
    }

    const [, hourText, minuteText, offsetText] = match;
    const utcDate = new Date(Date.UTC(
      Number(dateText.slice(0, 4)),
      Number(dateText.slice(5, 7)) - 1,
      Number(dateText.slice(8, 10)),
      Number(hourText) - Number(offsetText),
      Number(minuteText)
    ));
    const beijingDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
    const beijingText = [
      beijingDate.getUTCFullYear(),
      String(beijingDate.getUTCMonth() + 1).padStart(2, "0"),
      String(beijingDate.getUTCDate()).padStart(2, "0")
    ].join("-") + ` ${String(beijingDate.getUTCHours()).padStart(2, "0")}:${String(beijingDate.getUTCMinutes()).padStart(2, "0")}`;

    return {
      beijingDateTime: `北京时间开赛：${beijingText}`,
      localDateTime: `当地时间：${dateText} ${hourText}:${minuteText} (UTC${offsetText})`
    };
  }

  function scoreText(match) {
    const fullTime = match.score?.ft;
    return Array.isArray(fullTime) ? `${fullTime[0]}-${fullTime[1]}` : "VS";
  }

  function fixtureReason(match, isDone, isFocus) {
    const key = `${match.team1}|${match.team2}`;
    if (isFocus && focusReasons.has(key)) return focusReasons.get(key);
    if (isDone) return `${formatTeamName(match.team1)} ${scoreText(match)} ${formatTeamName(match.team2)}，已记录全场赛果。`;
    return "赛前信息待更新，先确认北京时间、对阵和小组形势。";
  }

  function buildFixtures() {
    return matches.map((match, index) => {
      const isDone = Array.isArray(match.score?.ft);
      const focusKey = `${match.team1}|${match.team2}`;
      const time = convertMatchTimeToBeijing(match.date, match.time);
      return {
        city: match.ground ?? "城市待定",
        date: match.date,
        group: formatGroup(match.group),
        home: match.team1,
        away: match.team2,
        score: scoreText(match),
        status: isDone ? "done" : "upcoming",
        focus: focusPairs.has(focusKey),
        timeLabel: time.beijingDateTime,
        watchTime: time.localDateTime,
        reason: fixtureReason(match, isDone, focusPairs.has(focusKey)),
        sortIndex: index
      };
    }).sort((a, b) => {
      if (a.status !== b.status) return a.status === "upcoming" ? -1 : 1;
      return a.status === "upcoming" ? a.sortIndex - b.sortIndex : b.sortIndex - a.sortIndex;
    });
  }

  const fixtures = buildFixtures();

  function formatStatus(status) {
    return status === "done" ? "已完赛" : "未开赛";
  }

  function setActiveFilter(nextFilter) {
    state.filter = nextFilter;
    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === state.filter;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function syncUrl(query) {
    if (!state.hydrated) return;
    const params = new URLSearchParams(window.location.search);
    query ? params.set("q", query) : params.delete("q");
    state.filter === "all" ? params.delete("filter") : params.set("filter", state.filter);
    const nextQuery = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const completedCount = fixtures.filter((fixture) => fixture.status === "done").length;
    const focusTotal = fixtures.filter((fixture) => fixture.focus).length;
    const filtered = fixtures.filter((fixture) => {
      const haystack = [
        fixture.date,
        fixture.city,
        fixture.group,
        fixture.home,
        fixture.away,
        formatTeamName(fixture.home),
        formatTeamName(fixture.away),
        fixture.reason
      ].join(" ").toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesFilter = state.filter === "all" || fixture.status === state.filter || (state.filter === "focus" && fixture.focus);
      return matchesSearch && matchesFilter;
    });
    const visibleFixtures = filtered.slice(0, state.visible);

    grid.innerHTML = visibleFixtures.length ? visibleFixtures.map((fixture) => `
      <article class="fixture-card">
        <div class="fixture-top">
          <span>${escapeHtml(fixture.city)}</span>
          <span>${escapeHtml(fixture.group)}</span>
        </div>
        <div class="fixture-time">${escapeHtml(fixture.timeLabel)}</div>
        <div class="teams"><span>${escapeHtml(formatTeamName(fixture.home))}</span><span class="versus">${escapeHtml(fixture.score)}</span><span>${escapeHtml(formatTeamName(fixture.away))}</span></div>
        <p class="reason">${escapeHtml(fixture.watchTime)} · ${escapeHtml(fixture.reason)}</p>
        <div class="fixture-top">
          <span class="badge ${fixture.status}">${formatStatus(fixture.status)}</span>
          ${fixture.focus ? '<span class="badge focus">重点看</span>' : '<span class="badge">普通场</span>'}
        </div>
      </article>
    `).join("") : '<p class="empty-state">没有匹配的比赛。清空搜索词或切换筛选后再看。</p>';

    doneCount.textContent = completedCount;
    upcomingCount.textContent = fixtures.length - completedCount;
    focusCount.textContent = focusTotal;
    doneFilterCount.textContent = completedCount;
    dataStatus.textContent = `已收录 ${completedCount} 场已完赛结果 · 2026 世界杯官方赛程共 ${fixtures.length} 场，整个赛程还剩 ${fixtures.length - completedCount} 场未完赛 · 所有比赛主时间显示北京时间 · 已更新 ${data.syncedAt ?? "待同步"}`;

    const hiddenCount = filtered.length - visibleFixtures.length;
    loadMoreRow.hidden = hiddenCount <= 0;
    loadMoreButton.textContent = `加载更多比赛（剩余 ${Math.max(hiddenCount, 0)} 场）`;
    syncUrl(query);
  }

  function hydrateStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    const knownFilter = filterButtons.some((button) => button.dataset.filter === filter);
    setActiveFilter(knownFilter ? filter : "all");
    searchInput.value = params.get("q") ?? "";
    state.hydrated = true;
  }

  hydrateStateFromUrl();
  render();

  searchInput.addEventListener("input", () => {
    state.visible = 30;
    render();
  });
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.visible = 30;
      setActiveFilter(button.dataset.filter);
      render();
    });
  });
  loadMoreButton.addEventListener("click", () => {
    state.visible += 30;
    render();
  });

  window.addEventListener?.("worldcup-advisor-data-ready", () => {
    data = window.worldCupAdvisorData ?? {};
    render();
  });
})();
