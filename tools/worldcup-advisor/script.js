const updatedAt = "2026-06-23 12:45 Asia/Shanghai";

const fixtures = [
  {
    date: "2026-06-23 12:00 当地时间",
    watchTime: "中国观看：06-24 01:00",
    group: "K组",
    city: "Houston",
    stadium: "Houston Stadium",
    home: "Portugal",
    away: "Uzbekistan",
    score: "未开赛",
    status: "upcoming",
    focus: true,
    reason: "Portugal 控球和前场个人能力占优，Uzbekistan 的防守纪律决定比赛会不会早早被打开。"
  },
  {
    date: "2026-06-23 15:00 当地时间",
    watchTime: "中国观看：06-24 03:00",
    group: "L组",
    city: "Boston",
    stadium: "Boston Stadium",
    home: "England",
    away: "Ghana",
    score: "未开赛",
    status: "upcoming",
    focus: true,
    reason: "England 纸面实力更强，Ghana 的反击速度和身体对抗会影响大小球判断。"
  },
  {
    date: "2026-06-23 18:00 当地时间",
    watchTime: "中国观看：06-24 06:00",
    group: "L组",
    city: "Toronto",
    stadium: "Toronto Stadium",
    home: "Panama",
    away: "Croatia",
    score: "未开赛",
    status: "upcoming",
    focus: false,
    reason: "Croatia 控场经验更好，Panama 如果低位防守，比赛节奏可能偏慢。"
  },
  {
    date: "2026-06-23 19:00 当地时间",
    watchTime: "中国观看：06-24 09:00",
    group: "K组",
    city: "Guadalajara",
    stadium: "Guadalajara Stadium",
    home: "Colombia",
    away: "DR Congo",
    score: "未开赛",
    status: "upcoming",
    focus: true,
    reason: "Colombia 进攻层次更丰富，DR Congo 的身体冲击会让比赛更开放。"
  }
];

const grid = document.querySelector("#fixture-grid");
const searchInput = document.querySelector("#search-input");
const filters = document.querySelectorAll(".filter");
const doneCount = document.querySelector("#done-count");
const upcomingCount = document.querySelector("#upcoming-count");
const focusCount = document.querySelector("#focus-count");
const dataStatus = document.querySelector("#data-status");
let activeFilter = "all";

function formatStatus(status) {
  if (status === "done") return "已完场";
  if (status === "live") return "进行中";
  return "未开赛";
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = fixtures.filter((fixture) => {
    const haystack = [
      fixture.date,
      fixture.group,
      fixture.city,
      fixture.stadium,
      fixture.watchTime,
      fixture.home,
      fixture.away,
      fixture.reason
    ].join(" ").toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesFilter = activeFilter === "all" || fixture.status === activeFilter || (activeFilter === "focus" && fixture.focus);
    return matchesSearch && matchesFilter;
  });

  grid.innerHTML = filtered.map((fixture) => `
    <article class="fixture-card">
      <div class="fixture-top">
        <span>${fixture.date} · ${fixture.city}</span>
        <span>${fixture.group}</span>
      </div>
      <div class="teams"><span>${fixture.home}</span><span class="versus">${fixture.score}</span><span>${fixture.away}</span></div>
      <p class="reason">${fixture.stadium} · ${fixture.watchTime} · ${fixture.reason}</p>
      <div class="fixture-top">
        <span class="badge ${fixture.status}">${formatStatus(fixture.status)}</span>
        ${fixture.focus ? '<span class="badge focus">重点看</span>' : '<span class="badge">普通场</span>'}
      </div>
    </article>
  `).join("");

  doneCount.textContent = fixtures.filter((fixture) => fixture.status === "done").length;
  upcomingCount.textContent = fixtures.filter((fixture) => fixture.status === "upcoming").length;
  focusCount.textContent = fixtures.filter((fixture) => fixture.focus).length;
  dataStatus.textContent = `今日赛程：2026-06-23 当地时间 · 已更新 ${updatedAt} · 每 5 分钟刷新页面状态`;
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

searchInput.addEventListener("input", render);
render();
setInterval(render, 5 * 60 * 1000);
