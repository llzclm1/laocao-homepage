const filterButtons = document.querySelectorAll(".filter-button");
const projectCards = document.querySelectorAll(".project-card");
const filterResult = document.querySelector(".filter-result");
const detailDialog = document.querySelector(".project-detail-dialog");
const detailTitle = document.querySelector("#project-detail-title");
const detailIntro = document.querySelector(".project-detail-intro");
const detailMeta = document.querySelector(".project-detail-meta");
const detailSummary = document.querySelector(".project-detail-summary");
const detailPoints = document.querySelector(".project-detail-points");
const detailContact = document.querySelector(".project-detail-contact");
const detailClose = document.querySelector(".dialog-close");
const detailImage = document.querySelector(".project-detail-image");
const detailQr = document.querySelector(".project-detail-qr");
const detailQrImage = document.querySelector(".project-detail-qr-image");
const detailDownloads = document.querySelector(".project-detail-downloads");
const worldcupHomeSummary = document.querySelector("#worldcup-home-summary");
const worldcupHomeStatus = document.querySelector("#worldcup-home-status");

const projectDetails = {
  pixroom: {
    title: "PixRoom",
    image: "assets/projects/detail-crops/pixroom-color-grading.webp",
    qrImage: "assets/projects/pixroom-miniapp-qrcode.png",
    qrTitle: "微信扫码打开 PixRoom 小程序",
    qrCopy: "用微信扫一扫，直接进入 PixRoom 照片调色小程序。",
    qrNote: "AppID：wx293c2105e032354d",
    intro: "小程序已上线的照片调色工具，目标是把胶片滤镜、色调预设、图片美化和轻量编辑做成手机里随手可用的小工具。",
    meta: [
      ["定位", "手机里的轻量照片调色入口"],
      ["解决", "普通用户调色和套滤镜门槛高的问题"],
      ["合作点", "滤镜风格、渠道测试、商业化验证"],
    ],
    summary:
      "PixRoom 小程序已上线，当前重点是继续打磨照片调色体验，并补充适合手机传播的色调预设。",
    points: [
      "适合日常照片、头像、商品图和社媒配图快速调色。",
      "已可作为线上小程序使用，核心流程是上传图片、选择滤镜、调整强度、快速保存。",
      "后续继续补充胶片、清透、复古等可复用色调预设。",
    ],
    contactLabel: "扫码使用",
  },
  "material-box": {
    title: "memories",
    image: "assets/projects/detail-crops/memoris-material-board.webp",
    intro: "面向 Mac 和 Windows 的信息收纳工具，已提供两个免费版下载，用来把微信、小红书、网页、聊天里看到的有用信息随手放进去，并自动归纳、提取重点。",
    meta: [
      ["定位", "桌面端信息与灵感的临时收纳箱"],
      ["解决", "有用内容分散在聊天、网页和收藏里"],
      ["版本", "Mac 免费版 / Windows 免费版"],
    ],
    summary:
      "memories 当前已经开放 Mac 和 Windows 免费版下载。它不是书签管理器，而是把碎片信息先收进来，再变成可以回看的资料。",
    points: [
      "当前提供 Mac OS App 单包和 Windows Native 单包。",
      "核心是快速收纳链接、文字、截图和灵感，再提炼重点。",
      "适合做知识整理、选题沉淀、购物决策和项目资料积累。",
    ],
    downloads: [
      ["下载 Mac 免费版", "https://github.com/llzclm1/laocao-homepage/releases/download/memoris-free-20260623/memoris-mac-free.zip"],
      ["下载 Windows 免费版", "https://github.com/llzclm1/laocao-homepage/releases/download/memoris-free-20260623/memoris-windows-free.zip"],
    ],
  },
  "office-survivor": {
    title: "工位突围",
    image: "assets/projects/office-survivor-cover.webp",
    intro: "一款微信小游戏，测试版已上架，正式版正在审批，把空间、成长和爽感做成轻量化玩法。",
    meta: [
      ["定位", "上班族题材的轻量生存小游戏"],
      ["解决", "碎片时间需要低门槛爽感体验"],
      ["阶段", "测试版已上架，正式版在审批"],
    ],
    summary:
      "工位突围测试版已经上架，正式版正在审批。当前重点是围绕正式发布和早期反馈继续推进。",
    points: [
      "测试版已经上架，可用于收集早期体验反馈。",
      "正式版正在审批，审批通过后进入更完整的公开发布阶段。",
      "商业化方向包含激励广告、分享传播、商城和留存目标。",
    ],
  },
  "motorcycle-garage": {
    title: "机车库",
    image: "assets/projects/detail-crops/motorcycle-garage-material-board.webp",
    qrImage: "assets/projects/motorcycle-garage-miniapp-qrcode.png",
    qrTitle: "微信扫码打开机车库小程序",
    qrCopy: "用微信扫一扫，进入机车库小程序记录车辆、保养、改装和费用。",
    qrNote: "微信小程序 / 机车库",
    intro: "已迁移为微信小程序的摩托车数字车库，用来记录车辆信息、保养提醒、改装档案和费用账本。",
    meta: [
      ["定位", "微信里的摩托车数字车库"],
      ["解决", "车辆、保养、改装和支出记录分散难追踪"],
      ["合作点", "微信小程序、车友服务、工具生态"],
    ],
    summary:
      "机车库当前已改为微信小程序，围绕车辆首页、微信登录入口、总投入、下次保养、最近保养、改装和支出账本做核心记录闭环。",
    points: [
      "当前已改为微信小程序，先完成车辆首页、保养提醒、改装记录和费用账本闭环。",
      "小程序默认使用微信本地存储，登录仅用于识别微信用户，车辆账本仍保存在本机。",
      "已预留微信登录入口和云同步接口，当前重点是本地数据可靠与核心记录体验。",
    ],
  },
};

