const updatedAt = "2026-06-23 13:05 Asia/Shanghai";

const completedFixtures = [
  ["2026-06-11", "A组", "Mexico City", "Mexico City Stadium", "Mexico", "South Africa", "2-0"],
  ["2026-06-11", "A组", "Guadalajara", "Guadalajara Stadium", "South Korea", "Czechia", "2-1"],
  ["2026-06-12", "B组", "Toronto", "Toronto Stadium", "Canada", "Bosnia and Herzegovina", "1-1"],
  ["2026-06-12", "D组", "Los Angeles", "Los Angeles Stadium", "United States", "Paraguay", "4-1"],
  ["2026-06-13", "B组", "San Francisco Bay Area", "San Francisco Bay Area Stadium", "Switzerland", "Qatar", "1-1"],
  ["2026-06-13", "C组", "Los Angeles", "Los Angeles Stadium", "Brazil", "Morocco", "1-1"],
  ["2026-06-13", "C组", "Boston", "Boston Stadium", "Scotland", "Haiti", "1-0"],
  ["2026-06-14", "D组", "Vancouver", "Vancouver Stadium", "Australia", "Türkiye", "2-0"],
  ["2026-06-14", "E组", "Philadelphia", "Philadelphia Stadium", "Germany", "Curaçao", "7-1"],
  ["2026-06-14", "F组", "New York/New Jersey", "New York New Jersey Stadium", "Netherlands", "Japan", "2-2"],
  ["2026-06-14", "E组", "Houston", "Houston Stadium", "Ivory Coast", "Ecuador", "1-0"],
  ["2026-06-14", "F组", "Monterrey", "Monterrey Stadium", "Sweden", "Tunisia", "5-1"],
  ["2026-06-15", "H组", "Atlanta", "Atlanta Stadium", "Spain", "Cabo Verde", "0-0"],
  ["2026-06-15", "G组", "Miami", "Miami Stadium", "Belgium", "Egypt", "1-1"],
  ["2026-06-15", "H组", "Dallas", "Dallas Stadium", "Saudi Arabia", "Uruguay", "1-1"],
  ["2026-06-15", "G组", "Seattle", "Seattle Stadium", "Iran", "New Zealand", "2-2"],
  ["2026-06-16", "I组", "New York/New Jersey", "New York New Jersey Stadium", "France", "Senegal", "3-1"],
  ["2026-06-16", "I组", "Boston", "Boston Stadium", "Norway", "Iraq", "4-1"],
  ["2026-06-16", "J组", "Kansas City", "Kansas City Stadium", "Argentina", "Algeria", "3-0"],
  ["2026-06-17", "J组", "San Francisco Bay Area", "San Francisco Bay Area Stadium", "Austria", "Jordan", "3-1"],
  ["2026-06-17", "K组", "Mexico City", "Mexico City Stadium", "Portugal", "DR Congo", "1-1"],
  ["2026-06-17", "L组", "Dallas", "Dallas Stadium", "England", "Croatia", "4-2"],
  ["2026-06-17", "L组", "Toronto", "Toronto Stadium", "Ghana", "Panama", "1-0"],
  ["2026-06-17", "K组", "Miami", "Miami Stadium", "Colombia", "Uzbekistan", "3-1"],
  ["2026-06-18", "A组", "Atlanta", "Atlanta Stadium", "Czechia", "South Africa", "1-1"],
  ["2026-06-18", "B组", "Los Angeles", "Los Angeles Stadium", "Switzerland", "Bosnia and Herzegovina", "4-1"],
  ["2026-06-18", "B组", "Vancouver", "Vancouver Stadium", "Canada", "Qatar", "6-0"],
  ["2026-06-18", "A组", "Mexico City", "Mexico City Stadium", "Mexico", "South Korea", "1-0"],
  ["2026-06-19", "D组", "Seattle", "Seattle Stadium", "United States", "Australia", "2-0"],
  ["2026-06-19", "C组", "Kansas City", "Kansas City Stadium", "Morocco", "Scotland", "1-0"],
  ["2026-06-19", "C组", "Philadelphia", "Philadelphia Stadium", "Brazil", "Haiti", "3-0"],
  ["2026-06-19", "D组", "Houston", "Houston Stadium", "Paraguay", "Türkiye", "1-0"],
  ["2026-06-20", "F组", "New York/New Jersey", "New York New Jersey Stadium", "Netherlands", "Sweden", "5-1"],
  ["2026-06-20", "E组", "Toronto", "Toronto Stadium", "Germany", "Ivory Coast", "2-1"],
  ["2026-06-20", "E组", "Houston", "Houston Stadium", "Ecuador", "Curaçao", "0-0"],
  ["2026-06-21", "F组", "Kansas City", "Kansas City Stadium", "Japan", "Tunisia", "4-0"],
  ["2026-06-21", "H组", "Dallas", "Dallas Stadium", "Spain", "Saudi Arabia", "4-0"],
  ["2026-06-21", "G组", "Los Angeles", "Los Angeles Stadium", "Belgium", "Iran", "0-0"],
  ["2026-06-21", "H组", "Miami", "Miami Stadium", "Uruguay", "Cabo Verde", "2-2"],
  ["2026-06-21", "G组", "Toronto", "Toronto Stadium", "Egypt", "New Zealand", "3-1"],
  ["2026-06-22", "J组", "San Francisco Bay Area", "San Francisco Bay Area Stadium", "Argentina", "Austria", "2-0"],
  ["2026-06-22", "I组", "Philadelphia", "Philadelphia Stadium", "France", "Iraq", "3-0"],
  ["2026-06-22", "I组", "Seattle", "Seattle Stadium", "Norway", "Senegal", "3-2"]
].map(([date, group, city, stadium, home, away, score]) => ({
  date: `${date} 已完赛`,
  watchTime: "已完赛",
  group,
  city,
  stadium,
  home,
  away,
  score,
  status: "done",
  focus: false,
  reason: "已完赛结果，进入赛果复盘池。"
}));

const upcomingFixtures = [
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
    watchTime: "中国观看：06-24 04:00",
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
    watchTime: "中国观看：06-24 07:00",
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
    date: "2026-06-23 22:00 当地时间",
    watchTime: "中国观看：06-24 10:00",
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

const fixtures = [...upcomingFixtures, ...completedFixtures];

const grid = document.querySelector("#fixture-grid");
const searchInput = document.querySelector("#search-input");
const filters = document.querySelectorAll(".filter");
const doneCount = document.querySelector("#done-count");
const upcomingCount = document.querySelector("#upcoming-count");
const focusCount = document.querySelector("#focus-count");
const dataStatus = document.querySelector("#data-status");
let activeFilter = "all";

function formatStatus(status) {
  if (status === "done") return "已完赛";
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
  dataStatus.textContent = `已收录 ${completedFixtures.length} 场已完赛结果 · 今日赛程：2026-06-23 当地时间 · 已更新 ${updatedAt}`;
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
