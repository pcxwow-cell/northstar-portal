import { useState, useEffect } from "react";
import { fetchDashboard, fetchAdminProjects, updateProject, postUpdate, fetchAdminInvestors, sendMessage, uploadDocument, inviteInvestor, updateInvestor, approveInvestor, deactivateInvestor, resetInvestorPassword, assignInvestorProject, updateInvestorKPI, fetchThreads, fetchThread, createThread, replyToThread, fetchInvestorProfile, fetchGroups, createGroup, updateGroup, deleteGroup, fetchGroupDetail, addGroupMembers, removeGroupMember, fetchStaff, createStaff, updateStaff, fetchAdminDocuments, fetchAdminDocumentDetail, fetchAdminProjectDetail, updateWaterfall, fetchSignatureRequests, createSignatureRequest, cancelSignatureRequest, fetchProspects, updateProspectStatus, fetchProspectStats, fetchCashFlows, recordCashFlow, recalculateProject, fetchAuditLog, createProject, fetchEntities, createEntity, updateEntity, deleteEntity, runFinancialModel, updateCashFlow, deleteCashFlow, fetchProjectCashFlows, fmt, fmtCurrency } from "./api.js";

const sans = "'DM Sans', -apple-system, sans-serif";
const red = "#EA2028";
const green = "#3D7A54";
const darkText = "#231F20";
const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #DDD", borderRadius: 8, fontSize: 13, fontFamily: sans, boxSizing: "border-box" };
const btnStyle = { padding: "8px 16px", background: red, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: sans, boxShadow: "0 1px 3px rgba(234,32,40,.3)" };
const btnOutline = { ...btnStyle, background: "#fff", color: darkText, border: "1px solid #DDD", boxShadow: "none" };

