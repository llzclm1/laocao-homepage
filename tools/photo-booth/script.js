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
const selectedTemplateNotice = document.querySelector("#selectedTemplateNotice");
const captureStrip = document.querySelector("#captureStrip");
const messageForm = document.querySelector("#messageForm");
const messages = document.querySelector("#messages");
const revealTargets = document.querySelectorAll(
  ".hero-copy, .template-panel, .camera-panel, .community, .privacy-note",
);

let stream;
const templateStorageKey = "photoBoothTemplate";
let composedPhotoUrl = "";
let capturedPhotos = [];

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
    saveTemplateSelection();
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
  saveTemplateSelection();
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
getSavedTemplateSelection();

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
    composedPhotoUrl = "";
    capturedPhotos = [];
    renderCaptureStrip();
    cameraStatus.textContent = "相机已打开";
    cameraHint.textContent = "视频只在本地预览，不会上传。请连续拍满 4 张后下载照片条。";
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

  capturedPhotos.push({
    canvas: cloneCanvas(canvas),
    url: canvas.toDataURL("image/png")
  });
  renderCaptureStrip();
  cameraStatus.textContent = `已拍 ${capturedPhotos.length}/4`;
  if (capturedPhotos.length >= 4) {
    composedPhotoUrl = composePhotoStrip(capturedPhotos, getSavedTemplateSelection());
    photo.src = composedPhotoUrl;
    photo.hidden = false;
    video.hidden = true;
    cameraPreview?.classList.add("has-photo");
    cameraPreview?.classList.remove("is-live", "has-error");
    takePhotoButton.disabled = true;
    downloadButton.disabled = false;
    followCard.hidden = false;
    cameraHint.textContent = "4 张已拍完，照片条已生成。满意的话就下载。";
    countdown.textContent = "✓";
    return;
  }
  cameraHint.textContent = `已保存第 ${capturedPhotos.length} 张，请继续拍第 ${capturedPhotos.length + 1} 张。`;
  countdown.textContent = `${capturedPhotos.length}/4`;
}

function downloadPhoto() {
  if (!photo?.src) {
    return;
  }

  const link = document.createElement("a");
  link.href = composedPhotoUrl || photo.src;
  link.download = `tietie-lab-${Date.now()}.png`;
  link.click();
  if (cameraHint) {
    cameraHint.textContent = "已开始下载。现在可以去小红书 @贴贴研究所 分享投稿。";
  }
}

function saveTemplateSelection() {
  const selectedCard = document.querySelector(".template-card.selected") || templateCards[0];
  const selection = {
    template: selectedCard?.dataset.template || "生日模板",
    layout: inferLayoutFromTemplate(selectedCard) || settingsPreviewStrip?.dataset.layout || "narrow",
    color: settingsPreviewStrip?.dataset.color || "pink",
    shape: settingsPreviewStrip?.dataset.shape || "square",
    sticker: settingsPreviewSticker?.dataset.sticker || "heart",
    showLogo: !settingsPreviewLogo?.hidden,
    showDate: !settingsPreviewDate?.hidden,
    showTime: !settingsPreviewTime?.hidden,
    logo: "贴贴研究所",
    locale: "zh-CN"
  };
  try {
    localStorage.setItem(templateStorageKey, JSON.stringify(selection));
  } catch {}
}

function inferLayoutFromTemplate(card) {
  const text = card?.querySelector("small")?.textContent || "";
  if (text.includes("8 × 5")) return "large";
  if (text.includes("6 × 4")) return "classic";
  return "narrow";
}

function getSavedTemplateSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(templateStorageKey) || "{}");
    const selection = {
      template: saved.template || "生日模板",
      layout: saved.layout || "narrow",
      color: saved.color || "pink",
      shape: saved.shape || "square",
      sticker: saved.sticker || "heart",
      showLogo: saved.showLogo !== false,
      showDate: Boolean(saved.showDate),
      showTime: Boolean(saved.showTime),
      logo: saved.logo || "贴贴研究所",
      locale: saved.locale || "zh-CN"
    };
    if (selectedTemplateNotice) selectedTemplateNotice.textContent = `当前模板：${selection.template}`;
    return selection;
  } catch {
    return { template: "生日模板", layout: "narrow", color: "pink", shape: "square", sticker: "heart", showLogo: true, showDate: false, showTime: false, logo: "贴贴研究所", locale: "zh-CN" };
  }
}

