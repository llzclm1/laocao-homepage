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
      audience: "buyer",
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
    document.querySelectorAll('a[href*="/supplier-reply-review/"]').forEach((link) => {
      if (/^\/(?:es\/)?buyer-guides\//.test(window.location.pathname)) {
        link.dataset.trackEvent = "buyer_guide_to_review_click";
      }
    });
    const pageType = document.body.dataset.pageType || inferPageType(window.location.pathname);
    if (pageType === "paid_landing") window.gewujiTrack("landing_page_view");
    if (pageType === "supplier_reply_review") window.gewujiTrack("supplier_reply_review_view");
    if (pageType === "sample_report") window.gewujiTrack("buyer_sample_report_view");
    if (pageType === "buyer_guide") window.gewujiTrack("buyer_guide_view");
    if (pageType === "contact") window.gewujiTrack("contact_page_view");
    if (pageType === "factory_page") window.gewujiTrack("factory_page_view");
    if (pageType === "buyer_landing") window.gewujiTrack("buyer_page_view");
    if (pageType === "buyer_guides_index") window.gewujiTrack("buyer_guides_index_view");
    if (pageType === "manufacturing_context") window.gewujiTrack("manufacturing_context_view");
    if (pageType === "supplier_reply_examples") window.gewujiTrack("buyer_example_view");
    if (pageType === "supplier_reply_methodology") window.gewujiTrack("supplier_reply_methodology_view");
    if (pageType === "supplier_checklist") window.gewujiTrack("supplier_checklist_view");

    document.querySelectorAll("[data-track-event]").forEach((element) => {
      element.addEventListener("click", (event) => {
        const properties = {
          action_location: element.dataset.trackLocation || "unknown",
          action_label: element.dataset.trackLabel || element.textContent.trim(),
        };
        const href = element instanceof HTMLAnchorElement ? element.href : "";
        const preservesNativeAction =
          !href ||
          href.startsWith("#") ||
          element.target === "_blank" ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey;

        if (preservesNativeAction) {
          window.gewujiTrack(element.dataset.trackEvent, properties);
          return;
        }

        event.preventDefault();
        window.gewujiTrackAndContinue(
          element.dataset.trackEvent,
          properties,
          () => window.location.assign(href),
        );
      });
    });

    document.querySelectorAll("[data-track-form]").forEach((form) => {
      let started = false;
      form.addEventListener("focusin", () => {
        if (started) return;
        started = true;
        window.gewujiTrack("buyer_review_start", { form_name: form.dataset.trackForm });
      });
      form.addEventListener("submit", () => {
        if (form.dataset.trackSubmitMode === "manual") return;
        const submitEvent = form.dataset.trackSubmitEvent || "buyer_review_email_click";
        window.gewujiTrack(submitEvent, {
          form_name: form.dataset.trackForm,
          submission_method: "email_handoff",
        });
      });
    });
  });

  function inferPageType(pathname) {
    const normalizedPath = pathname.replace(/\/+$/, "") || "/";
    if (normalizedPath === "/for-buyers") return "buyer_landing";
    if (normalizedPath === "/buyer-guides") return "buyer_guides_index";
    if (normalizedPath === "/field-materials") return "manufacturing_context";
    if (normalizedPath === "/china-supplier-checklist") return "supplier_checklist";
    if (normalizedPath === "/supplier-reply-review/sample-report") return "sample_report";
    if (normalizedPath.startsWith("/supplier-reply-review/examples/")) return "supplier_reply_examples";
    if (normalizedPath === "/supplier-reply-review/examples") return "supplier_reply_examples";
    if (normalizedPath === "/supplier-reply-review/methodology") return "supplier_reply_methodology";
    if (normalizedPath.startsWith("/supplier-reply-review/")) return "supplier_reply_review";
    if (normalizedPath.startsWith("/buyer-guides/") || normalizedPath.startsWith("/es/buyer-guides/")) return "buyer_guide";
    return "";
  }
})();
