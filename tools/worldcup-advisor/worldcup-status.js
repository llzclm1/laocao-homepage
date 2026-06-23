(() => {
  function formatBeijingTimestamp(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date).replace(" ", " ") + " Asia/Shanghai";
  }

  function buildWorldCupStatusText({
    completedMatches,
    totalMatches,
    syncedAt,
    lastRefreshAt,
    extra = ""
  }) {
    const pieces = [
      `已收录 ${completedMatches} 场已完赛结果`,
      `还剩 ${Math.max(totalMatches - completedMatches, 0)} 场`,
      `已更新 ${syncedAt ?? "待同步"}`
    ];
    const refreshedAt = formatBeijingTimestamp(lastRefreshAt);
    if (refreshedAt) pieces.push(`本页最新刷新 ${refreshedAt}`);
    if (extra) pieces.push(extra);
    return pieces.join(" · ");
  }

  window.WorldCupStatus = {
    buildWorldCupStatusText,
    formatBeijingTimestamp
  };
})();
