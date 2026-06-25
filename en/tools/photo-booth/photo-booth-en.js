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

let stream;

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

  photo.src = canvas.toDataURL("image/png");
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
  link.href = photo.src;
  link.download = `sticker-booth-${Date.now()}.png`;
  link.click();
  if (cameraHint) {
    cameraHint.textContent = "Download started. Your photo stays on this device.";
  }
}
