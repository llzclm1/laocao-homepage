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

const projectDetails = {
  pixroom: {
    title: "PixRoom",
    image: "assets/projects/pixroom-preview.png",
    intro: "面向普通用户的在线 P 图小程序，目标是把抠图、换背景、图片美化和轻量编辑做成手机里随手可用的小工具。",
    meta: [
      ["定位", "手机里的轻量修图入口"],
      ["解决", "普通用户不会复杂修图软件的问题"],
      ["合作点", "渠道测试、模板内容、商业化验证"],
    ],
    summary:
      "PixRoom 当前重点是稳定基础编辑体验，优先把上传图片、选择效果、快速保存做顺，再继续补充适合手机传播的功能和内容。",
    points: [
      "适合日常头像、商品图、证件照和社媒配图处理。",
      "第一阶段做“上传图片、选择效果、快速保存”的基础体验。",
      "后续接入免费次数、邀请奖励和激励视频广告。",
    ],
  },
  "material-box": {
    title: "素材收纳箱",
    image: "assets/projects/material-box-preview.svg",
    intro: "手机上的信息收纳 App，用来把微信、小红书、网页、聊天里看到的有用信息随手放进去，并自动归纳、提取重点。",
    meta: [
      ["定位", "手机信息与灵感的临时收纳箱"],
      ["解决", "有用内容分散在聊天、网页和收藏里"],
      ["合作点", "知识整理、内容创作、效率工具场景"],
    ],
    summary:
      "它不是书签管理器，而是把碎片信息先收进来，再变成可以回看的资料。重点是轻量输入、自动整理和后续查找。",
    points: [
      "面向“看到有用信息，但很快就散落找不到”的日常场景。",
      "核心是快速收纳链接、文字、截图和灵感，再提炼重点。",
      "适合做知识整理、选题沉淀、购物决策和项目资料积累。",
    ],
  },
  "office-survivor": {
    title: "工位突围",
    image: "assets/projects/office-survivor-cover.png",
    intro: "一款微信小游戏，把上班、突围、成长和爽感做成轻量化生存玩法。",
    meta: [
      ["定位", "上班族题材的轻量生存小游戏"],
      ["解决", "碎片时间需要低门槛爽感体验"],
      ["合作点", "试玩反馈、广告变现、内容联动"],
    ],
    summary:
      "工位突围的重点不是做复杂战斗，而是把上班题材的爽感循环做稳，再往留存和变现方向推进。",
    points: [
      "当前重点是稳定战斗主循环、角色系统和皮肤系统。",
      "商业化方向包含激励广告、分享传播、商城和留存目标。",
      "成功标准是不看广告也能完整玩，入口自然不打断战斗。",
    ],
  },
  "motorcycle-garage": {
    title: "Motorcycle Garage",
    image: "assets/projects/motorcycle-garage-preview.svg",
    intro: "本地优先的摩托车数字车库，用来记录保养、里程、费用、改装档案和车辆生命周期。",
    meta: [
      ["定位", "摩托车生命周期的私人档案"],
      ["解决", "保养、费用和改装记录分散难追踪"],
      ["合作点", "垂直社区、车友服务、工具生态"],
    ],
    summary:
      "Motorcycle Garage 先做本地记录和管理，把车主最常用的保养、花费和改装档案整理出来，再考虑更深的扩展。",
    points: [
      "MVP 覆盖车辆主页、保养提醒、费用账本和改装档案。",
      "iOS 使用 SwiftUI，本地 JSON 存储；Android 有 Compose 骨架。",
      "暂不做登录、社区和云同步，先验证单车本地使用场景。",
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

  if (detailContact) {
    detailContact.href = "#contact";
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

projectCards.forEach((card) => {
  card.addEventListener("click", (event) => {
    const trigger = event.target.closest(".project-detail-trigger");
    if (trigger || event.target === card || !event.target.closest(".card-link")) {
      openProjectDetail(trigger?.dataset.projectDetail ?? card.dataset.projectDetail);
    }
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProjectDetail(card.dataset.projectDetail);
    }
  });
});

if (detailDialog && detailClose) {
  detailClose.addEventListener("click", () => {
    detailDialog.close();
  });

  detailDialog.addEventListener("click", (event) => {
    const rect = detailDialog.getBoundingClientRect();
    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (clickedOutside) {
      detailDialog.close();
    }
  });
}
