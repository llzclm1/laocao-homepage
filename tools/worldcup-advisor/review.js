const data = window.worldCupAdvisorData;

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
    const totalGoals = score[0] + score[1];

    return `
      <article class="match-review-card">
        <div class="match-review-head">
          <span>北京时间 ${match.date} 已完赛 · ${group}</span>
          <div class="review-scoreline" aria-label="${home} ${scoreText} ${away}">
            <strong>${home}</strong>
            <b>${scoreText}</b>
            <strong>${away}</strong>
          </div>
        </div>
        <div class="review-metrics compact-review-metrics" aria-label="${home} 对 ${away} 复盘">
          <div><span>实际赛果</span><strong>${getResultLabel(match.team1, match.team2, score)}</strong><p>${match.ground ?? "赛地待更新"}</p></div>
          <div><span>节奏标签</span><strong>${getReviewTone(score)}</strong><p>总进球 ${totalGoals}，用于校准比分线和节奏预期。</p></div>
          <div><span>偏差检查</span><strong>按赛前判断复核</strong><p>重点看强弱方向、进球数和比赛开放度是否一致。</p></div>
          <div><span>下一步修正</span><strong>沉淀到同组比赛</strong><p>同组球队后续判断优先参考这场的节奏和防线稳定性。</p></div>
        </div>
      </article>
    `;
  }).join("");
}

renderMatchReviews();
