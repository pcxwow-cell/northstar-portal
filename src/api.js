// ─── API CLIENT ──────────────────────────────────────────
// Wraps fetch with JWT auth header and error handling.
// DEMO MODE: If API is unreachable (Vercel deploy without backend),
// falls back to static data from data.js for demo purposes.

import { investor as demoInvestor, projects as demoProjects, myProjects as demoMyProjects, allDocuments as demoAllDocuments, allDistributions as demoAllDistributions, generalDocuments as demoGeneralDocuments, messages as demoMessages } from "./data.js";

const API_BASE = "/api/v1";
let _demoMode = !!localStorage.getItem("northstar_demo_mode");

export function isDemoMode() { return _demoMode; }

function setDemoMode(val) {
  _demoMode = val;
  if (val) localStorage.setItem("northstar_demo_mode", "true");
  else localStorage.removeItem("northstar_demo_mode");
}

function getToken() {
  return localStorage.getItem("northstar_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("northstar_token", token);
  else localStorage.removeItem("northstar_token");
}

export function isAuthed() {
  return _demoMode ? !!localStorage.getItem("northstar_demo_role") : !!getToken();
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      setToken(null);
      throw new Error("Session expired. Please log in again.");
    }

    // Detect unreachable backend:
    // - Vite proxy returns 500 with ECONNREFUSED when backend is down
    // - Vercel returns 404 HTML page when no API route exists
    if (res.status === 500 || res.status === 404 || res.status === 405) {
      const contentType = res.headers.get("content-type") || "";
      const body = await res.text();
      const isApiDown = body.includes("ECONNREFUSED") || body.includes("proxy error") || body === ""
        || (res.status === 404 && contentType.includes("text/html")) // Vercel 404 page
        || (res.status === 404 && !contentType.includes("application/json")) // No JSON = no backend
        || (res.status === 405); // Vercel rewrite returns 405 for POST to static file
      if (isApiDown) {
        setDemoMode(true);
        throw new TypeError("API unreachable");
      }
      // Real API error (JSON response from our backend)
      try { const json = JSON.parse(body); throw new Error(json.error || `API error ${res.status}`); }
      catch (e) { if (e.message.includes("API error")) throw e; throw new Error(`API error ${res.status}`); }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || `API error ${res.status}`);
      if (body.lockedUntil) err.lockedUntil = body.lockedUntil;
      throw err;
    }

    return res.json();
  } catch (err) {
    // Network error — API unreachable. Switch to demo mode.
    if (err.message === "Failed to fetch" || err.name === "TypeError" || err.message === "API unreachable") {
      setDemoMode(true);
      throw err;
    }
    throw err;
  }
}

// ─── Auth ───
export async function login(email, password) {
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // If MFA is required, return the MFA challenge (no token set yet)
    if (data.requiresMfa) {
      return { requiresMfa: true, userId: data.userId, mfaToken: data.mfaToken };
    }
    setToken(data.token);
    return data.user;
  } catch (err) {
    // Demo mode fallback — accept hardcoded credentials
    if (_demoMode || err.message === "Failed to fetch" || err.message === "API unreachable") {
      setDemoMode(true);
      if (email === "j.chen@pacificventures.ca" && password === "northstar2025") {
        localStorage.setItem("northstar_demo_role", "INVESTOR");
        return { id: 1, name: "James Chen", initials: "JC", email, role: "Limited Partner" };
      }
      if (email === "admin@northstardevelopment.ca" && password === "admin2025") {
        localStorage.setItem("northstar_demo_role", "ADMIN");
        return { id: 2, name: "Northstar Admin", initials: "NA", email, role: "ADMIN" };
      }
      throw new Error("Invalid email or password");
    }
    throw err;
  }
}

export async function getMe() {
  if (!_demoMode && !getToken()) return null;
  if (_demoMode) {
    const role = localStorage.getItem("northstar_demo_role");
    if (role === "INVESTOR") return { id: 1, name: "James Chen", initials: "JC", email: "j.chen@pacificventures.ca", role: "Limited Partner", joined: "March 2023", projectIds: [1, 2] };
    if (role === "ADMIN") return { id: 2, name: "Northstar Admin", initials: "NA", email: "admin@northstardevelopment.ca", role: "ADMIN", joined: "January 2019", projectIds: [] };
    throw new Error("Not authenticated");
  }
  return apiFetch("/auth/me");
}

export async function updateProfile(data) {
  if (_demoMode) return data;
  return apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(data) });
}

export function logout() {
  setToken(null);
  localStorage.removeItem("northstar_demo_role");
  setDemoMode(false);
}

