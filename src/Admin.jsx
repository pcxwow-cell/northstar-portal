import { useState, useEffect } from "react";
import { fetchDashboard, fetchAdminProjects, updateProject, postUpdate, fetchAdminInvestors, sendMessage, uploadDocument, inviteInvestor, updateInvestor, approveInvestor, deactivateInvestor, resetInvestorPassword, assignInvestorProject, updateInvestorKPI, fetchThreads, fetchThread, createThread, replyToThread, fetchInvestorProfile, fetchGroups, createGroup, updateGroup, deleteGroup, fetchGroupDetail, addGroupMembers, removeGroupMember, fetchStaff, createStaff, updateStaff, fetchAdminDocuments, fetchAdminDocumentDetail, fetchAdminProjectDetail, updateWaterfall, fetchSignatureRequests, createSignatureRequest, cancelSignatureRequest, fetchProspects, updateProspectStatus, fetchProspectStats, fmt, fmtCurrency } from "./api.js";

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
    { id: "documents", label: "Documents" },
    { id: "signatures", label: "Signatures" },
    { id: "groups", label: "Groups" },
    { id: "staff", label: "Staff" },
    { id: "prospects", label: "Prospects" },
    { id: "inbox", label: "Inbox" },
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
function ProjectManager({ toast, onViewProject }) {
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

  useEffect(() => { load(); }, [projectId]);
  async function load() { fetchAdminProjectDetail(projectId).then(setProject); }

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

  const section = { background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px", marginBottom: 16 };
  const tabs = ["overview", "investors", "documents", "updates", "waterfall"];

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
          <div key={i} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "16px 20px" }}>
            <div style={{ fontSize: 22, fontWeight: 300, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E8E5DE", marginBottom: 20 }}>
        {tabs.map(t => (
          <span key={t} onClick={() => setTab(t)} style={{
            fontSize: 13, padding: "10px 20px", cursor: "pointer", textTransform: "capitalize",
            color: tab === t ? darkText : "#999", fontWeight: tab === t ? 500 : 400,
            borderBottom: tab === t ? `2px solid ${red}` : "2px solid transparent",
          }}>{t}</span>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div style={section}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#888" }}>Description</label>
            <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6, marginTop: 4 }}>{project.description}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
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
        </div>
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
      {tab === "updates" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Post a construction update..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={handlePostUpdate} style={btnStyle}>Post</button>
          </div>
          <div style={section}>
            {project.updates.length > 0 ? project.updates.map((u, i) => (
              <div key={u.id} style={{ padding: "12px 0", borderBottom: i < project.updates.length - 1 ? "1px solid #F5F3F0" : "none" }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{u.date}</div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{u.text}</div>
              </div>
            )) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No updates posted</p>}
          </div>
        </>
      )}

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
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 6, padding: "28px 24px", maxWidth: 480, width: "90%", maxHeight: "70vh", overflow: "auto" }}>
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
        <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
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
        <form onSubmit={handleUpload} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "28px 24px", maxWidth: 520 }}>
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
        <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
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
  useEffect(() => { fetchInvestorProfile(investorId).then(setProfile); }, [investorId]);
  if (!profile) return <p style={{ color: "#999" }}>Loading...</p>;

  const section = { background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px", marginBottom: 16 };
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

      {/* Projects + KPIs */}
      <div style={section}>
        <div style={sectionTitle}>Project Investments</div>
        {profile.projects.length > 0 ? profile.projects.map(p => (
          <div key={p.projectId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F0EDE8" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.projectName}</div>
              <div style={{ fontSize: 11, color: "#999" }}>{p.projectStatus}</div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#666" }}>
              <span>${fmt(p.committed)} committed</span>
              <span>${fmt(p.currentValue)} value</span>
              <span>{p.irr}% IRR</span>
              <span>{p.moic}x MOIC</span>
            </div>
          </div>
        )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No project assignments</span>}
      </div>

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

// ─── GROUP MANAGER ───
function GroupManager({ toast }) {
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#EA2028");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [addSearch, setAddSearch] = useState("");

  useEffect(() => { loadGroups(); fetchAdminInvestors().then(setInvestors); }, []);
  function loadGroups() { fetchGroups().then(setGroups); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try { await createGroup({ name: newName, color: newColor }); toast("Group created"); setNewName(""); loadGroups(); } catch (e) { toast(e.message, "error"); }
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
      <form onSubmit={handleCreate} style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "#888" }}>Group Name</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Class A LPs" style={inputStyle} required />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888" }}>Color</label>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 42, height: 38, border: "1px solid #DDD", borderRadius: 4, cursor: "pointer" }} />
        </div>
        <button type="submit" style={btnStyle}>Create Group</button>
      </form>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Group list */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
            {groups.length === 0 ? <div style={{ padding: 20, color: "#999", textAlign: "center", fontSize: 13 }}>No groups yet</div> : groups.map((g, i) => (
              <div key={g.id} onClick={() => openGroup(g.id)} style={{
                padding: "14px 16px", borderBottom: i < groups.length - 1 ? "1px solid #F0EDE8" : "none",
                cursor: "pointer", background: selectedGroup === g.id ? "#F8F7F4" : "#fff",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color || "#CCC" }} />
                  <span style={{ fontSize: 14, fontWeight: selectedGroup === g.id ? 500 : 400 }}>{g.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#999" }}>{g.memberCount}</span>
                  <span onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }} style={{ fontSize: 14, color: "#CCC", cursor: "pointer" }}>&times;</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group detail */}
        <div style={{ flex: 1 }}>
          {groupDetail ? (
            <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: groupDetail.color || "#CCC" }} />
                <h2 style={{ fontSize: 18, fontWeight: 500 }}>{groupDetail.name}</h2>
                <span style={{ fontSize: 12, color: "#999" }}>{groupDetail.members.length} members</span>
              </div>

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
        <form onSubmit={handleAdd} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
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

      <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
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
        <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: 40, textAlign: "center", color: "#999", fontSize: 13 }}>
          No signature requests yet. Use the Documents section to request signatures.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
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
      <div style={{ border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
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
