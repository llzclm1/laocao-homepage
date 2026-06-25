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

let stream;
const templateStorageKey = "photoBoothTemplateEn";
let composedPhotoUrl = "";

closeAnnouncement?.addEventListener("click", () => {
  announcement.hidden = true;
});

optionPanel?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const group = button.closest(".segmented, .swatches, .sticker-row");
  if (group) {
    group.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    updateSettingsPreview();
  }

  if (button.closest(".export-actions") && cameraHint) {
    cameraHint.textContent = `${button.textContent.trim()} will be available after you finish a photo strip.`;
  }
});

optionPanel?.addEventListener("change", updateSettingsPreview);
updateSettingsPreview();

templateCards.forEach((card) => {
  card.addEventListener("click", () => {
    templateCards.forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    if (selectedTemplateName) {
      selectedTemplateName.textContent = card.dataset.template || "Selected template";
    }
    saveTemplateSelection();
  });
});

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

function updateSettingsPreview() {
  if (!optionPanel || !settingsPreviewStrip || !settingsPreviewTitle || !settingsPreviewMeta) return;

  const groups = optionPanel.querySelectorAll(".option-group");
  const layout = groups[0]?.querySelector(".active")?.textContent.trim() || "Narrow 6 x 2";
  const colorButton = optionPanel.querySelector(".swatches .active");
  const colorName = colorButton?.getAttribute("aria-label") || "Pink";
  const shape = groups[2]?.querySelector(".active")?.textContent.trim() || "Square photos";
  const sticker = optionPanel.querySelector(".sticker-row .active")?.textContent.trim() || "Heart";
  const toggles = optionPanel.querySelectorAll(".toggle-grid input");
  const now = new Date();

  settingsPreviewStrip.dataset.layout = layout.includes("8 x 5")
    ? "large"
    : layout.includes("6 x 4")
      ? "classic"
      : "narrow";
  settingsPreviewStrip.dataset.color = colorButton?.classList.contains("cream")
    ? "cream"
    : colorButton?.classList.contains("black")
      ? "black"
      : colorButton?.classList.contains("blue")
        ? "blue"
        : "pink";
  settingsPreviewStrip.dataset.shape = shape.toLowerCase().includes("rounded") ? "round" : "square";

  if (settingsPreviewLogo) {
    settingsPreviewLogo.hidden = !toggles[0]?.checked;
  }
  if (settingsPreviewSticker) {
    settingsPreviewSticker.textContent = "";
    settingsPreviewSticker.dataset.sticker = getStickerKey(sticker);
    settingsPreviewSticker.setAttribute("aria-label", `${sticker} sticker`);
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
  settingsPreviewMeta.textContent = `${colorName} frame · ${shape} · ${sticker} sticker`;
  saveTemplateSelection();
}

function getStickerKey(sticker) {
  const normalized = sticker.toLowerCase();
  if (normalized.includes("star")) return "star";
  if (normalized.includes("dog")) return "dog";
  if (normalized.includes("christmas")) return "christmas";
  return "heart";
}

function formatPreviewDate(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatPreviewTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function openCamera() {
  if (!video || !photo || !takePhotoButton || !downloadButton || !cameraStatus || !cameraHint) return;

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
    cameraStatus.textContent = "Camera is on";
    cameraHint.textContent = "The video preview stays local. Look at the camera, then take a photo.";
    countdown.textContent = "Go";
  } catch {
    cameraPreview?.classList.add("has-error");
    cameraPreview?.classList.remove("is-live", "has-photo");
    cameraStatus.textContent = "Camera blocked";
    cameraHint.textContent = "Allow camera access in the browser and try again. Permission is only used for this capture.";
  }
}

function takePhoto() {
  if (!video || !canvas || !photo || !downloadButton || !cameraStatus || !cameraHint || !countdown) return;

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    cameraHint.textContent = "The camera is still warming up. Try again in a moment.";
    return;
  }

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, width, height);

  composedPhotoUrl = composePhotoStrip(canvas, getSavedTemplateSelection());
  photo.src = composedPhotoUrl;
  photo.hidden = false;
  video.hidden = true;
  cameraPreview?.classList.add("has-photo");
  cameraPreview?.classList.remove("is-live", "has-error");
  downloadButton.disabled = false;
  if (followCard) followCard.hidden = false;
  cameraStatus.textContent = "Photo captured";
  cameraHint.textContent = "Download it if you like the result, or retake by opening the camera again.";
  countdown.textContent = "OK";
}

function downloadPhoto() {
  if (!photo?.src) return;

  const link = document.createElement("a");
  link.href = composedPhotoUrl || photo.src;
  link.download = `sticker-booth-${Date.now()}.png`;
  link.click();
  if (cameraHint) {
    cameraHint.textContent = "Download started. Your photo stays on this device.";
  }
}

getSavedTemplateSelection();

function saveTemplateSelection() {
  const selectedCard = document.querySelector(".template-card.selected") || templateCards[0];
  const selection = {
    template: selectedCard?.dataset.template || "Birthday",
    layout: inferLayoutFromTemplate(selectedCard) || settingsPreviewStrip?.dataset.layout || "narrow",
    color: settingsPreviewStrip?.dataset.color || "pink",
    shape: settingsPreviewStrip?.dataset.shape || "square",
    sticker: settingsPreviewSticker?.dataset.sticker || "heart",
    showLogo: !settingsPreviewLogo?.hidden,
    showDate: !settingsPreviewDate?.hidden,
    showTime: !settingsPreviewTime?.hidden,
    logo: "Sticker Booth",
    locale: "en"
  };
  try {
    localStorage.setItem(templateStorageKey, JSON.stringify(selection));
  } catch {}
}

function inferLayoutFromTemplate(card) {
  const text = card?.querySelector("small")?.textContent || "";
  if (text.includes("8 x 5")) return "large";
  if (text.includes("6 x 4")) return "classic";
  return "narrow";
}

function getSavedTemplateSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(templateStorageKey) || "{}");
    const selection = {
      template: saved.template || "Birthday",
      layout: saved.layout || "narrow",
      color: saved.color || "pink",
      shape: saved.shape || "square",
      sticker: saved.sticker || "heart",
      showLogo: saved.showLogo !== false,
      showDate: Boolean(saved.showDate),
      showTime: Boolean(saved.showTime),
      logo: saved.logo || "Sticker Booth",
      locale: saved.locale || "en"
    };
    if (selectedTemplateNotice) selectedTemplateNotice.textContent = `Template: ${selection.template}`;
    return selection;
  } catch {
    return { template: "Birthday", layout: "narrow", color: "pink", shape: "square", sticker: "heart", showLogo: true, showDate: false, showTime: false, logo: "Sticker Booth", locale: "en" };
  }
}

function composePhotoStrip(sourceCanvas, selection) {
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
    drawCroppedImage(context, sourceCanvas, x, y, cellWidth, cellHeight, selection.shape === "round" ? 36 : 6);
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

function drawCroppedImage(context, image, x, y, width, height, radius) {
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
