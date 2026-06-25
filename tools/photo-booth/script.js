const announcement = document.querySelector("#announcement");
const closeAnnouncement = document.querySelector("#closeAnnouncement");
const templateCards = document.querySelectorAll(".template-card");
const templateTabs = document.querySelectorAll(".template-tabs button");
const selectedTemplateName = document.querySelector("#selectedTemplateName");
const optionPanel = document.querySelector(".option-panel");
const settingsPreviewStrip = document.querySelector("#settingsPreviewStrip");
const settingsPreviewTitle = document.querySelector("#settingsPreviewTitle");
const settingsPreviewMeta = document.querySelector("#settingsPreviewMeta");
const settingsPreviewLogo = document.querySelector("#settingsPreviewLogo");
const settingsPreviewSticker = document.querySelector("#settingsPreviewSticker");
const settingsPreviewDate = document.querySelector("#settingsPreviewDate");
const settingsPreviewTime = document.querySelector("#settingsPreviewTime");
const video = document.querySelector("#video");
const canvas = document.querySelector("#canvas");
const photo = document.querySelector("#photo");
const openCameraButton = document.querySelector("#openCameraButton");
const takePhotoButton = document.querySelector("#takePhotoButton");
const downloadButton = document.querySelector("#downloadButton");
const followCard = document.querySelector("#followCard");
const countdown = document.querySelector("#countdown");
const cameraStatus = document.querySelector("#cameraStatus");
const cameraHint = document.querySelector("#cameraHint");
const cameraPreview = document.querySelector(".camera-preview");
const messageForm = document.querySelector("#messageForm");
const messages = document.querySelector("#messages");
const revealTargets = document.querySelectorAll(
  ".hero-copy, .template-panel, .camera-panel, .community, .privacy-note",
);

let stream;

closeAnnouncement?.addEventListener("click", () => {
  announcement.hidden = true;
});

optionPanel?.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const group = button.closest(".segmented, .swatches, .sticker-row");
  if (group) {
    group.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    updateSettingsPreview();
  }

  if (button.closest(".export-actions")) {
    if (cameraHint) {
      cameraHint.textContent = `${button.textContent.trim()} 会在完成照片条后可用。`;
    }
  }
});

optionPanel?.addEventListener("change", updateSettingsPreview);
updateSettingsPreview();

templateCards.forEach((card) => {
  card.addEventListener("click", () => {
    templateCards.forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    if (selectedTemplateName) {
      selectedTemplateName.textContent = card.dataset.template || "已选模板";
    }
  });
});

function updateSettingsPreview() {
  if (!optionPanel || !settingsPreviewStrip || !settingsPreviewTitle || !settingsPreviewMeta) {
    return;
  }

  const groups = optionPanel.querySelectorAll(".option-group");
  const layout = groups[0]?.querySelector(".active")?.textContent.trim() || "窄版 6 × 2";
  const colorButton = optionPanel.querySelector(".swatches .active");
  const colorName = colorButton?.getAttribute("aria-label") || "粉色";
  const shape = groups[2]?.querySelector(".active")?.textContent.trim() || "直角照片";
  const sticker = optionPanel.querySelector(".sticker-row .active")?.textContent.trim() || "爱心";
  const toggles = optionPanel.querySelectorAll(".toggle-grid input");
  const now = new Date();

  settingsPreviewStrip.dataset.layout = layout.includes("8 × 5")
    ? "large"
    : layout.includes("6 × 4")
      ? "classic"
      : "narrow";
  settingsPreviewStrip.dataset.color = colorButton?.classList.contains("cream")
    ? "cream"
    : colorButton?.classList.contains("black")
      ? "black"
      : colorButton?.classList.contains("blue")
        ? "blue"
        : "pink";
  settingsPreviewStrip.dataset.shape = shape.includes("圆角") ? "round" : "square";

  if (settingsPreviewLogo) {
    settingsPreviewLogo.hidden = !toggles[0]?.checked;
  }
  if (settingsPreviewSticker) {
    settingsPreviewSticker.textContent = "";
    settingsPreviewSticker.dataset.sticker = getStickerKey(sticker);
    settingsPreviewSticker.setAttribute("aria-label", `${sticker}贴纸`);
  }
  if (settingsPreviewDate) {
    settingsPreviewDate.textContent = formatPreviewDate(now);
    settingsPreviewDate.hidden = !toggles[1]?.checked;
  }
  if (settingsPreviewTime) {
    settingsPreviewTime.textContent = formatPreviewTime(now);
    settingsPreviewTime.hidden = !toggles[2]?.checked;
  }

  settingsPreviewTitle.textContent = layout;
  settingsPreviewMeta.textContent = `${colorName}边框 · ${shape} · ${sticker}贴纸`;
}

function formatPreviewDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function formatPreviewTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getStickerKey(sticker) {
  if (sticker.includes("星星")) {
    return "star";
  }
  if (sticker.includes("小狗")) {
    return "dog";
  }
  if (sticker.includes("圣诞")) {
    return "christmas";
  }
  return "heart";
}

templateTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const filter = tab.dataset.filter || "all";

    templateTabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    templateCards.forEach((card) => {
      const category = card.dataset.category || "all";
      card.hidden = filter !== "all" && category !== filter;
    });
  });
});

openCameraButton?.addEventListener("click", openCamera);
takePhotoButton?.addEventListener("click", takePhoto);
downloadButton?.addEventListener("click", downloadPhoto);

messageForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(messageForm);
  const nickname = String(formData.get("nickname")).trim();
  const message = String(formData.get("message")).trim();

  if (!nickname || !message) {
    return;
  }

  const item = document.createElement("p");
  item.innerHTML = `<strong>${escapeHtml(nickname)}：</strong>${escapeHtml(message)}`;
  messages.prepend(item);
  messageForm.reset();
});

setupReveal();

async function openCamera() {
  if (!video || !photo || !takePhotoButton || !downloadButton || !cameraStatus || !cameraHint) {
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    video.srcObject = stream;
    video.hidden = false;
    photo.hidden = true;
    cameraPreview?.classList.add("is-live");
    cameraPreview?.classList.remove("has-photo", "has-error");
    takePhotoButton.disabled = false;
    downloadButton.disabled = true;
    cameraStatus.textContent = "相机已打开";
    cameraHint.textContent = "视频只在本地预览，不会上传。看向镜头，点一下拍照。";
    countdown.textContent = "拍";
  } catch {
    cameraPreview?.classList.add("has-error");
    cameraPreview?.classList.remove("is-live", "has-photo");
    cameraStatus.textContent = "无法打开相机";
    cameraHint.textContent = "请允许浏览器使用摄像头后再试；授权仅用于本次拍摄。";
  }
}

function takePhoto() {
  if (!video || !canvas || !photo || !downloadButton || !cameraStatus || !cameraHint || !countdown) {
    return;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    cameraHint.textContent = "相机还没准备好，请稍等一下。";
    return;
  }

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, width, height);

  photo.src = canvas.toDataURL("image/png");
  photo.hidden = false;
  video.hidden = true;
  cameraPreview?.classList.add("has-photo");
  cameraPreview?.classList.remove("is-live", "has-error");
  downloadButton.disabled = false;
  followCard.hidden = false;
  cameraStatus.textContent = "拍好了";
  cameraHint.textContent = "满意的话就下载；想上墙就带 #贴贴研究所 发到小红书。";
  countdown.textContent = "✓";
}

function downloadPhoto() {
  if (!photo?.src) {
    return;
  }

  const link = document.createElement("a");
  link.href = photo.src;
  link.download = `tietie-lab-${Date.now()}.png`;
  link.click();
  if (cameraHint) {
    cameraHint.textContent = "已开始下载。现在可以去小红书 @贴贴研究所 分享投稿。";
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupReveal() {
  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((item) => item.classList.add("in-view"));
    return;
  }

  revealTargets.forEach((item) => item.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 },
  );

  revealTargets.forEach((item) => observer.observe(item));
}
