const liveWorldCupData = window.worldCupAdvisorData;
const updatedAt = liveWorldCupData?.syncedAt ?? "2026-06-23 14:33 Asia/Shanghai";
const totalScheduledMatches = 104;
const teamNameMap = {
  Algeria: "阿尔及利亚",
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Austria: "奥地利",
  Belgium: "比利时",
  "Bosnia and Herzegovina": "波黑",
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
  "Saudi Arabia": "沙特阿拉伯",
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

function formatTeamName(team) {
  return teamNameMap[team] ? `${team}（${teamNameMap[team]}）` : team;
}

function getPlayerRole(player) {
  const roleMap = {
    "Riyad Mahrez": ["边锋 / 前场组织", "左脚内切和传中是 Algeria（阿尔及利亚）的主要创造来源。"],
    "Ismael Bennacer": ["中场", "负责推进和二点控制，决定球队能否把反击变成持续控球。"],
    "Amine Gouiri": ["前锋", "在禁区前串联和终结之间切换，是前场变化点。"],
    "Lionel Messi": ["前锋 / 前腰", "回撤组织和最后一传仍是 Argentina（阿根廷）的节奏开关。"],
    "Julian Alvarez": ["前锋", "无球跑动和压迫强，能给核心创造前场空间。"],
    "Emiliano Martinez": ["门将", "扑救稳定性和大赛心理是球队后场托底。"],
    "Mathew Ryan": ["门将", "后场指挥和出球质量影响 Australia（澳大利亚）的抗压。"],
    "Jackson Irvine": ["中场", "覆盖和对抗强，是中路防守强度来源。"],
    "Craig Goodwin": ["边路", "定位球和边路传中是现实进攻出口。"],
    "David Alaba": ["后卫 / 中场", "组织和防线指挥兼具，是 Austria（奥地利）的结构核心。"],
    "Marcel Sabitzer": ["中场", "前插和远射能提升中前场直接威胁。"],
    "Christoph Baumgartner": ["攻击中场", "擅长肋部接应和禁区前冲击。"],
    "Kevin De Bruyne": ["中场", "传球视野和节奏控制决定 Belgium（比利时）进攻上限。"],
    "Romelu Lukaku": ["中锋", "支点和禁区终结是对手防线的主要压力。"],
    "Jeremy Doku": ["边锋", "一对一突破能直接改变比赛宽度。"],
    "Edin Dzeko": ["中锋", "背身支点和禁区经验是 Bosnia and Herzegovina（波黑）的进攻基础。"],
    "Miralem Pjanic": ["中场", "长传和定位球决定球队推进质量。"],
    "Rade Krunic": ["中场", "负责中场衔接和防守覆盖。"],
    "Vinicius Junior": ["边锋", "高速突破和身后冲刺是 Brazil（巴西）的第一爆点。"],
    "Rodrygo": ["前锋", "能在边路和中路切换，增加禁区前变化。"],
    "Bruno Guimaraes": ["中场", "连接攻守和控制二点球，是中场平衡点。"],
    "Ryan Mendes": ["前锋", "速度和经验是 Cabo Verde（佛得角）的反击出口。"],
    "Garry Rodrigues": ["边锋", "边路冲刺能制造纵深和定位球。"],
    "Logan Costa": ["后卫", "防空和禁区保护是后场关键。"],
    "Alphonso Davies": ["边卫 / 边锋", "左路推进能把防守回合直接带成进攻。"],
    "Jonathan David": ["前锋", "跑位和终结决定 Canada（加拿大）的机会兑现。"],
    "Stephen Eustaquio": ["中场", "负责节奏分配和中路保护。"],
    "Luis Diaz": ["边锋", "一对一和连续冲刺是 Colombia（哥伦比亚）的主要进攻入口。"],
    "James Rodriguez": ["前腰", "最后一传和定位球质量决定阵地战效率。"],
    "Jhon Duran": ["前锋", "禁区冲击和身体对抗提供直接终结点。"],
    "Luka Modric": ["中场", "控节奏和二点处理仍是 Croatia（克罗地亚）的核心。"],
    "Mateo Kovacic": ["中场", "带球推进能帮助球队穿过第一道压迫。"],
    "Josko Gvardiol": ["后卫", "左侧出球和回追速度提升防线弹性。"],
    "Leandro Bacuna": ["中场", "经验和出球能力支撑 Curaçao（库拉索）的中后场。"],
    "Juninho Bacuna": ["中场", "推进和远射是中场向前的变化点。"],
    "Vurnon Anita": ["后卫 / 中场", "位置感和防守覆盖帮助球队保持结构。"],
    "Patrik Schick": ["前锋", "高点和终结能力是 Czechia（捷克）的主要威胁。"],
    "Tomas Soucek": ["中场", "后插上和定位球争顶很关键。"],
    "Antonin Barak": ["中场", "禁区前处理球和远射提供第二层进攻。"],
    "Yoane Wissa": ["前锋", "冲刺和边中结合是 DR Congo（刚果民主共和国）的反击入口。"],
    "Cedric Bakambu": ["前锋", "经验和禁区跑位是终结点。"],
    "Chancel Mbemba": ["后卫", "对抗和防线领导力是后场基础。"],
    "Moises Caicedo": ["中场", "拦截和向前输送决定 Ecuador（厄瓜多尔）的转换质量。"],
    "Piero Hincapie": ["后卫", "左脚出球和横移能力支撑后场。"],
    "Enner Valencia": ["前锋", "经验和门前嗅觉仍是关键得分点。"],
    "Mohamed Salah": ["边锋", "右路内切和终结是 Egypt（埃及）的最高威胁。"],
    "Omar Marmoush": ["前锋", "速度和跑动能分担核心压力。"],
    "Mostafa Mohamed": ["中锋", "禁区支点和头球是直接进攻选择。"],
    "Harry Kane": ["中锋", "回撤做球和禁区终结让 England（英格兰）进攻更立体。"],
    "Jude Bellingham": ["中场", "前插和对抗能改变中前场节奏。"],
    "Bukayo Saka": ["边锋", "右路突破和内切是稳定进攻来源。"],
    "Kylian Mbappe": ["前锋", "身后速度和单点爆破是 France（法国）的最大优势。"],
    "Antoine Griezmann": ["前腰", "连接中前场，负责节奏和最后一传。"],
    "Aurelien Tchouameni": ["中场", "防守覆盖和长传转移帮助球队保持平衡。"],
    "Jamal Musiala": ["攻击中场", "肋部盘带能撕开 Germany（德国）的密集防守难题。"],
    "Florian Wirtz": ["攻击中场", "接应和最后一传提升阵地战创造力。"],
    "Joshua Kimmich": ["中场 / 后卫", "位置选择和传球节奏影响球队结构。"],
    "Mohammed Kudus": ["攻击中场", "持球推进是 Ghana（加纳）制造开放回合的关键。"],
    "Thomas Partey": ["中场", "中路保护和长传转移稳定攻守。"],
    "Inaki Williams": ["前锋", "速度和纵深跑动是反击出口。"],
    "Duckens Nazon": ["前锋", "终结和身体冲击是 Haiti（海地）的主要得分路径。"],
    "Frantzdy Pierrot": ["前锋", "高点和禁区对抗提供支点。"],
    "Wilde-Donald Guerrier": ["边路", "边路推进和回防覆盖是重要工作。"],
    "Mehdi Taremi": ["前锋", "背身接球和造犯规是 Iran（伊朗）的前场支点。"],
    "Sardar Azmoun": ["前锋", "禁区跑位和终结经验丰富。"],
    "Alireza Jahanbakhsh": ["边锋", "边路传中和远射提供变化。"],
    "Aymen Hussein": ["中锋", "支点和终结是 Iraq（伊拉克）的进攻核心。"],
    "Ali Jasim": ["边锋", "转换中的持球推进很关键。"],
    "Zidane Iqbal": ["中场", "脚下技术和向前传球帮助中场连接。"],
    "Sebastien Haller": ["中锋", "禁区支点和头球是 Ivory Coast（科特迪瓦）的直接威胁。"],
    "Franck Kessie": ["中场", "对抗和后插上增强中路硬度。"],
    "Simon Adingra": ["边锋", "一对一突破能制造传中和二点机会。"],
    "Takefusa Kubo": ["边锋 / 前腰", "小范围处理球和内切是 Japan（日本）的创造点。"],
    "Kaoru Mitoma": ["边锋", "左路突破能持续改变防线站位。"],
    "Wataru Endo": ["中场", "抢断和节奏保护是攻守转换关键。"],
    "Mousa Al-Tamari": ["边锋", "速度和突破是 Jordan（约旦）的主要反击出口。"],
    "Yazan Al-Naimat": ["前锋", "跑位和终结承担前场效率。"],
    "Nizar Al-Rashdan": ["中场", "中场覆盖和出球影响球队稳定性。"],
    "Hirving Lozano": ["边锋", "速度和内切是 Mexico（墨西哥）的边路爆点。"],
    "Santiago Gimenez": ["中锋", "禁区终结和无球跑动是主要得分点。"],
    "Edson Alvarez": ["中场", "防守屏障和中路保护非常关键。"],
    "Achraf Hakimi": ["边卫", "右路推进和传中是 Morocco（摩洛哥）的进攻入口。"],
    "Sofyan Amrabat": ["中场", "拦截和身体对抗支撑防守结构。"],
    "Hakim Ziyech": ["边锋", "左脚传射和定位球提供创造力。"],
    "Virgil van Dijk": ["中卫", "防线指挥和高空对抗是 Netherlands（荷兰）的后场核心。"],
    "Frenkie de Jong": ["中场", "带球推进和摆脱压迫决定中场质量。"],
    "Cody Gakpo": ["前锋", "前场多位置切换提供终结和连接。"],
    "Chris Wood": ["中锋", "高点和背身支点是 New Zealand（新西兰）的主要出口。"],
    "Liberato Cacace": ["边卫", "边路推进能减轻防守压力。"],
    "Joe Bell": ["中场", "传球和覆盖负责中场连接。"],
    "Erling Haaland": ["中锋", "禁区终结和身后冲刺是 Norway（挪威）的最高威胁。"],
    "Martin Odegaard": ["中场", "最后一传和节奏控制负责创造机会。"],
    "Alexander Sorloth": ["前锋", "支点和冲击能分担终结压力。"],
    "Adalberto Carrasquilla": ["中场", "持球摆脱是 Panama（巴拿马）缓解压力的关键。"],
    "Michael Murillo": ["边卫", "边路攻防覆盖和前插很重要。"],
    "Anibal Godoy": ["中场", "经验和拦截帮助球队维持中路强度。"],
    "Miguel Almiron": ["前场", "推进速度和反击冲刺是 Paraguay（巴拉圭）的爆点。"],
    "Julio Enciso": ["前锋", "远射和禁区前处理球提供变化。"],
    "Gustavo Gomez": ["中卫", "防线指挥和定位球争顶是后场核心。"],
    "Cristiano Ronaldo": ["中锋", "门前终结和禁区存在感仍是 Portugal（葡萄牙）的关键。"],
    "Bruno Fernandes": ["中场", "传球、远射和定位球决定进攻效率。"],
    "Bernardo Silva": ["中场 / 边路", "持球控制和小范围配合稳定节奏。"],
    "Akram Afif": ["前锋", "左肋部创造力是 Qatar（卡塔尔）的主要进攻来源。"],
    "Almoez Ali": ["前锋", "跑位和终结负责机会兑现。"],
    "Hassan Al-Haydos": ["中场", "经验和传球帮助球队保持前场连接。"],
    "Salem Al-Dawsari": ["边锋", "个人突破和关键球能力是 Saudi Arabia（沙特阿拉伯）的核心。"],
    "Firas Al-Buraikan": ["前锋", "支点和跑位负责禁区连接。"],
    "Mohamed Kanno": ["中场", "身体和覆盖增强中场对抗。"],
    "Scott McTominay": ["中场", "后插上和禁区冲击是 Scotland（苏格兰）的重要得分点。"],
    "Andy Robertson": ["边卫", "左路传中和覆盖是边路质量来源。"],
    "John McGinn": ["中场", "对抗和推进支撑中场强度。"],
    "Sadio Mane": ["前锋", "经验、速度和终结是 Senegal（塞内加尔）的核心威胁。"],
    "Kalidou Koulibaly": ["中卫", "对抗和防线领导力是后场基础。"],
    "Nicolas Jackson": ["前锋", "冲刺和禁区跑位提供纵深。"],
    "Percy Tau": ["前锋", "灵活跑动和反击处理是 South Africa（南非）的前场出口。"],
    "Teboho Mokoena": ["中场", "远射和定位球有直接威胁。"],
    "Ronwen Williams": ["门将", "扑救和出球稳定后场。"],
    "Son Heung-min": ["前锋", "速度和终结是 South Korea（韩国）的最大威胁。"],
    "Kim Min-jae": ["中卫", "对抗和回追能力保护防线。"],
    "Lee Kang-in": ["中场", "传球和边路内切提供创造力。"],
    "Rodri": ["中场", "节奏控制和中路保护是 Spain（西班牙）的体系核心。"],
    "Pedri": ["中场", "接球转身和肋部配合提升阵地战质量。"],
    "Lamine Yamal": ["边锋", "一对一和内切创造边路变化。"],
    "Alexander Isak": ["前锋", "脚下和终结兼具，是 Sweden（瑞典）的高级终结点。"],
    "Dejan Kulusevski": ["边锋 / 前腰", "右肋部做球和推进能连接锋线。"],
    "Viktor Gyokeres": ["前锋", "身体冲击和跑动提供直接威胁。"],
    "Granit Xhaka": ["中场", "控节奏和长传是 Switzerland（瑞士）的中场核心。"],
    "Manuel Akanji": ["后卫", "防守覆盖和后场出球都很关键。"],
    "Breel Embolo": ["前锋", "支点和冲刺能提供禁区压力。"],
    "Ellyes Skhiri": ["中场", "中路拦截支撑 Tunisia（突尼斯）的防守。"],
    "Wahbi Khazri": ["前锋", "经验和定位球是关键球来源。"],
    "Hannibal Mejbri": ["中场", "推进和对抗能打破中场僵局。"],
    "Hakan Calhanoglu": ["中场", "长传和定位球是 Türkiye（土耳其）的进攻开关。"],
    "Arda Guler": ["攻击中场", "前腰区域创造力和左脚处理球是上限来源。"],
    "Kenan Yildiz": ["前锋", "冲击和年轻活力提供前场变化。"],
    "Christian Pulisic": ["边锋", "内切和传射是 United States（美国）的核心威胁。"],
    "Weston McKennie": ["中场", "后插上和身体对抗带来中场冲击。"],
    "Tyler Adams": ["中场", "拦截和中路保护决定防守稳定。"],
    "Federico Valverde": ["中场", "覆盖、远射和推进是 Uruguay（乌拉圭）的动力源。"],
    "Darwin Nunez": ["前锋", "身后冲刺和禁区冲击制造高频威胁。"],
    "Ronald Araujo": ["后卫", "速度和对抗能压住核心前锋。"],
    "Eldor Shomurodov": ["前锋", "支点和经验是 Uzbekistan（乌兹别克斯坦）的前场出口。"],
    "Abbosbek Fayzullaev": ["攻击中场", "突破和前场连接负责创造机会。"],
    "Abdukodir Khusanov": ["后卫", "身体和回追是防线抗压关键。"]
  };

  return roleMap[player] ?? ["核心球员", "当前只记录基础名单，详细角色待后续补充。"];
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getResultLabel(home, away, score) {
  const [homeGoals, awayGoals] = score.split("-").map(Number);
  if (homeGoals > awayGoals) return `${formatTeamName(home)} 胜`;
  if (homeGoals < awayGoals) return `${formatTeamName(away)} 胜`;
  return "平局";
}

function getTotalGoals(score) {
  return score.split("-").map(Number).reduce((sum, goals) => sum + goals, 0);
}

function getReviewTone(score) {
  const totalGoals = getTotalGoals(score);
  if (totalGoals >= 5) return "大比分";
  if (totalGoals <= 1) return "低比分";
  return "常规比分";
}

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
  ["2026-06-22", "I组", "Seattle", "Seattle Stadium", "Norway", "Senegal", "3-2"],
  ["2026-06-22", "J组", "San Francisco Bay Area", "San Francisco Bay Area Stadium", "Jordan", "Algeria", "1-2"]
].map(([date, group, city, stadium, home, away, score]) => {
  const result = getResultLabel(home, away, score);
  const totalGoals = getTotalGoals(score);
  const tone = getReviewTone(score);
  const beijingDate = addDays(date, 1);
  return {
    date: `北京时间 ${beijingDate} 已完赛`,
    timeLabel: `北京时间日期：${beijingDate}`,
    watchTime: `赛事当地日期：${date}`,
    group,
    city,
    stadium,
    home,
    away,
    score,
    status: "done",
    focus: false,
    result,
    totalGoals,
    tone,
    reason: `${result} · 总进球 ${totalGoals} · ${tone}，可用于复盘强弱判断、节奏和比分线偏差。`,
    facts: [`赛果：${result}`, `北京时间日期：${beijingDate}`, `总进球：${totalGoals}`, `复盘标签：${tone}`]
  };
});

const upcomingFixtures = [
  {
    date: "北京时间 2026-06-24 01:00",
    timeLabel: "北京时间开赛：2026-06-24 01:00",
    watchTime: "当地时间：2026-06-23 12:00",
    group: "K组",
    city: "Houston",
    stadium: "Houston Stadium",
    home: "Portugal",
    away: "Uzbekistan",
    score: "未开赛",
    status: "upcoming",
    focus: true,
    href: "matches/portugal-uzbekistan/",
    prediction: "Portugal 控球和前场个人能力占优，赛前倾向 Portugal 不败，小胜可能性更高。",
    keyPoint: "Uzbekistan 的防线站位和由守转攻速度，会决定比赛是否被早早打开。",
    watchFor: "先看 Portugal 前 20 分钟压迫强度，以及 Uzbekistan 能不能稳住第一波冲击。",
    reason: "Portugal 控球和前场个人能力占优，Uzbekistan 的防守纪律决定比赛会不会早早被打开。"
  },
  {
    date: "北京时间 2026-06-24 04:00",
    timeLabel: "北京时间开赛：2026-06-24 04:00",
    watchTime: "当地时间：2026-06-23 15:00",
    group: "L组",
    city: "Boston",
    stadium: "Boston Stadium",
    home: "England",
    away: "Ghana",
    score: "未开赛",
    status: "upcoming",
    focus: true,
    href: "matches/england-ghana/",
    prediction: "England 阵容深度更好，赛前倾向 England 占优，但 Ghana 具备反击制造波动的能力。",
    keyPoint: "Ghana 的边路速度和身体对抗，是 England 能否稳定控场的主要变量。",
    watchFor: "观察 England 是否早早取得领先；如果久攻不下，比赛会更依赖定位球和替补冲击。",
    reason: "England 纸面实力更强，Ghana 的反击速度和身体对抗会影响大小球判断。"
  },
  {
    date: "北京时间 2026-06-24 07:00",
    timeLabel: "北京时间开赛：2026-06-24 07:00",
    watchTime: "当地时间：2026-06-23 18:00",
    group: "L组",
    city: "Toronto",
    stadium: "Toronto Stadium",
    home: "Panama",
    away: "Croatia",
    score: "未开赛",
    status: "upcoming",
    focus: false,
    href: "matches/panama-croatia/",
    prediction: "Croatia 控场经验更好，赛前倾向 Croatia 占优，Panama 需要把比赛拖进低节奏。",
    keyPoint: "Panama 如果长期低位防守，Croatia 的中场耐心和远射质量会成为突破口。",
    watchFor: "重点看 Croatia 能不能在上半场打穿中路；若迟迟不开局，比分可能偏谨慎。",
    reason: "Croatia 控场经验更好，Panama 如果低位防守，比赛节奏可能偏慢。"
  },
  {
    date: "北京时间 2026-06-24 10:00",
    timeLabel: "北京时间开赛：2026-06-24 10:00",
    watchTime: "当地时间：2026-06-23 22:00",
    group: "K组",
    city: "Guadalajara",
    stadium: "Guadalajara Stadium",
    home: "Colombia",
    away: "DR Congo",
    score: "未开赛",
    status: "upcoming",
    focus: true,
    href: "matches/colombia-dr-congo/",
    prediction: "Colombia 进攻层次更丰富，赛前倾向 Colombia 主动，DR Congo 更依赖身体冲击和转换。",
    keyPoint: "如果 DR Congo 能把比赛变成往返冲刺，Colombia 后场空间会被持续测试。",
    watchFor: "看 Colombia 边路推进和禁区前二点球控制；这场更容易出现开放回合。",
    reason: "Colombia 进攻层次更丰富，DR Congo 的身体冲击会让比赛更开放。"
  }
];

const teamProfiles = [
  {
    "team": "Algeria",
    "players": [
      "Riyad Mahrez",
      "Ismael Bennacer",
      "Amine Gouiri"
    ],
    "style": "边路创造和中场推进是主线，节奏更依赖核心球员拿球质量。",
    "strength": "定位球和边路一对一能制造突然机会。",
    "risk": "防线回追速度和高压下出球稳定性需要重点观察。",
    "watch": "看 Mahrez 一侧是否能持续吸引包夹，给中路创造二点空间。"
  },
  {
    "team": "Argentina",
    "players": [
      "Lionel Messi",
      "Julian Alvarez",
      "Emiliano Martinez"
    ],
    "style": "前场小范围配合和终结效率仍是核心，门将稳定性给球队托底。",
    "strength": "领先后控节奏能力强，淘汰赛经验丰富。",
    "risk": "阵容年龄结构和连续高强度比赛会影响压迫质量。",
    "watch": "先看 Messi 回撤接球位置，以及 Alvarez 是否能拉开纵深。"
  },
  {
    "team": "Australia",
    "players": [
      "Mathew Ryan",
      "Jackson Irvine",
      "Craig Goodwin"
    ],
    "style": "整体纪律和身体对抗明确，比赛更偏实用主义。",
    "strength": "防守落位和定位球质量是主要拿分方式。",
    "risk": "面对技术型强队时，低位防守容易被持续消耗。",
    "watch": "观察前 15 分钟是否能守住禁区前沿，避免过早失球。"
  },
  {
    "team": "Austria",
    "players": [
      "David Alaba",
      "Marcel Sabitzer",
      "Christoph Baumgartner"
    ],
    "style": "中前场跑动强，能用压迫和快速转移制造节奏。",
    "strength": "中场覆盖面积大，反抢后第一脚向前很关键。",
    "risk": "如果高压被打穿，后场空间会暴露。",
    "watch": "看 Sabitzer 的推进线路和 Alaba 是否参与组织。"
  },
  {
    "team": "Belgium",
    "players": [
      "Kevin De Bruyne",
      "Romelu Lukaku",
      "Jeremy Doku"
    ],
    "style": "进攻依赖核心传球和边路爆点，阵地战质量高。",
    "strength": "Doku 的突破能改变防线站位，De Bruyne 决定上限。",
    "risk": "转换防守和中卫回追是主要隐患。",
    "watch": "看边路是否能早早打开宽度，减少中路拥堵。"
  },
  {
    "team": "Bosnia and Herzegovina",
    "players": [
      "Edin Dzeko",
      "Miralem Pjanic",
      "Rade Krunic"
    ],
    "style": "经验型中轴明显，进攻更依赖支点和传球节奏。",
    "strength": "Dzeko 的支点和禁区触球仍有威胁。",
    "risk": "比赛速度被拉高时，中后场覆盖会吃力。",
    "watch": "看 Pjanic 是否能舒服拿球，否则进攻会被迫长传。"
  },
  {
    "team": "Brazil",
    "players": [
      "Vinicius Junior",
      "Rodrygo",
      "Bruno Guimaraes"
    ],
    "style": "个人突破和前场连线能力强，边路是主要入口。",
    "strength": "单点爆破能力极高，落后时也有改变比赛的人。",
    "risk": "如果中场保护不足，攻守转换会留下空间。",
    "watch": "看 Vinicius 的接球高度，以及 Rodrygo 是否能进入禁区肋部。"
  },
  {
    "team": "Cabo Verde",
    "players": [
      "Ryan Mendes",
      "Garry Rodrigues",
      "Logan Costa"
    ],
    "style": "整体更依赖速度和纪律，反击质量决定威胁。",
    "strength": "边路冲刺和定位球是现实得分路径。",
    "risk": "阵地战创造力有限，落后后办法偏少。",
    "watch": "看他们能否把比赛压成低比分，并抓住前场第二点。"
  },
  {
    "team": "Canada",
    "players": [
      "Alphonso Davies",
      "Jonathan David",
      "Stephen Eustaquio"
    ],
    "style": "速度和纵向推进鲜明，左路冲击力强。",
    "strength": "Davies 能把防守回合直接带成进攻。",
    "risk": "高位投入后身后空间较大。",
    "watch": "看 Davies 的前插频率，以及 David 的无球跑动是否连上。"
  },
  {
    "team": "Colombia",
    "players": [
      "Luis Diaz",
      "James Rodriguez",
      "Jhon Duran"
    ],
    "style": "边路冲击和前腰调度兼具，比赛打开后威胁更大。",
    "strength": "Luis Diaz 的单点能力可以持续制造犯规和角球。",
    "risk": "如果中场被迫低位，前场会和后场脱节。",
    "watch": "看 James 的触球区域，以及 Duran 是否能提供禁区冲击。"
  },
  {
    "team": "Croatia",
    "players": [
      "Luka Modric",
      "Mateo Kovacic",
      "Josko Gvardiol"
    ],
    "style": "中场控节奏仍是核心，比赛管理能力强。",
    "strength": "经验丰富，能把比赛拖进自己舒服的节拍。",
    "risk": "面对高强度冲刺队，体能和回追速度是变量。",
    "watch": "看 Modric 是否能控制二点球，避免被迫频繁回防。"
  },
  {
    "team": "Curaçao",
    "players": [
      "Leandro Bacuna",
      "Juninho Bacuna",
      "Vurnon Anita"
    ],
    "style": "更多依赖整体防守和海外联赛球员经验。",
    "strength": "中后场对抗和定位球有一定基础。",
    "risk": "持续进攻创造力不足，容易被压在半场。",
    "watch": "看 Bacuna 兄弟能否把中路出球稳住。"
  },
  {
    "team": "Czechia",
    "players": [
      "Patrik Schick",
      "Tomas Soucek",
      "Antonin Barak"
    ],
    "style": "高点、定位球和中路硬度是主要标签。",
    "strength": "Soucek 的后插上和 Schick 的终结很有威胁。",
    "risk": "面对脚下速度快的对手，转身防守会被考验。",
    "watch": "看定位球数量和禁区二点球归属。"
  },
  {
    "team": "DR Congo",
    "players": [
      "Yoane Wissa",
      "Cedric Bakambu",
      "Chancel Mbemba"
    ],
    "style": "身体冲击和转换速度突出，比赛容易被拉开。",
    "strength": "前场冲刺和中卫对抗能力能制造不确定性。",
    "risk": "控球细腻度不足，阵地战耐心有限。",
    "watch": "看 Wissa 能否攻击边中卫身后。"
  },
  {
    "team": "Ecuador",
    "players": [
      "Moises Caicedo",
      "Piero Hincapie",
      "Enner Valencia"
    ],
    "style": "中场拦截和身体对抗强，攻防转换速度不错。",
    "strength": "Caicedo 能提高防守覆盖和向前输送。",
    "risk": "如果 Valencia 被限制，终结点会减少。",
    "watch": "看中场抢回球后的第一脚是否足够快。"
  },
  {
    "team": "Egypt",
    "players": [
      "Mohamed Salah",
      "Omar Marmoush",
      "Mostafa Mohamed"
    ],
    "style": "右路核心威胁明显，反击效率决定比赛走向。",
    "strength": "Salah 的牵制力能改变整条防线站位。",
    "risk": "过度依赖核心，阵地战容易变慢。",
    "watch": "看 Salah 接球是否靠近禁区，而不是被迫远离球门。"
  },
  {
    "team": "England",
    "players": [
      "Harry Kane",
      "Jude Bellingham",
      "Bukayo Saka"
    ],
    "style": "阵容深度和前场多点进攻是优势，能踢不同节奏。",
    "strength": "Kane 回撤、Bellingham 前插和 Saka 边路形成多层威胁。",
    "risk": "热门压力大，慢热时容易被反击惩罚。",
    "watch": "看 Bellingham 是否能在禁区前获得正面冲击空间。"
  },
  {
    "team": "France",
    "players": [
      "Kylian Mbappe",
      "Antoine Griezmann",
      "Aurelien Tchouameni"
    ],
    "style": "速度、经验和中场硬度兼备，反击上限很高。",
    "strength": "Mbappe 的身后威胁会迫使对手防线后撤。",
    "risk": "如果阵地战缺少耐心，进攻会依赖个人爆点。",
    "watch": "看 Griezmann 是否能连接中前场，释放 Mbappe。"
  },
  {
    "team": "Germany",
    "players": [
      "Jamal Musiala",
      "Florian Wirtz",
      "Joshua Kimmich"
    ],
    "style": "年轻创造力和中场组织结合，阵地战手段丰富。",
    "strength": "Musiala 与 Wirtz 的肋部拿球能撕开密集防线。",
    "risk": "后场压上后，身后空间仍是风险。",
    "watch": "看 Kimmich 的位置选择和两个前腰的换位频率。"
  },
  {
    "team": "Ghana",
    "players": [
      "Mohammed Kudus",
      "Thomas Partey",
      "Inaki Williams"
    ],
    "style": "身体对抗、边路速度和中路推进兼具。",
    "strength": "Kudus 的持球推进能把比赛带入开放状态。",
    "risk": "防线稳定性和终结效率波动较大。",
    "watch": "看 Partey 是否能保护中路，避免比赛失控。"
  },
  {
    "team": "Haiti",
    "players": [
      "Duckens Nazon",
      "Frantzdy Pierrot",
      "Wilde-Donald Guerrier"
    ],
    "style": "更依赖反击和身体冲击，比赛策略偏直接。",
    "strength": "前场冲刺能制造身后威胁。",
    "risk": "控球和防线组织在强压下容易出现失误。",
    "watch": "看他们能否守住前 30 分钟并抓住一次转换。"
  },
  {
    "team": "Iran",
    "players": [
      "Mehdi Taremi",
      "Sardar Azmoun",
      "Alireza Jahanbakhsh"
    ],
    "style": "防守纪律和前场经验突出，擅长把比赛压低节奏。",
    "strength": "双前锋经验足，反击和定位球都有威胁。",
    "risk": "落后后主动进攻手段有限。",
    "watch": "看 Taremi 的背身接球和 Azmoun 的禁区跑位。"
  },
  {
    "team": "Iraq",
    "players": [
      "Aymen Hussein",
      "Ali Jasim",
      "Zidane Iqbal"
    ],
    "style": "中前场有速度和冲击，比赛情绪强度高。",
    "strength": "Aymen Hussein 的支点和终结是主要威胁。",
    "risk": "面对强队时防线横移和禁区保护会被考验。",
    "watch": "看 Ali Jasim 能否在转换中拿到正面空间。"
  },
  {
    "team": "Ivory Coast",
    "players": [
      "Sebastien Haller",
      "Franck Kessie",
      "Simon Adingra"
    ],
    "style": "身体、冲击和中场对抗是基本盘。",
    "strength": "Kessie 能提高中场硬度，Haller 是禁区支点。",
    "risk": "如果边路传中质量不足，进攻容易变粗糙。",
    "watch": "看 Adingra 是否能持续制造一对一。"
  },
  {
    "team": "Japan",
    "players": [
      "Takefusa Kubo",
      "Kaoru Mitoma",
      "Wataru Endo"
    ],
    "style": "技术速度和团队纪律结合，边路变化丰富。",
    "strength": "Mitoma 与 Kubo 的突破能创造持续压迫。",
    "risk": "面对高大强壮队时，禁区防空是变量。",
    "watch": "看 Endo 能否控制攻守转换的第一落点。"
  },
  {
    "team": "Jordan",
    "players": [
      "Mousa Al-Tamari",
      "Yazan Al-Naimat",
      "Nizar Al-Rashdan"
    ],
    "style": "反击速度和前场个人能力是主要抓手。",
    "strength": "Al-Tamari 能用突破直接改变推进速度。",
    "risk": "控球稳定性不足，长期防守消耗大。",
    "watch": "看前场双人组是否能把少量机会转成射门。"
  },
  {
    "team": "Mexico",
    "players": [
      "Hirving Lozano",
      "Santiago Gimenez",
      "Edson Alvarez"
    ],
    "style": "主场情绪、边路速度和中场硬度明显。",
    "strength": "Lozano 的冲刺和 Gimenez 的终结能带来直接威胁。",
    "risk": "阵地战打不开时容易陷入横传。",
    "watch": "看 Alvarez 是否能保护中卫前区域。"
  },
  {
    "team": "Morocco",
    "players": [
      "Achraf Hakimi",
      "Sofyan Amrabat",
      "Hakim Ziyech"
    ],
    "style": "防守组织和边路质量突出，比赛韧性强。",
    "strength": "Hakimi 的右路推进和 Ziyech 的传射很有价值。",
    "risk": "如果被迫长期控球，创造力会受考验。",
    "watch": "看 Amrabat 是否能限制对手核心接球。"
  },
  {
    "team": "Netherlands",
    "players": [
      "Virgil van Dijk",
      "Frenkie de Jong",
      "Cody Gakpo"
    ],
    "style": "中后场质量高，能在控球和直接进攻间切换。",
    "strength": "Van Dijk 稳定防线，Frenkie 决定推进质量。",
    "risk": "锋线终结稳定性会影响优势兑现。",
    "watch": "看 Frenkie 是否能带球穿过第一道压迫。"
  },
  {
    "team": "New Zealand",
    "players": [
      "Chris Wood",
      "Liberato Cacace",
      "Joe Bell"
    ],
    "style": "防守纪律和高点支点是主要结构。",
    "strength": "Wood 的头球和背身能提供出球点。",
    "risk": "整体速度和阵地创造力有限。",
    "watch": "看 Cacace 的边路推进能否减轻防守压力。"
  },
  {
    "team": "Norway",
    "players": [
      "Erling Haaland",
      "Martin Odegaard",
      "Alexander Sorloth"
    ],
    "style": "终结点顶级，中前场有强支点和组织核心。",
    "strength": "Haaland 的禁区威胁会改变对手防线深度。",
    "risk": "防线稳定性和中场保护是上限变量。",
    "watch": "看 Odegaard 能否给 Haaland 送出早传和直塞。"
  },
  {
    "team": "Panama",
    "players": [
      "Adalberto Carrasquilla",
      "Michael Murillo",
      "Anibal Godoy"
    ],
    "style": "整体对抗和中场奔跑能力强，比赛偏硬朗。",
    "strength": "Carrasquilla 的持球能帮助球队摆脱压力。",
    "risk": "面对高技术强队时，禁区前犯规风险高。",
    "watch": "看 Murillo 一侧能否顶住对手边路冲击。"
  },
  {
    "team": "Paraguay",
    "players": [
      "Miguel Almiron",
      "Julio Enciso",
      "Gustavo Gomez"
    ],
    "style": "防守韧性和反击冲刺兼备，比赛常有身体强度。",
    "strength": "Almiron 的推进和 Enciso 的远射是爆点。",
    "risk": "控球主动性不足，领先后容易被围攻。",
    "watch": "看 Gomez 的防线指挥和禁区保护。"
  },
  {
    "team": "Portugal",
    "players": [
      "Cristiano Ronaldo",
      "Bruno Fernandes",
      "Bernardo Silva"
    ],
    "style": "前场创造点多，控球和终结手段丰富。",
    "strength": "Bruno 的传球和 Bernardo 的持球能持续制造优势。",
    "risk": "核心年龄结构和防线身后空间是变量。",
    "watch": "看 Bruno 是否能把控球优势转成禁区内机会。"
  },
  {
    "team": "Qatar",
    "players": [
      "Akram Afif",
      "Almoez Ali",
      "Hassan Al-Haydos"
    ],
    "style": "前场默契和区域配合是主线，反击质量不错。",
    "strength": "Afif 的创造力和 Almoez 的跑位是主要威胁。",
    "risk": "面对高压强队时，出球稳定性不足。",
    "watch": "看 Afif 是否能在左肋部拿到自由度。"
  },
  {
    "team": "Saudi Arabia",
    "players": [
      "Salem Al-Dawsari",
      "Firas Al-Buraikan",
      "Mohamed Kanno"
    ],
    "style": "节奏快、冲刺多，情绪和比赛强度容易拉满。",
    "strength": "Al-Dawsari 的个人能力能制造关键球。",
    "risk": "防线站位和身后保护存在波动。",
    "watch": "看中场能否把比赛速度控制在自己能承受的范围。"
  },
  {
    "team": "Scotland",
    "players": [
      "Scott McTominay",
      "Andy Robertson",
      "John McGinn"
    ],
    "style": "身体强度、边路传中和中场后插上明显。",
    "strength": "McTominay 的禁区前冲击是重要得分点。",
    "risk": "阵地创造力有限，依赖二点和定位球。",
    "watch": "看 Robertson 的传中质量和左路覆盖。"
  },
  {
    "team": "Senegal",
    "players": [
      "Sadio Mane",
      "Kalidou Koulibaly",
      "Nicolas Jackson"
    ],
    "style": "身体、速度和大赛经验兼具，转换威胁很高。",
    "strength": "Mane 的牵制和 Koulibaly 的防守统治力是核心。",
    "risk": "阵地战如果缺少细腻传递，进攻会变直接。",
    "watch": "看 Jackson 是否能把反击跑成有效射门。"
  },
  {
    "team": "South Africa",
    "players": [
      "Percy Tau",
      "Teboho Mokoena",
      "Ronwen Williams"
    ],
    "style": "整体纪律和中场跑动不错，适合低位反击。",
    "strength": "Mokoena 的远射和定位球有威胁。",
    "risk": "面对高压时，前场留球能力会被考验。",
    "watch": "看 Williams 的扑救和出球是否能稳定后场。"
  },
  {
    "team": "South Korea",
    "players": [
      "Son Heung-min",
      "Kim Min-jae",
      "Lee Kang-in"
    ],
    "style": "速度、纪律和核心个人能力结合，反击效率高。",
    "strength": "Son 的身后冲刺和 Lee 的创造力是主要入口。",
    "risk": "中场被压制时，前后场距离容易拉大。",
    "watch": "看 Kim Min-jae 是否能压住对手支点。"
  },
  {
    "team": "Spain",
    "players": [
      "Rodri",
      "Pedri",
      "Lamine Yamal"
    ],
    "style": "控球体系和肋部渗透鲜明，能持续消耗对手。",
    "strength": "Rodri 稳定节奏，年轻边路提供突破变化。",
    "risk": "如果缺少禁区终结点，优势可能转化慢。",
    "watch": "看 Pedri 的接球位置和 Yamal 的一对一效率。"
  },
  {
    "team": "Sweden",
    "players": [
      "Alexander Isak",
      "Dejan Kulusevski",
      "Viktor Gyokeres"
    ],
    "style": "锋线身体和速度兼备，反击和支点都有质量。",
    "strength": "Isak 与 Gyokeres 能提供不同类型终结。",
    "risk": "中场控球稳定性决定比赛能否持续压上。",
    "watch": "看 Kulusevski 是否能在右肋部持续做球。"
  },
  {
    "team": "Switzerland",
    "players": [
      "Granit Xhaka",
      "Manuel Akanji",
      "Breel Embolo"
    ],
    "style": "结构稳定，攻守转换和中后场经验足。",
    "strength": "Xhaka 控节奏，Akanji 能提高后场出球质量。",
    "risk": "进攻爆点有限，破密集防线需要耐心。",
    "watch": "看 Embolo 的支点作用和二点球保护。"
  },
  {
    "team": "Tunisia",
    "players": [
      "Ellyes Skhiri",
      "Wahbi Khazri",
      "Hannibal Mejbri"
    ],
    "style": "防守强度和中场对抗是基础，进攻偏直接。",
    "strength": "Skhiri 能保护中路，Khazri 有关键球能力。",
    "risk": "落后时阵地战办法不多。",
    "watch": "看 Hannibal 的推进能否打破中场僵局。"
  },
  {
    "team": "Türkiye",
    "players": [
      "Hakan Calhanoglu",
      "Arda Guler",
      "Kenan Yildiz"
    ],
    "style": "中前场技术和远射能力突出，创造力不错。",
    "strength": "Hakan 的定位球和长传能迅速改变进攻方向。",
    "risk": "年轻球员多，比赛稳定性会有波动。",
    "watch": "看 Arda Guler 是否能在前腰区域获得自由度。"
  },
  {
    "team": "United States",
    "players": [
      "Christian Pulisic",
      "Weston McKennie",
      "Tyler Adams"
    ],
    "style": "速度、压迫和主场能量明显，转换进攻有冲击力。",
    "strength": "Pulisic 的边路内切和 McKennie 后插上很关键。",
    "risk": "阵地战耐心和防线细节仍需观察。",
    "watch": "看 Adams 是否能切断对手反击第一传。"
  },
  {
    "team": "Uruguay",
    "players": [
      "Federico Valverde",
      "Darwin Nunez",
      "Ronald Araujo"
    ],
    "style": "强度、纵深和身体对抗极高，比赛风格直接。",
    "strength": "Valverde 覆盖全场，Darwin 能持续冲击身后。",
    "risk": "节奏过快时，传球失误会增加。",
    "watch": "看 Araujo 是否能控制对手核心前锋。"
  },
  {
    "team": "Uzbekistan",
    "players": [
      "Eldor Shomurodov",
      "Abbosbek Fayzullaev",
      "Abdukodir Khusanov"
    ],
    "style": "纪律和反击速度不错，首次大赛更需要稳住开局。",
    "strength": "Shomurodov 的支点和 Fayzullaev 的突破是主要出口。",
    "risk": "经验和抗压能力是最大未知。",
    "watch": "看 Khusanov 能否顶住强队前锋冲击。"
  }
];

const fixtures = [...upcomingFixtures, ...completedFixtures.slice().reverse()];

const grid = document.querySelector("#fixture-grid");
const historyList = document.querySelector("#history-list");
const teamProfileGrid = document.querySelector("#team-profile-grid");
const groupGrid = document.querySelector("#group-grid");
const searchInput = document.querySelector("#search-input");
const filters = document.querySelectorAll(".filter");
const doneCount = document.querySelector("#done-count");
const upcomingCount = document.querySelector("#upcoming-count");
const focusCount = document.querySelector("#focus-count");
const doneFilterCount = document.querySelector("#done-filter-count");
const dataStatus = document.querySelector("#data-status");
const pageId = document.body.dataset.page ?? "home";
let activeFilter = "all";

function getLiveCompletedCount() {
  return liveWorldCupData?.completedMatches ?? completedFixtures.length;
}

function getLiveTotalMatches() {
  return liveWorldCupData?.totalMatches ?? totalScheduledMatches;
}

function getDataSourceLabel() {
  return liveWorldCupData?.source?.name ? ` · 数据源 ${liveWorldCupData.source.name}` : "";
}

function initBookmarkButtons() {
  document.querySelectorAll("[data-bookmark-button]").forEach((button) => {
    button.addEventListener("click", () => {
      const shortcut = navigator.platform.toLowerCase().includes("mac") ? "⌘+D" : "Ctrl+D";
      button.textContent = `按 ${shortcut} 收藏`;
      button.setAttribute("aria-label", `按 ${shortcut} 将当前页面收藏到浏览器`);
      window.setTimeout(() => {
        button.textContent = "收藏到浏览器";
      }, 2600);
    });
  });
}

function formatStatus(status) {
  if (status === "done") return "已完赛";
  if (status === "live") return "进行中";
  return "未开赛";
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const completedMatchesCount = getLiveCompletedCount();
  const remainingMatchesCount = getLiveTotalMatches() - completedMatchesCount;
  const filtered = fixtures.filter((fixture) => {
    const haystack = [
      fixture.date,
      fixture.timeLabel,
      fixture.group,
      fixture.city,
      fixture.stadium,
      fixture.watchTime,
      fixture.home,
      formatTeamName(fixture.home),
      fixture.away,
      formatTeamName(fixture.away),
      fixture.reason,
      ...(teamProfiles.find((profile) => profile.team === fixture.home)?.players ?? []),
      ...(teamProfiles.find((profile) => profile.team === fixture.away)?.players ?? [])
    ].join(" ").toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesFilter = activeFilter === "all" || fixture.status === activeFilter || (activeFilter === "focus" && fixture.focus);
    return matchesSearch && matchesFilter;
  });

  if (!filtered.length) {
    grid.innerHTML = '<p class="empty-state">没有匹配的比赛。清空搜索词或切换筛选后再看。</p>';
  } else {
    grid.innerHTML = filtered.map((fixture) => `
    <article class="fixture-card">
      <div class="fixture-top">
        <span>${fixture.city}</span>
        <span>${fixture.group}</span>
      </div>
      <div class="fixture-time">${fixture.timeLabel}</div>
      <div class="teams"><span>${formatTeamName(fixture.home)}</span><span class="versus">${fixture.score}</span><span>${formatTeamName(fixture.away)}</span></div>
      <p class="reason">${fixture.stadium} · ${fixture.watchTime} · ${fixture.reason}</p>
      <div class="fixture-details">
        ${(fixture.facts ?? [`赛前判断：${fixture.prediction}`, `关键变量：${fixture.keyPoint}`, `观赛重点：${fixture.watchFor}`])
          .map((item) => `<span>${item}</span>`)
          .join("")}
      </div>
      <div class="fixture-top">
        <span class="badge ${fixture.status}">${formatStatus(fixture.status)}</span>
        ${fixture.focus ? '<span class="badge focus">重点看</span>' : '<span class="badge">普通场</span>'}
      </div>
      ${fixture.href ? `<a class="text-link fixture-link" href="${fixture.href}">查看单场详情</a>` : ""}
    </article>
  `).join("");
  }

  doneCount.textContent = completedMatchesCount;
  upcomingCount.textContent = remainingMatchesCount;
  focusCount.textContent = fixtures.filter((fixture) => fixture.focus).length;
  doneFilterCount.textContent = completedMatchesCount;
  dataStatus.textContent = `已收录 ${completedMatchesCount} 场已完赛结果 · 2026 世界杯官方赛程共 104 场，整个赛程还剩 ${remainingMatchesCount} 场未完赛 · 所有比赛主时间显示北京时间 · 已更新 ${updatedAt}${getDataSourceLabel()}`;
}

function renderHistory() {
  historyList.innerHTML = completedFixtures.slice().reverse().map((fixture) => `
    <article class="history-row">
      <div>
        <span>${fixture.timeLabel}</span>
        <strong>${formatTeamName(fixture.home)} ${fixture.score} ${formatTeamName(fixture.away)}</strong>
      </div>
      <p>${fixture.group} · ${fixture.city} · ${fixture.stadium} · ${fixture.watchTime}</p>
      <small>${fixture.reason}</small>
    </article>
  `).join("");
}

function renderTeamProfiles() {
  if (!teamProfileGrid) return;
  teamProfileGrid.innerHTML = teamProfiles.map((profile) => `
    <article class="team-profile-card">
      <div class="team-profile-head">
        <span>${formatTeamName(profile.team)}</span>
        <h3>${formatTeamName(profile.team)}</h3>
      </div>
      <p class="team-style">${profile.style}</p>
      <div class="player-list" aria-label="${formatTeamName(profile.team)} 核心球员">
        ${profile.players.map((player) => {
          const [role, note] = getPlayerRole(player);
          return `
            <div class="player-row">
              <strong>${player}</strong>
              <span>${role}</span>
              <p>${note}</p>
            </div>
          `;
        }).join("")}
      </div>
      <div class="team-profile-notes">
        <div><span>优势</span><p>${profile.strength}</p></div>
        <div><span>风险</span><p>${profile.risk}</p></div>
        <div><span>参谋观察</span><p>${profile.watch}</p></div>
      </div>
    </article>
  `).join("");
}

function renderGroups() {
  if (!groupGrid) return;
  if (groupGrid.children.length) return;

  const groups = fixtures.reduce((result, fixture) => {
    result[fixture.group] ??= new Set();
    result[fixture.group].add(fixture.home);
    result[fixture.group].add(fixture.away);
    return result;
  }, {});

  groupGrid.innerHTML = Object.entries(groups)
    .sort(([groupA], [groupB]) => groupA.localeCompare(groupB, "zh-Hans-CN"))
    .map(([group, teams]) => {
      const teamList = [...teams].sort((teamA, teamB) => teamA.localeCompare(teamB));
      const status = teamList.length >= 4 ? "完整四队" : `${teamList.length} 队已录入`;
      return `
        <article class="group-card">
          <div class="group-head">
            <span>${group}</span>
            <strong>${status}</strong>
          </div>
          <ol class="team-rank-list">
            ${teamList.map((team) => `<li><span>${formatTeamName(team)}</span><strong>${teamProfiles.some((profile) => profile.team === team) ? "有资料" : "待补"}</strong></li>`).join("")}
          </ol>
          <p>本组按当前已录入赛程自动汇总。赛前判断仍需结合首发、轮换、天气和积分压力。</p>
        </article>
      `;
    })
    .join("");
}

function renderLatestReview() {
  const latestReviewGrid = document.querySelector("#latest-review-grid");
  if (!latestReviewGrid) return;

  latestReviewGrid.innerHTML = completedFixtures.slice().reverse().slice(0, 3).map((fixture, index) => `
    <article>
      <span>${index === 0 ? "最近完赛" : fixture.tone === "低比分" ? "低比分样本" : "强队兑现"}</span>
      <h3>${formatTeamName(fixture.home)} ${fixture.score} ${formatTeamName(fixture.away)}</h3>
      <p>${fixture.reason}</p>
    </article>
  `).join("");
}

function renderMatchReviews() {
  const matchReviewList = document.querySelector("#match-review-list");
  if (!matchReviewList) return;

  matchReviewList.innerHTML = completedFixtures.slice().reverse().map((fixture) => `
    <article class="match-review-card">
      <div class="match-review-head">
        <span>${fixture.timeLabel} · ${fixture.group}</span>
        <strong>${formatTeamName(fixture.home)} ${fixture.score} ${formatTeamName(fixture.away)}</strong>
      </div>
      <div class="review-metrics compact-review-metrics" aria-label="${formatTeamName(fixture.home)} 对 ${formatTeamName(fixture.away)} 复盘">
        <div><span>实际赛果</span><strong>${fixture.result}</strong><p>${fixture.city} · ${fixture.stadium}</p></div>
        <div><span>节奏标签</span><strong>${fixture.tone}</strong><p>总进球 ${fixture.totalGoals}，用于校准比分线和节奏预期。</p></div>
        <div><span>偏差检查</span><strong>按赛前判断复核</strong><p>重点看强弱方向、进球数和比赛开放度是否一致。</p></div>
        <div><span>下一步修正</span><strong>沉淀到同组比赛</strong><p>同组球队后续判断优先参考这场的节奏和防线稳定性。</p></div>
      </div>
    </article>
  `).join("");
}

function renderMatchAdvisor() {
  const matchAdvisorList = document.querySelector("#match-advisor-list");
  if (!matchAdvisorList) return;

  matchAdvisorList.innerHTML = upcomingFixtures.map((fixture, index) => `
    <article class="match-advisor-card">
      <div class="match-advisor-head">
        <span>${fixture.timeLabel} · ${fixture.group} · ${fixture.city}</span>
        <strong>${formatTeamName(fixture.home)} vs ${formatTeamName(fixture.away)}</strong>
      </div>
      <div class="match-advisor-body">
        <div>
          <span>赛前方向</span>
          <p>${fixture.prediction}</p>
        </div>
        <div>
          <span>关键变量</span>
          <p>${fixture.keyPoint}</p>
        </div>
        <div>
          <span>观赛重点</span>
          <p>${fixture.watchFor}</p>
        </div>
      </div>
      <div class="fixture-top">
        <span class="badge ${fixture.focus ? "focus" : ""}">${fixture.focus ? `重点场 ${index + 1}` : "普通场"}</span>
        ${fixture.href ? `<a class="text-link fixture-link" href="../${fixture.href}">查看单场详情</a>` : ""}
      </div>
    </article>
  `).join("");
}

function renderSummary() {
  const completedMatchesCount = getLiveCompletedCount();
  const remainingMatchesCount = getLiveTotalMatches() - completedMatchesCount;
  if (doneCount) doneCount.textContent = completedMatchesCount;
  if (upcomingCount) upcomingCount.textContent = remainingMatchesCount;
  if (focusCount) focusCount.textContent = fixtures.filter((fixture) => fixture.focus).length;
  if (doneFilterCount) doneFilterCount.textContent = completedMatchesCount;
  if (dataStatus) dataStatus.textContent = `已收录 ${completedMatchesCount} 场已完赛结果 · 还剩 ${remainingMatchesCount} 场 · 已更新 ${updatedAt}${getDataSourceLabel()}`;
}

function initHomePage() {
  renderSummary();
}

function initFixturesPage() {
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filters.forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", render);
  }

  render();
  setInterval(render, 5 * 60 * 1000);
}

function initHistoryPage() {
  renderHistory();
}

function initTeamsPage() {
  renderTeamProfiles();
}

function initGroupsPage() {
  renderGroups();
}

function initReviewPage() {
  renderMatchReviews();
  renderLatestReview();
}

function initAdvisorPage() {
  renderMatchAdvisor();
}

switch (pageId) {
  case "fixtures":
    initBookmarkButtons();
    initFixturesPage();
    break;
  case "history":
    initBookmarkButtons();
    initHistoryPage();
    break;
  case "teams":
    initBookmarkButtons();
    initTeamsPage();
    break;
  case "groups":
    initBookmarkButtons();
    initGroupsPage();
    break;
  case "review":
    initBookmarkButtons();
    initReviewPage();
    break;
  case "advisor":
    initBookmarkButtons();
    initAdvisorPage();
    break;
  case "match":
    initBookmarkButtons();
    break;
  default:
    initBookmarkButtons();
    initHomePage();
    break;
}
