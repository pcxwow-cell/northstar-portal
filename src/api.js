// ─── API CLIENT ──────────────────────────────────────────
// Wraps fetch with JWT auth header and error handling.
// The Vite proxy forwards /api → http://localhost:3003

const API_BASE = "/api/v1";

function getToken() {
  return localStorage.getItem("northstar_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("northstar_token", token);
  else localStorage.removeItem("northstar_token");
}

export function isAuthed() {
  return !!getToken();
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid — clear auth
    setToken(null);
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

// ─── Auth ───
export async function login(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function getMe() {
  return apiFetch("/auth/me");
}

export function logout() {
  setToken(null);
}

// ─── Data fetching ───
export async function fetchProjects() {
  return apiFetch("/projects");
}

export async function fetchProject(id) {
  return apiFetch(`/projects/${id}`);
}

export async function fetchInvestor(id) {
  return apiFetch(`/investors/${id}`);
}

export async function fetchInvestorProjects(investorId) {
  return apiFetch(`/investors/${investorId}/projects`);
}

export async function fetchDocuments(investorId) {
  return apiFetch(`/documents?investorId=${investorId}`);
}

export async function fetchDistributions(investorId) {
  return apiFetch(`/distributions?investorId=${investorId}`);
}

export async function fetchMessages() {
  return apiFetch("/messages");
}

// ─── Document download ───
export async function downloadDocument(docId) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/documents/${docId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Download failed");
  }
  // Trigger browser download
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const disposition = res.headers.get("Content-Disposition");
  const filename = disposition?.match(/filename="(.+)"/)?.[1] || "document.pdf";
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Admin endpoints ───
export async function fetchDashboard() {
  return apiFetch("/admin/dashboard");
}

export async function fetchAdminProjects() {
  return apiFetch("/admin/projects");
}

export async function updateProject(id, data) {
  return apiFetch(`/admin/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function postUpdate(projectId, text) {
  return apiFetch(`/admin/projects/${projectId}/updates`, { method: "POST", body: JSON.stringify({ text }) });
}

export async function fetchAdminInvestors(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/admin/investors${qs ? "?" + qs : ""}`);
}

export async function inviteInvestor(data) {
  return apiFetch("/admin/investors/invite", { method: "POST", body: JSON.stringify(data) });
}

export async function updateInvestor(id, data) {
  return apiFetch(`/admin/investors/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function approveInvestor(id) {
  return apiFetch(`/admin/investors/${id}/approve`, { method: "POST" });
}

export async function deactivateInvestor(id) {
  return apiFetch(`/admin/investors/${id}/deactivate`, { method: "POST" });
}

export async function resetInvestorPassword(id) {
  return apiFetch(`/admin/investors/${id}/reset-password`, { method: "POST" });
}

export async function assignInvestorProject(investorId, data) {
  return apiFetch(`/admin/investors/${investorId}/assign-project`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateInvestorKPI(userId, projectId, data) {
  return apiFetch(`/admin/investors/${userId}/projects/${projectId}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function sendMessage(data) {
  return apiFetch("/admin/messages", { method: "POST", body: JSON.stringify(data) });
}

export async function uploadDocument(formData) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData, // multipart — no Content-Type header (browser sets boundary)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Upload failed");
  }
  return res.json();
}

// ─── Utility (kept from data.js) ───
export const fmt = (n) => {
  if (typeof n !== "number") return n;
  return n.toLocaleString("en-US");
};

export const fmtCurrency = (n) => {
  if (typeof n !== "number") return n;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
};
