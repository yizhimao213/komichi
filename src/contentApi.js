import { applyContentOverrides } from "./content.js";

const TOKEN_KEY = "komichi-admin-token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth) headers["authorization"] = `Bearer ${getToken()}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || (data && data.ok === false)) {
    throw fileError(res.status, data);
  }
  return data;
}

/* ---------------------------------- 公开 ---------------------------------- */

export async function loadOverrides() {
  try {
    const data = await request("/api/documents");
    applyContentOverrides(data?.documents ?? []);
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------- 后台 ---------------------------------- */

export async function login(token) {
  setToken(token);
  try {
    await request("/api/admin/session", { method: "POST", body: { token } });
    return true;
  } catch {
    setToken("");
    return false;
  }
}

export function logout() {
  setToken("");
}

export async function listDocuments() {
  const data = await request("/api/admin/documents", { auth: true });
  return data?.documents ?? [];
}

export async function getDocument(kind, slug) {
  const data = await request(`/api/admin/documents/${kind}/${encodeURIComponent(slug)}`, {
    auth: true,
  });
  return data?.document ?? null;
}

export async function saveDocument(kind, slug, doc) {
  const data = await request(`/api/admin/documents/${kind}/${encodeURIComponent(slug)}`, {
    method: "PUT",
    auth: true,
    body: doc,
  });
  return data?.document ?? null;
}

export async function removeDocument(kind, slug, hard = false) {
  return request(
    `/api/admin/documents/${kind}/${encodeURIComponent(slug)}${hard ? "?hard=1" : ""}`,
    { method: "DELETE", auth: true }
  );
}

function fileError(status, data) {
  const map = {
    unauthorized: "未登录或口令失效",
    missing_file: "没有选择文件",
    empty_file: "文件是空的",
    too_large: "文件超过大小上限",
    unsupported_type: "这种类型暂不接收",
    storage_unavailable: "对象存储未就绪",
    not_found: "文件不存在",
    invalid_folder: "文件夹名不可用",
    folder_exists: "已有同名文件夹",
    protected_folder: "这个文件夹不能删",
  };
  const error = new Error(map[data?.error] || data?.error || `http_${status}`);
  error.status = status;
  return error;
}

export async function listFiles({ kind = "", q = "", folder = "" } = {}) {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (q) params.set("q", q);
  if (folder) params.set("folder", folder);
  const search = params.toString();
  const data = await request(`/api/admin/files${search ? `?${search}` : ""}`, { auth: true });
  return data?.files ?? [];
}

export async function uploadFile(file, onProgress, folder = "") {
  const headers = { authorization: `Bearer ${getToken()}` };
  onProgress?.(20);
  const body = new FormData();
  body.append("file", file);
  if (folder) body.append("folder", folder);
  const res = await fetch("/api/admin/files", { method: "POST", headers, body });
  onProgress?.(90);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data?.ok === false) throw fileError(res.status, data);
  onProgress?.(100);
  return data?.file ?? null;
}

export async function moveFile(id, folder) {
  const data = await request(`/api/admin/files/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: { folder },
  });
  return data?.file ?? null;
}

export async function deleteFile(id) {
  return request(`/api/admin/files/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

export async function listFolders() {
  const data = await request("/api/admin/folders", { auth: true });
  return data?.folders ?? [];
}

export async function createFolder(name) {
  const data = await request("/api/admin/folders", {
    method: "POST",
    auth: true,
    body: { name },
  });
  return data?.folder ?? null;
}

export async function renameFolder(from, name) {
  const data = await request(`/api/admin/folders/${encodeURIComponent(from)}`, {
    method: "PATCH",
    auth: true,
    body: { name },
  });
  return data?.folder ?? null;
}

export async function deleteFolder(name) {
  return request(`/api/admin/folders/${encodeURIComponent(name)}`, { method: "DELETE", auth: true });
}
