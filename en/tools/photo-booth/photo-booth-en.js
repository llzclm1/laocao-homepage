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

let stream;
const templateStorageKey = "photoBoothTemplateEn";
let composedPhotoUrl = "";
let capturedPhotos = [];
const templatePresets = {
  Birthday: { layout: "narrow", color: "pink", shape: "square", sticker: "heart", showLogo: true, showDate: false, showTime: false, logoStyle: "party", templateImage: "birthday.png" },
  Graduation: { layout: "classic", color: "blue", shape: "square", sticker: "star", showLogo: true, showDate: true, showTime: false, logoStyle: "clean", templateImage: "graduation.png" },
  Couple: { layout: "narrow", color: "pink", shape: "round", sticker: "heart", showLogo: true, showDate: true, showTime: false, logoStyle: "soft", templateImage: "couple.png" },
  Besties: { layout: "narrow", color: "cream", shape: "round", sticker: "star", showLogo: true, showDate: true, showTime: false, logoStyle: "party", templateImage: "bestie.png" },
  "K-pop": { layout: "large", color: "black", shape: "square", sticker: "star", showLogo: true, showDate: false, showTime: true, logoStyle: "stage", templateImage: "kpop.png" },
  Y2K: { layout: "narrow", color: "blue", shape: "square", sticker: "star", showLogo: true, showDate: false, showTime: true, logoStyle: "stage", templateImage: "y2k.png" },
  "Retro Film": { layout: "classic", color: "black", shape: "square", sticker: "heart", showLogo: true, showDate: true, showTime: false, logoStyle: "film", templateImage: "film.png" },
  Christmas: { layout: "classic", color: "cream", shape: "round", sticker: "christmas", showLogo: true, showDate: true, showTime: false, logoStyle: "soft", templateImage: "christmas.png" },
  Halloween: { layout: "classic", color: "black", shape: "round", sticker: "christmas", showLogo: true, showDate: true, showTime: true, logoStyle: "stage", templateImage: "halloween.png" },
  Wedding: { layout: "large", color: "cream", shape: "round", sticker: "heart", showLogo: true, showDate: true, showTime: false, logoStyle: "soft", templateImage: "wedding.png" }
};
const templateImageCache = preloadTemplateImages(templatePresets);

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
    applyTemplatePreset(card.dataset.template);
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
countdown?.addEventListener("click", triggerShutter);
countdown?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  triggerShutter();
});
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

function applyTemplatePreset(template) {
  const preset = templatePresets[template];
  if (!preset || !optionPanel) return;

  setActiveOption(0, getLayoutLabel(preset.layout));
  setActiveSwatch(preset.color);
  setActiveOption(2, preset.shape === "round" ? "Rounded photos" : "Square photos");
  setActiveSticker(preset.sticker);
  setToggle(0, preset.showLogo);
  setToggle(1, preset.showDate);
  setToggle(2, preset.showTime);
  updateSettingsPreview();
}

function setActiveOption(groupIndex, label) {
  const group = optionPanel?.querySelectorAll(".option-group")[groupIndex];
  if (!group) return;
  group.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.textContent.trim() === label);
  });
}

function setActiveSwatch(color) {
  optionPanel?.querySelectorAll(".swatches button").forEach((button) => {
    button.classList.toggle("active", button.classList.contains(color));
  });
}

function setActiveSticker(sticker) {
  optionPanel?.querySelectorAll(".sticker-row button").forEach((button) => {
    button.classList.toggle("active", button.classList.contains(sticker));
  });
}

function setToggle(index, checked) {
  const input = optionPanel?.querySelectorAll(".toggle-grid input")[index];
  if (input) input.checked = Boolean(checked);
}

function getLayoutLabel(layout) {
  if (layout === "large") return "Large 8 x 5";
  if (layout === "classic") return "Classic 6 x 4";
  return "Narrow 6 x 2";
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
    composedPhotoUrl = "";
    capturedPhotos = [];
    renderCaptureStrip();
    cameraStatus.textContent = "Camera is on";
    cameraHint.textContent = "The video preview stays local. Take 4 photos before downloading the final strip.";
    countdown.textContent = "Go";
  } catch {
    cameraPreview?.classList.add("has-error");
    cameraPreview?.classList.remove("is-live", "has-photo");
    cameraStatus.textContent = "Camera blocked";
    cameraHint.textContent = "Allow camera access in the browser and try again. Permission is only used for this capture.";
  }
}