// ─── Password Management ───
export async function changePassword(currentPassword, newPassword) {
  if (_demoMode) return { success: true };
  return apiFetch("/auth/change-password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) });
}

export async function forgotPassword(email) {
  if (_demoMode) {
    console.log("[DEMO] Password reset requested for:", email);
    return { success: true };
  }
  return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export async function resetPassword(token, newPassword) {
  if (_demoMode) return { success: true };
  return apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
}

// ─── MFA (Two-Factor Authentication) ───
export async function setupMFA() {
  if (_demoMode) {
    return {
      secret: "DEMO1234SECRET56",
      otpauthUri: "otpauth://totp/Northstar%20Portal:demo@northstar.ca?secret=DEMO1234SECRET56&issuer=Northstar%20Portal",
      qrCodeDataUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEwMCIgeT0iOTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5Ij5EZW1vIFFSIENvZGU8L3RleHQ+PHRleHQgeD0iMTAwIiB5PSIxMTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjYmJiIj4oTm90IGZ1bmN0aW9uYWwpPC90ZXh0Pjwvc3ZnPg==",
    };
  }
  return apiFetch("/auth/mfa/setup", { method: "POST" });
}

export async function verifyMFASetup(token) {
  if (_demoMode) {
    if (token === "123456") return { success: true, backupCodes: ["a1b2c3d4", "e5f6g7h8", "i9j0k1l2", "m3n4o5p6", "q7r8s9t0", "u1v2w3x4", "y5z6a7b8", "c9d0e1f2"] };
    throw new Error("Invalid verification code");
  }
  return apiFetch("/auth/mfa/verify-setup", { method: "POST", body: JSON.stringify({ token }) });
}

export async function verifyMFA(userId, token, mfaToken) {
  if (_demoMode) {
    if (token === "123456") {
      const role = localStorage.getItem("northstar_demo_role");
      return {
        token: "demo-jwt-token",
        user: role === "ADMIN"
          ? { id: 2, name: "Northstar Admin", initials: "NA", email: "admin@northstardevelopment.ca", role: "ADMIN" }
          : { id: 1, name: "James Chen", initials: "JC", email: "j.chen@pacificventures.ca", role: "Limited Partner" },
      };
    }
    throw new Error("Invalid verification code");
  }
  return apiFetch("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ userId, token, mfaToken }) });
}

export async function disableMFA(password) {
  if (_demoMode) return { success: true };
  // NOTE: Using DELETE with body — some proxies may strip this. Consider changing to POST.
  return apiFetch("/auth/mfa/disable", { method: "DELETE", body: JSON.stringify({ password }) });
}

export async function getMFAStatus() {
  if (_demoMode) return { mfaEnabled: false };
  return apiFetch("/auth/mfa/status");
}

export async function regenerateBackupCodes() {
  if (_demoMode) return { backupCodes: ["a1b2c3d4", "e5f6g7h8", "i9j0k1l2", "m3n4o5p6", "q7r8s9t0", "u1v2w3x4", "y5z6a7b8", "c9d0e1f2"] };
  return apiFetch("/auth/mfa/regenerate-backup", { method: "POST" });
}

// ─── Login History ───
export async function fetchLoginHistory() {
  if (_demoMode) {
    return [
      { id: 1, ip: "192.168.1.42", userAgent: "Mozilla/5.0 Chrome/120", success: true, createdAt: new Date().toISOString() },
      { id: 2, ip: "192.168.1.42", userAgent: "Mozilla/5.0 Chrome/120", success: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 3, ip: "10.0.0.15", userAgent: "Mozilla/5.0 Safari/17", success: false, createdAt: new Date(Date.now() - 172800000).toISOString() },
      { id: 4, ip: "192.168.1.42", userAgent: "Mozilla/5.0 Chrome/120", success: true, createdAt: new Date(Date.now() - 259200000).toISOString() },
      { id: 5, ip: "192.168.1.42", userAgent: "Mozilla/5.0 Chrome/120", success: true, createdAt: new Date(Date.now() - 604800000).toISOString() },
    ];
  }
  return apiFetch("/auth/login-history");
}

// ─── Data fetching (with demo fallback) ───
export async function fetchProjects() {
  if (_demoMode) return demoProjects.map(p => ({ id: p.id, name: p.name, location: p.location, type: p.type, status: p.status, sqft: p.sqft, units: p.units, completion: p.completion, totalRaise: p.totalRaise, description: p.description, investorCommitted: p.investorCommitted, investorCalled: p.investorCalled, currentValue: p.currentValue, irr: p.irr, moic: p.moic }));
  return apiFetch("/projects");
}

export async function fetchProject(id) {
  if (_demoMode) return demoProjects.find(p => p.id === id) || null;
  return apiFetch(`/projects/${id}`);
}

export async function fetchInvestor(id) {
  if (_demoMode) return { ...demoInvestor, id: 1 };
  return apiFetch(`/investors/${id}`);
}

export async function fetchInvestorProjects(investorId) {
  if (_demoMode) return demoMyProjects;
  return apiFetch(`/investors/${investorId}/projects`);
}

export async function fetchDocuments(investorId) {
  if (_demoMode) return demoAllDocuments;
  return apiFetch(`/documents?investorId=${investorId}`);
}

export async function fetchDistributions(investorId) {
  if (_demoMode) return demoAllDistributions;
  return apiFetch(`/distributions?investorId=${investorId}`);
}

export async function fetchMessages() {
  if (_demoMode) return demoMessages;
  return apiFetch("/messages");
}

// ─── Document download ───
export async function downloadDocument(docId) {
  if (_demoMode) {
    // In demo mode, try to open the file path directly for seeded docs
    const doc = demoAllDocuments?.find(d => d.id === docId);
    if (doc?.file) window.open(doc.file, "_blank");
    return;
  }
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

// ─── Threads (messaging) ───
const _demoThreads = demoMessages.map((m, i) => ({
  id: i + 1, subject: m.subject, targetType: "ALL", project: null,
  creator: { id: 2, name: m.from, initials: m.from.split(" ").map(n => n[0]).join(""), role: "ADMIN" },
  lastMessage: { body: m.preview, sender: { id: 2, name: m.from, role: "ADMIN" }, date: new Date().toISOString() },
  messageCount: 1, unread: m.unread, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}));

export async function fetchThreads() {
  if (_demoMode) return _demoThreads;
  return apiFetch("/threads");
}

export async function fetchThread(id) {
  if (_demoMode) {
    const t = _demoThreads.find(t => t.id === id);
    const msg = demoMessages[id - 1];
    return { ...t, messages: [{ id: 1, body: msg?.preview || "", sender: t.creator, createdAt: new Date().toISOString() }], readReceipts: [
      { userId: 2, name: "Gord Wylie", initials: "GW", unread: false, readAt: new Date(Date.now() - 3600000).toISOString() },
      { userId: 1, name: "James Chen", initials: "JC", unread: false, readAt: new Date().toISOString() },
    ] };
  }
  return apiFetch(`/threads/${id}`);
}

export async function createThread(data) {
  if (_demoMode) { _demoThreads.unshift({ id: Date.now(), subject: data.subject, targetType: "STAFF", project: null, creator: { id: 1, name: "James Chen", initials: "JC", role: "INVESTOR" }, lastMessage: { body: data.body, sender: { id: 1, name: "James Chen", role: "INVESTOR" }, date: new Date().toISOString() }, messageCount: 1, unread: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); return _demoThreads[0]; }
  return apiFetch("/threads", { method: "POST", body: JSON.stringify(data) });
}

export async function replyToThread(id, body) {
  if (_demoMode) { const reply = { id: Date.now(), body, sender: { id: 1, name: "James Chen", initials: "JC", role: "INVESTOR" }, createdAt: new Date().toISOString() }; return reply; }
  return apiFetch(`/threads/${id}/reply`, { method: "POST", body: JSON.stringify({ body }) });
}

export async function markThreadRead(id) {
  if (_demoMode) return { ok: true };
  return apiFetch(`/threads/${id}/read`, { method: "POST" });
}

// ─── Admin endpoints ───
export async function fetchDashboard() {
  if (_demoMode) {
    const totalCommitted = demoProjects.reduce((s, p) => s + (p.totalRaise || 0), 0);
    const totalCurrentValue = demoProjects.reduce((s, p) => s + (p.currentValue || 0), 0);
    return {
      projectCount: demoProjects.length, investorCount: 1, docCount: demoAllDocuments.length,
      unreadMessages: demoMessages.filter(m => m.unread).length,
      recentDocs: demoAllDocuments.slice(0, 5).map(d => ({ id: d.id, name: d.name, date: d.date, project: { name: d.project } })),
      totalCommitted, totalCurrentValue,
      trends: { investors: "+3 this week", projects: "1 new this month", documents: "+5 this week", messages: "+2 today" },
    };
  }
  return apiFetch("/admin/dashboard");
}

export async function fetchAdminProjects() {
  if (_demoMode) return demoProjects.map(p => ({ id: p.id, name: p.name, location: p.location, status: p.status, completion: p.completion, totalRaise: p.totalRaise, units: p.units, investorCount: p.capTable.length, docCount: p.documents.length }));
  return apiFetch("/admin/projects");
}

export async function updateProject(id, data) {
  return apiFetch(`/admin/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function postUpdate(projectId, text) {
  return apiFetch(`/admin/projects/${projectId}/updates`, { method: "POST", body: JSON.stringify({ text }) });
}

export async function fetchAdminInvestors(params = {}) {
  if (_demoMode) return [{ id: 1, name: "James Chen", email: "j.chen@pacificventures.ca", initials: "JC", status: "ACTIVE", joined: "March 2023", totalCommitted: 850000, totalValue: 672500, projects: demoMyProjects.map(p => ({ projectId: p.id, projectName: p.name, committed: p.investorCommitted, called: p.investorCalled, currentValue: p.currentValue, irr: p.irr, moic: p.moic })) }];
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

export async function unlockInvestor(id) {
  return apiFetch(`/admin/investors/${id}/unlock`, { method: "POST" });
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

export async function fetchInvestorProfile(id) {
  if (_demoMode) return { id: 1, name: "James Chen", email: "j.chen@pacificventures.ca", initials: "JC", role: "INVESTOR", status: "ACTIVE", joined: "March 2023", groups: [], projects: demoMyProjects.map(p => ({ projectId: p.id, projectName: p.name, projectStatus: p.status, committed: p.investorCommitted, called: p.investorCalled, currentValue: p.currentValue, irr: p.irr, moic: p.moic })), documents: { assigned: [], projectDocs: demoAllDocuments.filter(d => d.project !== "General"), generalDocs: demoAllDocuments.filter(d => d.project === "General") }, recentThreads: demoMessages.map((m, i) => ({ id: i + 1, subject: m.subject, updatedAt: new Date().toISOString(), targetType: "ALL", unread: m.unread })) };
  return apiFetch(`/admin/investors/${id}/profile`);
}

// Groups
export async function fetchGroups() {
  if (_demoMode) return [];
  return apiFetch("/admin/groups");
}

export async function createGroup(data) {
  return apiFetch("/admin/groups", { method: "POST", body: JSON.stringify(data) });
}

export async function updateGroup(id, data) {
  return apiFetch(`/admin/groups/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteGroup(id, force = false) {
  return apiFetch(`/admin/groups/${id}${force ? "?force=true" : ""}`, { method: "DELETE" });
}

export async function fetchGroupDetail(id) {
  return apiFetch(`/admin/groups/${id}`);
}

export async function addGroupMembers(groupId, userIds) {
  return apiFetch(`/admin/groups/${groupId}/members`, { method: "POST", body: JSON.stringify({ userIds }) });
}

export async function removeGroupMember(groupId, userId) {
  return apiFetch(`/admin/groups/${groupId}/members/${userId}`, { method: "DELETE" });
}

// Staff
export async function fetchStaff() {
  if (_demoMode) return [{ id: 2, name: "Northstar Admin", email: "admin@northstardevelopment.ca", role: "ADMIN", status: "ACTIVE", joined: "January 2019" }];
  return apiFetch("/admin/staff");
}

export async function createStaff(data) {
  return apiFetch("/admin/staff", { method: "POST", body: JSON.stringify(data) });
}

export async function updateStaff(id, data) {
  return apiFetch(`/admin/staff/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deactivateStaff(id) {
  return apiFetch(`/admin/staff/${id}/deactivate`, { method: "POST" });
}

export async function reactivateStaff(id) {
  return apiFetch(`/admin/staff/${id}/reactivate`, { method: "POST" });
}

export async function resetStaffPassword(id) {
  return apiFetch(`/admin/staff/${id}/reset-password`, { method: "POST" });
}

// Admin documents
export async function fetchAdminProjectDetail(id) {
  if (_demoMode) { const p = demoProjects.find(x => x.id === id); if (!p) return null; return { ...p, completion: p.completion, prefReturn: p.waterfall.prefReturn, catchUp: p.waterfall.catchUp, carry: p.waterfall.carry, investors: p.id <= 2 ? [{ userId: 1, name: "James Chen", email: "j.chen@pacificventures.ca", committed: p.investorCommitted, called: p.investorCalled, currentValue: p.currentValue, irr: p.irr, moic: p.moic }] : [], documents: p.documents.map(d => ({ ...d, viewedBy: 0 })), updates: p.updates.map((u, i) => ({ id: i + 1, ...u })) }; }
  return apiFetch(`/admin/projects/${id}`);
}

export async function updateWaterfall(projectId, data) {
  return apiFetch(`/admin/projects/${projectId}/waterfall`, { method: "PUT", body: JSON.stringify(data) });
}

export async function fetchAdminDocuments(params = {}) {
  if (_demoMode) return demoAllDocuments.map(d => ({ id: d.id, name: d.name, category: d.category, date: d.date, size: d.size, status: d.status, project: d.project, totalInvestors: d.project === "General" ? 1 : 1, viewed: 0, downloaded: 0 }));
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/admin/documents${qs ? "?" + qs : ""}`);
}

export async function fetchAdminDocumentDetail(id) {
  if (_demoMode) { const d = demoAllDocuments.find(x => x.id === id); return d ? { ...d, project: d.project !== "General" ? { id: 1, name: d.project } : null, accessList: [{ id: 1, name: "James Chen", email: "j.chen@pacificventures.ca", hasAccess: true, viewedAt: null, downloadedAt: null, acknowledgedAt: null }], signatureRequests: [] } : null; }
  return apiFetch(`/admin/documents/${id}`);
}

export async function uploadDocument(formData) {
  if (_demoMode) return { id: Date.now(), name: "demo-upload.pdf", status: "published" };
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

export async function bulkUploadK1(formData) {
  if (_demoMode) return { total: 2, matched: 1, unmatched: 1, results: [
    { filename: "K1_JamesChen_2025.pdf", documentId: 99, matched: { id: 1, name: "James Chen" }, status: "matched" },
    { filename: "K1_Unknown_2025.pdf", documentId: 100, matched: null, status: "unmatched" },
  ]};
  const token = getToken();
  const res = await fetch(`${API_BASE}/documents/bulk-k1`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Bulk upload failed");
  }
  return res.json();
}

export async function deleteDocument(id) {
  return apiFetch(`/documents/${id}`, { method: "DELETE" });
}

export function getDocumentPreviewUrl(docId) {
  if (_demoMode) return null;
  const BASE = import.meta.env.VITE_API_URL || "";
  const token = localStorage.getItem("token");
  return `${BASE}/api/v1/documents/${docId}/preview?token=${encodeURIComponent(token)}`;
}

export async function acknowledgeDocument(docId) {
  if (_demoMode) return { ok: true, acknowledgedAt: new Date().toISOString() };
  return apiFetch(`/documents/${docId}/acknowledge`, { method: "POST" });
}

export async function assignDocument(docId, userIds, groupIds = []) {
  return apiFetch(`/admin/documents/${docId}/assign`, { method: "POST", body: JSON.stringify({ userIds, groupIds }) });
}

export async function deleteProject(id) {
  return apiFetch(`/admin/projects/${id}`, { method: "DELETE" });
}

// ─── Signatures ───
const _demoSignatures = [
  { id: 1, documentId: 5, documentName: "Subscription Agreement", status: "pending", message: "Please review and sign", createdAt: new Date().toISOString(),
    signers: [{ id: 1, name: "James Chen", email: "j.chen@pacificventures.ca", status: "pending", signUrl: null, userId: 1 }] },
];

export async function fetchSignatureRequests() {
  if (_demoMode) return _demoSignatures;
  return apiFetch("/signatures");
}

export async function fetchSignatureRequest(id) {
  if (_demoMode) return _demoSignatures.find(s => s.id === id) || null;
  return apiFetch(`/signatures/${id}`);
}

export async function createSignatureRequest(data) {
  if (_demoMode) {
    const req = {
      id: Date.now(), requestId: "demo_" + Date.now(), status: "pending",
      subject: data.subject || "Signature requested", document: { id: data.documentId, name: "Document" },
      createdBy: { id: 2, name: "Northstar Admin" }, createdAt: new Date().toISOString(),
      signers: (data.signerIds || []).map((id, i) => ({ id: Date.now() + i, name: `Signer ${i + 1}`, email: "", status: "pending", signUrl: null, userId: id })),
    };
    _demoSignatures.unshift(req);
    return req;
  }
  return apiFetch("/signatures/request", { method: "POST", body: JSON.stringify(data) });
}

export async function signDocument(signerId) {
  if (_demoMode) {
    // Find and update signer status in demo data
    for (const req of _demoSignatures) {
      const signer = req.signers.find(s => s.id === signerId);
      if (signer) {
        signer.status = "signed";
        if (req.signers.every(s => s.status === "signed")) req.status = "signed";
        return { ok: true, status: "signed", allSigned: req.status === "signed" };
      }
    }
    return { ok: true, status: "signed", allSigned: true };
  }
  return apiFetch(`/signatures/${signerId}/sign`, { method: "POST" });
}

export async function getEmbeddedSignUrl(signerId) {
  if (_demoMode) {
    // Demo mode: return null so frontend falls back to in-app signing
    return { signUrl: null };
  }
  return apiFetch(`/signatures/${signerId}/embed`);
}

export async function downloadSignedDocument(requestId) {
  if (_demoMode) {
    console.log("[Demo] downloadSignedDocument", requestId);
    // Create a minimal blob to simulate download
    const blob = new Blob(["[Demo] Signed document placeholder"], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "signed_document.pdf"; a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const BASE = import.meta.env.VITE_API_URL || "";
  const token = localStorage.getItem("token");
  const resp = await fetch(`${BASE}/api/v1/signatures/${requestId}/document`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error("Failed to download signed document");
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `signed_document_${requestId}.pdf`; a.click();
  URL.revokeObjectURL(url);
}

export async function cancelSignatureRequest(id) {
  if (_demoMode) {
    const req = _demoSignatures.find(s => s.id === id);
    if (req) req.status = "cancelled";
    return { ok: true };
  }
  return apiFetch(`/signatures/${id}/cancel`, { method: "POST" });
}

// ─── Notifications ───
export async function fetchNotifications() {
  if (_demoMode) return [];
  return apiFetch("/notifications");
}

export async function fetchNotificationPreferences() {
  if (_demoMode) return {
    emailDocuments: true, emailSignatures: true, emailDistributions: true,
    emailMessages: true, emailCapitalCalls: true,
  };
  return apiFetch("/notifications/preferences");
}

export async function updateNotificationPreferences(data) {
  if (_demoMode) return { ...data };
  return apiFetch("/notifications/preferences", { method: "PUT", body: JSON.stringify(data) });
}

// ─── Email Settings (Admin) ───

export async function fetchEmailSettings() {
  if (_demoMode) return {
    id: 1,
    enableDocuments: true, enableSignatures: true, enableDistributions: true,
    enableMessages: true, enableCapitalCalls: true, enableWelcome: true, enablePasswordReset: true,
    fromName: null, fromAddress: null, replyToAddress: null,
    brandColor: null, companyName: null, companyAddress: null, logoUrl: null, portalUrl: null,
    subjectWelcome: null, subjectDocument: null, subjectSignature: null,
    subjectDistribution: null, subjectMessage: null, subjectCapitalCall: null, subjectPasswordReset: null,
    footerText: null,
    _provider: "demo", _providerConfigured: false, _envFromAddress: null, _envFromName: null,
  };
  return apiFetch("/settings/email");
}

export async function updateEmailSettings(data) {
  if (_demoMode) return { ...data, id: 1 };
  return apiFetch("/settings/email", { method: "PUT", body: JSON.stringify(data) });
}

export async function sendSignatureReminder(userId) {
  if (_demoMode) return { success: true };
  return apiFetch("/notifications/test", { method: "POST", body: JSON.stringify({ type: "signature_required", userId }) });
}

export async function sendTestEmail() {
  if (_demoMode) return { success: true, sentTo: "demo@example.com" };
  return apiFetch("/settings/email/test", { method: "POST" });
}

export async function fetchEmailLog(params = {}) {
  if (_demoMode) return { logs: [
    { id: 1, userName: "James Chen", userEmail: "j.chen@pacificventures.ca", type: "document_uploaded", subject: "New Document: Q4 Report", status: "sent", createdAt: new Date().toISOString() },
    { id: 2, userName: "James Chen", userEmail: "j.chen@pacificventures.ca", type: "signature_required", subject: "Signature Required: Subscription Agreement", status: "sent", createdAt: new Date(Date.now() - 86400000).toISOString() },
  ], total: 2 };
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/settings/email/log${qs ? "?" + qs : ""}`);
}

export async function fetchEmailStats() {
  if (_demoMode) return { total: 12, sent: 10, failed: 1, skipped: 1, byType: { document_uploaded: 4, signature_required: 3, new_message: 3, distribution_paid: 1, capital_call: 1 } };
  return apiFetch("/settings/email/stats");
}

export async function createDistribution(data) {
  if (_demoMode) return { id: Date.now(), ...data, project: "Demo Project", investorsNotified: 1 };
  return apiFetch("/distributions", { method: "POST", body: JSON.stringify(data) });
}

// ─── Prospects (public + admin) ───
const _demoProspects = [
  { id: 1, name: "Sarah Mitchell", email: "sarah.mitchell@westcoastwealth.ca", phone: "604-555-0142", entityType: "Individual", accreditationStatus: "Accredited", investmentRange: "$250K-$500K", interestedProjectId: 1, interestedProject: { id: 1, name: "Porthaven" }, message: "Interested in the Porthaven development. Would like to schedule a call.", status: "new", createdAt: "2026-03-10T14:30:00Z", updatedAt: "2026-03-10T14:30:00Z", leadSource: "Website", notes: "", followUpDate: "2026-03-22T00:00:00Z" },
  { id: 2, name: "David Park", email: "dpark@harbourinvestments.com", phone: "778-555-0319", entityType: "LLC", accreditationStatus: "Accredited", investmentRange: "$500K+", interestedProjectId: 2, interestedProject: { id: 2, name: "Livy" }, message: "Our firm is looking at residential development opportunities in the Port Coquitlam area.", status: "contacted", createdAt: "2026-03-08T10:00:00Z", updatedAt: "2026-03-09T09:00:00Z", leadSource: "Referral", notes: "Referred by Coastal Family Office. Very interested in Livy specifically.", followUpDate: "2026-03-15T00:00:00Z" },
  { id: 3, name: "Michelle Wong", email: "mwong@pacificridge.ca", phone: "604-555-0287", entityType: "Trust", accreditationStatus: "Accredited", investmentRange: "$100K-$250K", interestedProjectId: 3, interestedProject: { id: 3, name: "Estrella" }, message: "Interested in the affordable housing component of Estrella.", status: "qualified", createdAt: "2026-03-05T16:45:00Z", updatedAt: "2026-03-07T11:00:00Z", leadSource: "Event", notes: "Met at Vancouver RE Investment Forum. Strong interest in impact investing.", followUpDate: "2026-03-25T00:00:00Z" },
  { id: 4, name: "Robert Fraser", email: "rob.fraser@gmail.com", phone: null, entityType: "Individual", accreditationStatus: "Not Yet", investmentRange: "$50K-$100K", interestedProjectId: null, interestedProject: null, message: "Just learning about real estate investment.", status: "declined", createdAt: "2026-02-28T08:00:00Z", updatedAt: "2026-03-01T10:00:00Z", leadSource: "Cold Outreach", notes: "Not accredited. May revisit in future.", followUpDate: null },
  { id: 5, name: "Jennifer Liu", email: "jliu@mapleleafcapital.ca", phone: "604-555-0456", entityType: "IRA", accreditationStatus: "Accredited", investmentRange: "$250K-$500K", interestedProjectId: 1, interestedProject: { id: 1, name: "Porthaven" }, message: "Looking to allocate from our self-directed IRA into real estate development.", status: "new", createdAt: "2026-03-12T09:15:00Z", updatedAt: "2026-03-12T09:15:00Z", leadSource: "Website", notes: "", followUpDate: "2026-03-20T00:00:00Z" },
];

// Public — submit interest
export async function submitProspectInterest(data) {
  if (_demoMode) {
    const prospect = { id: Date.now(), ...data, status: "new", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), interestedProject: null };
    _demoProspects.unshift(prospect);
    return prospect;
  }
  return apiFetch("/prospects", { method: "POST", body: JSON.stringify(data) });
}

// Admin — list prospects
export async function fetchProspects(params = {}) {
  if (_demoMode) {
    let list = [..._demoProspects];
    if (params.status && params.status !== "all") list = list.filter(p => p.status === params.status);
    return list;
  }
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/prospects${qs ? "?" + qs : ""}`);
}

// Admin — update prospect status
export async function updateProspectStatus(id, status) {
  if (_demoMode) {
    const p = _demoProspects.find(x => x.id === id);
    if (p) { p.status = status; p.updatedAt = new Date().toISOString(); }
    return p || { id, status };
  }
  return apiFetch(`/prospects/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
}

// Admin — update prospect fields (notes, leadSource, followUpDate, etc.)
export async function updateProspect(id, data) {
  if (_demoMode) {
    const p = _demoProspects.find(x => x.id === id);
    if (p) { Object.assign(p, data, { updatedAt: new Date().toISOString() }); }
    return p || { id, ...data };
  }
  return apiFetch(`/prospects/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

// Admin — prospect stats
export async function fetchProspectStats() {
  if (_demoMode) {
    const counts = { new: 0, contacted: 0, qualified: 0, converted: 0, declined: 0, total: _demoProspects.length };
    _demoProspects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
    return counts;
  }
  return apiFetch("/prospects/stats");
}

// ─── Finance (Sprint 14) ───
export async function fetchCapitalAccount(userId, projectId) {
  if (_demoMode) {
    return {
      committed: 500000, called: 400000, unfunded: 100000,
      totalDistributed: 27600, currentValue: 480000,
      unrealizedGainLoss: 107600, totalReturn: 107600, moic: 1.27, irr: 12.4,
    };
  }
  return apiFetch(`/finance/capital-account/${userId}/${projectId}`);
}

export async function fetchCashFlows(userId, projectId) {
  if (_demoMode) {
    return [
      { id: 1, date: "2023-01-15T00:00:00.000Z", amount: -500000, type: "capital_call", description: "Initial investment" },
      { id: 2, date: "2023-06-01T00:00:00.000Z", amount: -100000, type: "capital_call", description: "Capital call #2" },
      { id: 3, date: "2024-09-15T00:00:00.000Z", amount: 8500, type: "distribution", description: "Q3 2024 income distribution" },
      { id: 4, date: "2024-12-15T00:00:00.000Z", amount: 10200, type: "distribution", description: "Q4 2024 income distribution" },
      { id: 5, date: "2025-03-15T00:00:00.000Z", amount: 8900, type: "distribution", description: "Q1 2025 income distribution" },
    ];
  }
  return apiFetch(`/finance/cashflows/${userId}/${projectId}`);
}

export async function calculateWaterfallApi(data) {
  if (_demoMode) {
    const { totalDistributable = 1000000, structure = {} } = data;
    const lpCap = structure.lpCapital || 500000;
    const prefPct = structure.prefReturnPct || 8;
    const carryPct = structure.carryPct || 20;
    const holdYears = structure.holdPeriodYears || 2;
    const prefAmt = lpCap * (Math.pow(1 + prefPct / 100, holdYears) - 1);
    const roc = Math.min(totalDistributable, lpCap);
    const pref = Math.min(totalDistributable - roc, prefAmt);
    const remaining = totalDistributable - roc - pref;
    const catchup = Math.min(remaining, pref * carryPct / (100 - carryPct));
    const rest = remaining - catchup;
    return {
      tiers: [
        { name: "Return of Capital", lpAmount: roc, gpAmount: 0, total: roc },
        { name: `Preferred Return (${prefPct}%)`, lpAmount: Math.round(pref * 100) / 100, gpAmount: 0, total: Math.round(pref * 100) / 100 },
        { name: "GP Catch-Up", lpAmount: 0, gpAmount: Math.round(catchup * 100) / 100, total: Math.round(catchup * 100) / 100 },
        { name: "Carried Interest", lpAmount: Math.round(rest * (100 - carryPct) / 100 * 100) / 100, gpAmount: Math.round(rest * carryPct / 100 * 100) / 100, total: Math.round(rest * 100) / 100 },
      ],
      lpTotal: Math.round((roc + pref + rest * (100 - carryPct) / 100) * 100) / 100,
      gpTotal: Math.round((catchup + rest * carryPct / 100) * 100) / 100,
      lpIRR: 0.12,
    };
  }
  return apiFetch("/finance/calculate-waterfall", { method: "POST", body: JSON.stringify(data) });
}

export async function recordCashFlow(data) {
  if (_demoMode) return { id: Date.now(), ...data, createdAt: new Date().toISOString() };
  return apiFetch("/finance/record-cashflow", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCashFlow(id, data) {
  if (_demoMode) return { id, ...data };
  return apiFetch(`/finance/cashflows/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteCashFlow(id) {
  if (_demoMode) return { ok: true };
  return apiFetch(`/finance/cashflows/${id}`, { method: "DELETE" });
}

export async function fetchProjectCashFlows(projectId) {
  if (_demoMode) {
    return [
      { id: 1, projectId, userId: 1, investorName: "James Chen", date: "2023-01-15T00:00:00.000Z", amount: -500000, type: "capital_call", description: "Initial investment" },
      { id: 2, projectId, userId: 1, investorName: "James Chen", date: "2023-06-01T00:00:00.000Z", amount: -100000, type: "capital_call", description: "Capital call #2" },
      { id: 3, projectId, userId: 1, investorName: "James Chen", date: "2024-09-15T00:00:00.000Z", amount: 8500, type: "distribution", description: "Q3 2024 income distribution" },
      { id: 4, projectId, userId: 1, investorName: "James Chen", date: "2024-12-15T00:00:00.000Z", amount: 10200, type: "distribution", description: "Q4 2024 income distribution" },
      { id: 5, projectId, userId: 1, investorName: "James Chen", date: "2025-03-15T00:00:00.000Z", amount: 8900, type: "distribution", description: "Q1 2025 income distribution" },
    ];
  }
  return apiFetch(`/finance/cashflows?projectId=${projectId}`);
}

export async function recalculateProject(projectId) {
  if (_demoMode) return { projectId, results: [{ userId: 1, irr: 12.4, moic: 1.27, status: "updated" }] };
  return apiFetch(`/finance/recalculate/${projectId}`, { method: "POST" });
}

// ─── Audit Log (admin) ───
export async function fetchAuditLog(params = {}) {
  if (_demoMode) return [
    { id: 1, user: "Northstar Admin", action: "login", resource: "user:2", details: '{"email":"admin@northstardevelopment.ca"}', ipAddress: "127.0.0.1", createdAt: new Date().toISOString() },
    { id: 2, user: "James Chen", action: "document_download", resource: "document:1", details: '{"name":"Q2 2025 Report"}', ipAddress: "127.0.0.1", createdAt: new Date(Date.now() - 3600000).toISOString() },
  ];
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/admin/audit-log${qs ? "?" + qs : ""}`);
}

// ─── Create Project (admin) ───
export async function createProject(data) {
  if (_demoMode) {
    const newProject = { id: Date.now(), ...data, completion: 0, investorCount: 0, docCount: 0 };
    return newProject;
  }
  return apiFetch("/admin/projects", { method: "POST", body: JSON.stringify(data) });
}

// ─── Project Image Upload ───
export async function uploadProjectImage(projectId, file) {
  if (_demoMode) {
    // Return a fake URL in demo mode
    return { imageUrl: URL.createObjectURL(file) };
  }
  const formData = new FormData();
  formData.append("image", file);
  const token = localStorage.getItem("northstar_token");
  const res = await fetch(`${API_BASE}/admin/projects/${projectId}/image`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed (${res.status})`);
  }
  return res.json();
}

// ─── Investor Entities ───
const _demoEntities = [
  { id: 1, name: "James Chen (Individual)", type: "Individual", taxId: "***-**-1234", address: "1234 Marine Drive, Vancouver BC", state: "BC", isDefault: true, investmentCount: 1, createdAt: new Date().toISOString() },
  { id: 2, name: "Chen Family Trust", type: "Trust", taxId: "88-***7890", address: "1234 Marine Drive, Vancouver BC", state: "BC", isDefault: false, investmentCount: 1, createdAt: new Date().toISOString() },
];

export async function fetchEntities(userId) {
  if (_demoMode) return _demoEntities;
  return apiFetch(`/investors/${userId}/entities`);
}

export async function createEntity(userId, data) {
  if (_demoMode) {
    const entity = { id: Date.now(), ...data, investmentCount: 0, createdAt: new Date().toISOString() };
    _demoEntities.push(entity);
    return entity;
  }
  return apiFetch(`/investors/${userId}/entities`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateEntity(entityId, data) {
  if (_demoMode) {
    const e = _demoEntities.find(x => x.id === entityId);
    if (e) Object.assign(e, data);
    return e || { id: entityId, ...data };
  }
  return apiFetch(`/entities/${entityId}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteEntity(entityId) {
  if (_demoMode) {
    const idx = _demoEntities.findIndex(x => x.id === entityId);
    if (idx >= 0) _demoEntities.splice(idx, 1);
    return { ok: true };
  }
  return apiFetch(`/entities/${entityId}`, { method: "DELETE" });
}

// ─── Financial Modeler ───
export async function runFinancialModel(data) {
  if (_demoMode) {
    const { scenario = {} } = data;
    const { totalInvestment = 500000, holdPeriodYears = 5, exitValue = 1000000, annualCashFlow = 0, prefReturnPct = 8, carryPct = 20 } = scenario;
    const totalCashFlows = annualCashFlow * holdPeriodYears;
    const totalDistributable = exitValue + totalCashFlows;
    const prefAmount = totalInvestment * (Math.pow(1 + prefReturnPct / 100, holdPeriodYears) - 1);
    const roc = Math.min(totalDistributable, totalInvestment);
    const pref = Math.min(totalDistributable - roc, prefAmount);
    const remaining = totalDistributable - roc - pref;
    const catchup = Math.min(remaining, pref * carryPct / (100 - carryPct));
    const rest = remaining - catchup;
    const lpReturn = roc + pref + rest * (100 - carryPct) / 100;
    const gpReturn = catchup + rest * carryPct / 100;
    const lpMOIC = totalInvestment > 0 ? Math.round((lpReturn / totalInvestment) * 100) / 100 : 0;
    const lpIRR = holdPeriodYears > 0 ? Math.round((Math.pow(lpReturn / totalInvestment, 1 / holdPeriodYears) - 1) * 10000) / 10000 : 0;
    const yearByYear = [{ year: 0, cashFlow: -totalInvestment, cumulativeCashFlow: -totalInvestment, balance: totalInvestment }];
    let cumCF = -totalInvestment;
    for (let y = 1; y <= holdPeriodYears; y++) {
      const cf = y < holdPeriodYears ? annualCashFlow : annualCashFlow + exitValue;
      cumCF += cf;
      yearByYear.push({ year: y, cashFlow: cf, cumulativeCashFlow: cumCF, balance: y < holdPeriodYears ? totalInvestment : 0 });
    }
    return {
      totalReturn: lpReturn + gpReturn, lpReturn, gpReturn, lpIRR, gpIRR: null, lpMOIC,
      equityMultiple: lpMOIC, cashOnCash: totalInvestment > 0 ? Math.round((totalCashFlows / totalInvestment) * 10000) / 100 : 0,
      yearByYear,
      waterfallBreakdown: [
        { name: "Return of Capital", lpAmount: roc, gpAmount: 0, total: roc },
        { name: `Preferred Return (${prefReturnPct}%)`, lpAmount: Math.round(pref * 100) / 100, gpAmount: 0, total: Math.round(pref * 100) / 100 },
        { name: "GP Catch-Up", lpAmount: 0, gpAmount: Math.round(catchup * 100) / 100, total: Math.round(catchup * 100) / 100 },
        { name: "Carried Interest", lpAmount: Math.round(rest * (100 - carryPct) / 100 * 100) / 100, gpAmount: Math.round(rest * carryPct / 100 * 100) / 100, total: Math.round(rest * 100) / 100 },
      ],
      sensitivity: [
        { label: "-20%", exitValue: Math.round(exitValue * 0.8), lpReturn: Math.round(lpReturn * 0.85), lpIRR: lpIRR * 0.7, lpMOIC: Math.round(lpMOIC * 0.85 * 100) / 100 },
        { label: "-10%", exitValue: Math.round(exitValue * 0.9), lpReturn: Math.round(lpReturn * 0.92), lpIRR: lpIRR * 0.85, lpMOIC: Math.round(lpMOIC * 0.92 * 100) / 100 },
        { label: "+0%", exitValue, lpReturn, lpIRR, lpMOIC },
        { label: "+10%", exitValue: Math.round(exitValue * 1.1), lpReturn: Math.round(lpReturn * 1.08), lpIRR: lpIRR * 1.15, lpMOIC: Math.round(lpMOIC * 1.08 * 100) / 100 },
        { label: "+20%", exitValue: Math.round(exitValue * 1.2), lpReturn: Math.round(lpReturn * 1.15), lpIRR: lpIRR * 1.3, lpMOIC: Math.round(lpMOIC * 1.15 * 100) / 100 },
      ],
    };
  }
  return apiFetch("/finance/model-scenario", { method: "POST", body: JSON.stringify(data) });
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

// ─── Cap Table CRUD ───
export async function createCapTableEntry(projectId, data) {
  return apiFetch(`/admin/projects/${projectId}/cap-table`, { method: "POST", body: JSON.stringify(data) });
}
export async function updateCapTableEntry(projectId, entryId, data) {
  return apiFetch(`/admin/projects/${projectId}/cap-table/${entryId}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteCapTableEntry(projectId, entryId) {
  return apiFetch(`/admin/projects/${projectId}/cap-table/${entryId}`, { method: "DELETE" });
}

// ─── Waterfall Tier CRUD ───
export async function createWaterfallTier(projectId, data) {
  return apiFetch(`/admin/projects/${projectId}/waterfall-tiers`, { method: "POST", body: JSON.stringify(data) });
}
export async function updateWaterfallTier(projectId, tierId, data) {
  return apiFetch(`/admin/projects/${projectId}/waterfall-tiers/${tierId}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteWaterfallTier(projectId, tierId) {
  return apiFetch(`/admin/projects/${projectId}/waterfall-tiers/${tierId}`, { method: "DELETE" });
}

// ─── Bulk Operations ───
export async function recordBulkDistribution(projectId, data) {
  return apiFetch("/finance/bulk-distribution", { method: "POST", body: JSON.stringify({ projectId, ...data }) });
}
export async function recordBulkCapitalCall(projectId, data) {
  return apiFetch("/finance/bulk-capital-call", { method: "POST", body: JSON.stringify({ projectId, ...data }) });
}

// ─── Mark notification read ───
export async function markNotificationRead(id) {
  if (_demoMode) return { ok: true };
  return apiFetch(`/notifications/${id}/read`, { method: "POST" });
}

// ─── Feature Flags ───

const DEFAULT_FLAGS = {
  overview: true, portfolio: true, captable: true, modeler: true,
  documents: true, distributions: true, messages: true, profile: true,
  capitalAccount: true, downloadDocuments: true, signDocuments: true,
  viewWaterfall: true, exportData: true, mfa: true,
};

export async function fetchMyFlags() {
  if (_demoMode) return DEFAULT_FLAGS;
  try {
    const data = await apiFetch("/features/my-flags");
    return data.flags || DEFAULT_FLAGS;
  } catch {
    return DEFAULT_FLAGS;
  }
}

export async function fetchUserFlags(userId) {
  if (_demoMode) return { overrides: {}, roleDefaults: DEFAULT_FLAGS, globalFlags: {} };
  return apiFetch(`/features/flags/${userId}`);
}

export async function updateUserFlags(userId, flags) {
  if (_demoMode) return { message: "Updated", overrides: flags };
  return apiFetch(`/features/flags/${userId}`, { method: "PUT", body: JSON.stringify({ flags }) });
}

export async function fetchFeatureDefaults() {
  if (_demoMode) return { roleDefaults: { INVESTOR: DEFAULT_FLAGS }, globalFlags: {} };
  return apiFetch("/features/defaults");
}

// ─── CSV Export (Sprint 2) ───

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function generateDemoCsv(headers, rows) {
  const escape = v => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))];
  return new Blob([lines.join("\r\n") + "\r\n"], { type: "text/csv" });
}

async function fetchCsvDownload(path, filename) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

export async function exportInvestorsCSV() {
  if (_demoMode) {
    const blob = generateDemoCsv(
      ["Name", "Email", "Status", "Total Committed", "Total Value", "Projects"],
      [["James Chen", "j.chen@pacificventures.ca", "ACTIVE", "850000", "672500", "Porthaven; Livy"]]
    );
    triggerDownload(blob, "investors.csv");
    return;
  }
  return fetchCsvDownload("/admin/export/investors", "investors.csv");
}

export async function exportProjectsCSV() {
  if (_demoMode) {
    const blob = generateDemoCsv(
      ["Name", "Location", "Status", "Total Raise", "Completion %", "Investor Count"],
      demoProjects.map(p => [p.name, p.location, p.status, p.totalRaise, p.completion, p.capTable.length])
    );
    triggerDownload(blob, "projects.csv");
    return;
  }
  return fetchCsvDownload("/admin/export/projects", "projects.csv");
}

export async function exportDistributionsCSV() {
  if (_demoMode) {
    const rows = [];
    demoProjects.forEach(p => p.distributions.forEach(d => rows.push([p.name, d.quarter, d.date, d.amount, d.type])));
    const blob = generateDemoCsv(["Project", "Quarter", "Date", "Amount", "Type"], rows);
    triggerDownload(blob, "distributions.csv");
    return;
  }
  return fetchCsvDownload("/admin/export/distributions", "distributions.csv");
}

export async function exportDocumentsCSV() {
  if (_demoMode) {
    const blob = generateDemoCsv(
      ["Name", "Category", "Project", "Date", "Size", "Status"],
      demoAllDocuments.map(d => [d.name, d.category, d.project, d.date, d.size, d.status])
    );
    triggerDownload(blob, "documents.csv");
    return;
  }
  return fetchCsvDownload("/admin/export/documents", "documents.csv");
}

export async function exportAuditLogCSV(params = {}) {
  if (_demoMode) {
    const blob = generateDemoCsv(
      ["Timestamp", "User", "Action", "Resource", "IP"],
      [
        [new Date().toISOString(), "Northstar Admin", "login", "user:2", "127.0.0.1"],
        [new Date(Date.now() - 3600000).toISOString(), "James Chen", "document_download", "document:1", "127.0.0.1"],
      ]
    );
    triggerDownload(blob, "audit-log.csv");
    return;
  }
  const qs = new URLSearchParams(params).toString();
  return fetchCsvDownload(`/admin/export/audit-log${qs ? "?" + qs : ""}`, "audit-log.csv");
}

export async function exportCapTableCSV(projectId) {
  if (_demoMode) {
    const p = demoProjects.find(x => x.id === projectId);
    if (!p) return;
    const blob = generateDemoCsv(
      ["Holder", "Type", "Committed", "Called", "Ownership %", "Unfunded"],
      p.capTable.map(e => [e.holder, e.type, e.committed, e.called, e.ownership, e.unfunded])
    );
    triggerDownload(blob, `cap-table-${p.name.toLowerCase().replace(/\s+/g, "-")}.csv`);
    return;
  }
  return fetchCsvDownload(`/admin/export/cap-table/${projectId}`, `cap-table-${projectId}.csv`);
}

// ─── Bulk Operations (Sprint 2) ───

export async function bulkInviteInvestors(csvFile) {
  if (_demoMode) {
    const text = await csvFile.text();
    const lines = text.trim().split("\n").filter(l => l.trim());
    const count = Math.max(0, lines.length - 1);
    return { success: count, failed: [] };
  }
  const formData = new FormData();
  formData.append("file", csvFile);
  const token = getToken();
  const res = await fetch(`${API_BASE}/admin/bulk/invite-investors`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Bulk invite failed");
  }
  return res.json();
}

export async function bulkApproveInvestors(ids) {
  if (_demoMode) return { success: ids.length, failed: [] };
  return apiFetch("/admin/bulk/approve-investors", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function bulkDeactivateInvestors(ids) {
  if (_demoMode) return { success: ids.length, failed: [] };
  return apiFetch("/admin/bulk/deactivate-investors", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function bulkImportCashFlows(projectId, csvFile) {
  if (_demoMode) {
    const text = await csvFile.text();
    const lines = text.trim().split("\n").filter(l => l.trim());
    const count = Math.max(0, lines.length - 1);
    return { success: count, failed: [] };
  }
  const formData = new FormData();
  formData.append("file", csvFile);
  const token = getToken();
  const res = await fetch(`${API_BASE}/admin/bulk/cash-flows/${projectId}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Cash flow import failed");
  }
  return res.json();
}
