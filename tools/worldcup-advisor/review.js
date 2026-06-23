let data = window.worldCupAdvisorData;

const teamNameMap = {
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Austria: "奥地利",
  Belgium: "比利时",
  Brazil: "巴西",
  Canada: "加拿大",
  "Cabo Verde": "佛得角",
  Colombia: "哥伦比亚",
  Croatia: "克罗地亚",
  Curaçao: "库拉索",
  Czechia: "捷克",
  "DR Congo": "刚果民主共和国",
  Ecuador: "厄瓜多尔",
  Egypt: "埃及",
  England: "英格兰",
  France: "法国",
  Germany: "德国",
  Ghana: "加纳",
  Haiti: "海地",
  Iran: "伊朗",
  Iraq: "伊拉克",
  "Ivory Coast": "科特迪瓦",
  Japan: "日本",
  Jordan: "约旦",
  Mexico: "墨西哥",
  Morocco: "摩洛哥",
  Netherlands: "荷兰",
  "New Zealand": "新西兰",
  Norway: "挪威",
  Panama: "巴拿马",
  Paraguay: "巴拉圭",
  Portugal: "葡萄牙",
  Qatar: "卡塔尔",
  "Saudi Arabia": "沙特",
  Scotland: "苏格兰",
  Senegal: "塞内加尔",
  "South Africa": "南非",
  "South Korea": "韩国",
  Spain: "西班牙",
  Sweden: "瑞典",
  Switzerland: "瑞士",
  Tunisia: "突尼斯",
  Türkiye: "土耳其",
  Uruguay: "乌拉圭",
  "United States": "美国",
  Uzbekistan: "乌兹别克斯坦"
};

const groupNameMap = {
  "Group A": "A组",
  "Group B": "B组",
  "Group C": "C组",
  "Group D": "D组",
  "Group E": "E组",
  "Group F": "F组",
  "Group G": "G组",
  "Group H": "H组",
  "Group I": "I组",
  "Group J": "J组",
  "Group K": "K组",
  "Group L": "L组"
};

function formatTeamName(team) {
  return teamNameMap[team] ?? team;
}

function formatGroup(group) {
  return groupNameMap[group] ?? group ?? "小组待更新";
}

function getResultLabel(home, away, score) {
  const [homeGoals, awayGoals] = score;
  if (homeGoals > awayGoals) return `${formatTeamName(home)} 胜`;
  if (homeGoals < awayGoals) return `${formatTeamName(away)} 胜`;
  return "平局";
}

function getReviewTone(score) {
  const totalGoals = score[0] + score[1];
  if (totalGoals >= 5) return "大比分";
  if (totalGoals <= 1) return "低比分";
  return "常规比分";
}

function getMatchTimestamp(match) {
  const timeMatch = /(\d{2}):(\d{2})\s+UTC([+-]\d+)/.exec(match.time ?? "");
  if (!timeMatch) return new Date(`${match.date}T00:00:00Z`).getTime();

  const [, hourText, minuteText, offsetText] = timeMatch;
  return Date.UTC(
    Number(match.date.slice(0, 4)),
    Number(match.date.slice(5, 7)) - 1,
    Number(match.date.slice(8, 10)),
    Number(hourText) - Number(offsetText),
    Number(minuteText)
  );
}

