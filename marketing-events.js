(function () {
  const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const params = new URLSearchParams(window.location.search);

  campaignKeys.forEach((key) => {
    const value = params.get(key);
    if (value) sessionStorage.setItem(`gewuji_${key}`, value);
  });

  function campaignData() {
    const source = sessionStorage.getItem("gewuji_utm_source");
    const referrer = document.referrer ? new URL(document.referrer).hostname : "";
    return {
      traffic_source: source || referrer || "direct",
      traffic_medium: sessionStorage.getItem("gewuji_utm_medium") || (source ? "unknown" : referrer ? "referral" : "none"),
      campaign: sessionStorage.getItem("gewuji_utm_campaign") || "",
      campaign_content: sessionStorage.getItem("gewuji_utm_content") || "",
      campaign_term: sessionStorage.getItem("gewuji_utm_term") || "",
    };
  }

  window.gewujiTrack = function (eventName, properties) {
    const payload = {
      ...campaignData(),
      page_path: window.location.pathname,
      ...(properties || {}),
    };

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, ...payload });
    }

    if (typeof window.clarity === "function") {
      window.clarity("event", eventName);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const pageType = document.body.dataset.pageType;
    if (pageType === "paid_landing") window.gewujiTrack("landing_page_view");
    if (pageType === "sample_report") window.gewujiTrack("sample_report_view");

    document.querySelectorAll("[data-track-event]").forEach((element) => {
      element.addEventListener("click", () => {
        window.gewujiTrack(element.dataset.trackEvent, {
          action_location: element.dataset.trackLocation || "unknown",
          action_label: element.dataset.trackLabel || element.textContent.trim(),
        });
      });
    });

    document.querySelectorAll("[data-track-form]").forEach((form) => {
      let started = false;
      form.addEventListener("focusin", () => {
        if (started) return;
        started = true;
        window.gewujiTrack("form_start", { form_name: form.dataset.trackForm });
      });
      form.addEventListener("submit", () => {
        window.gewujiTrack("form_submit", {
          form_name: form.dataset.trackForm,
          submission_method: "email_handoff",
        });
      });
    });
  });
})();
