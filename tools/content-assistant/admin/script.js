const settingsKey = "gewuji-content-admin-settings";
const adminSecretSessionKey = "gewuji-content-admin-secret";
const defaultApiBaseUrl = "https://156-238-232-37.sslip.io";
const clientHeaders = {
  "Content-Type": "application/json",
  "X-Promotion-Client": "official-web",
  "X-Promotion-Version": "0.1.0",
};

const apiBaseUrlInput = document.querySelector("#apiBaseUrl");
const adminSecretInput = document.querySelector("#adminSecret");
const result = document.querySelector("#result");
const statusText = document.querySelector("#status");
const codeForm = document.querySelector("#codeForm");
let lastRedeemCode = "";

restoreSettings();

document.querySelector("#saveSettings").addEventListener("click", () => {
  saveSettings();
  writeStatus("API 地址已保存，管理员密钥仅保存在当前浏览器会话。");
});

document.querySelectorAll("[data-code-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const credits = button.getAttribute("data-code-preset") || "100";
    const creditsInput = codeForm.elements.namedItem("credits");
    const planSelect = codeForm.elements.namedItem("plan");
    creditsInput.value = credits;
    planSelect.value = credits === "300" ? "team" : "pro";
    document.querySelectorAll("[data-code-preset]").forEach((presetButton) => {
      presetButton.classList.toggle("selected", presetButton === button);
    });
    writeStatus(`已选择 ${credits} 点套餐。`);
  });
});

document.querySelector("#grantForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await postAdmin("/api/admin/grant-credits", {
    loginId: String(form.get("loginId") || "").trim(),
    credits: Number(form.get("credits") || 0),
    plan: String(form.get("plan") || "pro"),
    title: String(form.get("title") || "人工开通").trim(),
  });
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const creditsInput = formElement.elements.namedItem("credits");
  const expiresInput = formElement.elements.namedItem("expiresInDays");
  const planSelect = formElement.elements.namedItem("plan");
  const codeInput = formElement.elements.namedItem("code");
  await postAdmin("/api/admin/redeem-codes", {
    credits: Number(creditsInput.value || 0),
    expiresInDays: Number(expiresInput.value || 30),
    plan: String(planSelect.value || "pro"),
    code: String(codeInput.value || "").trim(),
  });
});

document.querySelector("#copyResult").addEventListener("click", async () => {
  await navigator.clipboard.writeText(result.textContent || "");
  writeStatus("已复制全部结果。");
});

document.querySelector("#copyCode").addEventListener("click", async () => {
  if (!lastRedeemCode) {
    writeStatus("暂无可复制的兑换码。");
    return;
  }
  await navigator.clipboard.writeText(lastRedeemCode);
  writeStatus(`已复制兑换码：${lastRedeemCode}`);
});

async function postAdmin(path, body) {
  saveSettings();
  const apiBaseUrl = normalizedApiBaseUrl();
  const adminSecret = adminSecretInput.value.trim();

  if (!apiBaseUrl) {
    writeStatus("请先填写 API 地址。");
    return;
  }
  if (!adminSecret) {
    writeStatus("请先填写管理员密钥。");
    return;
  }

  writeStatus("提交中...");
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        ...clientHeaders,
        "X-Admin-Secret": adminSecret,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      writeStatus(payload?.error?.message || `请求失败：${response.status}`);
      return;
    }
    writeResult(formatSuccess(payload));
    writeStatus("操作成功。");
  } catch (error) {
    writeStatus(`请求失败：${error.message || error}`);
  }
}

function formatSuccess(payload) {
  if (payload?.code?.code) {
    lastRedeemCode = payload.code.code;
    return [
      "兑换码生成成功",
      "",
      `兑换码：${payload.code.code}`,
      `额度：${payload.code.credits}`,
      `版本：${payload.code.plan}`,
      `有效期：${payload.code.expiresAt}`,
      "",
      "发给用户的话术：",
      `你的知铺兑换码是 ${payload.code.code}，登录后在“账号权益”里输入兑换即可到账。`,
    ].join("\n");
  }

  if (payload?.user) {
    lastRedeemCode = "";
    return [
      "额度开通成功",
      "",
      `用户：${payload.user.name}`,
      `账号：${payload.user.loginId || "-"}`,
      `版本：${payload.user.plan}`,
      `剩余额度：${payload.user.credits}`,
    ].join("\n");
  }

  lastRedeemCode = "";
  return JSON.stringify(payload, null, 2);
}

function restoreSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(settingsKey) || "{}");
    apiBaseUrlInput.value = settings.apiBaseUrl || defaultApiBaseUrl;
    adminSecretInput.value = sessionStorage.getItem(adminSecretSessionKey) || "";
    if (settings.adminSecret) {
      localStorage.setItem(settingsKey, JSON.stringify({
        apiBaseUrl: settings.apiBaseUrl || defaultApiBaseUrl,
      }));
    }
  } catch {
    apiBaseUrlInput.value = defaultApiBaseUrl;
  }
}

function saveSettings() {
  localStorage.setItem(settingsKey, JSON.stringify({
    apiBaseUrl: normalizedApiBaseUrl(),
  }));
  sessionStorage.setItem(adminSecretSessionKey, adminSecretInput.value.trim());
}

function normalizedApiBaseUrl() {
  return apiBaseUrlInput.value.trim().replace(/\/+$/, "");
}

function writeResult(text) {
  result.textContent = text;
}

function writeStatus(text) {
  statusText.textContent = text;
}
