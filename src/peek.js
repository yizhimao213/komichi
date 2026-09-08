export function readPeekOrigin(el, kind = "text") {
  const node = el?.nodeType === 1 ? el : null;
  if (!node) return null;
  const r = kind === "text" ? node.getClientRects()[0] ?? node.getBoundingClientRect() : node.getBoundingClientRect();
  if (!r || !r.width || !r.height) return null;
  return {
    bottom: r.bottom,
    height: r.height,
    kind,
    left: r.left,
    right: r.right,
    top: r.top,
    width: r.width,
  };
}

export function parsePeekPath(raw) {
  if (!raw || typeof raw !== "string") return null;
  let url;
  try {
    url = new URL(raw, "https://peek.local");
  } catch {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "notes" && parts[1] && parts[1] !== "series") {
    const key = decodeURIComponent(parts.length >= 4 ? parts[3] : parts[1]);
    return { kind: "note", key, href: `/notes/${key}` };
  }
  if (parts[0] === "posts" && parts[1]) {
    const key = decodeURIComponent(parts[1]);
    return { kind: "post", key, href: `/posts/${key}` };
  }
  return null;
}
