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
    image: "assets/projects/detail-crops/pixroom-color-grading.png",
    intro: "已经上线的照片调色小程序，目标是把胶片滤镜、色调预设、图片美化和轻量编辑做成手机里随手可用的小工具。",
    meta: [
      ["定位", "手机里的轻量照片调色入口"],
      ["解决", "普通用户调色和套滤镜门槛高的问题"],
      ["合作点", "滤镜风格、渠道测试、商业化验证"],
    ],
    summary:
      "PixRoom 已经上线，当前重点是继续打磨照片调色体验，并补充适合手机传播的色调预设。",
    points: [
      "适合日常照片、头像、商品图和社媒配图快速调色。",
      "已可作为线上小程序使用，核心流程是上传图片、选择滤镜、调整强度、快速保存。",
      "后续继续补充胶片、清透、复古等可复用色调预设。",
    ],
  },
  "material-box": {
    title: "memories",
    image: "assets/projects/detail-crops/memoris-material-board.png",
    intro: "准备上架 App Store 的手机信息收纳 APP，用来把微信、小红书、网页、聊天里看到的有用信息随手放进去，并自动归纳、提取重点。",
    meta: [
      ["定位", "手机信息与灵感的临时收纳箱"],
      ["解决", "有用内容分散在聊天、网页和收藏里"],
      ["合作点", "知识整理、内容创作、效率工具场景"],
    ],
    summary:
      "memories 当前进入 App Store 上架准备阶段。它不是书签管理器，而是把碎片信息先收进来，再变成可以回看的资料。",
    points: [
      "当前重点是完成上架前的产品资料、截图和审核准备。",
      "核心是快速收纳链接、文字、截图和灵感，再提炼重点。",
      "适合做知识整理、选题沉淀、购物决策和项目资料积累。",
    ],
  },
  "baodan-workshop": {
    title: "爆单工坊",
    image: "assets/projects/baodan-workshop-cover.png",
    intro: "爆单工坊是一套 AI 营销内容生成工具。",
    meta: [
      ["英文名", "AI Marketing Studio"],
      ["定位", "一句需求，生成全平台营销内容"],
      ["标签", "AI / Marketing / Content / Automation / Growth"],
    ],
    summary:
      "用户输入客户需求后，自动生成适用于小红书、抖音、视频号、公众号等平台的营销内容，同时输出图片提示词与短视频脚本，实现从需求到发布的一站式内容生产流程。",
    points: [
      "输入产品、活动或客户需求，即可生成多平台营销文案。",
      "覆盖小红书文案、抖音文案、视频号文案和公众号文章。",
      "同步输出 AI 配图提示词和 AI 视频脚本，帮助商家、自媒体和企业快速制作营销素材。",
    ],
  },
  "office-survivor": {
    title: "工位突围",
    image: "assets/projects/office-survivor-cover.png",
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
    title: "Motorcycle garage",
    image: "assets/projects/detail-crops/motorcycle-garage-material-board.png",
    intro: "制作中的摩托车管理软件，用来记录保养、里程、费用、改装档案和车辆生命周期。",
    meta: [
      ["定位", "摩托车生命周期的私人档案"],
      ["解决", "保养、费用和改装记录分散难追踪"],
      ["合作点", "垂直社区、车友服务、工具生态"],
    ],
    summary:
      "Motorcycle garage 当前在制作中，先做本地记录和管理，把车主最常用的保养、花费和改装档案整理出来。",
    points: [
      "当前先把车辆主页、保养提醒、费用账本和改装档案做扎实。",
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
