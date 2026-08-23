(function () {
  const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const params = new URLSearchParams(window.location.search);
  const funnelSource = params.get("source");

  if (funnelSource) sessionStorage.setItem("gewuji_funnel_source", funnelSource);

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
      source: sessionStorage.getItem("gewuji_funnel_source") || "direct",
    };
  }

  function decorateFactoryLinks() {
    const stored = {
      utm_source: sessionStorage.getItem("gewuji_utm_source"),
      utm_medium: sessionStorage.getItem("gewuji_utm_medium"),
      utm_campaign: sessionStorage.getItem("gewuji_utm_campaign"),
      utm_content: sessionStorage.getItem("gewuji_utm_content"),
      utm_term: sessionStorage.getItem("gewuji_utm_term"),
      source: sessionStorage.getItem("gewuji_funnel_source"),
    };

    document.querySelectorAll('a[href*="factory.gewuji.dev"]').forEach((link) => {
      let target;
      try {
        target = new URL(link.href);
      } catch {
        return;
      }

      Object.entries(stored).forEach(([key, value]) => {
        if (value && !target.searchParams.has(key)) target.searchParams.set(key, value);
      });

      link.href = target.toString();
    });
  }

  function emitEvent(eventName, properties, continueAction, timeoutMs) {
    const payload = {
      ...campaignData(),
      page_path: window.location.pathname,
      ...(properties || {}),
    };
    let continued = false;
    const continueOnce = () => {
      if (continued) return;
      continued = true;
      if (typeof continueAction === "function") continueAction();
    };

    if (typeof window.gtag === "function") {
      const gtagPayload = typeof continueAction === "function"
        ? { ...payload, event_callback: continueOnce, event_timeout: timeoutMs }
        : payload;
      window.gtag("event", eventName, gtagPayload);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, ...payload });
      continueOnce();
    }

    if (typeof window.clarity === "function") {
      window.clarity("event", eventName);
    }

    if (typeof continueAction === "function") {
      window.setTimeout(continueOnce, timeoutMs);
    }

    return payload;
  }

  window.gewujiTrack = function (eventName, properties) {
    return emitEvent(eventName, properties);
  };

  window.gewujiTrackAndContinue = function (eventName, properties, continueAction, timeoutMs = 800) {
    return emitEvent(eventName, properties, continueAction, timeoutMs);
  };

  document.addEventListener("DOMContentLoaded", () => {
    decorateFactoryLinks();
    const pageType = document.body.dataset.pageType;
    if (pageType === "paid_landing") window.gewujiTrack("landing_page_view");
    if (pageType === "supplier_reply_review") window.gewujiTrack("supplier_reply_review_view");
    if (pageType === "sample_report") window.gewujiTrack("sample_report_view");
    if (pageType === "buyer_guide") window.gewujiTrack("buyer_guide_view");
    if (pageType === "contact") window.gewujiTrack("contact_page_view");
    if (pageType === "factory_page") window.gewujiTrack("factory_page_view");

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
        if (form.dataset.trackSubmitMode === "manual") return;
        const submitEvent = form.dataset.trackSubmitEvent || "form_submit";
        window.gewujiTrack(submitEvent, {
          form_name: form.dataset.trackForm,
          submission_method: "email_handoff",
        });
      });
    });
  });
})();
