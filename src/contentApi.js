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
    const error = new Error(data?.error || `http_${res.status}`);
    error.status = res.status;
    throw error;
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
