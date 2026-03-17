import { useState, useEffect } from "react";
import { fetchDashboard, fetchAdminProjects, updateProject, postUpdate, fetchAdminInvestors, sendMessage, uploadDocument, inviteInvestor, updateInvestor, approveInvestor, deactivateInvestor, resetInvestorPassword, assignInvestorProject, updateInvestorKPI, fetchThreads, fetchThread, createThread, replyToThread, fmt, fmtCurrency } from "./api.js";

const sans = "'DM Sans', -apple-system, sans-serif";
const red = "#EA2028";
const green = "#3D7A54";
const darkText = "#231F20";
const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #DDD", borderRadius: 4, fontSize: 13, fontFamily: sans, boxSizing: "border-box" };
const btnStyle = { padding: "8px 16px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans };
const btnOutline = { ...btnStyle, background: "#fff", color: darkText, border: "1px solid #DDD" };

export default function AdminPanel({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  function showToast(msg, type = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "Projects" },
    { id: "investors", label: "Investors" },
    { id: "documents", label: "Upload Docs" },
    { id: "inbox", label: "Inbox" },
  ];
  const pages = {
    dashboard: <Dashboard />,
    projects: <ProjectManager toast={showToast} />,
    investors: <InvestorManager toast={showToast} />,
    documents: <DocumentUploader toast={showToast} />,
    inbox: <AdminInbox user={user} toast={showToast} />,
  };

  return (
    <div style={{ fontFamily: sans, color: darkText, minHeight: "100vh", background: "#F8F7F4" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, background: "#fff", borderBottom: "1px solid #E8E5DE" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 24, background: red, borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".02em" }}>NORTHSTAR</span>
          <span style={{ fontSize: 11, padding: "2px 8px", background: "#FEE", borderRadius: 3, color: red, fontWeight: 500 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#666" }}>{user.name}</span>
          <button onClick={onLogout} style={{ ...btnOutline, fontSize: 12 }}>Sign Out</button>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 0, background: "#fff", borderBottom: "1px solid #E8E5DE", padding: "0 32px" }}>
        {navItems.map(n => (
          <span key={n.id} onClick={() => setView(n.id)} style={{
            fontSize: 13, padding: "12px 20px", cursor: "pointer",
            color: view === n.id ? darkText : "#999",
            borderBottom: view === n.id ? `2px solid ${red}` : "2px solid transparent",
            fontWeight: view === n.id ? 500 : 400,
          }}>{n.label}</span>
        ))}
      </nav>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 32px 80px" }}>{pages[view]}</main>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 20px", background: toast.type === "error" ? "#FEE" : "#EFE", border: `1px solid ${toast.type === "error" ? red : green}`, borderRadius: 4, fontSize: 13, color: toast.type === "error" ? red : green, zIndex: 100 }}>{toast.msg}</div>
      )}
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { fetchDashboard().then(setData); }, []);
  if (!data) return <p style={{ color: "#999" }}>Loading...</p>;
  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Admin Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Projects", value: data.projectCount },
          { label: "Investors", value: data.investorCount },
          { label: "Documents", value: data.docCount },
          { label: "Unread Messages", value: data.unreadMessages },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px" }}>
            <div style={{ fontSize: 28, fontWeight: 300, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Recent Documents</h2>
      <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
        {data.recentDocs.map((d, i) => (
          <div key={d.id} style={{ padding: "12px 20px", borderBottom: i < data.recentDocs.length - 1 ? "1px solid #F0EDE8" : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{d.name}</span>
            <span style={{ color: "#999" }}>{d.project?.name || "General"} · {d.date}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── PROJECT MANAGER ───
function ProjectManager({ toast }) {
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [updateText, setUpdateText] = useState("");
  useEffect(() => { fetchAdminProjects().then(setProjects); }, []);

  async function handleSave(id, field, value) {
    try { await updateProject(id, { [field]: value }); setProjects(p => p.map(x => x.id === id ? { ...x, [field === "completionPct" ? "completion" : field]: value } : x)); toast("Updated"); } catch (e) { toast(e.message, "error"); }
  }
  async function handlePostUpdate(pid) {
    if (!updateText.trim()) return;
    try { await postUpdate(pid, updateText); toast("Update posted"); setUpdateText(""); } catch (e) { toast(e.message, "error"); }
  }

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Projects</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {projects.map(p => (
          <div key={p.id} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#999" }}>{p.location} · {p.investorCount} investors · {p.docCount} docs</div>
              </div>
              <button onClick={() => setEditing(editing === p.id ? null : p.id)} style={btnOutline}>{editing === p.id ? "Close" : "Edit"}</button>
            </div>
            <div style={{ display: "flex", gap: 32, fontSize: 13, color: "#666" }}>
              <span>Status: <strong>{p.status}</strong></span>
              <span>Completion: <strong>{p.completion}%</strong></span>
              <span>Total Raise: <strong>{fmtCurrency(p.totalRaise)}</strong></span>
            </div>
            {editing === p.id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F0EDE8" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <select value={p.status} onChange={e => handleSave(p.id, "status", e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                    <option>Pre-Development</option><option>Under Construction</option><option>Completed</option>
                  </select>
                  <input type="number" min="0" max="100" value={p.completion} onChange={e => handleSave(p.id, "completionPct", parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: 80 }} placeholder="%" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Post a construction update..." style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => handlePostUpdate(p.id)} style={btnStyle}>Post</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── INVESTOR MANAGER (search, filter, sort, invite, edit, KPI editing) ───
function InvestorManager({ toast }) {
  const [investors, setInvestors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [editing, setEditing] = useState(null);
  const [editingKPI, setEditingKPI] = useState(null);

  function reload() {
    fetchAdminInvestors({ search, status: statusFilter, projectId: projectFilter, sortBy, sortDir }).then(setInvestors);
  }
  useEffect(() => { reload(); }, [search, statusFilter, projectFilter, sortBy, sortDir]);
  useEffect(() => { fetchAdminProjects().then(setProjects); }, []);

  async function handleInvite(e) {
    e.preventDefault();
    try {
      const result = await inviteInvestor({ name: inviteName, email: inviteEmail });
      toast(`Invited ${result.name}. Temp password: ${result.tempPassword}`);
      setShowInvite(false); setInviteName(""); setInviteEmail(""); reload();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleApprove(id) {
    try { await approveInvestor(id); toast("Investor approved"); reload(); } catch (e) { toast(e.message, "error"); }
  }
  async function handleDeactivate(id) {
    try { await deactivateInvestor(id); toast("Investor deactivated"); reload(); } catch (e) { toast(e.message, "error"); }
  }
  async function handleResetPw(id) {
    try { const r = await resetInvestorPassword(id); toast(`New password: ${r.tempPassword}`); } catch (e) { toast(e.message, "error"); }
  }
  async function handleEditSave(id, data) {
    try { await updateInvestor(id, data); toast("Updated"); reload(); setEditing(null); } catch (e) { toast(e.message, "error"); }
  }
  async function handleKPISave(userId, projectId, data) {
    try { await updateInvestorKPI(userId, projectId, data); toast("KPI updated"); reload(); setEditingKPI(null); } catch (e) { toast(e.message, "error"); }
  }

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  const statusBadge = (s) => ({ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: s === "ACTIVE" ? "#EFE" : s === "PENDING" ? "#FFF8E1" : "#FEE", color: s === "ACTIVE" ? green : s === "PENDING" ? "#B8860B" : red });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>Investors</h1>
        <button onClick={() => setShowInvite(!showInvite)} style={btnStyle}>{showInvite ? "Cancel" : "Invite Investor"}</button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Full Name</label>
            <input value={inviteName} onChange={e => setInviteName(e.target.value)} required style={inputStyle} placeholder="James Chen" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required style={inputStyle} placeholder="investor@example.com" />
          </div>
          <button type="submit" style={btnStyle}>Send Invite</button>
        </form>
      )}

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ ...inputStyle, flex: 1 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 140 }}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Column headers */}
      <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 120px 120px 140px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>
          <span onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>Name {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
          <span onClick={() => toggleSort("email")} style={{ cursor: "pointer" }}>Email {sortBy === "email" ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
          <span>Status</span>
          <span>Committed</span>
          <span>Value</span>
          <span>Actions</span>
        </div>

        {investors.map((inv) => (
          <div key={inv.id}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 120px 120px 140px", padding: "14px 20px", borderBottom: "1px solid #F0EDE8", alignItems: "center", fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{inv.name}</span>
              <span style={{ color: "#666" }}>{inv.email}</span>
              <span><span style={statusBadge(inv.status)}>{inv.status}</span></span>
              <span>${fmt(inv.totalCommitted)}</span>
              <span>${fmt(inv.totalValue)}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setEditing(editing === inv.id ? null : inv.id)} style={{ ...btnOutline, padding: "4px 10px", fontSize: 11 }}>Edit</button>
                {inv.status === "PENDING" && <button onClick={() => handleApprove(inv.id)} style={{ ...btnStyle, padding: "4px 10px", fontSize: 11, background: green }}>Approve</button>}
                {inv.status === "ACTIVE" && <button onClick={() => handleDeactivate(inv.id)} style={{ ...btnOutline, padding: "4px 10px", fontSize: 11, color: red, borderColor: red }}>Deactivate</button>}
              </div>
            </div>

            {/* Expanded edit panel */}
            {editing === inv.id && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0EDE8", background: "#FAFAF8" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#888" }}>Name</label>
                    <input defaultValue={inv.name} onBlur={e => e.target.value !== inv.name && handleEditSave(inv.id, { name: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#888" }}>Email</label>
                    <input defaultValue={inv.email} onBlur={e => e.target.value !== inv.email && handleEditSave(inv.id, { email: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#888" }}>Actions</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button onClick={() => handleResetPw(inv.id)} style={{ ...btnOutline, fontSize: 11, padding: "6px 10px" }}>Reset Password</button>
                    </div>
                  </div>
                </div>

                {/* Project KPIs */}
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#666" }}>Project KPIs / Returns</div>
                {inv.projects.map(p => (
                  <div key={p.projectId} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, padding: "8px 12px", background: "#fff", borderRadius: 4, border: "1px solid #E8E5DE" }}>
                    <span style={{ width: 100, fontWeight: 500, fontSize: 13 }}>{p.projectName}</span>
                    {editingKPI === `${inv.id}-${p.projectId}` ? (
                      <>
                        <KPIInput label="Committed" defaultValue={p.committed} onSave={v => handleKPISave(inv.id, p.projectId, { committed: parseFloat(v) })} />
                        <KPIInput label="Called" defaultValue={p.called} onSave={v => handleKPISave(inv.id, p.projectId, { called: parseFloat(v) })} />
                        <KPIInput label="Value" defaultValue={p.currentValue} onSave={v => handleKPISave(inv.id, p.projectId, { currentValue: parseFloat(v) })} />
                        <KPIInput label="IRR %" defaultValue={p.irr} onSave={v => handleKPISave(inv.id, p.projectId, { irr: parseFloat(v) })} />
                        <KPIInput label="MOIC" defaultValue={p.moic} onSave={v => handleKPISave(inv.id, p.projectId, { moic: parseFloat(v) })} />
                        <button onClick={() => setEditingKPI(null)} style={{ ...btnOutline, fontSize: 11, padding: "4px 8px" }}>Done</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 12, color: "#666" }}>${fmt(p.committed)} committed · ${fmt(p.currentValue)} value · {p.irr}% IRR · {p.moic}x</span>
                        <button onClick={() => setEditingKPI(`${inv.id}-${p.projectId}`)} style={{ ...btnOutline, fontSize: 11, padding: "4px 8px", marginLeft: "auto" }}>Edit KPIs</button>
                      </>
                    )}
                  </div>
                ))}
                {inv.projects.length === 0 && <div style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>No project assignments</div>}
              </div>
            )}
          </div>
        ))}
        {investors.length === 0 && <div style={{ padding: 24, color: "#999", textAlign: "center" }}>No investors found</div>}
      </div>
    </>
  );
}

function KPIInput({ label, defaultValue, onSave }) {
  const [val, setVal] = useState(defaultValue ?? "");
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 10, color: "#AAA" }}>{label}</label>
      <input value={val} onChange={e => setVal(e.target.value)} onBlur={() => onSave(val)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} />
    </div>
  );
}

// ─── DOCUMENT UPLOADER ───
function DocumentUploader({ toast }) {
  const [projects, setProjects] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [name, setName] = useState(""); const [category, setCategory] = useState("Reporting");
  const [projectId, setProjectId] = useState(""); const [file, setFile] = useState(null);
  const [targetInvestors, setTargetInvestors] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchAdminProjects().then(setProjects); fetchAdminInvestors().then(setInvestors); }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !name) return toast("Name and file are required", "error");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name); formData.append("category", category);
      if (projectId) formData.append("projectId", projectId);
      formData.append("file", file);
      await uploadDocument(formData);
      toast("Document uploaded" + (targetInvestors.length ? ` and assigned to ${targetInvestors.length} investor(s)` : ""));
      setName(""); setFile(null); setProjectId(""); setTargetInvestors([]);
    } catch (err) { toast(err.message, "error"); }
    finally { setUploading(false); }
  }

  function toggleInvestor(id) {
    setTargetInvestors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Upload Document</h1>
      <form onSubmit={handleUpload} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "32px 28px", maxWidth: 560 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Document Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Q3 2025 — Porthaven Quarterly Report" style={inputStyle} required />
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option>Reporting</option><option>Property Update</option><option>Offering</option>
              <option>Capital Call</option><option>Legal</option><option>Tax</option><option>Distribution</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
              <option value="">General (all investors)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Target specific investors */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Assign to Specific Investors (optional)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {investors.map(inv => (
              <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", padding: "4px 10px", background: targetInvestors.includes(inv.id) ? "#FEE" : "#F8F7F4", border: `1px solid ${targetInvestors.includes(inv.id) ? red : "#E8E5DE"}`, borderRadius: 4 }}>
                <input type="checkbox" checked={targetInvestors.includes(inv.id)} onChange={() => toggleInvestor(inv.id)} style={{ accentColor: red }} />
                {inv.name}
              </label>
            ))}
          </div>
          {targetInvestors.length === 0 && <div style={{ fontSize: 11, color: "#BBB", marginTop: 4 }}>Leave empty to make visible to all investors in the project</div>}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>File</label>
          <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv" onChange={e => setFile(e.target.files[0])} style={{ fontSize: 13 }} required />
        </div>
        <button type="submit" disabled={uploading} style={{ ...btnStyle, padding: "12px 24px", fontSize: 14, opacity: uploading ? 0.6 : 1 }}>
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>
    </>
  );
}

// ─── TARGETED MESSAGE COMPOSER ───
// ─── ADMIN INBOX (threads + compose with searchable recipient picker) ───
function AdminInbox({ user, toast }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadDetail, setThreadDetail] = useState(null);
  const [reply, setReply] = useState("");
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread | from-investors
  const [sending, setSending] = useState(false);

  // Compose state
  const [projects, setProjects] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [targetType, setTargetType] = useState("ALL");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [recipients, setRecipients] = useState([]); // { id, name, email }
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showBrowse, setShowBrowse] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => { loadThreads(); fetchAdminProjects().then(setProjects); fetchAdminInvestors().then(setInvestors); }, []);

  async function loadThreads() {
    try { const t = await fetchThreads(); setThreads(t); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function openThread(thread) {
    setSelectedThread(thread);
    try {
      const detail = await fetchThread(thread.id);
      setThreadDetail(detail);
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: false } : t));
    } catch (e) { toast("Failed to load thread", "error"); }
  }

  async function handleReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const msg = await replyToThread(threadDetail.id, reply);
      setThreadDetail(prev => ({ ...prev, messages: [...prev.messages, msg] }));
      setReply("");
      toast("Reply sent");
    } catch (e) { toast(e.message, "error"); }
    finally { setSending(false); }
  }

  async function handleCompose(e) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return toast("Subject and message required", "error");
    if (targetType === "INDIVIDUAL" && recipients.length === 0) return toast("Add at least one recipient", "error");
    setSending(true);
    try {
      await createThread({
        subject, body, targetType,
        targetProjectId: targetType === "PROJECT" ? parseInt(targetProjectId) : undefined,
        recipientIds: targetType === "INDIVIDUAL" ? recipients.map(r => r.id) : undefined,
      });
      const label = targetType === "ALL" ? "all investors" : targetType === "PROJECT" ? "project investors" : `${recipients.length} investor(s)`;
      toast(`Message sent to ${label}`);
      setComposing(false); setSubject(""); setBody(""); setRecipients([]); setTargetType("ALL");
      loadThreads();
    } catch (e) { toast(e.message, "error"); }
    finally { setSending(false); }
  }

  // Recipient picker helpers
  const searchResults = recipientSearch.length >= 1
    ? investors.filter(inv => !recipients.some(r => r.id === inv.id) && (inv.name.toLowerCase().includes(recipientSearch.toLowerCase()) || inv.email.toLowerCase().includes(recipientSearch.toLowerCase())))
    : [];

  function addRecipient(inv) { setRecipients(prev => [...prev, { id: inv.id, name: inv.name, email: inv.email }]); setRecipientSearch(""); }
  function removeRecipient(id) { setRecipients(prev => prev.filter(r => r.id !== id)); }

  // Filter threads
  const filtered = threads.filter(t => {
    if (filter === "unread") return t.unread;
    if (filter === "from-investors") return t.creator.role === "INVESTOR";
    return true;
  });

  // Thread detail view
  if (threadDetail) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedThread(null); setThreadDetail(null); setReply(""); }}>← Back to inbox</p>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 6 }}>{threadDetail.subject}</h2>
          <div style={{ fontSize: 12, color: "#999" }}>
            {threadDetail.messages.length} messages · Started by {threadDetail.creator.name}
            {threadDetail.project && <span> · {threadDetail.project}</span>}
            <span style={{ marginLeft: 8, padding: "2px 8px", background: "#F0EDE8", borderRadius: 3, fontSize: 10 }}>{threadDetail.targetType}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {threadDetail.messages.map((m) => {
            const isInvestor = m.sender.role === "INVESTOR";
            return (
              <div key={m.id} style={{ background: "#fff", border: `1px solid ${isInvestor ? "#E8E5DE" : "#DDE8DD"}`, borderRadius: 6, padding: "16px 20px", marginLeft: isInvestor ? 0 : 40, marginRight: isInvestor ? 40 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: isInvestor ? "#F0EDE8" : `${green}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: isInvestor ? "#666" : green }}>
                      {m.sender.initials || m.sender.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{m.sender.name}</span>
                    <span style={{ fontSize: 11, color: "#999" }}>{isInvestor ? "Investor" : "Staff"}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#BBB" }}>{new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.body}</div>
              </div>
            );
          })}
        </div>
        <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "16px 20px" }}>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." rows={3}
            style={{ ...inputStyle, border: "none", padding: 0, resize: "vertical" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={handleReply} disabled={sending || !reply.trim()} style={{ ...btnStyle, opacity: sending || !reply.trim() ? 0.5 : 1 }}>
              {sending ? "Sending..." : "Reply"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Compose view
  if (composing) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => setComposing(false)}>← Back to inbox</p>
        <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>New Message</h2>
        <form onSubmit={handleCompose} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "28px 24px" }}>
          {/* Target type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Send To</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ val: "ALL", label: "All Investors" }, { val: "PROJECT", label: "Project" }, { val: "INDIVIDUAL", label: "Specific Investors" }].map(t => (
                <button key={t.val} type="button" onClick={() => { setTargetType(t.val); setRecipients([]); }} style={{
                  ...btnOutline, fontSize: 12, padding: "6px 14px",
                  background: targetType === t.val ? red : "#fff", color: targetType === t.val ? "#fff" : darkText, borderColor: targetType === t.val ? red : "#DDD",
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {targetType === "PROJECT" && (
            <div style={{ marginBottom: 20 }}>
              <select value={targetProjectId} onChange={e => setTargetProjectId(e.target.value)} style={inputStyle} required>
                <option value="">Choose a project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Searchable recipient picker */}
          {targetType === "INDIVIDUAL" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Recipients</label>
              {/* Chips for selected recipients */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: recipients.length ? 10 : 0 }}>
                {recipients.map(r => (
                  <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: `${red}10`, border: `1px solid ${red}30`, borderRadius: 16, fontSize: 12 }}>
                    {r.name}
                    <span onClick={() => removeRecipient(r.id)} style={{ cursor: "pointer", color: red, fontWeight: 700, fontSize: 14, lineHeight: 1 }}>&times;</span>
                  </span>
                ))}
              </div>
              {/* Search input */}
              <div style={{ position: "relative" }}>
                <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Search investors by name or email..."
                  style={inputStyle} />
                {/* Dropdown results */}
                {searchResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8E5DE", borderTop: "none", borderRadius: "0 0 4px 4px", zIndex: 10, maxHeight: 200, overflow: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
                    {searchResults.slice(0, 8).map(inv => (
                      <div key={inv.id} onClick={() => addRecipient(inv)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F0EDE8", fontSize: 13 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8F7F4"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <div style={{ fontWeight: 500 }}>{inv.name}</div>
                        <div style={{ fontSize: 11, color: "#999" }}>
                          {inv.email}
                          {inv.projects?.length > 0 && <span> · {inv.projects.map(p => p.projectName).join(", ")}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Browse button */}
              <div style={{ marginTop: 8 }}>
                <span onClick={() => setShowBrowse(!showBrowse)} style={{ fontSize: 12, color: red, cursor: "pointer" }}>
                  {showBrowse ? "Hide investor list" : "Browse all investors →"}
                </span>
              </div>
              {/* Investor table browser */}
              {showBrowse && (
                <div style={{ marginTop: 12, border: "1px solid #E8E5DE", borderRadius: 4, maxHeight: 250, overflow: "auto" }}>
                  {investors.filter(inv => !recipients.some(r => r.id === inv.id)).map((inv, i) => (
                    <div key={inv.id} onClick={() => addRecipient(inv)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #F0EDE8", cursor: "pointer", fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8F7F4"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{inv.name}</span>
                        <span style={{ color: "#999", marginLeft: 8, fontSize: 12 }}>{inv.email}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {inv.projects?.map(p => (
                          <span key={p.projectId} style={{ fontSize: 10, padding: "2px 6px", background: "#F0EDE8", borderRadius: 3 }}>{p.projectName}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." rows={6} style={{ ...inputStyle, resize: "vertical" }} required />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => setComposing(false)} style={btnOutline}>Cancel</button>
            <button type="submit" disabled={sending} style={{ ...btnStyle, padding: "10px 24px", opacity: sending ? 0.5 : 1 }}>
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </>
    );
  }

  // Inbox list
  const unreadCount = threads.filter(t => t.unread).length;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 300 }}>Inbox</h1>
          <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{unreadCount} unread · {threads.length} conversations</p>
        </div>
        <button onClick={() => setComposing(true)} style={btnStyle}>New Message</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ val: "all", label: "All" }, { val: "unread", label: "Unread" }, { val: "from-investors", label: "From Investors" }].map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)} style={{
            ...btnOutline, fontSize: 12, padding: "5px 14px",
            background: filter === f.val ? "#F0EDE8" : "#fff", fontWeight: filter === f.val ? 500 : 400,
          }}>{f.label}{f.val === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}</button>
        ))}
      </div>

      {loading ? <p style={{ color: "#999" }}>Loading...</p> : (
        <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#999" }}>No messages</div>
          ) : filtered.map((t, i) => (
            <div key={t.id} onClick={() => openThread(t)} style={{
              padding: "16px 20px", borderBottom: i < filtered.length - 1 ? "1px solid #F0EDE8" : "none",
              cursor: "pointer", display: "flex", gap: 12, background: t.unread ? `${red}04` : "transparent",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#FAFAF8"}
              onMouseLeave={e => e.currentTarget.style.background = t.unread ? `${red}04` : "transparent"}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.unread ? red : "transparent", marginTop: 7, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: t.unread ? 600 : 400 }}>{t.subject}</span>
                  <span style={{ fontSize: 11, color: "#BBB", flexShrink: 0 }}>
                    {t.lastMessage ? new Date(t.lastMessage.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#999" }}>
                  {t.creator.name}
                  {t.creator.role === "INVESTOR" && <span style={{ marginLeft: 6, padding: "1px 6px", background: "#F0EDE8", borderRadius: 3, fontSize: 10 }}>Investor</span>}
                  {t.messageCount > 1 && <span> · {t.messageCount} msgs</span>}
                  {t.project && <span> · {t.project}</span>}
                  <span style={{ marginLeft: 6, fontSize: 10, color: "#CCC" }}>{t.targetType}</span>
                </div>
                {t.lastMessage && (
                  <div style={{ fontSize: 12, color: "#AAA", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.lastMessage.body.substring(0, 100)}...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
