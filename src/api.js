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