function renderCaptureStrip() {
  if (!captureStrip) return;
  captureStrip.innerHTML = "";
  for (let index = 0; index < 4; index += 1) {
    if (capturedPhotos[index]) {
      const image = document.createElement("img");
      image.src = capturedPhotos[index].url;
      image.alt = `第 ${index + 1} 张已拍照片`;
      captureStrip.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.setAttribute("aria-label", `第 ${index + 1} 张待拍`);
      captureStrip.append(placeholder);
    }
  }
}

function composePhotoStrip(photoSources, selection) {
  const layoutMap = {
    narrow: { width: 720, height: 1800, columns: 1, rows: 4 },
    classic: { width: 1080, height: 1620, columns: 2, rows: 2 },
    large: { width: 1200, height: 1500, columns: 2, rows: 2 }
  };
  const palette = {
    pink: { border: "#df8faf", background: "#fff4f9", accent: "#d74796" },
    cream: { border: "#fff4df", background: "#fffaf0", accent: "#b7791f" },
    black: { border: "#29262b", background: "#f7f4f1", accent: "#29262b" },
    blue: { border: "#9acbff", background: "#f0f7ff", accent: "#2563eb" }
  };
  const config = layoutMap[selection.layout] || layoutMap.narrow;
  const colors = palette[selection.color] || palette.pink;
  const output = document.createElement("canvas");
  output.width = config.width;
  output.height = config.height;
  const context = output.getContext("2d");
  context.fillStyle = colors.background;
  context.fillRect(0, 0, output.width, output.height);
  context.lineWidth = Math.max(18, Math.round(output.width * 0.035));
  context.strokeStyle = colors.border;
  context.strokeRect(context.lineWidth / 2, context.lineWidth / 2, output.width - context.lineWidth, output.height - context.lineWidth);

  const padding = Math.round(output.width * 0.09);
  const topSpace = selection.showLogo ? 108 : 58;
  const bottomSpace = 118;
  const gap = Math.round(output.width * 0.035);
  const cellWidth = (output.width - padding * 2 - gap * (config.columns - 1)) / config.columns;
  const cellHeight = (output.height - topSpace - bottomSpace - gap * (config.rows - 1)) / config.rows;
  for (let index = 0; index < config.rows * config.columns; index += 1) {
    const column = index % config.columns;
    const row = Math.floor(index / config.columns);
    const x = padding + column * (cellWidth + gap);
    const y = topSpace + row * (cellHeight + gap);
    drawCroppedImage(context, photoSources[index]?.canvas || photoSources[0]?.canvas, x, y, cellWidth, cellHeight, selection.shape === "round" ? 36 : 6);
  }

  context.fillStyle = colors.accent;
  context.textAlign = "left";
  if (selection.showLogo) {
    context.font = "700 42px sans-serif";
    context.fillText(selection.logo, padding, 64);
  }
  context.font = "600 26px sans-serif";
  const now = new Date();
  const stamp = [
    selection.showDate ? formatPreviewDate(now) : "",
    selection.showTime ? formatPreviewTime(now) : ""
  ].filter(Boolean).join(" ");
  if (stamp) context.fillText(stamp, padding, output.height - 48);
  drawSticker(context, selection.sticker, output.width - padding - 82, output.height - 116, 72, colors.accent);
  return output.toDataURL("image/png");
}

function cloneCanvas(sourceCanvas) {
  const copy = document.createElement("canvas");
  copy.width = sourceCanvas.width;
  copy.height = sourceCanvas.height;
  copy.getContext("2d").drawImage(sourceCanvas, 0, 0);
  return copy;
}

function drawCroppedImage(context, image, x, y, width, height, radius) {
  if (!image) return;
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const cropWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const cropHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const sx = (image.width - cropWidth) / 2;
  const sy = (image.height - cropHeight) / 2;
  context.save();
  roundedRect(context, x, y, width, height, radius);
  context.clip();
  context.drawImage(image, sx, sy, cropWidth, cropHeight, x, y, width, height);
  context.restore();
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawSticker(context, sticker, x, y, size, color) {
  context.save();
  context.fillStyle = color;
  context.font = `${size}px sans-serif`;
  const stickerMap = { star: "★", dog: "🐶", christmas: "✦", heart: "♥" };
  context.fillText(stickerMap[sticker] || stickerMap.heart, x, y + size);
  context.restore();
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