function openProjectDetail(detailKey) {
  const detail = projectDetails[detailKey];
  if (
    !detailDialog ||
    !detail ||
    !detailTitle ||
    !detailIntro ||
    !detailMeta ||
    !detailSummary ||
    !detailPoints
  ) {
    return;
  }

  detailTitle.textContent = detail.title;
  if (detailImage) {
    detailImage.src = detail.image;
    detailImage.alt = `${detail.title} 项目预览图`;
  }
  detailIntro.textContent = detail.intro;
  detailMeta.innerHTML = detail.meta
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
  detailSummary.textContent = detail.summary;
  detailPoints.innerHTML = detail.points.map((point) => `<li>${point}</li>`).join("");

  if (detailDownloads) {
    detailDownloads.hidden = !detail.downloads;
    detailDownloads.innerHTML = detail.downloads
      ? detail.downloads
          .map(([label, href]) => `<a class="button primary" href="${href}">${label}</a>`)
          .join("")
      : "";
  }

  if (detailQr && detailQrImage) {
    const hasQr = Boolean(detail.qrImage);
    if (hasQr) {
      detailQr.hidden = false;
      detailQr.removeAttribute("hidden");
      detailQr.style.display = "";
      detailQrImage.src = detail.qrImage;
      detailQrImage.alt = `${detail.title} 小程序二维码`;
      const qrTitle = detailQr.querySelector(".project-detail-qr-title");
      const qrCopy = detailQr.querySelector(".project-detail-qr-copy");
      const qrNote = detailQr.querySelector(".project-detail-qr-note");
      if (qrTitle) qrTitle.textContent = detail.qrTitle ?? `微信扫码打开${detail.title}`;
      if (qrCopy) qrCopy.textContent = detail.qrCopy ?? "用微信扫一扫，打开对应小程序。";
      if (qrNote) qrNote.textContent = detail.qrNote ?? "";
    } else {
      detailQr.hidden = true;
      detailQr.style.display = "none";
      detailQrImage.removeAttribute("src");
      detailQrImage.alt = "";
    }
  }

  if (detailContact) {
    detailContact.href = "#contact";
    detailContact.textContent = detail.contactLabel ?? "联系合作";
  }

  detailDialog.showModal();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    let visibleCount = 0;

    filterButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });

    projectCards.forEach((card) => {
      const categories = card.dataset.category.split(" ");
      const shouldShow = filter === "all" || categories.includes(filter);
      card.classList.toggle("hidden", !shouldShow);
      if (shouldShow) {
        visibleCount += 1;
      }
    });

    if (filterResult) {
      filterResult.textContent = `显示 ${visibleCount} 个项目`;
    }
  });
});

function updateWorldCupHome() {
  const data = window.worldCupAdvisorData;
  if (!data) return;

  const completed = Number.isFinite(data.completedMatches) ? data.completedMatches : null;
  const remaining = Number.isFinite(data.totalMatches) && completed !== null ? data.totalMatches - completed : null;
  const updatedAt = data.syncedAt ?? "待同步";
  if (worldcupHomeSummary && completed !== null) {
    worldcupHomeSummary.textContent = `按当天赛程整理比赛、重点场、赛前判断和赛后复盘，当前已同步 ${completed} 场完赛数据，页面会继续跟进最新赛果。`;
  }
  if (worldcupHomeStatus && completed !== null && remaining !== null) {
    worldcupHomeStatus.textContent = window.WorldCupStatus
      ? window.WorldCupStatus.buildWorldCupStatusText({
          completedMatches: completed,
          totalMatches: completed + remaining,
          syncedAt: updatedAt,
          lastRefreshAt: data.lastRefreshAt
        })
      : `已收录 ${completed} 场已完赛结果 · 还剩 ${remaining} 场 · 已更新 ${updatedAt}`;
  }
}

window.addEventListener?.("worldcup-advisor-data-ready", updateWorldCupHome);
updateWorldCupHome();

projectCards.forEach((card) => {
  card.addEventListener("click", (event) => {
    if (card.dataset.href && !event.target.closest("a, button")) {
      window.location.href = card.dataset.href;
      return;
    }

    const trigger = event.target.closest(".project-detail-trigger");
    if (trigger || event.target === card || !event.target.closest(".card-link")) {
      openProjectDetail(trigger?.dataset.projectDetail ?? card.dataset.projectDetail);
    }
  });

  card.addEventListener("keydown", (event) => {
    if (event.target.closest("a, button")) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (card.dataset.href) {
        window.location.href = card.dataset.href;
        return;
      }

      openProjectDetail(card.dataset.projectDetail);
    }
  });
});

if (detailDialog && detailClose) {
  detailClose.addEventListener("click", () => {
    detailDialog.close();
  });

  detailDialog.addEventListener("click", (event) => {
    if (event.target === detailDialog) {
      detailDialog.close();
    }
  });
}