function triggerShutter() {
  if (capturedPhotos.length >= 4) {
    if (cameraHint) {
      cameraHint.textContent = "All 4 photos are captured. The photo strip is ready to download.";
    }
    return;
  }

  if (!takePhotoButton || takePhotoButton.disabled) {
    if (cameraHint) {
      cameraHint.textContent = "Open the camera first. The shutter stops after all 4 photos are captured.";
    }
    return;
  }

  takePhoto();
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

  capturedPhotos.push({
    canvas: cloneCanvas(canvas),
    url: canvas.toDataURL("image/png")
  });
  renderCaptureStrip();
  cameraStatus.textContent = `Captured ${capturedPhotos.length}/4`;
  if (capturedPhotos.length >= 4) {
    composedPhotoUrl = composePhotoStrip(capturedPhotos, getSavedTemplateSelection());
    photo.src = composedPhotoUrl;
    photo.hidden = false;
    video.hidden = true;
    cameraPreview?.classList.add("has-photo");
    cameraPreview?.classList.remove("is-live", "has-error");
    takePhotoButton.disabled = true;
    downloadButton.disabled = false;
    if (followCard) followCard.hidden = false;
    cameraHint.textContent = "All 4 photos are captured. The photo strip is ready to download.";
    countdown.textContent = "OK";
    return;
  }
  cameraHint.textContent = `Saved photo ${capturedPhotos.length}. Take photo ${capturedPhotos.length + 1} next.`;
  countdown.textContent = `${capturedPhotos.length}/4`;
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
  const preset = templatePresets[selectedCard?.dataset.template] || templatePresets.Birthday;
  const selection = {
    template: selectedCard?.dataset.template || "Birthday",
    layout: settingsPreviewStrip?.dataset.layout || preset.layout,
    color: settingsPreviewStrip?.dataset.color || preset.color,
    shape: settingsPreviewStrip?.dataset.shape || preset.shape,
    sticker: settingsPreviewSticker?.dataset.sticker || preset.sticker,
    showLogo: !settingsPreviewLogo?.hidden,
    showDate: !settingsPreviewDate?.hidden,
    showTime: !settingsPreviewTime?.hidden,
    logo: "Sticker Booth",
    logoStyle: preset.logoStyle,
    templateImage: preset.templateImage,
    locale: "en"
  };
  try {
    localStorage.setItem(templateStorageKey, JSON.stringify(selection));
  } catch {}
}

function getSavedTemplateSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(templateStorageKey) || "{}");
    const preset = templatePresets[saved.template] || templatePresets.Birthday;
    const selection = {
      template: saved.template || "Birthday",
      layout: saved.layout || preset.layout,
      color: saved.color || preset.color,
      shape: saved.shape || preset.shape,
      sticker: saved.sticker || preset.sticker,
      showLogo: saved.showLogo !== false,
      showDate: Boolean(saved.showDate),
      showTime: Boolean(saved.showTime),
      logo: saved.logo || "Sticker Booth",
      logoStyle: saved.logoStyle || preset.logoStyle,
      templateImage: saved.templateImage || preset.templateImage,
      locale: saved.locale || "en"
    };
    if (selectedTemplateNotice) selectedTemplateNotice.textContent = `Template: ${selection.template}`;
    return selection;
  } catch {
    return { template: "Birthday", ...templatePresets.Birthday, logo: "Sticker Booth", locale: "en" };
  }
}

function renderCaptureStrip() {
  if (!captureStrip) return;
  captureStrip.innerHTML = "";
  for (let index = 0; index < 4; index += 1) {
    if (capturedPhotos[index]) {
      const image = document.createElement("img");
      image.src = capturedPhotos[index].url;
      image.alt = `Captured photo ${index + 1}`;
      captureStrip.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.setAttribute("aria-label", `Photo ${index + 1} pending`);
      captureStrip.append(placeholder);
    }
  }
}

function composePhotoStrip(photoSources, selection) {
  const templateImage = getLoadedTemplateImage(selection.templateImage);
  if (templateImage) {
    return composeTemplateImageStrip(photoSources, selection, templateImage);
  }

  const layoutMap = {
    narrow: { width: 720, height: 2160, columns: 1, rows: 4 },
    classic: { width: 1200, height: 1800, columns: 2, rows: 2 },
    large: { width: 1500, height: 2400, columns: 2, rows: 2 }
  };
  const palette = {
    pink: { border: "#df8faf", background: "#fff4f9", accent: "#d74796", photoBorder: "rgba(201, 137, 183, 0.42)" },
    cream: { border: "#fff4df", background: "#fffaf0", accent: "#b7791f", photoBorder: "rgba(183, 121, 31, 0.32)" },
    black: { border: "#29262b", background: "#f7f4f1", accent: "#29262b", photoBorder: "rgba(41, 38, 43, 0.34)" },
    blue: { border: "#9acbff", background: "#f0f7ff", accent: "#2563eb", photoBorder: "rgba(37, 99, 235, 0.3)" }
  };
  const config = layoutMap[selection.layout] || layoutMap.narrow;
  const colors = palette[selection.color] || palette.pink;
  const output = document.createElement("canvas");
  output.width = config.width;
  output.height = config.height;
  const context = output.getContext("2d");
  context.fillStyle = colors.background;
  context.fillRect(0, 0, output.width, output.height);
  drawTemplatePattern(context, output, selection, colors);
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
    const radius = selection.shape === "round" ? Math.round(Math.min(cellWidth, cellHeight) * 0.12) : 6;
    drawCroppedImage(context, photoSources[index]?.canvas || photoSources[0]?.canvas, x, y, cellWidth, cellHeight, radius);
    context.lineWidth = Math.max(4, Math.round(output.width * 0.006));
    context.strokeStyle = colors.photoBorder;
    roundedRect(context, x, y, cellWidth, cellHeight, radius);
    context.stroke();
  }

  context.fillStyle = colors.accent;
  context.textAlign = "left";
  if (selection.showLogo) {
    context.font = getLogoFont(selection.logoStyle, output.width);
    context.fillText(selection.logo, padding, 64);
  }
  context.font = "600 26px sans-serif";
  const now = new Date();
  const stamp = [
    selection.showDate ? formatPreviewDate(now) : "",
    selection.showTime ? formatPreviewTime(now) : ""
  ].filter(Boolean).join(" ");
  if (stamp) context.fillText(stamp, padding, output.height - 48);
  drawSticker(context, selection.sticker, output.width - padding - 92, output.height - 126, 82, colors.accent);
  return output.toDataURL("image/png");
}

