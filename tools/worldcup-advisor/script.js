const fixtures = [
  { date: "06-12 北京时间", group: "A组", city: "Mexico City", home: "墨西哥", away: "瑞士", score: "2-0", status: "done", focus: true, reason: "揭幕战样本，主场情绪和节奏值得复盘。" },
  { date: "06-13 北京时间", group: "D组", city: "Inglewood", home: "美国", away: "巴拉圭", score: "4-1", status: "done", focus: false, reason: "进攻效率高，但要看对手防线质量。" },
  { date: "06-14 北京时间", group: "B组", city: "Santa Clara", home: "巴西", away: "摩洛哥", score: "未开赛", status: "upcoming", focus: true, reason: "技术流对抗纪律防守，优先看阵容。" },
  { date: "06-14 北京时间", group: "C组", city: "Seattle", home: "海地", away: "苏格兰", score: "未开赛", status: "upcoming", focus: false, reason: "节奏可能偏硬，注意定位球。" },
  { date: "06-15 北京时间", group: "D组", city: "Vancouver", home: "澳大利亚", away: "土耳其", score: "未开赛", status: "upcoming", focus: true, reason: "身体对抗强，大小球倾向更值得观察。" },
  { date: "06-15 北京时间", group: "G组", city: "Los Angeles", home: "德国", away: "日本", score: "未开赛", status: "upcoming", focus: true, reason: "强强对话，最适合作为今日主看场。" }
];

const grid = document.querySelector("#fixture-grid");
const searchInput = document.querySelector("#search-input");
const filters = document.querySelectorAll(".filter");
const doneCount = document.querySelector("#done-count");
const upcomingCount = document.querySelector("#upcoming-count");
let activeFilter = "all";

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = fixtures.filter((fixture) => {
    const haystack = [fixture.date, fixture.group, fixture.city, fixture.home, fixture.away, fixture.reason].join(" ").toLowerCase();
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
      <p class="reason">${fixture.reason}</p>
      <div class="fixture-top">
        <span class="badge ${fixture.status}">${fixture.status === "done" ? "已完场" : "未开赛"}</span>
        ${fixture.focus ? '<span class="badge focus">重点看</span>' : '<span class="badge">普通场</span>'}
      </div>
    </article>
  `).join("");

  doneCount.textContent = fixtures.filter((fixture) => fixture.status === "done").length;
  upcomingCount.textContent = fixtures.filter((fixture) => fixture.status === "upcoming").length;
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
