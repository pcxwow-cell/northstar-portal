import { useState, useEffect } from "react";
import { fetchDashboard, fetchAdminProjects, updateProject, postUpdate, fetchAdminInvestors, sendMessage, uploadDocument, inviteInvestor, updateInvestor, approveInvestor, deactivateInvestor, resetInvestorPassword, assignInvestorProject, updateInvestorKPI, fmt, fmtCurrency } from "./api.js";

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
    { id: "messages", label: "Send Message" },
  ];
  const pages = {
    dashboard: <Dashboard />,
    projects: <ProjectManager toast={showToast} />,
    investors: <InvestorManager toast={showToast} />,
    documents: <DocumentUploader toast={showToast} />,
    messages: <MessageComposer user={user} toast={showToast} />,
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
function MessageComposer({ user, toast }) {
  const [projects, setProjects] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [fromName, setFromName] = useState(user.name || "");
  const [role, setRole] = useState("Northstar Admin");
  const [subject, setSubject] = useState(""); const [preview, setPreview] = useState("");
  const [targetType, setTargetType] = useState("ALL");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [recipientIds, setRecipientIds] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchAdminProjects().then(setProjects); fetchAdminInvestors().then(setInvestors); }, []);

  async function handleSend(e) {
    e.preventDefault();
    if (!subject || !preview) return toast("Subject and message required", "error");
    if (targetType === "INDIVIDUAL" && recipientIds.length === 0) return toast("Select at least one recipient", "error");
    setSending(true);
    try {
      await sendMessage({ fromName, role, subject, preview, targetType, targetProjectId: targetType === "PROJECT" ? targetProjectId : undefined, recipientIds: targetType === "INDIVIDUAL" ? recipientIds : undefined });
      const targetLabel = targetType === "ALL" ? "all investors" : targetType === "PROJECT" ? "project investors" : `${recipientIds.length} investor(s)`;
      toast(`Message sent to ${targetLabel}`);
      setSubject(""); setPreview(""); setRecipientIds([]);
    } catch (err) { toast(err.message, "error"); }
    finally { setSending(false); }
  }

  function toggleRecipient(id) {
    setRecipientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Send Message</h1>
      <form onSubmit={handleSend} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "32px 28px", maxWidth: 600 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>From Name</label>
            <input value={fromName} onChange={e => setFromName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Role / Title</label>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="President" style={inputStyle} />
          </div>
        </div>

        {/* Target type */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Send To</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: "ALL", label: "All Investors" },
              { val: "PROJECT", label: "Project Investors" },
              { val: "INDIVIDUAL", label: "Specific Investors" },
            ].map(t => (
              <button key={t.val} type="button" onClick={() => setTargetType(t.val)} style={{
                ...btnOutline, fontSize: 12, padding: "6px 14px",
                background: targetType === t.val ? red : "#fff",
                color: targetType === t.val ? "#fff" : darkText,
                borderColor: targetType === t.val ? red : "#DDD",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {targetType === "PROJECT" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Select Project</label>
            <select value={targetProjectId} onChange={e => setTargetProjectId(e.target.value)} style={inputStyle} required>
              <option value="">Choose a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {targetType === "INDIVIDUAL" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Select Recipients</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {investors.map(inv => (
                <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", padding: "6px 12px", background: recipientIds.includes(inv.id) ? "#FEE" : "#F8F7F4", border: `1px solid ${recipientIds.includes(inv.id) ? red : "#E8E5DE"}`, borderRadius: 4 }}>
                  <input type="checkbox" checked={recipientIds.includes(inv.id)} onChange={() => toggleRecipient(inv.id)} style={{ accentColor: red }} />
                  {inv.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Q3 2025 Project Update" style={inputStyle} required />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Message</label>
          <textarea value={preview} onChange={e => setPreview(e.target.value)} placeholder="Write your message..." rows={5} style={{ ...inputStyle, resize: "vertical" }} required />
        </div>
        <button type="submit" disabled={sending} style={{ ...btnStyle, padding: "12px 24px", fontSize: 14, opacity: sending ? 0.6 : 1 }}>
          {sending ? "Sending..." : `Send ${targetType === "ALL" ? "to All" : targetType === "PROJECT" ? "to Project" : `to ${recipientIds.length} Selected`}`}
        </button>
      </form>
    </>
  );
}
