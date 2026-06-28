const form = document.querySelector("#diagnosis-form");
const statusNode = document.querySelector("#form-status");
const config = window.__DIAGNOSIS_CONFIG__ || {};

function setStatus(message, state = "") {
  statusNode.textContent = message;
  statusNode.dataset.state = state;
}

function field(formData, name, maxLength) {
  const value = String(formData.get(name) || "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function requireContact(payload) {
  return payload.email || payload.wechat;
}

async function submitLead(payload) {
  const url = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const key = config.supabaseAnonKey;

  if (!url || !key) {
    throw new Error("Supabase 还没配置好。你可以先发邮件到 25132283@qq.com。");
  }

  const response = await fetch(`${url}/rest/v1/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("提交失败，请稍后再试，或直接发邮件到 25132283@qq.com。");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  if (field(formData, "website", 20)) {
    form.reset();
    setStatus("已收到，我会尽快查看。", "success");
    return;
  }

  const payload = {
    source: "diagnosis_form",
    status: "new",
    company_name: field(formData, "company_name", 120),
    contact_name: field(formData, "contact_name", 80),
    email: field(formData, "email", 120),
    wechat: field(formData, "wechat", 80),
    product_line: field(formData, "product_line", 160),
    website_url: field(formData, "website_url", 300),
    material_url: field(formData, "material_url", 300),
    pain_point: field(formData, "pain_point", 1200),
    notes: field(formData, "notes", 1200),
    page_url: window.location.href,
    user_agent: navigator.userAgent.slice(0, 300)
  };

  if (!payload.company_name || !payload.pain_point || !requireContact(payload)) {
    setStatus("请填写公司名、问题，并至少留下邮箱或微信。", "error");
    return;
  }

  setStatus("正在提交...");

  try {
    await submitLead(payload);
    form.reset();
    setStatus("已收到，我会尽快查看。", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});
