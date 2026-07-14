(function () {
  function normalizePath(value) {
    const path = new URL(value, window.location.href).pathname.replace(/\/+$/, "");
    return path || "/";
  }

  function setCurrentNavigation() {
    const current = normalizePath(window.location.href);
    const section = current.startsWith("/supplier-reply-review")
      ? "/supplier-reply-review"
      : current.startsWith("/buyer-guides") || current === "/for-buyers"
        ? "/for-buyers"
        : current.startsWith("/field-materials")
          ? "/field-materials"
          : current.startsWith("/contact")
            ? "/contact"
            : current;

    document.querySelectorAll(".bridge-nav a").forEach((link) => {
      if (normalizePath(link.href) === section) link.setAttribute("aria-current", "page");
    });
  }

  function enhanceRelatedLinks() {
    document.querySelectorAll(".bridge-section-header > h2").forEach((heading) => {
      if (!heading.textContent.trim().startsWith("Related")) return;
      const links = heading.parentElement.querySelectorAll(":scope > p a");
      if (!links.length) return;
      const container = links[0].parentElement;
      container.classList.add("bridge-related-links");
      [...container.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && /^[\s·]+$/.test(node.textContent)) node.remove();
      });
      links.forEach((link) => link.classList.add("bridge-resource-link"));
    });
  }

  function enhanceFaq() {
    document.querySelectorAll(".bridge-section-header > h2").forEach((heading) => {
      if (heading.textContent.trim() !== "FAQ") return;
      const container = heading.parentElement;
      container.classList.add("bridge-faq-list");
      let question = heading.nextElementSibling;
      while (question?.tagName === "H3") {
        const answer = question.nextElementSibling;
        if (!answer || answer.tagName !== "P") break;
        const nextQuestion = answer.nextElementSibling;
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        const answerWrap = document.createElement("div");
        details.className = "bridge-faq-item";
        answerWrap.className = "bridge-faq-answer";
        summary.textContent = question.textContent;
        answerWrap.append(answer);
        details.append(summary, answerWrap);
        container.insertBefore(details, question);
        question.remove();
        question = nextQuestion;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.classList.contains("bridge-page")) return;
    setCurrentNavigation();
    enhanceRelatedLinks();
    enhanceFaq();
  });
})();