function preloadTemplateImages(presets) {
  const cache = {};
  Object.values(presets).forEach((preset) => {
    if (!preset.templateImage || cache[preset.templateImage]) return;
    const image = new Image();
    image.src = "../../../tools/photo-booth/assets/templates/" + preset.templateImage;
    cache[preset.templateImage] = image;
  });
  return cache;
}

function getLoadedTemplateImage(fileName) {
  const image = templateImageCache[fileName];
  return image?.complete && image.naturalWidth ? image : null;
}

function composeTemplateImageStrip(photoSources, selection, templateImage) {
  const scale = 4;
  const output = document.createElement("canvas");
  output.width = templateImage.naturalWidth * scale;
  output.height = templateImage.naturalHeight * scale;
  const context = output.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(templateImage, 0, 0, output.width, output.height);

  getTemplateSlots(templateImage.naturalWidth, templateImage.naturalHeight).forEach((slot, index) => {
    const x = slot.x * scale;
    const y = slot.y * scale;
    const width = slot.width * scale;
    const height = slot.height * scale;
    const radius = selection.shape === "round" ? Math.round(Math.min(width, height) * 0.12) : 8 * scale;
    drawCroppedImage(context, photoSources[index]?.canvas || photoSources[0]?.canvas, x, y, width, height, radius);
  });

  drawTemplateText(context, output, selection, scale);
  return output.toDataURL("image/png");
}

function getTemplateSlots(width, height) {
  const side = Math.round(width * 0.16);
  const top = Math.round(height * 0.14);
  const bottom = Math.round(height * 0.14);
  const gap = Math.round(height * 0.028);
  const slotWidth = width - side * 2;
  const slotHeight = Math.floor((height - top - bottom - gap * 3) / 4);
  return Array.from({ length: 4 }, (_, index) => ({
    x: side,
    y: top + index * (slotHeight + gap),
    width: slotWidth,
    height: slotHeight
  }));
}

function drawTemplateText(context, output, selection, scale) {
  const padding = Math.round(output.width * 0.1);
  context.save();
  context.fillStyle = selection.color === "black" ? "#29262b" : selection.color === "blue" ? "#2563eb" : selection.color === "cream" ? "#b7791f" : "#d74796";
  context.textAlign = "left";
  if (selection.showLogo) {
    context.font = getLogoFont(selection.logoStyle, output.width);
    context.fillText(selection.logo, padding, 44 * scale);
  }
  const stamp = [
    selection.showDate ? formatPreviewDate(new Date()) : "",
    selection.showTime ? formatPreviewTime(new Date()) : ""
  ].filter(Boolean).join(" ");
  if (stamp) {
    context.font = `600 ${18 * scale}px "Avenir Next", "SF Pro Text", sans-serif`;
    context.fillText(stamp, padding, output.height - 24 * scale);
  }
  context.restore();
}

function drawTemplatePattern(context, output, selection, colors) {
  context.save();
  context.globalAlpha = 0.22;
  context.fillStyle = colors.accent;
  const step = selection.layout === "narrow" ? 42 : 58;
  for (let x = -output.height; x < output.width; x += step) {
    context.fillRect(x, 0, 8, output.height);
  }
  context.globalAlpha = selection.logoStyle === "stage" ? 0.18 : 0.1;
  for (let index = 0; index < 18; index += 1) {
    const x = (index * 137) % output.width;
    const y = (index * 211) % output.height;
    drawSticker(context, selection.sticker, x, y, 34, colors.accent);
  }
  context.restore();
}

function getLogoFont(style, width) {
  const size = Math.round(width * 0.058);
  if (style === "stage") return `900 ${size}px "Bagel Fat One", "DynaPuff", sans-serif`;
  if (style === "film") return `700 ${size}px "Avenir Next", "SF Pro Text", sans-serif`;
  if (style === "soft") return `800 ${size}px "DynaPuff", "Bagel Fat One", sans-serif`;
  return `900 ${size}px "Bagel Fat One", "DynaPuff", sans-serif`;
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