function formatBeijingMatchTime(match) {
  const date = new Date(getMatchTimestamp(match) + 8 * 60 * 60 * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function getGoalMinutes(goals) {
  return (goals ?? [])
    .map((goal) => goal.minute)
    .filter((minute) => Number.isFinite(minute));
}

function getFirstGoalSummary(match) {
  const goals = [
    ...(match.goals1 ?? []).map((goal) => ({ ...goal, team: formatTeamName(match.team1) })),
    ...(match.goals2 ?? []).map((goal) => ({ ...goal, team: formatTeamName(match.team2) }))
  ].filter((goal) => Number.isFinite(goal.minute))
    .sort((a, b) => a.minute - b.minute);

  if (!goals.length) return "全场没有进球，复盘重点转向控球消耗、防线站位和机会质量。";
  const firstGoal = goals[0];
  return `${firstGoal.team} 在第 ${firstGoal.minute} 分钟先打开局面，${firstGoal.name ?? "进球球员"} 是这场走势的第一个拐点。`;
}

function getScoreStory(match, score) {
  const [homeGoals, awayGoals] = score;
  const home = formatTeamName(match.team1);
  const away = formatTeamName(match.team2);
  if (homeGoals === awayGoals) return `${home} 和 ${away} 没有分出胜负，复盘重点是双方谁更接近打破平衡。`;
  const winner = homeGoals > awayGoals ? home : away;
  const loser = homeGoals > awayGoals ? away : home;
  const margin = Math.abs(homeGoals - awayGoals);
  if (margin >= 3) return `${winner} 拉开 ${margin} 球差距，这不是普通小胜，更像是强弱关系被直接打穿。`;
  if (margin === 1) return `${winner} 只赢 1 球，${loser} 仍然把比赛悬念留到了最后阶段。`;
  return `${winner} 用 2 球优势收下比赛，胜负方向清楚，但还要看进球是否集中在关键时段。`;
}

function getRhythmReview(match, score) {
  const totalGoals = score[0] + score[1];
  const allMinutes = [...getGoalMinutes(match.goals1), ...getGoalMinutes(match.goals2)];
  const lateGoals = allMinutes.filter((minute) => minute >= 75).length;
  const earlyGoals = allMinutes.filter((minute) => minute <= 20).length;
  if (totalGoals === 0) return "0-0 说明比赛更像耐心消耗，进攻端缺少能把局面撕开的最后一脚。";
  if (earlyGoals) return `前 20 分钟就有进球，比赛很早进入开放状态，后续判断要提高开局强度权重。`;
  if (lateGoals) return `第 75 分钟后出现 ${lateGoals} 个进球，体能、换人和尾段防守稳定性要单独复核。`;
  if (totalGoals >= 5) return `全场 ${totalGoals} 球，进攻效率明显高于常规预期，大小比分判断需要上调。`;
  if (totalGoals <= 1) return "低比分收场，说明双方至少一端的防守结构比赛前预期更硬。";
  return `全场 ${totalGoals} 球，节奏没有失控，适合作为同组后续比赛的基准样本。`;
}

function getHalftimeReview(match, score) {
  const halfTime = match.score?.ht;
  if (!Array.isArray(halfTime)) return "半场数据缺失，先按全场比分复核强弱方向。";
  const [homeHalf, awayHalf] = halfTime;
  const [homeFull, awayFull] = score;
  const secondHalfGoals = (homeFull + awayFull) - (homeHalf + awayHalf);
  if (homeHalf === awayHalf && homeFull !== awayFull) return `半场 ${homeHalf}-${awayHalf}，下半场才分出胜负，临场调整比开局判断更关键。`;
  if (secondHalfGoals === 0) return `半场 ${homeHalf}-${awayHalf} 后没有再进球，领先方的控局能力值得加分。`;
  if (secondHalfGoals >= 3) return `下半场新增 ${secondHalfGoals} 球，比赛后段明显提速，替补和体能影响很大。`;
  return `半场 ${homeHalf}-${awayHalf}，下半场新增 ${secondHalfGoals} 球，整体走势比较连续。`;
}

function getNextAdjustment(match, score) {
  const [homeGoals, awayGoals] = score;
  const totalGoals = homeGoals + awayGoals;
  if (homeGoals === 0 || awayGoals === 0) return "出现零封，下一轮要优先检查被零封球队的前场连接和射门质量。";
  if (totalGoals >= 5) return "大比分样本要影响同组预估：防线压迫、转换回追和门前效率都要重新加权。";
  if (homeGoals === awayGoals) return "平局样本要重点沉淀双方的抗压能力，不能只按纸面实力继续外推。";
  return "把这场的胜负方向、半场走势和进球时段沉淀到同组后续判断里。";
}

function renderMatchReviews() {
  const list = document.querySelector("#match-review-list");
  if (!list) return;

  const completedMatches = (data?.matches ?? [])
    .filter((match) => Array.isArray(match.score?.ft))
    .slice()
    .sort((a, b) => getMatchTimestamp(b) - getMatchTimestamp(a));

  if (!completedMatches.length) {
    list.innerHTML = '<p class="empty-state">暂无已完赛结果，比赛结束后会自动补充复盘。</p>';
    return;
  }

  list.innerHTML = completedMatches.map((match) => {
    const score = match.score.ft;
    const scoreText = `${score[0]}-${score[1]}`;
    const home = formatTeamName(match.team1);
    const away = formatTeamName(match.team2);
    const group = formatGroup(match.group);
    const metrics = [
      ["实际赛果", getResultLabel(match.team1, match.team2, score), `${match.ground ?? "赛地待更新"} · ${getScoreStory(match, score)}`],
      ["进球拐点", getReviewTone(score), getFirstGoalSummary(match)],
      ["节奏复核", "按进球时段复盘", getRhythmReview(match, score)],
      ["下轮修正", getHalftimeReview(match, score), getNextAdjustment(match, score)]
    ];

    return `
      <article class="match-review-card">
        <div class="match-review-head">
          <span>北京时间 ${formatBeijingMatchTime(match)} 已完赛 · ${group}</span>
          <div class="review-scoreline" aria-label="${home} ${scoreText} ${away}">
            <strong>${home}</strong>
            <b>${scoreText}</b>
            <strong>${away}</strong>
          </div>
        </div>
        <div class="review-metrics compact-review-metrics" aria-label="${home} 对 ${away} 复盘">
          ${metrics.map(([label, value, copy]) => `<div><span>${label}</span><strong>${value}</strong><p>${copy}</p></div>`).join("")}
        </div>
      </article>
    `;
  }).join("");
}

renderMatchReviews();

window.addEventListener?.("worldcup-advisor-data-ready", () => {
  data = window.worldCupAdvisorData;
  renderMatchReviews();
});
