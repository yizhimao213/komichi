function reveal(img) {
  const go = () => img.classList.add("is-in");
  if (img.complete && img.naturalWidth > 0) {
    go();
    return;
  }
  img.addEventListener("load", go, { once: true });
  img.addEventListener("error", go, { once: true });
}

function bind(img) {
  if (!(img instanceof HTMLImageElement) || img.dataset.lazyBound) return;
  img.dataset.lazyBound = "1";
  const eager =
    img.hasAttribute("data-eager") || img.getAttribute("loading") === "eager";
  if (!img.hasAttribute("decoding")) img.decoding = "async";
  if (!img.hasAttribute("loading")) img.loading = eager ? "eager" : "lazy";
  if (!img.getAttribute("referrerpolicy")) img.referrerPolicy = "no-referrer";
  if (eager) {
    img.classList.add("is-in");
    return;
  }
  img.classList.add("is-lazy");
  reveal(img);
}

function scan(root) {
  if (root instanceof HTMLImageElement) {
    bind(root);
    return;
  }
  if (root.querySelectorAll) root.querySelectorAll("img").forEach(bind);
}

export function markdownImage({ href, title, text } = {}) {
  const src = String(href || "").replace(/"/g, "&quot;");
  const alt = String(text || "").replace(/"/g, "&quot;");
  const t = title ? ` title="${String(title).replace(/"/g, "&quot;")}"` : "";
  return `<img src="${src}" alt="${alt}"${t} loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
}

export function watchLazyImages() {
  scan(document);
  const mo = new MutationObserver((records) => {
    for (const rec of records) {
      rec.addedNodes.forEach((node) => {
        if (node.nodeType === 1) scan(node);
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}
