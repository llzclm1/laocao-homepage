const settingsKey = "gewuji-content-admin-settings";
const clientHeaders = {
  "Content-Type": "application/json",
  "X-Promotion-Client": "official-web",
  "X-Promotion-Version": "0.1.0",
};

const apiBaseUrlInput = document.querySelector("#apiBaseUrl");
const adminSecretInput = document.querySelector("#adminSecret");
const result = document.querySelector("#result");

restoreSettings();

document.querySelector("#saveSettings").addEventListener("click", () => {
  saveSettings();
  writeResult("设置已保存到当前浏览器。");
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

document.querySelector("#codeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await postAdmin("/api/admin/redeem-codes", {
    credits: Number(form.get("credits") || 0),
    expiresInDays: Number(form.get("expiresInDays") || 30),
    plan: String(form.get("plan") || "pro"),
    code: String(form.get("code") || "").trim(),
  });
});

document.querySelector("#copyResult").addEventListener("click", async () => {
  await navigator.clipboard.writeText(result.textContent || "");
});

async function postAdmin(path, body) {
  saveSettings();
  const apiBaseUrl = normalizedApiBaseUrl();
  const adminSecret = adminSecretInput.value.trim();

  if (!apiBaseUrl) {
    writeResult("请先填写 API 地址。");
    return;
  }
  if (!adminSecret) {
    writeResult("请先填写管理员密钥。");
    return;
  }

  writeResult("提交中...");
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
      writeResult(payload?.error?.message || `请求失败：${response.status}`);
      return;
    }
    writeResult(formatSuccess(payload));
  } catch (error) {
    writeResult(`请求失败：${error.message || error}`);
  }
}

function formatSuccess(payload) {
  if (payload?.code?.code) {
    return [
      "兑换码生成成功",
      "",
      `兑换码：${payload.code.code}`,
      `额度：${payload.code.credits}`,
      `版本：${payload.code.plan}`,
      `有效期：${payload.code.expiresAt}`,
      "",
      "发给客户的话术：",
      `你的知铺兑换码是 ${payload.code.code}，登录后在“账号权益”里输入兑换即可到账。`,
    ].join("\n");
  }

  if (payload?.user) {
    return [
      "额度开通成功",
      "",
      `用户：${payload.user.name}`,
      `账号：${payload.user.loginId || "-"}`,
      `版本：${payload.user.plan}`,
      `剩余额度：${payload.user.credits}`,
    ].join("\n");
  }

  return JSON.stringify(payload, null, 2);
}

function restoreSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(settingsKey) || "{}");
    apiBaseUrlInput.value = settings.apiBaseUrl || "";
    adminSecretInput.value = settings.adminSecret || "";
  } catch {
    // Ignore broken local settings.
  }
}

function saveSettings() {
  localStorage.setItem(settingsKey, JSON.stringify({
    apiBaseUrl: normalizedApiBaseUrl(),
    adminSecret: adminSecretInput.value.trim(),
  }));
}

function normalizedApiBaseUrl() {
  return apiBaseUrlInput.value.trim().replace(/\/+$/, "");
}

function writeResult(text) {
  result.textContent = text;
}