// ─── ADMIN LOADING SPINNER ───
function AdminSpinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 12 }}>
      <style>{`@keyframes adminSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 24, height: 24, border: `2px solid ${red}22`, borderTopColor: red, borderRadius: "50%", animation: "adminSpin .7s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#999" }}>Loading...</span>
    </div>
  );
}

// ─── ADMIN ERROR BANNER ───
function AdminError({ message, onRetry }) {
  return (
    <div style={{ padding: "14px 20px", borderRadius: 10, background: "#FEE", border: `1px solid ${red}30`, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: red }}>
      <span>{message || "Something went wrong."}</span>
      {onRetry && <span onClick={onRetry} style={{ ...btnOutline, fontSize: 12, color: red, borderColor: `${red}44`, cursor: "pointer" }}>Retry</span>}
    </div>
  );
}

// ─── ADMIN EMPTY STATE ───
function AdminEmpty({ title, subtitle }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: "#666", marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "#999" }}>{subtitle}</div>}
    </div>
  );
}

export default function AdminPanel({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  function showToast(msg, type = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "Projects" },
    { id: "investors", label: "Investors" },
    { id: "documents", label: "Documents" },
    { id: "signatures", label: "Signatures" },
    { id: "groups", label: "Groups" },
    { id: "staff", label: "Staff" },
    { id: "prospects", label: "Prospects" },
    { id: "inbox", label: "Inbox" },
    { id: "audit", label: "Audit Log" },
  ];

  // Sub-view navigation
  const [profileId, setProfileId] = useState(null);
  const [projectDetailId, setProjectDetailId] = useState(null);

  const pages = {
    dashboard: <Dashboard />,
    projects: projectDetailId
      ? <ProjectDetail projectId={projectDetailId} onBack={() => setProjectDetailId(null)} toast={showToast} />
      : <ProjectManager toast={showToast} onViewProject={(id) => setProjectDetailId(id)} />,
    investors: profileId
      ? <InvestorProfile investorId={profileId} onBack={() => setProfileId(null)} toast={showToast} />
      : <InvestorManager toast={showToast} onViewProfile={(id) => setProfileId(id)} />,
    documents: <DocumentManager toast={showToast} />,
    signatures: <SignatureManager toast={showToast} />,
    groups: <GroupManager toast={showToast} />,
    staff: <StaffManager toast={showToast} />,
    prospects: <ProspectManager toast={showToast} />,
    inbox: <AdminInbox user={user} toast={showToast} />,
    audit: <AuditLogViewer />,
  };

  return (
    <div style={{ fontFamily: sans, color: darkText, minHeight: "100vh", background: "#F8F7F4" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 24, background: red, borderRadius: 4 }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".08em" }}>NORTHSTAR</span>
          <span style={{ fontSize: 11, padding: "2px 8px", background: "#FEE", borderRadius: 20, color: red, fontWeight: 500 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#666" }}>{user.name}</span>
          <button onClick={onLogout} style={{ ...btnOutline, fontSize: 12, borderRadius: 6 }}>Sign Out</button>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 4, background: "#fff", borderBottom: "1px solid #ECEAE5", padding: "8px 32px" }}>
        {navItems.map(n => (
          <span key={n.id} onClick={() => setView(n.id)} style={{
            fontSize: 13, padding: "8px 16px", cursor: "pointer",
            color: view === n.id ? red : "#888",
            background: view === n.id ? "#EA20280D" : "transparent",
            borderRadius: 6,
            fontWeight: view === n.id ? 500 : 400,
            transition: "all .15s",
          }}
            onMouseEnter={e => { if (view !== n.id) e.currentTarget.style.background = "#F0EDE8"; }}
            onMouseLeave={e => { if (view !== n.id) e.currentTarget.style.background = "transparent"; }}>{n.label}</span>
        ))}
      </nav>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 32px 80px" }}>{pages[view]}</main>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 20px", background: toast.type === "error" ? "#FEE" : "#EFE", border: `1px solid ${toast.type === "error" ? red : green}`, borderRadius: 10, fontSize: 13, color: toast.type === "error" ? red : green, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>{toast.msg}</div>
      )}
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { fetchDashboard().then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <AdminError message={error} onRetry={() => { setError(null); fetchDashboard().then(setData).catch(e => setError(e.message)); }} />;
  if (!data) return <AdminSpinner />;
  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Admin Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Projects", value: data.projectCount, accent: red },
          { label: "Investors", value: data.investorCount, accent: green },
          { label: "Documents", value: data.docCount, accent: "#D4A574" },
          { label: "Unread Messages", value: data.unreadMessages, accent: "#5B8DEF" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", borderLeft: `3px solid ${s.accent}`, transition: "transform .15s, box-shadow .15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)"; }}>
            <div style={{ fontSize: 28, fontWeight: 300, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Recent Documents</h2>
      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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
function ProjectManager({ toast, onViewProject }) {
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [cpForm, setCpForm] = useState({ name: "", location: "", type: "Residential", status: "Pre-Development", description: "", sqft: "", units: "", totalRaise: "", estimatedCompletion: "", unitsSold: "", revenue: "", prefReturnPct: "8", gpCatchupPct: "100", carryPct: "20" });

  function reload() { fetchAdminProjects().then(setProjects); }
  useEffect(() => { reload(); }, []);

  async function handleSave(id, field, value) {
    try { await updateProject(id, { [field]: value }); setProjects(p => p.map(x => x.id === id ? { ...x, [field === "completionPct" ? "completion" : field]: value } : x)); toast("Updated"); } catch (e) { toast(e.message, "error"); }
  }
  async function handlePostUpdate(pid) {
    if (!updateText.trim()) return;
    try { await postUpdate(pid, updateText); toast("Update posted"); setUpdateText(""); } catch (e) { toast(e.message, "error"); }
  }
  async function handleCreateProject(e) {
    e.preventDefault();
    if (!cpForm.name.trim()) { toast("Project name is required", "error"); return; }
    try {
      const data = { ...cpForm };
      if (data.units) data.units = parseInt(data.units);
      if (data.totalRaise) data.totalRaise = parseFloat(data.totalRaise);
      if (data.unitsSold) data.unitsSold = parseInt(data.unitsSold);
      if (data.revenue) data.revenue = parseFloat(data.revenue);
      if (data.prefReturnPct) data.prefReturnPct = parseFloat(data.prefReturnPct);
      if (data.gpCatchupPct) data.gpCatchupPct = parseFloat(data.gpCatchupPct);
      if (data.carryPct) data.carryPct = parseFloat(data.carryPct);
      await createProject(data);
      toast("Project created");
      setShowCreate(false);
      setCpForm({ name: "", location: "", type: "Residential", status: "Pre-Development", description: "", sqft: "", units: "", totalRaise: "", estimatedCompletion: "", unitsSold: "", revenue: "", prefReturnPct: "8", gpCatchupPct: "100", carryPct: "20" });
      reload();
    } catch (err) { toast(err.message, "error"); }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>Projects</h1>
        <button onClick={() => setShowCreate(!showCreate)} style={btnStyle}>{showCreate ? "Cancel" : "Create Project"}</button>
      </div>

      {/* Create Project Form */}
      {showCreate && (
        <form onSubmit={handleCreateProject} style={{ background: "#fff", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>New Project</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Name *</label>
              <input value={cpForm.name} onChange={e => setCpForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} placeholder="Project name" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Location</label>
              <input value={cpForm.location} onChange={e => setCpForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="City, Province" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Type</label>
              <select value={cpForm.type} onChange={e => setCpForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                <option>Residential</option><option>Mixed-Use</option><option>Commercial</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Status</label>
              <select value={cpForm.status} onChange={e => setCpForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                <option>Pre-Development</option><option>Under Construction</option><option>Completed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Square Footage</label>
              <input value={cpForm.sqft} onChange={e => setCpForm(f => ({ ...f, sqft: e.target.value }))} style={inputStyle} placeholder="e.g. 96,000" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Units</label>
              <input type="number" value={cpForm.units} onChange={e => setCpForm(f => ({ ...f, units: e.target.value }))} style={inputStyle} placeholder="e.g. 108" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Total Raise ($)</label>
              <input type="number" value={cpForm.totalRaise} onChange={e => setCpForm(f => ({ ...f, totalRaise: e.target.value }))} style={inputStyle} placeholder="e.g. 6000000" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Est. Completion Date</label>
              <input type="date" value={cpForm.estimatedCompletion} onChange={e => setCpForm(f => ({ ...f, estimatedCompletion: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Units Sold</label>
              <input type="number" value={cpForm.unitsSold} onChange={e => setCpForm(f => ({ ...f, unitsSold: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Revenue ($)</label>
              <input type="number" value={cpForm.revenue} onChange={e => setCpForm(f => ({ ...f, revenue: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Pref Return %</label>
              <input type="number" step="0.1" value={cpForm.prefReturnPct} onChange={e => setCpForm(f => ({ ...f, prefReturnPct: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Carry %</label>
              <input type="number" value={cpForm.carryPct} onChange={e => setCpForm(f => ({ ...f, carryPct: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Description</label>
            <textarea value={cpForm.description} onChange={e => setCpForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Project description..." />
          </div>
          <button type="submit" style={btnStyle}>Create Project</button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {projects.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#999" }}>{p.location} · {p.investorCount} investors · {p.docCount} docs</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onViewProject?.(p.id)} style={btnStyle}>View</button>
                <button onClick={() => setEditing(editing === p.id ? null : p.id)} style={btnOutline}>{editing === p.id ? "Close" : "Edit"}</button>
              </div>
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
function InvestorManager({ toast, onViewProfile }) {
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
        <form onSubmit={handleInvite} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
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
      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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
                <button onClick={() => onViewProfile?.(inv.id)} style={{ ...btnStyle, padding: "4px 10px", fontSize: 11 }}>View</button>
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

// ─── PROJECT DETAIL PAGE ───
function ProjectDetail({ projectId, onBack, toast }) {
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("overview");
  const [updateText, setUpdateText] = useState("");
  const [editingKPI, setEditingKPI] = useState(null);
  const [cashFlowsList, setCashFlowsList] = useState([]);
  const [cfInvestors, setCfInvestors] = useState([]);
  const [showCfModal, setShowCfModal] = useState(false);
  const [cfDate, setCfDate] = useState("");
  const [cfAmount, setCfAmount] = useState("");
  const [cfType, setCfType] = useState("capital_call");
  const [cfUserId, setCfUserId] = useState("");
  const [cfDesc, setCfDesc] = useState("");
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => { load(); }, [projectId]);
  async function load() { fetchAdminProjectDetail(projectId).then(setProject); }

  useEffect(() => {
    if (tab === "cashflows" && project) {
      loadCashFlows();
      if (project.investors) setCfInvestors(project.investors);
    }
  }, [tab, project?.id]);

  async function loadCashFlows() {
    const allFlows = [];
    if (project?.investors) {
      for (const inv of project.investors) {
        try {
          const flows = await fetchCashFlows(inv.userId, projectId);
          allFlows.push(...flows.map(f => ({ ...f, investorName: inv.name })));
        } catch (e) { /* skip */ }
      }
    }
    allFlows.sort((a, b) => new Date(a.date) - new Date(b.date));
    setCashFlowsList(allFlows);
  }

  async function handleRecordCashFlow(e) {
    e.preventDefault();
    if (!cfUserId || !cfDate || !cfAmount || !cfType) { toast("All fields required", "error"); return; }
    try {
      const amountVal = parseFloat(cfAmount);
      const finalAmount = (cfType === "capital_call") ? -Math.abs(amountVal) : Math.abs(amountVal);
      await recordCashFlow({ userId: parseInt(cfUserId), projectId, date: cfDate, amount: finalAmount, type: cfType, description: cfDesc || null });
      toast("Cash flow recorded");
      setShowCfModal(false); setCfDate(""); setCfAmount(""); setCfDesc(""); setCfUserId("");
      loadCashFlows();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const result = await recalculateProject(projectId);
      toast(`Recalculated ${result.results.length} investor(s)`);
      load();
    } catch (err) { toast(err.message, "error"); }
    setRecalculating(false);
  }

  async function handleSaveField(field, value) {
    try { await updateProject(projectId, { [field]: value }); toast("Updated"); load(); } catch (e) { toast(e.message, "error"); }
  }

  async function handleSaveWaterfall(field, value) {
    try { await updateWaterfall(projectId, { [field]: parseFloat(value) }); toast("Waterfall updated"); load(); } catch (e) { toast(e.message, "error"); }
  }

  async function handlePostUpdate() {
    if (!updateText.trim()) return;
    try { await postUpdate(projectId, updateText); toast("Update posted"); setUpdateText(""); load(); } catch (e) { toast(e.message, "error"); }
  }

  async function handleSaveInvestorKPI(userId, field, value) {
    try { await updateInvestorKPI(userId, projectId, { [field]: parseFloat(value) }); toast("KPI updated"); load(); } catch (e) { toast(e.message, "error"); }
  }

  if (!project) return <p style={{ color: "#999" }}>Loading...</p>;

  // Financial modeler state
  const [fmExitValue, setFmExitValue] = useState("");
  const [fmHoldYears, setFmHoldYears] = useState("5");
  const [fmAnnualCF, setFmAnnualCF] = useState("0");
  const [fmResult, setFmResult] = useState(null);
  const [fmLoading, setFmLoading] = useState(false);

  // Org chart state
  const [orgChart, setOrgChart] = useState([]);
  useEffect(() => {
    if (project?.orgChart) {
      try { setOrgChart(JSON.parse(project.orgChart)); } catch { setOrgChart([]); }
    }
  }, [project?.orgChart]);

  async function handleRunModel() {
    setFmLoading(true);
    try {
      const result = await runFinancialModel({
        projectId: project.id,
        scenario: {
          totalInvestment: project.totalRaise,
          holdPeriodYears: parseInt(fmHoldYears) || 5,
          exitValue: parseFloat(fmExitValue) || project.totalRaise * 2,
          annualCashFlow: parseFloat(fmAnnualCF) || 0,
          prefReturnPct: project.prefReturn,
          gpCatchupPct: project.catchUp,
          carryPct: project.carry,
        },
      });
      setFmResult(result);
    } catch (err) { toast(err.message, "error"); }
    setFmLoading(false);
  }

  async function handleSaveOrgChart() {
    try {
      await updateProject(projectId, { orgChart: JSON.stringify(orgChart) });
      toast("Org chart saved");
    } catch (e) { toast(e.message, "error"); }
  }

  const section = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const tabs = ["overview", "investors", "documents", "updates", "waterfall", "cashflows", "model"];

  return (
    <>
      <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={onBack}>← Back to projects</p>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>{project.name}</h1>
        <div style={{ fontSize: 13, color: "#999" }}>{project.location} · {project.type}</div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Status", value: project.status },
          { label: "Completion", value: `${project.completion}%` },
          { label: "Total Raise", value: fmtCurrency(project.totalRaise) },
          { label: "Investors", value: project.investors.length },
          { label: "Documents", value: project.documents.length },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize: 22, fontWeight: 300, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F5F3EF", borderRadius: 8, padding: 2, width: "fit-content" }}>
        {tabs.map(t => (
          <span key={t} onClick={() => setTab(t)} style={{
            fontSize: 13, padding: "8px 16px", cursor: "pointer", textTransform: "capitalize",
            color: tab === t ? darkText : "#888", fontWeight: tab === t ? 500 : 400,
            background: tab === t ? "#fff" : "transparent",
            borderRadius: 6,
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            transition: "all .15s",
          }}>{t}</span>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <>
          <div style={section}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#888" }}>Description</label>
              <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6, marginTop: 4 }}>{project.description}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "#888" }}>Status</label>
                <select defaultValue={project.status} onChange={e => handleSaveField("status", e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
                  <option>Pre-Development</option><option>Under Construction</option><option>Completed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888" }}>Completion %</label>
                <input type="number" min="0" max="100" defaultValue={project.completion} onBlur={e => handleSaveField("completionPct", parseInt(e.target.value))} style={{ ...inputStyle, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888" }}>Total Raise ($)</label>
                <input type="number" defaultValue={project.totalRaise} onBlur={e => handleSaveField("totalRaise", parseFloat(e.target.value))} style={{ ...inputStyle, marginTop: 4 }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "#888" }}>Est. Completion Date</label>
                <input type="date" defaultValue={project.estimatedCompletion ? new Date(project.estimatedCompletion).toISOString().split("T")[0] : ""} onBlur={e => handleSaveField("estimatedCompletion", e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888" }}>Units Sold</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <input type="number" defaultValue={project.unitsSold || 0} onBlur={e => handleSaveField("unitsSold", parseInt(e.target.value))} style={{ ...inputStyle, width: 80 }} />
                  <span style={{ fontSize: 12, color: "#999" }}>/ {project.units || 0} total</span>
                  {project.units > 0 && (
                    <div style={{ flex: 1, height: 6, background: "#F0EDE8", borderRadius: 20, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, ((project.unitsSold || 0) / project.units) * 100)}%`, height: "100%", background: green, borderRadius: 20 }} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888" }}>Revenue ($)</label>
                <input type="number" defaultValue={project.revenue || 0} onBlur={e => handleSaveField("revenue", parseFloat(e.target.value))} style={{ ...inputStyle, marginTop: 4 }} />
              </div>
            </div>
          </div>

          {/* Org Chart */}
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Organization Chart</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setOrgChart(oc => [...oc, { role: "", name: "", company: "" }])} style={{ ...btnOutline, padding: "4px 10px", fontSize: 11 }}>Add Row</button>
                <button onClick={handleSaveOrgChart} style={{ ...btnStyle, padding: "4px 10px", fontSize: 11 }}>Save</button>
              </div>
            </div>
            {orgChart.length > 0 ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 30px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
                  <span>Role</span><span>Name</span><span>Company</span><span></span>
                </div>
                {orgChart.map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 30px", gap: 6, padding: "6px 0", borderBottom: "1px solid #F5F3F0", alignItems: "center" }}>
                    <input value={row.role} onChange={e => { const oc = [...orgChart]; oc[i] = { ...oc[i], role: e.target.value }; setOrgChart(oc); }} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="Role" />
                    <input value={row.name} onChange={e => { const oc = [...orgChart]; oc[i] = { ...oc[i], name: e.target.value }; setOrgChart(oc); }} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="Name" />
                    <input value={row.company} onChange={e => { const oc = [...orgChart]; oc[i] = { ...oc[i], company: e.target.value }; setOrgChart(oc); }} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="Company" />
                    <span onClick={() => setOrgChart(oc => oc.filter((_, j) => j !== i))} style={{ fontSize: 16, color: "#CCC", cursor: "pointer", textAlign: "center" }}>&times;</span>
                  </div>
                ))}
              </>
            ) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No org chart entries. Click "Add Row" to start.</p>}
          </div>
        </>
      )}

      {/* Investors tab */}
      {tab === "investors" && (
        <div style={section}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 14 }}>LP Investors ({project.investors.length})</div>
          {project.investors.length > 0 ? project.investors.map((inv) => (
            <div key={inv.userId} style={{ padding: "12px 0", borderBottom: "1px solid #F0EDE8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{inv.name}</span>
                  <span style={{ fontSize: 12, color: "#999", marginLeft: 8 }}>{inv.email}</span>
                </div>
                <button onClick={() => setEditingKPI(editingKPI === inv.userId ? null : inv.userId)} style={{ ...btnOutline, padding: "4px 10px", fontSize: 11 }}>
                  {editingKPI === inv.userId ? "Done" : "Edit KPIs"}
                </button>
              </div>
              {editingKPI === inv.userId ? (
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { label: "Committed", field: "committed", val: inv.committed },
                    { label: "Called", field: "called", val: inv.called },
                    { label: "Value", field: "currentValue", val: inv.currentValue },
                    { label: "IRR %", field: "irr", val: inv.irr },
                    { label: "MOIC", field: "moic", val: inv.moic },
                  ].map(k => (
                    <div key={k.field} style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: "#AAA" }}>{k.label}</label>
                      <input defaultValue={k.val ?? ""} onBlur={e => handleSaveInvestorKPI(inv.userId, k.field, e.target.value)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#666" }}>
                  <span>${fmt(inv.committed)} committed</span>
                  <span>${fmt(inv.currentValue)} value</span>
                  <span>{inv.irr}% IRR</span>
                  <span>{inv.moic}x MOIC</span>
                </div>
              )}
            </div>
          )) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No investors assigned</p>}

          {/* Cap table */}
          {project.capTable.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginTop: 24, marginBottom: 14 }}>Cap Table</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 80px 80px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
                <span>Holder</span><span>Class</span><span>Committed</span><span>Called</span><span>Unfunded</span><span>Ownership</span>
              </div>
              {project.capTable.map(e => (
                <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 80px 80px", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{e.holder}</span>
                  <span style={{ color: "#666" }}>{e.type}</span>
                  <span>${fmt(e.committed)}</span>
                  <span>${fmt(e.called)}</span>
                  <span>${fmt(e.unfunded)}</span>
                  <span>{e.ownership}%</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Documents tab */}
      {tab === "documents" && (
        <div style={section}>
          {project.documents.length > 0 ? project.documents.map((d, i) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < project.documents.length - 1 ? "1px solid #F5F3F0" : "none", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#BBB" }}>{d.category} · {d.date} · {d.size}</div>
              </div>
              <span style={{ fontSize: 12, color: d.viewedBy > 0 ? green : "#CCC" }}>{d.viewedBy} viewed</span>
            </div>
          )) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No documents</p>}
        </div>
      )}

      {/* Updates tab */}
      {tab === "updates" && <ProjectUpdatesTab project={project} updateText={updateText} setUpdateText={setUpdateText} handlePostUpdate={handlePostUpdate} section={section} />}

      {/* Waterfall tab */}
      {tab === "waterfall" && (
        <div style={section}>
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888" }}>Pref Return %</label>
              <input type="number" step="0.1" defaultValue={project.prefReturn} onBlur={e => handleSaveWaterfall("prefReturn", e.target.value)} style={{ ...inputStyle, width: 100, marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888" }}>GP Catch-Up %</label>
              <input type="number" defaultValue={project.catchUp} onBlur={e => handleSaveWaterfall("catchUp", e.target.value)} style={{ ...inputStyle, width: 100, marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888" }}>Carry %</label>
              <input type="number" defaultValue={project.carry} onBlur={e => handleSaveWaterfall("carry", e.target.value)} style={{ ...inputStyle, width: 100, marginTop: 4 }} />
            </div>
          </div>
          {project.waterfall.tiers.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 12 }}>Distribution Tiers</div>
              {project.waterfall.tiers.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{t.name}</span>
                    <span style={{ color: "#999", marginLeft: 12 }}>LP: {t.lpShare} · GP: {t.gpShare}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ color: "#999", fontSize: 12 }}>{t.threshold}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 10, background: t.status === "complete" ? "#EFE" : t.status === "accruing" ? "#FFF8E1" : "#F0EDE8", color: t.status === "complete" ? green : t.status === "accruing" ? "#B8860B" : "#999" }}>{t.status}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Cash Flows tab */}
      {tab === "cashflows" && <ProjectCashFlowsTab project={project} projectId={projectId} cashFlowsList={cashFlowsList} cfInvestors={cfInvestors} showCfModal={showCfModal} setShowCfModal={setShowCfModal} cfDate={cfDate} setCfDate={setCfDate} cfAmount={cfAmount} setCfAmount={setCfAmount} cfType={cfType} setCfType={setCfType} cfUserId={cfUserId} setCfUserId={setCfUserId} cfDesc={cfDesc} setCfDesc={setCfDesc} handleRecordCashFlow={handleRecordCashFlow} handleRecalculate={handleRecalculate} recalculating={recalculating} loadCashFlows={loadCashFlows} toast={toast} section={section} />}

      {/* Financial Model tab */}
      {tab === "model" && (
        <div style={section}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Financial Scenario Model</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "#888" }}>Exit Value ($)</label>
              <input type="number" value={fmExitValue} onChange={e => setFmExitValue(e.target.value)} placeholder={`e.g. ${fmt(project.totalRaise * 2)}`} style={{ ...inputStyle, marginTop: 4 }} />
            </div>
            <div style={{ width: 120 }}>
              <label style={{ fontSize: 11, color: "#888" }}>Hold Period (yrs)</label>
              <input type="number" min="1" max="30" value={fmHoldYears} onChange={e => setFmHoldYears(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "#888" }}>Annual Cash Flow ($)</label>
              <input type="number" value={fmAnnualCF} onChange={e => setFmAnnualCF(e.target.value)} placeholder="0" style={{ ...inputStyle, marginTop: 4 }} />
            </div>
            <button onClick={handleRunModel} disabled={fmLoading} style={{ ...btnStyle, opacity: fmLoading ? 0.5 : 1 }}>
              {fmLoading ? "Running..." : "Run Scenario"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
            Pre-filled: Total Investment ${fmt(project.totalRaise)} | Pref: {project.prefReturn}% | Carry: {project.carry}%
          </div>

          {fmResult && (
            <>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "LP IRR", value: fmResult.lpIRR != null ? `${(fmResult.lpIRR * 100).toFixed(1)}%` : "--" },
                  { label: "LP MOIC", value: `${fmResult.lpMOIC}x` },
                  { label: "Equity Multiple", value: `${fmResult.equityMultiple}x` },
                  { label: "Cash on Cash", value: `${fmResult.cashOnCash}%` },
                ].map((c, i) => (
                  <div key={i} style={{ background: "#F8F7F4", borderRadius: 6, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 300, color: darkText }}>{c.value}</div>
                    <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 4 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Waterfall breakdown with LP/GP bar */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 12 }}>Waterfall Breakdown</div>
              {fmResult.waterfallBreakdown.map((tier, i) => {
                const total = tier.lpAmount + tier.gpAmount;
                const lpPct = total > 0 ? (tier.lpAmount / total) * 100 : 0;
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{tier.name}</span>
                      <span style={{ color: "#999" }}>LP: ${fmt(Math.round(tier.lpAmount))} | GP: ${fmt(Math.round(tier.gpAmount))}</span>
                    </div>
                    <div style={{ height: 12, background: "#F0EDE8", borderRadius: 2, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${lpPct}%`, background: green, height: "100%" }} />
                      <div style={{ width: `${100 - lpPct}%`, background: red, height: "100%", opacity: 0.6 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#999", marginBottom: 24, marginTop: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: green, borderRadius: 2, display: "inline-block" }} /> LP</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: `${red}99`, borderRadius: 2, display: "inline-block" }} /> GP</span>
              </div>

              {/* Year-by-year */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 12 }}>Year-by-Year Cash Flow</div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 120px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
                <span>Year</span><span style={{ textAlign: "right" }}>Cash Flow</span><span style={{ textAlign: "right" }}>Cumulative</span><span style={{ textAlign: "right" }}>Balance</span>
              </div>
              {fmResult.yearByYear.map((y, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 120px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
                  <span>{y.year === 0 ? "Initial" : `Year ${y.year}`}</span>
                  <span style={{ textAlign: "right", color: y.cashFlow < 0 ? red : green, fontWeight: 500 }}>
                    {y.cashFlow < 0 ? `-$${fmt(Math.abs(Math.round(y.cashFlow)))}` : `$${fmt(Math.round(y.cashFlow))}`}
                  </span>
                  <span style={{ textAlign: "right", color: y.cumulativeCashFlow < 0 ? red : green }}>
                    {y.cumulativeCashFlow < 0 ? `-$${fmt(Math.abs(Math.round(y.cumulativeCashFlow)))}` : `$${fmt(Math.round(y.cumulativeCashFlow))}`}
                  </span>
                  <span style={{ textAlign: "right", color: "#666" }}>${fmt(Math.round(y.balance))}</span>
                </div>
              ))}

              {/* Sensitivity table */}
              {fmResult.sensitivity && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 12, marginTop: 24 }}>Sensitivity Analysis</div>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 100px 80px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
                    <span>Scenario</span><span style={{ textAlign: "right" }}>Exit Value</span><span style={{ textAlign: "right" }}>LP Return</span><span style={{ textAlign: "right" }}>LP IRR</span><span style={{ textAlign: "right" }}>LP MOIC</span>
                  </div>
                  {fmResult.sensitivity.map((s, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 100px 80px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13, background: s.label === "+0%" ? "#F8F7F4" : "transparent" }}>
                      <span style={{ fontWeight: 500 }}>{s.label}</span>
                      <span style={{ textAlign: "right" }}>${fmt(s.exitValue)}</span>
                      <span style={{ textAlign: "right", color: green }}>${fmt(Math.round(s.lpReturn))}</span>
                      <span style={{ textAlign: "right" }}>{s.lpIRR != null ? `${(s.lpIRR * 100).toFixed(1)}%` : "--"}</span>
                      <span style={{ textAlign: "right" }}>{s.lpMOIC}x</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

// ─── DOCUMENT MANAGER (dashboard + detail + upload) ───
function DocumentManager({ toast }) {
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docDetail, setDocDetail] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSignModal, setShowSignModal] = useState(false);
  const [sigInvestors, setSigInvestors] = useState([]);
  const [sigSelectedIds, setSigSelectedIds] = useState([]);
  const [sigSubject, setSigSubject] = useState("");
  const [sigSending, setSigSending] = useState(false);

  // Upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Reporting");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadDocs(); fetchAdminProjects().then(setProjects); }, []);
  useEffect(() => { loadDocs(); }, [projectFilter, categoryFilter, search]);

  async function loadDocs() {
    try {
      const params = {};
      if (projectFilter) params.projectId = projectFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (search) params.search = search;
      const d = await fetchAdminDocuments(params);
      setDocs(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function openDoc(doc) {
    setSelectedDoc(doc);
    try { const detail = await fetchAdminDocumentDetail(doc.id); setDocDetail(detail); } catch (e) { toast("Failed to load document", "error"); }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !uploadName) return toast("Name and file required", "error");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", uploadName);
      formData.append("category", uploadCategory);
      if (uploadProjectId) formData.append("projectId", uploadProjectId);
      formData.append("file", uploadFile);
      await uploadDocument(formData);
      toast("Document uploaded");
      setShowUpload(false); setUploadName(""); setUploadFile(null); setUploadProjectId("");
      loadDocs();
    } catch (err) { toast(err.message, "error"); }
    finally { setUploading(false); }
  }

  const categories = ["Reporting", "Property Update", "Offering", "Capital Call", "Legal", "Tax", "Distribution"];

  async function openSignModal() {
    setShowSignModal(true);
    setSigSubject(`Please sign: ${docDetail.name}`);
    setSigSelectedIds([]);
    try {
      const investors = await fetchAdminInvestors();
      setSigInvestors(investors);
    } catch (e) { console.error(e); }
  }

  async function handleSendSignature() {
    if (!sigSelectedIds.length) return toast("Select at least one signer", "error");
    setSigSending(true);
    try {
      await createSignatureRequest({
        documentId: docDetail.id,
        signerIds: sigSelectedIds,
        subject: sigSubject,
      });
      toast("Signature request sent");
      setShowSignModal(false);
      // Refresh detail
      const detail = await fetchAdminDocumentDetail(docDetail.id);
      setDocDetail(detail);
    } catch (e) { toast(e.message, "error"); }
    finally { setSigSending(false); }
  }

  // Document detail view
  if (docDetail) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedDoc(null); setDocDetail(null); }}>← Back to documents</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 6 }}>{docDetail.name}</h2>
            <div style={{ fontSize: 12, color: "#999" }}>
              {docDetail.project?.name || "General"} · {docDetail.category} · {docDetail.date} · {docDetail.size}
              <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 3, fontSize: 10, background: docDetail.status === "published" ? "#EFE" : "#FFF8E1", color: docDetail.status === "published" ? green : "#B8860B" }}>{docDetail.status}</span>
            </div>
          </div>
          <button onClick={openSignModal} style={{ ...btnStyle, fontSize: 12 }}>Request Signature</button>
        </div>

        {/* Signature Request Modal */}
        {showSignModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowSignModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "28px 24px", maxWidth: 480, width: "90%", maxHeight: "70vh", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 400, marginBottom: 20 }}>Request Signature</h3>
              <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Select investors to sign <strong>{docDetail.name}</strong></p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Subject</label>
                <input value={sigSubject} onChange={e => setSigSubject(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Signers</label>
                <div style={{ border: "1px solid #DDD", borderRadius: 4, maxHeight: 200, overflow: "auto" }}>
                  {sigInvestors.map(inv => (
                    <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #F0EDE8", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={sigSelectedIds.includes(inv.id)}
                        onChange={e => setSigSelectedIds(prev => e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id))} />
                      <span style={{ fontWeight: 500 }}>{inv.name}</span>
                      <span style={{ color: "#999" }}>{inv.email}</span>
                    </label>
                  ))}
                  {sigInvestors.length === 0 && <div style={{ padding: 14, color: "#999", fontSize: 12 }}>Loading investors...</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowSignModal(false)} style={btnOutline}>Cancel</button>
                <button onClick={handleSendSignature} disabled={sigSending} style={{ ...btnStyle, opacity: sigSending ? 0.5 : 1 }}>
                  {sigSending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Access audit table */}
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>
            <span>Investor</span><span>Email</span><span>Viewed</span><span>Downloaded</span><span>Acknowledged</span>
          </div>
          {docDetail.accessList.length > 0 ? docDetail.accessList.map((a, i) => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "12px 20px", borderBottom: i < docDetail.accessList.length - 1 ? "1px solid #F0EDE8" : "none", fontSize: 13, alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>
                {a.name}
                {a.directAssignment && <span style={{ fontSize: 10, color: red, marginLeft: 6 }}>Direct</span>}
              </span>
              <span style={{ color: "#666" }}>{a.email}</span>
              <span style={{ color: a.viewedAt ? green : "#CCC" }}>{a.viewedAt ? new Date(a.viewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
              <span style={{ color: a.downloadedAt ? green : "#CCC" }}>{a.downloadedAt ? new Date(a.downloadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
              <span style={{ color: a.acknowledgedAt ? green : "#CCC" }}>{a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
            </div>
          )) : (
            <div style={{ padding: 20, color: "#999", textAlign: "center", fontSize: 13 }}>No investor access records</div>
          )}
        </div>
      </>
    );
  }

  // Upload form
  if (showUpload) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => setShowUpload(false)}>← Back to documents</p>
        <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>Upload Document</h2>
        <form onSubmit={handleUpload} style={{ background: "#fff", borderRadius: 12, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", maxWidth: 520 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Document Name</label>
            <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Q3 2025 — Porthaven Quarterly Report" style={inputStyle} required />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Category</label>
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} style={inputStyle}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Project</label>
              <select value={uploadProjectId} onChange={e => setUploadProjectId(e.target.value)} style={inputStyle}>
                <option value="">General (all investors)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>File</label>
            <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv" onChange={e => setUploadFile(e.target.files[0])} style={{ fontSize: 13 }} required />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setShowUpload(false)} style={btnOutline}>Cancel</button>
            <button type="submit" disabled={uploading} style={{ ...btnStyle, padding: "10px 24px", opacity: uploading ? 0.5 : 1 }}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </>
    );
  }

  // Document list dashboard
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 300 }}>Documents</h1>
          <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{docs.length} documents</p>
        </div>
        <button onClick={() => setShowUpload(true)} style={btnStyle}>Upload Document</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." style={{ ...inputStyle, flex: 1 }} />
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Document table */}
      {loading ? <p style={{ color: "#999" }}>Loading...</p> : (
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 80px 80px 80px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>
            <span>Document</span><span>Project</span><span>Category</span><span>Investors</span><span>Viewed</span><span>Downloaded</span>
          </div>
          {docs.map((d, i) => (
            <div key={d.id} onClick={() => openDoc(d)} style={{
              display: "grid", gridTemplateColumns: "2fr 100px 100px 80px 80px 80px",
              padding: "14px 20px", borderBottom: i < docs.length - 1 ? "1px solid #F0EDE8" : "none",
              cursor: "pointer", fontSize: 13, alignItems: "center",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#FAFAF8"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div>
                <div style={{ fontWeight: 500 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#BBB" }}>{d.date} · {d.size}</div>
              </div>
              <span style={{ fontSize: 12, color: "#666" }}>{d.project}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", background: "#F0EDE8", borderRadius: 3 }}>{d.category}</span>
              <span>{d.totalInvestors}</span>
              <span style={{ color: d.viewed > 0 ? green : "#CCC" }}>{d.viewed}</span>
              <span style={{ color: d.downloaded > 0 ? green : "#CCC" }}>{d.downloaded}</span>
            </div>
          ))}
          {docs.length === 0 && <div style={{ padding: 24, color: "#999", textAlign: "center" }}>No documents found</div>}
        </div>
      )}
    </>
  );
}

// ─── TARGETED MESSAGE COMPOSER ───
// ─── INVESTOR PROFILE PAGE ───
function InvestorProfile({ investorId, onBack, toast }) {
  const [profile, setProfile] = useState(null);
  const [entities, setEntities] = useState([]);
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [entityForm, setEntityForm] = useState({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });

  useEffect(() => { fetchInvestorProfile(investorId).then(setProfile); loadEntities(); }, [investorId]);
  function loadEntities() { fetchEntities(investorId).then(setEntities).catch(() => setEntities([])); }

  async function handleCreateEntity(e) {
    e.preventDefault();
    try {
      await createEntity(investorId, entityForm);
      toast("Entity created");
      setShowEntityForm(false);
      setEntityForm({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });
      loadEntities();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDeleteEntity(entityId) {
    try { await deleteEntity(entityId); toast("Entity deleted"); loadEntities(); } catch (err) { toast(err.message, "error"); }
  }

  if (!profile) return <p style={{ color: "#999" }}>Loading...</p>;

  const section = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  return (
    <>
      <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={onBack}>← Back to investors</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0EDE8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#666" }}>
            {profile.initials || profile.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 400 }}>{profile.name}</h1>
            <div style={{ fontSize: 13, color: "#999" }}>{profile.email} · {profile.role === "INVESTOR" ? "Limited Partner" : profile.role} · Joined {profile.joined}</div>
          </div>
        </div>
        <span style={{ padding: "4px 12px", borderRadius: 4, fontSize: 12, fontWeight: 500, background: profile.status === "ACTIVE" ? "#EFE" : profile.status === "PENDING" ? "#FFF8E1" : "#FEE", color: profile.status === "ACTIVE" ? green : profile.status === "PENDING" ? "#B8860B" : red }}>{profile.status}</span>
      </div>

      {/* Groups */}
      <div style={section}>
        <div style={sectionTitle}>Groups</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profile.groups.length > 0 ? profile.groups.map(g => (
            <span key={g.id} style={{ padding: "4px 12px", borderRadius: 16, fontSize: 12, background: g.color ? `${g.color}20` : "#F0EDE8", color: g.color || "#666", border: `1px solid ${g.color ? `${g.color}40` : "#E0DDD8"}` }}>{g.name}</span>
          )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No groups assigned</span>}
        </div>
      </div>

      {/* Investment Entities */}
      <div style={section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={sectionTitle}>Investment Entities</div>
          <button onClick={() => setShowEntityForm(!showEntityForm)} style={{ ...btnOutline, padding: "4px 10px", fontSize: 11 }}>{showEntityForm ? "Cancel" : "Add Entity"}</button>
        </div>
        {showEntityForm && (
          <form onSubmit={handleCreateEntity} style={{ padding: "12px", background: "#FAFAF8", borderRadius: 4, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: "#999" }}>Name</label>
                <input value={entityForm.name} onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))} required style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="Entity name" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#999" }}>Type</label>
                <select value={entityForm.type} onChange={e => setEntityForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}>
                  <option>Individual</option><option>LLC</option><option>Trust</option><option>IRA</option><option>Corporation</option><option>Partnership</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#999" }}>Tax ID</label>
                <input value={entityForm.taxId} onChange={e => setEntityForm(f => ({ ...f, taxId: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="EIN/SSN" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 10, color: "#999" }}>State</label>
                <input value={entityForm.state} onChange={e => setEntityForm(f => ({ ...f, state: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. BC" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 4 }}>
                <input type="checkbox" checked={entityForm.isDefault} onChange={e => setEntityForm(f => ({ ...f, isDefault: e.target.checked }))} />
                <label style={{ fontSize: 11, color: "#666" }}>Default entity</label>
              </div>
              <button type="submit" style={{ ...btnStyle, padding: "6px 12px", fontSize: 11 }}>Create</button>
            </div>
          </form>
        )}
        {entities.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 60px 70px 40px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
            <span>Entity Name</span><span>Type</span><span>Tax ID</span><span>State</span><span>Default</span><span></span>
          </div>
        ) : null}
        {entities.map(e => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 60px 70px 40px", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13, alignItems: "center" }}>
            <span style={{ fontWeight: 500 }}>{e.name}</span>
            <span style={{ color: "#666" }}>{e.type}</span>
            <span style={{ color: "#999", fontSize: 11 }}>{e.taxId || "\u2014"}</span>
            <span style={{ color: "#999" }}>{e.state || "\u2014"}</span>
            <span>{e.isDefault ? <span style={{ fontSize: 10, padding: "2px 6px", background: "#EFE", color: green, borderRadius: 3 }}>Default</span> : ""}</span>
            <span onClick={() => handleDeleteEntity(e.id)} style={{ fontSize: 14, color: "#CCC", cursor: "pointer" }}>&times;</span>
          </div>
        ))}
        {entities.length === 0 && !showEntityForm && <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No entities</span>}
      </div>

      {/* Projects + KPIs */}
      <div style={section}>
        <div style={sectionTitle}>Project Investments</div>
        {profile.projects.length > 0 ? profile.projects.map(p => (
          <div key={p.projectId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F0EDE8" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.projectName}</div>
              <div style={{ fontSize: 11, color: "#999" }}>{p.projectStatus}</div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#666", alignItems: "center" }}>
              <span>${fmt(p.committed)} committed</span>
              <span>${fmt(p.currentValue)} value</span>
              <span>{p.irr}% IRR <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "#EFE", color: green, marginLeft: 2, verticalAlign: "middle" }}>calculated</span></span>
              <span>{p.moic}x MOIC <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "#EFE", color: green, marginLeft: 2, verticalAlign: "middle" }}>calculated</span></span>
            </div>
          </div>
        )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No project assignments</span>}
      </div>

      {/* Cash Flows */}
      {profile.projects.length > 0 && (
        <InvestorCashFlowsSection investorId={investorId} investorName={profile.name} projects={profile.projects} toast={toast} />
      )}

      {/* Documents Access */}
      <div style={section}>
        <div style={sectionTitle}>Document Access ({(profile.documents.assigned.length + profile.documents.projectDocs.length + profile.documents.generalDocs.length)} documents)</div>
        {[...profile.documents.assigned, ...profile.documents.projectDocs, ...profile.documents.generalDocs].slice(0, 10).map((d, i) => (
          <div key={`${d.id}-${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
            <span>{d.name}</span>
            <span style={{ color: "#999", fontSize: 12 }}>{d.category} · {d.date}</span>
          </div>
        ))}
      </div>

      {/* Recent Messages */}
      <div style={section}>
        <div style={sectionTitle}>Recent Messages</div>
        {profile.recentThreads.length > 0 ? profile.recentThreads.map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {t.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: red }} />}
              <span>{t.subject}</span>
            </div>
            <span style={{ color: "#999", fontSize: 11 }}>{new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {t.targetType}</span>
          </div>
        )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No messages</span>}
      </div>
    </>
  );
}

// ─── PROJECT UPDATES TAB (with comparison view) ───
function ProjectUpdatesTab({ project, updateText, setUpdateText, handlePostUpdate, section }) {
  const [compareMode, setCompareMode] = useState(false);
  const [leftIdx, setLeftIdx] = useState(1);
  const [rightIdx, setRightIdx] = useState(0);

  const updates = project.updates || [];

  function DeltaBadge({ label, before, after, isCurrency }) {
    if (before == null || after == null || before === after) return null;
    const d = after - before;
    const positive = d > 0;
    const display = isCurrency ? `${positive ? "+" : ""}${fmtCurrency(d)}` : `${positive ? "+" : ""}${d}`;
    return (
      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, marginRight: 6, background: positive ? "#EFE" : "#FEE", color: positive ? green : red }}>
        {positive ? "\u2191" : "\u2193"} {label}: {display}
      </span>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Post a construction update..." style={{ ...inputStyle, flex: 1 }} />
        <button onClick={handlePostUpdate} style={btnStyle}>Post</button>
        {updates.length >= 2 && (
          <button onClick={() => setCompareMode(!compareMode)} style={{ ...btnOutline, background: compareMode ? "#FEE" : "#fff", color: compareMode ? red : darkText }}>
            {compareMode ? "Exit Compare" : "Compare"}
          </button>
        )}
      </div>

      {compareMode && updates.length >= 2 ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "#888" }}>Earlier Update</label>
              <select value={leftIdx} onChange={e => setLeftIdx(parseInt(e.target.value))} style={{ ...inputStyle, marginTop: 4 }}>
                {updates.map((u, i) => <option key={i} value={i}>{u.date}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "#888" }}>Later Update</label>
              <select value={rightIdx} onChange={e => setRightIdx(parseInt(e.target.value))} style={{ ...inputStyle, marginTop: 4 }}>
                {updates.map((u, i) => <option key={i} value={i}>{u.date}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[updates[leftIdx], updates[rightIdx]].map((u, ci) => u ? (
              <div key={ci} style={{ border: "1px solid #E8E5DE", borderRadius: 4, padding: 16, background: ci === 1 ? "#FAFFF8" : "#FAFAFA" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>{u.date}</div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6, marginBottom: 12 }}>{u.text}</div>
                {(u.completionPct != null || u.unitsSold != null || u.revenue != null || u.status) && (
                  <div style={{ borderTop: "1px solid #E8E5DE", paddingTop: 10, fontSize: 12, color: "#888" }}>
                    {u.completionPct != null && <div>Completion: <strong>{u.completionPct}%</strong></div>}
                    {u.unitsSold != null && <div>Units Sold: <strong>{u.unitsSold}</strong></div>}
                    {u.revenue != null && <div>Revenue: <strong>{fmtCurrency(u.revenue)}</strong></div>}
                    {u.status && <div>Status: <strong>{u.status}</strong></div>}
                  </div>
                )}
              </div>
            ) : null)}
          </div>
          {/* Delta indicators */}
          {updates[leftIdx] && updates[rightIdx] && (
            <div style={{ marginTop: 12, padding: "10px 0", borderTop: "1px solid #E8E5DE" }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Changes:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                <DeltaBadge label="Completion" before={updates[leftIdx].completionPct} after={updates[rightIdx].completionPct} />
                <DeltaBadge label="Units Sold" before={updates[leftIdx].unitsSold} after={updates[rightIdx].unitsSold} />
                <DeltaBadge label="Revenue" before={updates[leftIdx].revenue} after={updates[rightIdx].revenue} isCurrency />
                {updates[leftIdx].status !== updates[rightIdx].status && updates[leftIdx].status && updates[rightIdx].status && (
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "#F0F8FF", color: "#336" }}>
                    Status: {updates[leftIdx].status} → {updates[rightIdx].status}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={section}>
          {updates.length > 0 ? updates.map((u, i) => (
            <div key={u.id} style={{ padding: "12px 0", borderBottom: i < updates.length - 1 ? "1px solid #F5F3F0" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: "#999" }}>{u.date}</div>
                {u.completionPct != null && <span style={{ fontSize: 10, color: "#999", padding: "2px 6px", border: "1px solid #E8E5DE", borderRadius: 3 }}>{u.completionPct}% complete</span>}
              </div>
              <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{u.text}</div>
              {/* Show delta vs previous */}
              {i < updates.length - 1 && (() => {
                const prev = updates[i + 1];
                const deltas = [];
                if (u.completionPct != null && prev.completionPct != null && u.completionPct !== prev.completionPct) {
                  const d = u.completionPct - prev.completionPct;
                  deltas.push({ label: "Completion", value: `${d > 0 ? "+" : ""}${d}%`, positive: d > 0 });
                }
                if (u.unitsSold != null && prev.unitsSold != null && u.unitsSold !== prev.unitsSold) {
                  const d = u.unitsSold - prev.unitsSold;
                  deltas.push({ label: "Units Sold", value: `${d > 0 ? "+" : ""}${d}`, positive: d > 0 });
                }
                if (u.revenue != null && prev.revenue != null && u.revenue !== prev.revenue) {
                  const d = u.revenue - prev.revenue;
                  deltas.push({ label: "Revenue", value: `${d > 0 ? "+" : ""}${fmtCurrency(d)}`, positive: d > 0 });
                }
                if (deltas.length === 0) return null;
                return (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {deltas.map((d, j) => (
                      <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: d.positive ? "#EFE" : "#FEE", color: d.positive ? green : red }}>
                        {d.positive ? "\u2191" : "\u2193"} {d.label}: {d.value}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          )) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No updates posted</p>}
        </div>
      )}
    </>
  );
}

// ─── PROJECT CASH FLOWS TAB (with edit/delete) ───
function ProjectCashFlowsTab({ project, projectId, cashFlowsList, cfInvestors, showCfModal, setShowCfModal, cfDate, setCfDate, cfAmount, setCfAmount, cfType, setCfType, cfUserId, setCfUserId, cfDesc, setCfDesc, handleRecordCashFlow, handleRecalculate, recalculating, loadCashFlows, toast, section }) {
  const [editingCf, setEditingCf] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState("");
  const [editDesc, setEditDesc] = useState("");

  function startEdit(cf) {
    setEditingCf(cf.id);
    setEditDate(new Date(cf.date).toISOString().split("T")[0]);
    setEditAmount(String(Math.abs(cf.amount)));
    setEditType(cf.type);
    setEditDesc(cf.description || "");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      const amountVal = parseFloat(editAmount);
      const finalAmount = editType === "capital_call" ? -Math.abs(amountVal) : Math.abs(amountVal);
      await updateCashFlow(editingCf, { date: editDate, amount: finalAmount, type: editType, description: editDesc || null });
      toast("Cash flow updated");
      setEditingCf(null);
      loadCashFlows();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this cash flow record?")) return;
    try {
      await deleteCashFlow(id);
      toast("Cash flow deleted");
      loadCashFlows();
    } catch (err) { toast(err.message, "error"); }
  }

  // Calculate running balance and totals
  const totalContributed = cashFlowsList.filter(cf => cf.amount < 0).reduce((s, cf) => s + Math.abs(cf.amount), 0);
  const totalDistributed = cashFlowsList.filter(cf => cf.amount > 0).reduce((s, cf) => s + cf.amount, 0);
  const netCF = totalDistributed - totalContributed;

  return (
    <div style={section}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: "12px 16px", background: "#FAFAF8", borderRadius: 4, border: "1px solid #E8E5DE" }}>
        <div>
          <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>Capital Called</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: red }}>${fmt(totalContributed)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>Distributed</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: green }}>${fmt(totalDistributed)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>Net</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: netCF >= 0 ? green : red }}>{netCF >= 0 ? "+" : "-"}${fmt(Math.abs(netCF))}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Cash Flow History ({cashFlowsList.length} records)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCfModal(true)} style={btnStyle}>Record Cash Flow</button>
          <button onClick={handleRecalculate} disabled={recalculating} style={{ ...btnOutline, opacity: recalculating ? 0.5 : 1 }}>
            {recalculating ? "Recalculating..." : "Recalculate IRR/MOIC"}
          </button>
        </div>
      </div>
      {cashFlowsList.length > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 100px 100px 80px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
            <span>Date</span><span>Investor</span><span>Description</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Type</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {cashFlowsList.map((cf, i) => (
            editingCf === cf.id ? (
              <form key={cf.id} onSubmit={handleSaveEdit} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 100px 100px 80px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", gap: 4, alignItems: "center" }}>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} />
                <span style={{ fontSize: 12 }}>{cf.investorName || `User ${cf.userId}`}</span>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} placeholder="Description" />
                <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }} />
                <select value={editType} onChange={e => setEditType(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 10 }}>
                  <option value="capital_call">Capital Call</option>
                  <option value="distribution">Distribution</option>
                  <option value="return_of_capital">Return of Capital</option>
                  <option value="income">Income</option>
                </select>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <button type="submit" style={{ fontSize: 10, padding: "3px 6px", background: green, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>Save</button>
                  <button type="button" onClick={() => setEditingCf(null)} style={{ fontSize: 10, padding: "3px 6px", background: "#fff", color: "#999", border: "1px solid #DDD", borderRadius: 3, cursor: "pointer" }}>X</button>
                </div>
              </form>
            ) : (
              <div key={cf.id || i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 100px 100px 80px", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
                <span style={{ color: "#999", fontSize: 12 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                <span style={{ fontWeight: 500 }}>{cf.investorName || `User ${cf.userId}`}</span>
                <span style={{ color: "#666" }}>{cf.description || cf.type}</span>
                <span style={{ textAlign: "right", fontWeight: 500, color: cf.amount < 0 ? red : green }}>
                  {cf.amount < 0 ? `-$${fmt(Math.abs(cf.amount))}` : `+$${fmt(cf.amount)}`}
                </span>
                <span style={{ textAlign: "right", fontSize: 11, color: "#999", textTransform: "capitalize" }}>{(cf.type || "").replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <span onClick={() => startEdit(cf)} style={{ fontSize: 11, color: "#666", cursor: "pointer" }}>Edit</span>
                  <span onClick={() => handleDelete(cf.id)} style={{ fontSize: 11, color: red, cursor: "pointer" }}>Del</span>
                </div>
              </div>
            )
          ))}
        </>
      ) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No cash flows recorded</p>}

      {/* Record Cash Flow Modal */}
      {showCfModal && (
        <div onClick={() => setShowCfModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, padding: 32, width: 420, boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Record Cash Flow</h3>
            <form onSubmit={handleRecordCashFlow}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "#888" }}>Investor</label>
                <select value={cfUserId} onChange={e => setCfUserId(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} required>
                  <option value="">Select investor...</option>
                  {(cfInvestors || []).map(inv => <option key={inv.userId} value={inv.userId}>{inv.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "#888" }}>Date</label>
                <input type="date" value={cfDate} onChange={e => setCfDate(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} required />
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#888" }}>Amount ($)</label>
                  <input type="number" step="0.01" value={cfAmount} onChange={e => setCfAmount(e.target.value)} placeholder="e.g. 50000" style={{ ...inputStyle, marginTop: 4 }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#888" }}>Type</label>
                  <select value={cfType} onChange={e => setCfType(e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
                    <option value="capital_call">Capital Call</option>
                    <option value="distribution">Distribution</option>
                    <option value="return_of_capital">Return of Capital</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: "#888" }}>Description</label>
                <input value={cfDesc} onChange={e => setCfDesc(e.target.value)} placeholder="Optional description" style={{ ...inputStyle, marginTop: 4 }} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCfModal(false)} style={btnOutline}>Cancel</button>
                <button type="submit" style={btnStyle}>Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INVESTOR CASH FLOWS SECTION (for investor profile) ───
function InvestorCashFlowsSection({ investorId, investorName, projects, toast }) {
  const [cashFlows, setCashFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => { loadAll(); }, [investorId]);

  async function loadAll() {
    setLoading(true);
    const allFlows = [];
    for (const p of projects) {
      try {
        const flows = await fetchCashFlows(investorId, p.projectId);
        allFlows.push(...flows.map(f => ({ ...f, projectName: p.projectName })));
      } catch (e) { /* skip */ }
    }
    allFlows.sort((a, b) => new Date(a.date) - new Date(b.date));
    setCashFlows(allFlows);
    setLoading(false);
  }

  function startEdit(cf) {
    setEditingId(cf.id);
    setEditDate(new Date(cf.date).toISOString().split("T")[0]);
    setEditAmount(String(Math.abs(cf.amount)));
    setEditType(cf.type);
    setEditDesc(cf.description || "");
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const amountVal = parseFloat(editAmount);
      const finalAmount = editType === "capital_call" ? -Math.abs(amountVal) : Math.abs(amountVal);
      await updateCashFlow(editingId, { date: editDate, amount: finalAmount, type: editType, description: editDesc || null });
      toast("Cash flow updated");
      setEditingId(null);
      loadAll();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this cash flow record?")) return;
    try { await deleteCashFlow(id); toast("Cash flow deleted"); loadAll(); } catch (err) { toast(err.message, "error"); }
  }

  const totalContributed = cashFlows.filter(cf => cf.amount < 0).reduce((s, cf) => s + Math.abs(cf.amount), 0);
  const totalDistributed = cashFlows.filter(cf => cf.amount > 0).reduce((s, cf) => s + cf.amount, 0);

  const section = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  if (loading) return <div style={section}><div style={sectionTitle}>Cash Flows</div><p style={{ color: "#BBB", fontSize: 13 }}>Loading...</p></div>;

  return (
    <div style={section}>
      <div style={sectionTitle}>Cash Flows ({cashFlows.length} records)</div>
      {cashFlows.length > 0 && (
        <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: "10px 14px", background: "#FAFAF8", borderRadius: 4, border: "1px solid #E8E5DE" }}>
          <div><div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Total Contributed</div><div style={{ fontSize: 15, fontWeight: 500, color: red }}>${fmt(totalContributed)}</div></div>
          <div><div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Total Distributed</div><div style={{ fontSize: 15, fontWeight: 500, color: green }}>${fmt(totalDistributed)}</div></div>
        </div>
      )}
      {cashFlows.length > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
            <span>Date</span><span>Project</span><span>Description</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Type</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {cashFlows.map(cf => (
            editingId === cf.id ? (
              <form key={cf.id} onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", padding: "6px 0", borderBottom: "1px solid #F5F3F0", gap: 4, alignItems: "center" }}>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} />
                <span style={{ fontSize: 12 }}>{cf.projectName}</span>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} />
                <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }} />
                <select value={editType} onChange={e => setEditType(e.target.value)} style={{ ...inputStyle, padding: "4px 4px", fontSize: 9 }}>
                  <option value="capital_call">Capital Call</option><option value="distribution">Distribution</option><option value="return_of_capital">Return of Capital</option><option value="income">Income</option>
                </select>
                <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                  <button type="submit" style={{ fontSize: 9, padding: "3px 5px", background: green, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>OK</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 9, padding: "3px 5px", background: "#fff", color: "#999", border: "1px solid #DDD", borderRadius: 3, cursor: "pointer" }}>X</button>
                </div>
              </form>
            ) : (
              <div key={cf.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 12 }}>
                <span style={{ color: "#999", fontSize: 11 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                <span style={{ fontWeight: 500 }}>{cf.projectName}</span>
                <span style={{ color: "#666" }}>{cf.description || cf.type}</span>
                <span style={{ textAlign: "right", fontWeight: 500, color: cf.amount < 0 ? red : green }}>{cf.amount < 0 ? `-$${fmt(Math.abs(cf.amount))}` : `+$${fmt(cf.amount)}`}</span>
                <span style={{ textAlign: "right", fontSize: 10, color: "#999", textTransform: "capitalize" }}>{(cf.type || "").replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <span onClick={() => startEdit(cf)} style={{ fontSize: 11, color: "#666", cursor: "pointer" }}>Edit</span>
                  <span onClick={() => handleDelete(cf.id)} style={{ fontSize: 11, color: red, cursor: "pointer" }}>Del</span>
                </div>
              </div>
            )
          ))}
        </>
      ) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No cash flows</span>}
    </div>
  );
}

// ─── GROUP MANAGER ───
function GroupManager({ toast }) {
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#EA2028");
  const [newParentId, setNewParentId] = useState("");
  const [newTier, setNewTier] = useState("primary");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [addSearch, setAddSearch] = useState("");

  useEffect(() => { loadGroups(); fetchAdminInvestors().then(setInvestors); }, []);
  function loadGroups() { fetchGroups().then(setGroups); }

  // Build tree structure
  const rootGroups = groups.filter(g => !g.parentId);
  const childGroupsOf = (parentId) => groups.filter(g => g.parentId === parentId);
  const totalMembers = (g) => {
    const children = childGroupsOf(g.id);
    return g.memberCount + children.reduce((s, c) => s + (c.memberCount || 0), 0);
  };

  const tierLabels = { primary: "Primary LP", "sub-lp": "Sub-LP", "fund-of-funds": "Fund of Funds" };
  const tierColors = { primary: "#3D7A54", "sub-lp": "#8B7128", "fund-of-funds": "#4466AA" };

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try { await createGroup({ name: newName, color: newColor, parentId: newParentId ? parseInt(newParentId) : null, tier: newTier }); toast("Group created"); setNewName(""); setNewParentId(""); loadGroups(); } catch (e) { toast(e.message, "error"); }
  }

  async function handleDelete(id) {
    try { await deleteGroup(id); toast("Group deleted"); if (selectedGroup === id) { setSelectedGroup(null); setGroupDetail(null); } loadGroups(); } catch (e) { toast(e.message, "error"); }
  }

  async function openGroup(id) {
    setSelectedGroup(id);
    const detail = await fetchGroupDetail(id);
    setGroupDetail(detail);
  }

  async function handleAddMember(userId) {
    try { await addGroupMembers(selectedGroup, [userId]); toast("Member added"); openGroup(selectedGroup); } catch (e) { toast(e.message, "error"); }
  }

  async function handleRemoveMember(userId) {
    try { await removeGroupMember(selectedGroup, userId); toast("Member removed"); openGroup(selectedGroup); } catch (e) { toast(e.message, "error"); }
  }

  const addResults = addSearch.length >= 1 && groupDetail
    ? investors.filter(inv => !groupDetail.members.some(m => m.id === inv.id) && (inv.name.toLowerCase().includes(addSearch.toLowerCase()) || inv.email.toLowerCase().includes(addSearch.toLowerCase())))
    : [];

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 24 }}>Investor Groups</h1>

      {/* Create group */}
      <form onSubmit={handleCreate} style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "#888" }}>Group Name</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Class A LPs" style={inputStyle} required />
        </div>
        <div style={{ width: 140 }}>
          <label style={{ fontSize: 11, color: "#888" }}>Parent Group</label>
          <select value={newParentId} onChange={e => setNewParentId(e.target.value)} style={inputStyle}>
            <option value="">None (top-level)</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div style={{ width: 130 }}>
          <label style={{ fontSize: 11, color: "#888" }}>Tier</label>
          <select value={newTier} onChange={e => setNewTier(e.target.value)} style={inputStyle}>
            <option value="primary">Primary LP</option>
            <option value="sub-lp">Sub-LP</option>
            <option value="fund-of-funds">Fund of Funds</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888" }}>Color</label>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 42, height: 38, border: "1px solid #DDD", borderRadius: 4, cursor: "pointer" }} />
        </div>
        <button type="submit" style={btnStyle}>Create Group</button>
      </form>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Group list */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            {groups.length === 0 ? <div style={{ padding: 20, color: "#999", textAlign: "center", fontSize: 13 }}>No groups yet</div> : (() => {
              const renderGroup = (g, indent = 0) => {
                const children = childGroupsOf(g.id);
                return [
                  <div key={g.id} onClick={() => openGroup(g.id)} style={{
                    padding: "12px 16px", paddingLeft: 16 + indent * 20, borderBottom: "1px solid #F0EDE8",
                    cursor: "pointer", background: selectedGroup === g.id ? "#F8F7F4" : "#fff",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {indent > 0 && <span style={{ color: "#CCC", fontSize: 10 }}>&#x2514;</span>}
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color || "#CCC" }} />
                      <span style={{ fontSize: 13, fontWeight: selectedGroup === g.id ? 500 : 400 }}>{g.name}</span>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${tierColors[g.tier] || "#999"}15`, color: tierColors[g.tier] || "#999" }}>{tierLabels[g.tier] || g.tier}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#999" }}>{totalMembers(g)}</span>
                      <span onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }} style={{ fontSize: 14, color: "#CCC", cursor: "pointer" }}>&times;</span>
                    </div>
                  </div>,
                  ...children.flatMap(c => renderGroup(c, indent + 1)),
                ];
              };
              return rootGroups.flatMap(g => renderGroup(g));
            })()}
          </div>
        </div>

        {/* Group detail */}
        <div style={{ flex: 1 }}>
          {groupDetail ? (
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: groupDetail.color || "#CCC" }} />
                <h2 style={{ fontSize: 18, fontWeight: 500 }}>{groupDetail.name}</h2>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: `${tierColors[groupDetail.tier] || "#999"}15`, color: tierColors[groupDetail.tier] || "#999" }}>{tierLabels[groupDetail.tier] || groupDetail.tier}</span>
                <span style={{ fontSize: 12, color: "#999" }}>{groupDetail.members.length} members</span>
              </div>
              {groupDetail.parent && (
                <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>Parent: <strong onClick={() => openGroup(groupDetail.parent.id)} style={{ cursor: "pointer", color: red }}>{groupDetail.parent.name}</strong></div>
              )}
              {groupDetail.children && groupDetail.children.length > 0 && (
                <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
                  Sub-groups: {groupDetail.children.map((c, i) => (
                    <span key={c.id}><strong onClick={() => openGroup(c.id)} style={{ cursor: "pointer", color: red }}>{c.name}</strong> ({c.memberCount}){i < groupDetail.children.length - 1 ? ", " : ""}</span>
                  ))}
                </div>
              )}

              {/* Add member search */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search investors to add..." style={inputStyle} />
                {addResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8E5DE", borderTop: "none", borderRadius: "0 0 4px 4px", zIndex: 10, maxHeight: 180, overflow: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
                    {addResults.slice(0, 6).map(inv => (
                      <div key={inv.id} onClick={() => { handleAddMember(inv.id); setAddSearch(""); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #F0EDE8" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8F7F4"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <span style={{ fontWeight: 500 }}>{inv.name}</span>
                        <span style={{ color: "#999", marginLeft: 8, fontSize: 12 }}>{inv.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member list */}
              {groupDetail.members.map((m, i) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < groupDetail.members.length - 1 ? "1px solid #F5F3F0" : "none" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: "#999", marginLeft: 10 }}>{m.email}</span>
                  </div>
                  <span onClick={() => handleRemoveMember(m.id)} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Remove</span>
                </div>
              ))}
              {groupDetail.members.length === 0 && <div style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No members — search above to add investors</div>}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Select a group to manage members</div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── STAFF MANAGER ───
function StaffManager({ toast }) {
  const [staff, setStaff] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("ADMIN");

  useEffect(() => { loadStaff(); }, []);
  function loadStaff() { fetchStaff().then(setStaff); }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      const result = await createStaff({ name, email, role });
      toast(`${result.name} added. Temp password: ${result.tempPassword}`);
      setShowAdd(false); setName(""); setEmail(""); loadStaff();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleUpdate(id, data) {
    try { await updateStaff(id, data); toast("Updated"); loadStaff(); } catch (e) { toast(e.message, "error"); }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>Company Staff</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={btnStyle}>{showAdd ? "Cancel" : "Add Staff"}</button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#888" }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="Jane Smith" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#888" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="jane@northstardevelopment.ca" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#888" }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
              <option value="ADMIN">Admin</option>
              <option value="GP">General Partner</option>
            </select>
          </div>
          <button type="submit" style={btnStyle}>Add</button>
        </form>
      )}

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 100px 120px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>
          <span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Actions</span>
        </div>
        {staff.map(s => (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 100px 120px", padding: "14px 20px", borderBottom: "1px solid #F0EDE8", alignItems: "center", fontSize: 13 }}>
            <span style={{ fontWeight: 500 }}>{s.name}</span>
            <span style={{ color: "#666" }}>{s.email}</span>
            <select value={s.role} onChange={e => handleUpdate(s.id, { role: e.target.value })} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}>
              <option value="ADMIN">Admin</option>
              <option value="GP">GP</option>
            </select>
            <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 11, background: s.status === "ACTIVE" ? "#EFE" : "#FEE", color: s.status === "ACTIVE" ? green : red }}>{s.status}</span>
            <button onClick={() => handleUpdate(s.id, { status: s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })} style={{ ...btnOutline, padding: "4px 10px", fontSize: 11 }}>
              {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
        {staff.length === 0 && <div style={{ padding: 24, color: "#999", textAlign: "center" }}>No staff members</div>}
      </div>
    </>
  );
}

// ─── ADMIN INBOX (threads + compose with searchable recipient picker) ───
function SignatureManager({ toast }) {
  const [sigs, setSigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSigs(); }, []);
  async function loadSigs() {
    setLoading(true);
    try { const data = await fetchSignatureRequests(); setSigs(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCancel(id) {
    try { await cancelSignatureRequest(id); toast("Signature request cancelled"); loadSigs(); }
    catch (e) { toast(e.message, "error"); }
  }

  const statusColor = (s) => s === "signed" ? green : s === "pending" ? "#B8860B" : s === "cancelled" ? "#999" : red;
  const statusBg = (s) => s === "signed" ? "#EFE" : s === "pending" ? "#FFF8E1" : s === "cancelled" ? "#F5F5F5" : "#FEE";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 300 }}>Signatures</h1>
          <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{sigs.length} signature requests</p>
        </div>
      </div>
      {loading ? <p style={{ color: "#999" }}>Loading...</p> : sigs.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 40, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", textAlign: "center", color: "#999", fontSize: 13 }}>
          No signature requests yet. Use the Documents section to request signatures.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".06em" }}>
            <span>Document</span><span>Created By</span><span>Signers</span><span>Status</span><span>Actions</span>
          </div>
          {sigs.map((sig, i) => (
            <div key={sig.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px", padding: "14px 20px", borderBottom: i < sigs.length - 1 ? "1px solid #F0EDE8" : "none", fontSize: 13, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{sig.document?.name || sig.subject}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{sig.subject}</div>
              </div>
              <span style={{ color: "#666" }}>{sig.createdBy?.name}</span>
              <div>
                {sig.signers?.map(s => (
                  <div key={s.id} style={{ fontSize: 12, marginBottom: 2 }}>
                    {s.name} <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: statusBg(s.status), color: statusColor(s.status) }}>{s.status}</span>
                  </div>
                ))}
              </div>
              <span style={{ padding: "2px 10px", borderRadius: 3, fontSize: 11, background: statusBg(sig.status), color: statusColor(sig.status), display: "inline-block", width: "fit-content" }}>{sig.status}</span>
              <div>
                {sig.status === "pending" && (
                  <button onClick={() => handleCancel(sig.id)} style={{ ...btnOutline, fontSize: 11, padding: "4px 12px", color: red, borderColor: red }}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── PROSPECT MANAGER ───
function ProspectManager({ toast }) {
  const [prospects, setProspects] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        fetchProspects(filterStatus !== "all" ? { status: filterStatus } : {}),
        fetchProspectStats(),
      ]);
      setProspects(list);
      setStats(s);
    } catch (err) {
      toast("Failed to load prospects: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus]);

  async function handleStatusChange(id, newStatus) {
    try {
      await updateProspectStatus(id, newStatus);
      toast("Prospect status updated", "success");
      load();
    } catch (err) {
      toast("Failed to update: " + err.message, "error");
    }
  }

  const statusColors = {
    new: "#2563EB", contacted: "#8B7128", qualified: green, converted: "#7C3AED", declined: "#999",
  };

  if (loading && !prospects.length) return <div style={{ padding: 40, color: "#999", textAlign: "center" }}>Loading prospects...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 400, color: darkText }}>Prospect Leads</h2>
      </div>

      {/* Stats Badges */}
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All", count: stats.total },
            { key: "new", label: "New", count: stats.new, color: "#2563EB" },
            { key: "contacted", label: "Contacted", count: stats.contacted, color: "#8B7128" },
            { key: "qualified", label: "Qualified", count: stats.qualified, color: green },
            { key: "converted", label: "Converted", count: stats.converted, color: "#7C3AED" },
            { key: "declined", label: "Declined", count: stats.declined, color: "#999" },
          ].map(s => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{
              padding: "6px 14px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans,
              display: "flex", alignItems: "center", gap: 6,
              background: filterStatus === s.key ? (s.color || darkText) : "#fff",
              color: filterStatus === s.key ? "#fff" : (s.color || darkText),
              border: `1px solid ${filterStatus === s.key ? "transparent" : "#DDD"}`,
              fontWeight: filterStatus === s.key ? 500 : 400,
            }}>
              {s.label}
              <span style={{
                padding: "1px 6px", borderRadius: 8, fontSize: 10,
                background: filterStatus === s.key ? "rgba(255,255,255,.25)" : `${s.color || darkText}15`,
                color: filterStatus === s.key ? "#fff" : (s.color || darkText),
              }}>{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E5DE" }}>
              {["Name", "Email", "Interest Range", "Project", "Status", "Date"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prospects.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#999" }}>No prospects found</td></tr>
            )}
            {prospects.map(p => (
              <>
                <tr key={p.id} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={{
                  borderBottom: "1px solid #F0EDEA", cursor: "pointer", transition: "background .1s",
                }} onMouseEnter={e => e.currentTarget.style.background = "#FAFAF8"}
                   onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: darkText }}>{p.name}</td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>{p.email}</td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>{p.investmentRange || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>{p.interestedProject?.name || "General"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 3,
                      background: `${statusColors[p.status] || "#999"}15`,
                      color: statusColors[p.status] || "#999",
                      fontWeight: 500, textTransform: "capitalize",
                    }}>{p.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#999", fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
                {expandedId === p.id && (
                  <tr key={`${p.id}-detail`}>
                    <td colSpan={6} style={{ padding: "16px 24px", background: "#FAFAF8", borderBottom: "1px solid #E8E5DE" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Phone</span><span style={{ fontSize: 13, color: darkText }}>{p.phone || "Not provided"}</span></div>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Entity Type</span><span style={{ fontSize: 13, color: darkText }}>{p.entityType || "Not specified"}</span></div>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Accreditation</span><span style={{ fontSize: 13, color: darkText }}>{p.accreditationStatus || "Not specified"}</span></div>
                      </div>
                      {p.message && (
                        <div style={{ marginBottom: 16 }}>
                          <span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Message</span>
                          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, background: "#fff", padding: "12px 16px", borderRadius: 4, border: "1px solid #E8E5DE" }}>{p.message}</p>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "#888" }}>Update status:</span>
                        <select value={p.status} onChange={e => handleStatusChange(p.id, e.target.value)} style={{
                          padding: "6px 12px", border: "1px solid #DDD", borderRadius: 4, fontSize: 12, fontFamily: sans,
                        }}>
                          {["new", "contacted", "qualified", "converted", "declined"].map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
              <div key={m.id} style={{ background: "#fff", border: `1px solid ${isInvestor ? "#ECEAE5" : "#DDE8DD"}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.03)", marginLeft: isInvestor ? 0 : 40, marginRight: isInvestor ? 40 : 0 }}>
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
        <div style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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
        <form onSubmit={handleCompose} style={{ background: "#fff", borderRadius: 12, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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

// ─── AUDIT LOG VIEWER ───
function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState("all");

  const actionTypes = ["all", "login", "logout", "document_download", "document_upload", "signature_request", "signature_sign", "profile_update", "investor_invite", "project_update", "cash_flow_record", "prospect_submit"];

  function loadLogs() {
    setLoading(true); setError(null);
    const params = {};
    if (actionFilter !== "all") params.action = actionFilter;
    fetchAuditLog(params).then(setLogs).catch(e => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => { loadLogs(); }, [actionFilter]);

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 24 }}>Audit Log</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Compliance log of key system actions. Last 100 entries shown.</p>

      {/* Filter by action */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {actionTypes.map(a => (
          <span key={a} onClick={() => setActionFilter(a)} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer",
            border: `1px solid ${actionFilter === a ? red + "55" : "#DDD"}`,
            color: actionFilter === a ? red : "#999",
            background: actionFilter === a ? `${red}08` : "#fff",
          }}>{a.replace(/_/g, " ")}</span>
        ))}
      </div>

      {error && <AdminError message={error} onRetry={loadLogs} />}
      {loading ? <AdminSpinner /> : logs.length === 0 ? (
        <AdminEmpty title="No audit log entries" subtitle="Actions will appear here as users interact with the system." />
      ) : (
        <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E5DE" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "#999" }}>Timestamp</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "#999" }}>User</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "#999" }}>Action</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "#999" }}>Resource</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "#999" }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? "1px solid #E8E5DE" : "none" }}>
                  <td style={{ padding: "10px 14px", color: "#999", whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{log.user}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 3,
                      background: log.action === "login" ? `${green}15` : log.action.includes("download") ? "#EEF" : `${red}08`,
                      color: log.action === "login" ? green : log.action.includes("download") ? "#44A" : "#666",
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>{log.action.replace(/_/g, " ")}</span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#999" }}>{log.resource || "\u2014"}</td>
                  <td style={{ padding: "10px 14px", color: "#CCC", fontSize: 11 }}>{log.ipAddress || "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
