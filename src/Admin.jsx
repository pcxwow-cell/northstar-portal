import { useState, useEffect } from "react";
import { useToast } from "./context/ToastContext.jsx";
import { AdminDataProvider, useAdminData } from "./context/AdminDataContext.jsx";
import Spinner from "./components/Spinner.jsx";
import EmptyState from "./components/EmptyState.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import { fetchDashboard, fetchAdminProjects, updateProject, postUpdate, fetchAdminInvestors, uploadDocument, bulkUploadK1, inviteInvestor, updateInvestor, approveInvestor, deactivateInvestor, resetInvestorPassword, assignInvestorProject, updateInvestorKPI, fetchThreads, fetchThread, createThread, replyToThread, fetchInvestorProfile, fetchGroups, createGroup, updateGroup, deleteGroup, fetchGroupDetail, addGroupMembers, removeGroupMember, fetchStaff, createStaff, updateStaff, deactivateStaff, reactivateStaff, resetStaffPassword, fetchAdminDocuments, fetchAdminDocumentDetail, fetchAdminProjectDetail, updateWaterfall, fetchSignatureRequests, createSignatureRequest, cancelSignatureRequest, fetchProspects, updateProspectStatus, fetchProspectStats, fetchCashFlows, recordCashFlow, recalculateProject, fetchAuditLog, createProject, deleteProject, deleteDocument, assignDocument, fetchEntities, createEntity, updateEntity, deleteEntity, runFinancialModel, updateCashFlow, deleteCashFlow, fetchProjectCashFlows, fetchUserFlags, updateUserFlags, fetchFeatureDefaults, fmt, fmtCurrency, fetchEmailSettings, updateEmailSettings, sendTestEmail, fetchEmailLog, fetchEmailStats, unlockInvestor, createCapTableEntry, updateCapTableEntry, deleteCapTableEntry, createWaterfallTier, updateWaterfallTier, deleteWaterfallTier, recordBulkDistribution } from "./api.js";

import { colors, fonts, inputStyle, btnStyle, btnOutline, shadows, radius, labelStyle } from "./styles/theme.js";
import Button from "./components/Button.jsx";
import Card from "./components/Card.jsx";
import FormInput from "./components/FormInput.jsx";
import Modal from "./components/Modal.jsx";


// ─── SORTABLE HEADER ───
function SortableHeader({ columns, sortBy, sortDir, onSort }) {
  return columns.map(col => (
    <span key={col.key} onClick={() => onSort(col.key)} style={{
      fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText,
      cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4,
    }}>
      {col.label}
      {sortBy === col.key && <span style={{ fontSize: 8 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
    </span>
  ));
}

// ─── SEARCH BOX ───
function SearchBox({ value, onChange, placeholder = "Search..." }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: "8px 14px", border: "1px solid #DDD", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', fonts.sans-serif", width: 260, boxSizing: "border-box" }} />
  );
}

// ─── SORTABLE HOOK ───
function useSortable(defaultSort = "", defaultDir = "asc") {
  const [sortBy, setSortBy] = useState(defaultSort);
  const [sortDir, setSortDir] = useState(defaultDir);
  function onSort(key) {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  }
  function sortData(data) {
    if (!sortBy) return data;
    return [...data].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }
  return { sortBy, sortDir, onSort, sortData };
}

// ─── PEOPLE SECTION (consolidated: Investors + Groups + Staff) ───
function PeopleSection({ profileId, setProfileId, peopleTab, setPeopleTab, toast }) {
  const subTabs = [
    { id: "investors", label: "Investors" },
    { id: "groups", label: "Groups" },
    { id: "staff", label: "Staff" },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>People</h1>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: colors.lightBorder, borderRadius: 8, padding: 3, width: "fit-content" }}>
        {subTabs.map(t => (
          <span key={t.id} onClick={() => { setPeopleTab(t.id); setProfileId(null); }} style={{
            fontSize: 13, padding: "8px 20px", cursor: "pointer",
            color: peopleTab === t.id ? "#1A1816" : "#888", fontWeight: peopleTab === t.id ? 500 : 400,
            background: peopleTab === t.id ? colors.white : "transparent",
            borderRadius: 6, boxShadow: peopleTab === t.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            transition: "all .15s",
          }}>{t.label}</span>
        ))}
      </div>
      {peopleTab === "investors" && (
        profileId
          ? <InvestorProfile investorId={profileId} onBack={() => setProfileId(null)} toast={toast} />
          : <InvestorManager toast={toast} onViewProfile={(id) => setProfileId(id)} hideHeader />
      )}
      {peopleTab === "groups" && <GroupManager toast={toast} hideHeader />}
      {peopleTab === "staff" && <StaffManager toast={toast} hideHeader />}
    </>
  );
}

// ─── DOCUMENTS SECTION (consolidated: Documents + Signatures) ───
function DocumentsSection({ docsTab, setDocsTab, toast }) {
  const subTabs = [
    { id: "documents", label: "All Documents" },
    { id: "signatures", label: "Signatures" },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>Documents</h1>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: colors.lightBorder, borderRadius: 8, padding: 3, width: "fit-content" }}>
        {subTabs.map(t => (
          <span key={t.id} onClick={() => setDocsTab(t.id)} style={{
            fontSize: 13, padding: "8px 20px", cursor: "pointer",
            color: docsTab === t.id ? "#1A1816" : "#888", fontWeight: docsTab === t.id ? 500 : 400,
            background: docsTab === t.id ? colors.white : "transparent",
            borderRadius: 6, boxShadow: docsTab === t.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            transition: "all .15s",
          }}>{t.label}</span>
        ))}
      </div>
      {docsTab === "documents" && <DocumentManager toast={toast} hideHeader />}
      {docsTab === "signatures" && <SignatureManager toast={toast} hideHeader />}
    </>
  );
}

export default function AdminPanel({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const toast = useToast();

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "Projects" },
    { id: "people", label: "People" },
    { id: "documents", label: "Documents" },
    { id: "prospects", label: "Prospects" },
    { id: "statements", label: "Statements" },
    { id: "inbox", label: "Inbox" },
    { id: "audit", label: "Audit Log" },
    { id: "settings", label: "Settings" },
  ];

  // Sub-view navigation
  const [profileId, setProfileId] = useState(null);
  const [projectDetailId, setProjectDetailId] = useState(null);
  const [peopleTab, setPeopleTab] = useState("investors");
  const [docsTab, setDocsTab] = useState("documents");

  const pages = {
    dashboard: <Dashboard onNavigate={(v) => {
      if (v === "investors") { setView("people"); setPeopleTab("investors"); }
      else if (v === "documents") { setView("documents"); setDocsTab("documents"); }
      else setView(v);
    }} />,
    projects: projectDetailId
      ? <ProjectDetail projectId={projectDetailId} onBack={() => setProjectDetailId(null)} toast={toast} />
      : <ProjectManager toast={toast} onViewProject={(id) => setProjectDetailId(id)} />,
    people: <PeopleSection profileId={profileId} setProfileId={setProfileId} peopleTab={peopleTab} setPeopleTab={setPeopleTab} toast={toast} />,
    documents: <DocumentsSection docsTab={docsTab} setDocsTab={setDocsTab} toast={toast} />,
    prospects: <ProspectManager toast={toast} />,
    statements: <StatementManager toast={toast} />,
    inbox: <AdminInbox user={user} toast={toast} />,
    audit: <AuditLogViewer />,
    settings: <EmailSettingsManager toast={toast} />,
  };

  return (
    <AdminDataProvider>
    <div style={{ fontFamily: fonts.sans, color: colors.darkText, minHeight: "100vh", background: "#F8F7F4" }}>
      <style>{`
        *:focus-visible { outline: 2px solid #EA2028; outline-offset: 2px; border-radius: 4px; }
        button:active { transform: scale(0.97); }
        button { transition: transform .1s ease; }

        .admin-header { padding: 0 32px; }
        .admin-nav { padding: 8px 32px; flex-wrap: nowrap; }
        .admin-main { padding: 32px; }
        .admin-user-name { display: inline; }

        @media (max-width: 900px) {
          .admin-header { padding: 0 16px; }
          .admin-nav { padding: 6px 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .admin-main { padding: 20px 16px; }
          .admin-user-name { display: none; }
          .admin-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .admin-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .admin-table-scroll > div { min-width: 600px; }
          .admin-detail-grid { grid-template-columns: 1fr !important; }
          .admin-form-row { flex-direction: column !important; }
          .admin-form-row > div { width: 100% !important; }
          .admin-perm-grid { grid-template-columns: 1fr !important; }
          h1 { font-size: 22px !important; }
        }

        @media (max-width: 600px) {
          .admin-header { padding: 0 12px; }
          .admin-nav { padding: 4px 8px; gap: 2px !important; }
          .admin-nav span { font-size: 11px !important; padding: 6px 10px !important; }
          .admin-main { padding: 16px 12px; }
          .admin-stat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <header className="admin-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, background: colors.white, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 24, background: colors.red, borderRadius: 4 }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".08em" }}>NORTHSTAR</span>
          <span style={{ fontSize: 11, padding: "2px 8px", background: "#FEE", borderRadius: 20, color: colors.red, fontWeight: 500 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="admin-user-name" style={{ fontSize: 13, color: "#666" }}>{user.name}</span>
          <Button onClick={onLogout} aria-label="Sign out of admin panel" variant="outline" style={{ fontSize: 12, borderRadius: 6 }}>Sign Out</Button>
        </div>
      </header>
      <nav className="admin-nav" role="navigation" aria-label="Admin navigation" style={{ display: "flex", gap: 4, background: colors.white, borderBottom: "1px solid #ECEAE5" }}>
        {navItems.map(n => (
          <span key={n.id} role="link" tabIndex={0} aria-current={view === n.id ? "page" : undefined} onClick={() => setView(n.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setView(n.id); } }} style={{
            fontSize: 13, padding: "8px 16px", cursor: "pointer",
            color: view === n.id ? colors.red : "#888",
            background: view === n.id ? "#EA20280D" : "transparent",
            borderRadius: 6,
            fontWeight: view === n.id ? 500 : 400,
            transition: "all .15s",
          }}
            onMouseEnter={e => { if (view !== n.id) e.currentTarget.style.background = colors.lightBorder; }}
            onMouseLeave={e => { if (view !== n.id) e.currentTarget.style.background = "transparent"; }}>{n.label}</span>
        ))}
      </nav>
      <main className="admin-main" role="main" aria-label="Admin content" style={{ maxWidth: 1000, margin: "0 auto" }}>{pages[view]}</main>
    </div>
    </AdminDataProvider>
  );
}

// ─── DASHBOARD ───
function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [pendingInvestors, setPendingInvestors] = useState([]);
  const [signatureRequests, setSignatureRequests] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  useEffect(() => {
    fetchDashboard().then(setData).catch(e => setError(e.message));
    // Fetch pending actions data in parallel
    Promise.allSettled([
      fetchAdminInvestors({ status: "PENDING" }),
      fetchSignatureRequests(),
      fetchAuditLog(),
    ]).then(([invResult, sigResult, auditResult]) => {
      if (invResult.status === "fulfilled") {
        const inv = invResult.value;
        setPendingInvestors(Array.isArray(inv) ? inv : inv.investors || []);
      }
      if (sigResult.status === "fulfilled") {
        const sigs = Array.isArray(sigResult.value) ? sigResult.value : sigResult.value?.requests || [];
        setSignatureRequests(sigs);
      }
      if (auditResult.status === "fulfilled") {
        const logs = Array.isArray(auditResult.value) ? auditResult.value : auditResult.value?.entries || [];
        setAuditLog(logs.slice(0, 10));
      }
      setPendingLoading(false);
    });
  }, []);

  async function handleQuickApprove(id) {
    try {
      await approveInvestor(id);
      setPendingInvestors(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  }
  async function handleQuickReject(id) {
    try {
      await deactivateInvestor(id);
      setPendingInvestors(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  }

  if (error) return <AdminError message={error} onRetry={() => { setError(null); fetchDashboard().then(setData).catch(e => setError(e.message)); }} />;
  if (!data) return <Spinner />;

  const statCards = [
    { label: "Projects", value: data.projectCount, accent: colors.red, nav: "projects" },
    { label: "Investors", value: data.investorCount, accent: colors.green, nav: "investors" },
    { label: "Documents", value: data.docCount, accent: "#D4A574", nav: "documents" },
    { label: "Unread Messages", value: data.unreadMessages, accent: "#5B8DEF", nav: "inbox" },
  ];

  const pendingSigs = signatureRequests.filter(s => s.status === "pending" || s.status === "sent");
  const cardShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)";

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Admin Dashboard</h1>

      {/* Stat Cards */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {statCards.map((s, i) => (
          <Card key={i} accent={s.accent} style={{ transition: "transform .15s, box-shadow .15s", cursor: "pointer" }}
            onClick={() => onNavigate(s.nav)}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"; e.currentTarget.style.background = colors.cardBg; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = cardShadow; e.currentTarget.style.background = colors.white; }}>
            <div style={{ fontSize: 28, fontWeight: 300, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Pending Actions */}
      <Card padding="24px 28px" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          Pending Actions
          {!pendingLoading && (pendingInvestors.length + pendingSigs.length) > 0 && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${colors.red}15`, color: colors.red, fontWeight: 600 }}>
              {pendingInvestors.length + pendingSigs.length}
            </span>
          )}
        </h2>
        {pendingLoading ? (
          <div style={{ padding: "12px 0", fontSize: 13, color: colors.mutedText }}>Checking for pending items...</div>
        ) : (pendingInvestors.length === 0 && pendingSigs.length === 0) ? (
          <div style={{ padding: "12px 0", fontSize: 13, color: colors.mutedText }}>No pending actions. You are all caught up.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Pending Investors */}
            {pendingInvestors.length > 0 && (
              <div style={{ border: `1px solid ${colors.lightBorder}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: colors.cardBg, fontSize: 12, fontWeight: 500, color: colors.mutedText, borderBottom: `1px solid ${colors.lightBorder}` }}>
                  Investors Awaiting Approval ({pendingInvestors.length})
                </div>
                {pendingInvestors.map(inv => (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #F8F7F4", fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{inv.name}</span>
                      <span style={{ color: colors.mutedText, marginLeft: 8 }}>{inv.email}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button onClick={() => handleQuickApprove(inv.id)} style={{ padding: "4px 12px", fontSize: 11, background: colors.green }}>Approve</Button>
                      <Button onClick={() => handleQuickReject(inv.id)} variant="outline" style={{ padding: "4px 12px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Pending Signatures */}
            {pendingSigs.length > 0 && (
              <div style={{ border: `1px solid ${colors.lightBorder}`, borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{pendingSigs.length}</span> document{pendingSigs.length !== 1 ? "s" : ""} awaiting signature
                </div>
                <Button onClick={() => onNavigate("documents")} variant="outline" style={{ padding: "4px 12px", fontSize: 11 }}>Review</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Invite Investor", icon: "+", nav: "investors", accent: colors.green },
          { label: "Upload Document", icon: "\u2191", nav: "documents", accent: "#D4A574" },
          { label: "Post Update", icon: "\u270E", nav: "projects", accent: colors.red },
          { label: "Record Distribution", icon: "$", nav: "projects", accent: "#5B8DEF" },
        ].map((a, i) => (
          <Button key={i} onClick={() => onNavigate(a.nav)} style={{
            background: colors.white, border: "1px solid #ECEAE5", borderRadius: 10, padding: "16px 20px",
            fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, color: colors.darkText,
            display: "flex", alignItems: "center", gap: 10, transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = a.accent; e.currentTarget.style.background = colors.cardBg; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECEAE5"; e.currentTarget.style.background = colors.white; }}>
            <span style={{ width: 28, height: 28, borderRadius: 6, background: `${a.accent}15`, color: a.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600 }}>{a.icon}</span>
            {a.label}
          </Button>
        ))}
      </div>

      {/* Recent Activity Timeline */}
      <Card padding="24px 28px" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Recent Activity</h2>
        {auditLog.length === 0 ? (
          <div style={{ fontSize: 13, color: colors.mutedText, padding: "8px 0" }}>No recent activity recorded.</div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 24 }}>
            {/* Timeline line */}
            <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: "#ECEAE5" }} />
            {auditLog.map((entry, i) => (
              <div key={entry.id || i} style={{ position: "relative", paddingBottom: i < auditLog.length - 1 ? 16 : 0, fontSize: 13 }}>
                {/* Timeline dot */}
                <div style={{ position: "absolute", left: -20, top: 5, width: 10, height: 10, borderRadius: "50%", background: colors.white, border: `2px solid ${colors.red}`, zIndex: 1 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{entry.action || entry.type}</span>
                    {entry.userName && <span style={{ color: colors.mutedText }}> by {entry.userName}</span>}
                    {entry.resource && <span style={{ color: colors.mutedText }}> on {entry.resource}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: "#AAA", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : entry.date || ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Documents */}
      <Card padding="24px 28px">
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Recent Documents</h2>
        {data.recentDocs.length === 0 ? (
          <div style={{ fontSize: 13, color: colors.mutedText }}>No recent documents.</div>
        ) : (
          data.recentDocs.map((d, i) => (
            <div key={d.id} style={{ padding: "10px 0", borderBottom: i < data.recentDocs.length - 1 ? `1px solid ${colors.lightBorder}` : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{d.name}</span>
              <span style={{ color: colors.mutedText }}>{d.project?.name || "General"} · {d.date}</span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

// ─── PROJECT MANAGER ───
function ProjectManager({ toast, onViewProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [cpForm, setCpForm] = useState({ name: "", location: "", type: "Residential", status: "Pre-Development", description: "", sqft: "", units: "", totalRaise: "", estimatedCompletion: "", unitsSold: "", revenue: "", prefReturnPct: "8", gpCatchupPct: "100", carryPct: "20" });

  function reload() { setLoading(true); fetchAdminProjects().then(setProjects).finally(() => setLoading(false)); }
  useEffect(() => { reload(); }, []);

  const filteredProjects = projects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.name || "").toLowerCase().includes(q) || (p.location || "").toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
  function handleDeleteProject(id, name) {
    setConfirmAction({
      title: "Delete Project",
      message: `Delete project "${name}"? This will permanently remove all related data (investors, documents, distributions, etc). This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setConfirmAction(null);
        try { await deleteProject(id); toast(`Project "${name}" deleted`); reload(); } catch (e) { toast(e.message, "error"); }
      },
    });
  }

  if (loading && projects.length === 0) return <Spinner />;

  return (
    <>
      {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>Projects</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create Project"}</Button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or location..." style={{ ...inputStyle, flex: 1 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
          <option value="">All Statuses</option>
          <option value="Pre-Development">Pre-Development</option>
          <option value="Under Construction">Under Construction</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Create Project Form */}
      {showCreate && (
        <form onSubmit={handleCreateProject} style={{ background: colors.white, borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24 }}>
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
          <Button type="submit">Create Project</Button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredProjects.length === 0 && !loading && (
          <EmptyState title="No projects found" subtitle={search || statusFilter ? "Try adjusting your search or filter." : "Create your first project to get started."} />
        )}
        {filteredProjects.map(p => {
          // Project thumbnail from Northstar's actual images
          const thumbs = {
            "Porthaven": "https://northstardevelopment.ca/public/images/porthaven-1.jpg",
            "Livy": "https://northstardevelopment.ca/public/images/livy-2.jpeg",
            "Estrella": "https://northstardevelopment.ca/public/images/estrella-1.jpg",
            "Panorama B6": "https://northstardevelopment.ca/public/images/panorama-1.jpg",
          };
          const thumb = thumbs[p.name] || null;
          const statusColor = p.status === "Completed" ? colors.green : p.status === "Under Construction" ? "#B8860B" : "#666";
          const statusBg = p.status === "Completed" ? "#EFE" : p.status === "Under Construction" ? "#FFF8E1" : "#F5F5F5";

          return (
          <Card key={p.id} padding="0" style={{ overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s, transform .15s" }}
            onClick={() => onViewProject?.(p.id)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ display: "flex" }}>
              {/* Thumbnail */}
              {thumb && (
                <div style={{ width: 120, minHeight: 100, flexShrink: 0, backgroundImage: `url(${thumb})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              )}
              {!thumb && (
                <div style={{ width: 120, minHeight: 100, flexShrink: 0, background: `linear-gradient(135deg, ${colors.red}15, ${colors.red}05)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 32, fontWeight: 300, color: `${colors.red}40` }}>{p.name?.[0] || "P"}</span>
                </div>
              )}
              <div style={{ flex: 1, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: colors.mutedText, marginTop: 2 }}>{p.location}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: statusBg, color: statusColor, fontWeight: 500 }}>{p.status}</span>
                    <Button onClick={(e) => { e.stopPropagation(); setEditing(editing === p.id ? null : p.id); }} variant="outline" style={{ padding: "4px 12px", fontSize: 11 }}>{editing === p.id ? "Close" : "Quick Edit"}</Button>
                    <Button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id, p.name); }} variant="outline" style={{ padding: "4px 12px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Delete</Button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                  <span>{p.investorCount} investors</span>
                  <span>{p.docCount} documents</span>
                  <span>Completion: <strong style={{ color: colors.darkText }}>{p.completion}%</strong></span>
                  <span>Raise: <strong style={{ color: colors.darkText }}>{fmtCurrency(p.totalRaise)}</strong></span>
                </div>
              </div>
            </div>
            {editing === p.id && (
              <div style={{ padding: "16px 20px", borderTop: `1px solid ${colors.lightBorder}` }} onClick={e => e.stopPropagation()}>
                <div className="admin-form-row" style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <select value={p.status} onChange={e => handleSave(p.id, "status", e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                    <option>Pre-Development</option><option>Under Construction</option><option>Completed</option>
                  </select>
                  <input type="number" min="0" max="100" value={p.completion} onChange={e => handleSave(p.id, "completionPct", parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: 80 }} placeholder="%" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Post a construction update..." style={{ ...inputStyle, flex: 1 }} />
                  <Button onClick={() => handlePostUpdate(p.id)}>Post</Button>
                </div>
              </div>
            )}
          </Card>
        );
        })}
      </div>
    </>
  );
}

// ─── INVESTOR MANAGER (search, filter, sort, invite, edit, KPI editing) ───
// ─── CREDENTIAL DIALOG (persistent, copyable) ───
function CredentialDialog({ name, email, tempPassword, onClose }) {
  const [copied, setCopied] = useState(false);
  const copyText = `Email: ${email}\nTemporary Password: ${tempPassword}`;
  function handleCopy() {
    navigator.clipboard.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <Modal open={true} onClose={onClose} title="Investor Created" maxWidth={440}>
      <p style={{ fontSize: 13, color: colors.mutedText, marginBottom: 20 }}>Save these credentials — the password cannot be retrieved later.</p>
      <div style={{ background: colors.cardBg, border: "1px solid #ECEAE5", borderRadius: 8, padding: "16px 20px", marginBottom: 20, fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
        <div><span style={{ color: "#999" }}>Name:</span> <strong>{name}</strong></div>
        <div><span style={{ color: "#999" }}>Email:</span> <strong>{email}</strong></div>
        <div><span style={{ color: "#999" }}>Password:</span> <strong style={{ color: colors.red }}>{tempPassword}</strong></div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleCopy} style={{ flex: 1, padding: "10px", background: copied ? colors.green : colors.red, color: colors.white, border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
          {copied ? "✓ Copied!" : "Copy Credentials"}
        </button>
        <button onClick={onClose} style={{ padding: "10px 20px", background: "#F5F3EF", border: "1px solid #ECEAE5", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#666" }}>
          Close
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#AAA", marginTop: 12 }}>A welcome email has been sent to {email}.</p>
    </Modal>
  );
}

function InvestorManager({ toast, onViewProfile, hideHeader }) {
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
  const [invLoading, setInvLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);

  function reload() {
    setInvLoading(true);
    fetchAdminInvestors({ search, status: statusFilter, projectId: projectFilter, sortBy, sortDir }).then(setInvestors).finally(() => setInvLoading(false));
  }
  useEffect(() => { reload(); }, [search, statusFilter, projectFilter, sortBy, sortDir]);
  useEffect(() => { fetchAdminProjects().then(setProjects); }, []);

  const [credentialDialog, setCredentialDialog] = useState(null);

  async function handleInvite(e) {
    e.preventDefault();
    try {
      const result = await inviteInvestor({ name: inviteName, email: inviteEmail });
      setCredentialDialog({ name: result.name, email: inviteEmail, tempPassword: result.tempPassword });
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
    try {
      const inv = investors.find(i => i.id === id);
      const r = await resetInvestorPassword(id);
      setCredentialDialog({ name: inv?.name || "Investor", email: inv?.email || "", tempPassword: r.tempPassword });
    } catch (e) { toast(e.message, "error"); }
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

  const statusBadge = (s) => ({ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: s === "ACTIVE" ? "#EFE" : s === "PENDING" ? "#FFF8E1" : "#FEE", color: s === "ACTIVE" ? colors.green : s === "PENDING" ? "#B8860B" : colors.red });

  if (invLoading && investors.length === 0) return <Spinner />;

  return (
    <>
      {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
      {credentialDialog && <CredentialDialog {...credentialDialog} onClose={() => setCredentialDialog(null)} />}
      {!hideHeader && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>Investors</h1>
      </div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button onClick={() => setShowInvite(!showInvite)}>{showInvite ? "Cancel" : "Invite Investor"}</Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="admin-form-row" style={{ background: colors.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Full Name</label>
            <input value={inviteName} onChange={e => setInviteName(e.target.value)} required style={inputStyle} placeholder="James Chen" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required style={inputStyle} placeholder="investor@example.com" />
          </div>
          <Button type="submit">Send Invite</Button>
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
      <Card className="admin-table-scroll" padding="0" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 120px 120px 140px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE" }}>
          <SortableHeader columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "status", label: "Status" },
            { key: "committed", label: "Committed" },
            { key: "value", label: "Value" },
          ]} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>Actions</span>
        </div>

        {investors.map((inv) => (
          <div key={inv.id}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 120px 120px 140px", padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}`, alignItems: "center", fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{inv.name}</span>
              <span style={{ color: "#666" }}>{inv.email}</span>
              <span><span style={statusBadge(inv.status)}>{inv.status}</span></span>
              <span>${fmt(inv.totalCommitted)}</span>
              <span>${fmt(inv.totalValue)}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button onClick={() => onViewProfile?.(inv.id)} style={{ padding: "4px 10px", fontSize: 11 }}>View</Button>
                <Button onClick={() => setEditing(editing === inv.id ? null : inv.id)} variant="outline" style={{ padding: "4px 10px", fontSize: 11 }}>Edit</Button>
                {inv.status === "PENDING" && <Button onClick={() => handleApprove(inv.id)} style={{ padding: "4px 10px", fontSize: 11, background: colors.green }}>Approve</Button>}
                {inv.status === "PENDING" && <Button onClick={() => setConfirmAction({ title: "Reject Investor", message: `Reject investor "${inv.name}"? This will deactivate their account.`, danger: true, onConfirm: () => { setConfirmAction(null); handleDeactivate(inv.id); } })} variant="outline" style={{ padding: "4px 10px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Reject</Button>}
                {inv.status === "ACTIVE" && <Button onClick={() => setConfirmAction({ title: "Deactivate Investor", message: `Deactivate ${inv.name}? They will no longer be able to log in.`, danger: true, onConfirm: () => { setConfirmAction(null); handleDeactivate(inv.id); } })} variant="outline" style={{ padding: "4px 10px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Deactivate</Button>}
              </div>
            </div>

            {/* Expanded edit panel */}
            {editing === inv.id && (
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.lightBorder}`, background: colors.cardBg }}>
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
                      <Button onClick={() => handleResetPw(inv.id)} variant="outline" style={{ fontSize: 11, padding: "6px 10px" }}>Reset Password</Button>
                    </div>
                  </div>
                </div>

                {/* Project KPIs */}
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#666" }}>Project KPIs / Returns</div>
                {inv.projects.map(p => (
                  <div key={p.projectId} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, padding: "8px 12px", background: colors.white, borderRadius: 4, border: "1px solid #E8E5DE" }}>
                    <span style={{ width: 100, fontWeight: 500, fontSize: 13 }}>{p.projectName}</span>
                    {editingKPI === `${inv.id}-${p.projectId}` ? (
                      <>
                        <KPIInput label="Committed" defaultValue={p.committed} onSave={v => handleKPISave(inv.id, p.projectId, { committed: parseFloat(v) })} />
                        <KPIInput label="Called" defaultValue={p.called} onSave={v => handleKPISave(inv.id, p.projectId, { called: parseFloat(v) })} />
                        <KPIInput label="Value" defaultValue={p.currentValue} onSave={v => handleKPISave(inv.id, p.projectId, { currentValue: parseFloat(v) })} />
                        <KPIInput label="IRR %" defaultValue={p.irr} onSave={v => handleKPISave(inv.id, p.projectId, { irr: parseFloat(v) })} />
                        <KPIInput label="MOIC" defaultValue={p.moic} onSave={v => handleKPISave(inv.id, p.projectId, { moic: parseFloat(v) })} />
                        <Button onClick={() => setEditingKPI(null)} variant="outline" style={{ fontSize: 11, padding: "4px 8px" }}>Done</Button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 12, color: "#666" }}>${fmt(p.committed)} committed · ${fmt(p.currentValue)} value · {p.irr}% IRR · {p.moic}x</span>
                        <Button onClick={() => setEditingKPI(`${inv.id}-${p.projectId}`)} variant="outline" style={{ fontSize: 11, padding: "4px 8px", marginLeft: "auto" }}>Edit KPIs</Button>
                      </>
                    )}
                  </div>
                ))}
                {inv.projects.length === 0 && <div style={{ fontSize: 12, color: colors.mutedText, fontStyle: "italic" }}>No project assignments</div>}
              </div>
            )}
          </div>
        ))}
        {investors.length === 0 && <div style={{ padding: 24, color: colors.mutedText, textAlign: "center" }}>No investors found</div>}
      </Card>
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

  // Financial modeler state (must be before any conditional returns — React hooks rule)
  const [fmExitValue, setFmExitValue] = useState("");
  const [fmHoldYears, setFmHoldYears] = useState("5");
  const [fmAnnualCF, setFmAnnualCF] = useState("0");
  const [fmResult, setFmResult] = useState(null);
  const [fmLoading, setFmLoading] = useState(false);

  // Org chart state
  const [orgChart, setOrgChart] = useState([]);

  // Cash flow editing state
  const [editCf, setEditCf] = useState(null);
  const [editCfDate, setEditCfDate] = useState("");
  const [editCfAmount, setEditCfAmount] = useState("");
  const [editCfType, setEditCfType] = useState("");
  const [editCfDesc, setEditCfDesc] = useState("");

  // Cap table CRUD state (D.1)
  const [showCapForm, setShowCapForm] = useState(false);
  const [editingCapId, setEditingCapId] = useState(null);
  const [capForm, setCapForm] = useState({ holderName: "", holderType: "LP", committed: "", called: "", ownershipPct: "", unfunded: "" });

  // Waterfall tier editing state (D.2)
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTierId, setEditingTierId] = useState(null);
  const [tierForm, setTierForm] = useState({ tierName: "", lpShare: "", gpShare: "", threshold: "" });

  // Add investor from project detail (D.3)
  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [addInvList, setAddInvList] = useState([]);
  const [addInvId, setAddInvId] = useState("");
  const [addInvCommitted, setAddInvCommitted] = useState("");

  // Bulk distribution (D.5)
  const [showDistribution, setShowDistribution] = useState(false);
  const [distAmount, setDistAmount] = useState("");
  const [distQuarter, setDistQuarter] = useState("");
  const [distDate, setDistDate] = useState("");
  const [distPreview, setDistPreview] = useState(null);

  useEffect(() => { load(); }, [projectId]);
  async function load() { fetchAdminProjectDetail(projectId).then(setProject); }

  useEffect(() => {
    if (tab === "cashflows" && project) {
      loadCashFlows();
      if (project.investors) setCfInvestors(project.investors);
    }
  }, [tab, project?.id]);

  useEffect(() => {
    if (project?.orgChart) {
      try { setOrgChart(JSON.parse(project.orgChart)); } catch { setOrgChart([]); }
    }
  }, [project?.orgChart]);

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

  if (!project) return <Spinner />;

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

  const section = { background: colors.white, borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const tabs = ["overview", "investors", "documents", "updates", "waterfall", "cashflows", "model"];

  return (
    <>
      <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={onBack}>← Back to projects</p>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>{project.name}</h1>
        <div style={{ fontSize: 13, color: colors.mutedText }}>{project.location} · {project.type}</div>
      </div>

      {/* KPI cards */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Status", value: project.status },
          { label: "Completion", value: `${project.completion}%` },
          { label: "Total Raise", value: fmtCurrency(project.totalRaise) },
          { label: "Investors", value: project.investors.length },
          { label: "Documents", value: project.documents.length },
        ].map((s, i) => (
          <Card key={i} padding="16px 20px">
            <div style={{ fontSize: 22, fontWeight: 300, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F5F3EF", borderRadius: 8, padding: 2, width: "fit-content" }}>
        {tabs.map(t => (
          <span key={t} onClick={() => setTab(t)} style={{
            fontSize: 13, padding: "8px 16px", cursor: "pointer", textTransform: "capitalize",
            color: tab === t ? colors.darkText : "#888", fontWeight: tab === t ? 500 : 400,
            background: tab === t ? colors.white : "transparent",
            borderRadius: 6,
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            transition: "all .15s",
          }}>{t}</span>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <>
          <Card style={{ marginBottom: 16 }}>
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
                  <span style={{ fontSize: 12, color: colors.mutedText }}>/ {project.units || 0} total</span>
                  {project.units > 0 && (
                    <div style={{ flex: 1, height: 6, background: colors.lightBorder, borderRadius: 20, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, ((project.unitsSold || 0) / project.units) * 100)}%`, height: "100%", background: colors.green, borderRadius: 20 }} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888" }}>Revenue ($)</label>
                <input type="number" defaultValue={project.revenue || 0} onBlur={e => handleSaveField("revenue", parseFloat(e.target.value))} style={{ ...inputStyle, marginTop: 4 }} />
              </div>
            </div>
          </Card>

          {/* Org Chart */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Organization Chart</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Button onClick={() => setOrgChart(oc => [...oc, { role: "", name: "", company: "" }])} variant="outline" style={{ padding: "4px 10px", fontSize: 11 }}>Add Row</Button>
                <Button onClick={handleSaveOrgChart} style={{ padding: "4px 10px", fontSize: 11 }}>Save</Button>
              </div>
            </div>
            {orgChart.length > 0 ? (
              <div className="admin-table-scroll">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 30px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
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
              </div>
            ) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No org chart entries. Click "Add Row" to start.</p>}
          </Card>
        </>
      )}

      {/* Investors tab */}
      {tab === "investors" && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 14 }}>LP Investors ({project.investors.length})</div>
          {project.investors.length > 0 ? project.investors.map((inv) => (
            <div key={inv.userId} style={{ padding: "12px 0", borderBottom: `1px solid ${colors.lightBorder}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{inv.name}</span>
                  <span style={{ fontSize: 12, color: colors.mutedText, marginLeft: 8 }}>{inv.email}</span>
                </div>
                <Button onClick={() => setEditingKPI(editingKPI === inv.userId ? null : inv.userId)} variant="outline" style={{ padding: "4px 10px", fontSize: 11 }}>
                  {editingKPI === inv.userId ? "Done" : "Edit KPIs"}
                </Button>
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

          {/* Add Investor from Project Detail (D.3) */}
          <div style={{ marginTop: 16 }}>
            {!showAddInvestor ? (
              <Button onClick={async () => { const invs = await fetchAdminInvestors(); setAddInvList(Array.isArray(invs) ? invs : invs.investors || []); setShowAddInvestor(true); }} variant="outline" style={{ fontSize: 12 }}>Add Investor</Button>
            ) : (
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: "16px", border: "1px solid #E8E5DE" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Add Investor to Project</div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Investor</label>
                    <select value={addInvId} onChange={e => setAddInvId(e.target.value)} style={inputStyle}>
                      <option value="">Select investor...</option>
                      {addInvList.filter(inv => !project.investors.some(pi => pi.userId === inv.id)).map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.email})</option>)}
                    </select>
                  </div>
                  <div style={{ width: 140 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Commitment ($)</label>
                    <input type="number" value={addInvCommitted} onChange={e => setAddInvCommitted(e.target.value)} placeholder="0" style={inputStyle} />
                  </div>
                  <Button onClick={() => setShowAddInvestor(false)} variant="outline" style={{ fontSize: 12 }}>Cancel</Button>
                  <Button disabled={!addInvId} onClick={async () => {
                    try {
                      await assignInvestorProject(parseInt(addInvId), { projectId, committed: Number(addInvCommitted) || 0 });
                      toast("Investor added to project");
                      setShowAddInvestor(false); setAddInvId(""); setAddInvCommitted(""); load();
                    } catch (e) { toast(e.message, "error"); }
                  }} style={{ fontSize: 12, opacity: addInvId ? 1 : 0.5 }}>Add</Button>
                </div>
              </div>
            )}
          </div>

          {/* D.7: Project Financial Summary */}
          {project.investors.length > 0 && (() => {
            const totals = project.investors.reduce((acc, inv) => ({
              committed: acc.committed + (inv.committed || 0),
              called: acc.called + (inv.called || 0),
              distributed: acc.distributed + (inv.distributed || 0),
              unfunded: acc.unfunded + ((inv.committed || 0) - (inv.called || 0)),
            }), { committed: 0, called: 0, distributed: 0, unfunded: 0 });
            return (
              <div style={{ marginTop: 20, background: colors.cardBg, borderRadius: 8, padding: "16px 20px", border: "1px solid #E8E5DE" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>Financial Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  <div><div style={{ fontSize: 18, fontWeight: 300 }}>${fmt(totals.committed)}</div><div style={{ fontSize: 10, color: colors.mutedText }}>Total Committed</div></div>
                  <div><div style={{ fontSize: 18, fontWeight: 300 }}>${fmt(totals.called)}</div><div style={{ fontSize: 10, color: colors.mutedText }}>Total Called</div></div>
                  <div><div style={{ fontSize: 18, fontWeight: 300 }}>${fmt(totals.distributed)}</div><div style={{ fontSize: 10, color: colors.mutedText }}>Total Distributed</div></div>
                  <div><div style={{ fontSize: 18, fontWeight: 300 }}>${fmt(totals.unfunded)}</div><div style={{ fontSize: 10, color: colors.mutedText }}>Total Unfunded</div></div>
                </div>
              </div>
            );
          })()}

          {/* D.5: Bulk Distribution Recording */}
          <div style={{ marginTop: 16 }}>
            {!showDistribution ? (
              <Button variant="outline" onClick={() => setShowDistribution(true)} style={{ fontSize: 12 }}>Record Distribution</Button>
            ) : (
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: "16px", border: "1px solid #E8E5DE" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Record Bulk Distribution</div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Total Amount ($)</label>
                    <input type="number" value={distAmount} onChange={e => {
                      setDistAmount(e.target.value);
                      const amt = parseFloat(e.target.value) || 0;
                      const totalOwnership = project.investors.reduce((s, inv) => s + (inv.ownershipPct || inv.ownership || 0), 0) || project.investors.length;
                      setDistPreview(project.investors.map(inv => {
                        const pct = (inv.ownershipPct || inv.ownership || (100 / project.investors.length));
                        return { name: inv.name, pct, amount: (amt * pct / 100) };
                      }));
                    }} placeholder="e.g. 100000" style={inputStyle} />
                  </div>
                  <div style={{ width: 100 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Quarter</label>
                    <input value={distQuarter} onChange={e => setDistQuarter(e.target.value)} placeholder="Q1 2026" style={inputStyle} />
                  </div>
                  <div style={{ width: 140 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Date</label>
                    <input type="date" value={distDate} onChange={e => setDistDate(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                {distPreview && distPreview.length > 0 && (
                  <div style={{ marginBottom: 12, padding: "8px 12px", background: colors.white, borderRadius: 4, border: "1px solid #E8E5DE" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Pro-Rata Split Preview</div>
                    {distPreview.map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: i < distPreview.length - 1 ? "1px solid #F5F3F0" : "none" }}>
                        <span>{d.name} ({d.pct.toFixed(1)}%)</span>
                        <span style={{ fontWeight: 500 }}>${fmt(Math.round(d.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Button variant="outline" onClick={() => { setShowDistribution(false); setDistPreview(null); setDistAmount(""); setDistQuarter(""); setDistDate(""); }} style={{ fontSize: 12 }}>Cancel</Button>
                  <Button disabled={!distAmount} onClick={async () => {
                    if (!confirm(`Record distribution of $${fmt(parseFloat(distAmount))} across ${project.investors.length} investors?`)) return;
                    try {
                      await recordBulkDistribution(projectId, { amount: parseFloat(distAmount), quarter: distQuarter, date: distDate || new Date().toISOString().split("T")[0] });
                      toast("Distribution recorded");
                      setShowDistribution(false); setDistPreview(null); setDistAmount(""); setDistQuarter(""); setDistDate(""); load();
                    } catch (e) { toast(e.message, "error"); }
                  }} style={{ fontSize: 12, opacity: distAmount ? 1 : 0.5 }}>Confirm Distribution</Button>
                </div>
              </div>
            )}
          </div>

          {/* Cap table with CRUD (D.1) */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginTop: 24, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Cap Table</span>
            <Button variant="outline" onClick={() => { setShowCapForm(!showCapForm); setEditingCapId(null); setCapForm({ holderName: "", holderType: "LP", committed: "", called: "", ownershipPct: "", unfunded: "" }); }} style={{ padding: "4px 10px", fontSize: 11 }}>{showCapForm ? "Cancel" : "Add Entry"}</Button>
          </div>
          {showCapForm && (
            <div style={{ background: colors.cardBg, borderRadius: 6, padding: "12px", marginBottom: 12, border: "1px solid #E8E5DE" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 80px 80px", gap: 8, alignItems: "flex-end" }}>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Holder Name</label><input value={capForm.holderName} onChange={e => setCapForm(f => ({ ...f, holderName: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="Name" /></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Type</label><select value={capForm.holderType} onChange={e => setCapForm(f => ({ ...f, holderType: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}><option>LP</option><option>GP</option><option>Co-GP</option></select></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Committed</label><input type="number" value={capForm.committed} onChange={e => setCapForm(f => ({ ...f, committed: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="0" /></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Called</label><input type="number" value={capForm.called} onChange={e => setCapForm(f => ({ ...f, called: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="0" /></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Ownership %</label><input type="number" step="0.01" value={capForm.ownershipPct} onChange={e => setCapForm(f => ({ ...f, ownershipPct: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="0" /></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Unfunded</label><input type="number" value={capForm.unfunded} onChange={e => setCapForm(f => ({ ...f, unfunded: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="0" /></div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={async () => {
                  const data = { holderName: capForm.holderName, holderType: capForm.holderType, committed: parseFloat(capForm.committed) || 0, called: parseFloat(capForm.called) || 0, ownershipPct: parseFloat(capForm.ownershipPct) || 0, unfunded: parseFloat(capForm.unfunded) || 0 };
                  try {
                    if (editingCapId) { await updateCapTableEntry(projectId, editingCapId, data); toast("Cap table entry updated"); }
                    else { await createCapTableEntry(projectId, data); toast("Cap table entry added"); }
                    setShowCapForm(false); setEditingCapId(null); load();
                  } catch (e) { toast(e.message, "error"); }
                }} style={{ padding: "6px 12px", fontSize: 11 }}>{editingCapId ? "Save" : "Add"}</Button>
              </div>
            </div>
          )}
          {project.capTable.length > 0 && (
            <div className="admin-table-scroll">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 80px 80px 80px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
                <span>Holder</span><span>Class</span><span>Committed</span><span>Called</span><span>Unfunded</span><span>Ownership</span><span>Actions</span>
              </div>
              {project.capTable.map(e => (
                <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 80px 80px 80px", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13, alignItems: "center" }}>
                  <span style={{ fontWeight: 500 }}>{e.holder}</span>
                  <span style={{ color: "#666" }}>{e.type}</span>
                  <span>${fmt(e.committed)}</span>
                  <span>${fmt(e.called)}</span>
                  <span>${fmt(e.unfunded)}</span>
                  <span>{e.ownership}%</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button variant="outline" onClick={() => { setEditingCapId(e.id); setCapForm({ holderName: e.holder, holderType: e.type, committed: e.committed || "", called: e.called || "", ownershipPct: e.ownership || "", unfunded: e.unfunded || "" }); setShowCapForm(true); }} style={{ padding: "2px 6px", fontSize: 10 }}>Edit</Button>
                    <Button variant="outline" onClick={async () => { if (!confirm("Delete this cap table entry?")) return; try { await deleteCapTableEntry(projectId, e.id); toast("Entry deleted"); load(); } catch (err) { toast(err.message, "error"); } }} style={{ padding: "2px 6px", fontSize: 10, color: colors.red, borderColor: colors.red }}>&times;</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {project.capTable.length === 0 && !showCapForm && <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No cap table entries</p>}
        </Card>
      )}

      {/* Documents tab */}
      {tab === "documents" && (
        <Card style={{ marginBottom: 16 }}>
          {project.documents.length > 0 ? project.documents.map((d, i) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < project.documents.length - 1 ? "1px solid #F5F3F0" : "none", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#BBB" }}>{d.category} · {d.date} · {d.size}</div>
              </div>
              <span style={{ fontSize: 12, color: d.viewedBy > 0 ? colors.green : "#CCC" }}>{d.viewedBy} viewed</span>
            </div>
          )) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No documents</p>}
        </Card>
      )}

      {/* Updates tab */}
      {tab === "updates" && <ProjectUpdatesTab project={project} updateText={updateText} setUpdateText={setUpdateText} handlePostUpdate={handlePostUpdate} section={section} />}

      {/* Waterfall tab */}
      {tab === "waterfall" && (
        <Card style={{ marginBottom: 16 }}>
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
          {/* Distribution Tiers with CRUD (D.2) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Distribution Tiers</div>
            <Button variant="outline" onClick={() => { setShowTierForm(!showTierForm); setEditingTierId(null); setTierForm({ tierName: "", lpShare: "", gpShare: "", threshold: "" }); }} style={{ padding: "4px 10px", fontSize: 11 }}>{showTierForm ? "Cancel" : "Add Tier"}</Button>
          </div>
          {showTierForm && (
            <div style={{ background: colors.cardBg, borderRadius: 6, padding: "12px", marginBottom: 12, border: "1px solid #E8E5DE" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 120px", gap: 8, alignItems: "flex-end" }}>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Tier Name</label><input value={tierForm.tierName} onChange={e => setTierForm(f => ({ ...f, tierName: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. Preferred Return" /></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>LP Share</label><input value={tierForm.lpShare} onChange={e => setTierForm(f => ({ ...f, lpShare: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. 100%" /></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>GP Share</label><input value={tierForm.gpShare} onChange={e => setTierForm(f => ({ ...f, gpShare: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. 0%" /></div>
                <div><label style={{ fontSize: 10, color: "#AAA" }}>Threshold</label><input value={tierForm.threshold} onChange={e => setTierForm(f => ({ ...f, threshold: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. 8% IRR" /></div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={async () => {
                  const data = { tierName: tierForm.tierName, lpShare: tierForm.lpShare, gpShare: tierForm.gpShare, threshold: tierForm.threshold };
                  try {
                    if (editingTierId) { await updateWaterfallTier(projectId, editingTierId, data); toast("Tier updated"); }
                    else { await createWaterfallTier(projectId, data); toast("Tier added"); }
                    setShowTierForm(false); setEditingTierId(null); load();
                  } catch (e) { toast(e.message, "error"); }
                }} style={{ padding: "6px 12px", fontSize: 11 }}>{editingTierId ? "Save" : "Add"}</Button>
              </div>
            </div>
          )}
          {project.waterfall.tiers.length > 0 ? project.waterfall.tiers.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13, alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 500 }}>{t.name}</span>
                <span style={{ color: colors.mutedText, marginLeft: 12 }}>LP: {t.lpShare} · GP: {t.gpShare}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: colors.mutedText, fontSize: 12 }}>{t.threshold}</span>
                <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 10, background: t.status === "complete" ? "#EFE" : t.status === "accruing" ? "#FFF8E1" : colors.lightBorder, color: t.status === "complete" ? colors.green : t.status === "accruing" ? "#B8860B" : "#999" }}>{t.status}</span>
                <Button variant="outline" onClick={() => { setEditingTierId(t.id); setTierForm({ tierName: t.name, lpShare: t.lpShare, gpShare: t.gpShare, threshold: t.threshold }); setShowTierForm(true); }} style={{ padding: "2px 6px", fontSize: 10 }}>Edit</Button>
                <Button variant="outline" onClick={async () => { if (!confirm(`Delete tier "${t.name}"?`)) return; try { await deleteWaterfallTier(projectId, t.id); toast("Tier deleted"); load(); } catch (e) { toast(e.message, "error"); } }} style={{ padding: "2px 6px", fontSize: 10, color: colors.red, borderColor: colors.red }}>&times;</Button>
              </div>
            </div>
          )) : (!showTierForm && <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No distribution tiers</p>)}
        </Card>
      )}

      {/* Cash Flows tab */}
      {tab === "cashflows" && <ProjectCashFlowsTab project={project} projectId={projectId} cashFlowsList={cashFlowsList} cfInvestors={cfInvestors} showCfModal={showCfModal} setShowCfModal={setShowCfModal} cfDate={cfDate} setCfDate={setCfDate} cfAmount={cfAmount} setCfAmount={setCfAmount} cfType={cfType} setCfType={setCfType} cfUserId={cfUserId} setCfUserId={setCfUserId} cfDesc={cfDesc} setCfDesc={setCfDesc} handleRecordCashFlow={handleRecordCashFlow} handleRecalculate={handleRecalculate} recalculating={recalculating} loadCashFlows={loadCashFlows} toast={toast} section={section} />}

      {/* Financial Model tab */}
      {tab === "model" && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Financial Scenario Model</div>
          <div className="admin-form-row" style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-end" }}>
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
            <Button onClick={handleRunModel} disabled={fmLoading} style={{ opacity: fmLoading ? 0.5 : 1 }}>
              {fmLoading ? "Running..." : "Run Scenario"}
            </Button>
          </div>
          <div style={{ fontSize: 12, color: colors.mutedText, marginBottom: 20 }}>
            Pre-filled: Total Investment ${fmt(project.totalRaise)} | Pref: {project.prefReturn}% | Carry: {project.carry}%
          </div>

          {fmResult && (
            <>
              {/* Summary cards */}
              <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "LP IRR", value: fmResult.lpIRR != null ? `${(fmResult.lpIRR * 100).toFixed(1)}%` : "--" },
                  { label: "LP MOIC", value: `${fmResult.lpMOIC}x` },
                  { label: "Equity Multiple", value: `${fmResult.equityMultiple}x` },
                  { label: "Cash on Cash", value: `${fmResult.cashOnCash}%` },
                ].map((c, i) => (
                  <div key={i} style={{ background: "#F8F7F4", borderRadius: 6, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 300, color: colors.darkText }}>{c.value}</div>
                    <div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 4 }}>{c.label}</div>
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
                      <span style={{ color: colors.mutedText }}>LP: ${fmt(Math.round(tier.lpAmount))} | GP: ${fmt(Math.round(tier.gpAmount))}</span>
                    </div>
                    <div style={{ height: 12, background: colors.lightBorder, borderRadius: 2, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${lpPct}%`, background: colors.green, height: "100%" }} />
                      <div style={{ width: `${100 - lpPct}%`, background: colors.red, height: "100%", opacity: 0.6 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: colors.mutedText, marginBottom: 24, marginTop: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: colors.green, borderRadius: 2, display: "inline-block" }} /> LP</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: `${colors.red}99`, borderRadius: 2, display: "inline-block" }} /> GP</span>
              </div>

              {/* Year-by-year */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 12 }}>Year-by-Year Cash Flow</div>
              <div className="admin-table-scroll">
              <div style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 120px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
                <span>Year</span><span style={{ textAlign: "right" }}>Cash Flow</span><span style={{ textAlign: "right" }}>Cumulative</span><span style={{ textAlign: "right" }}>Balance</span>
              </div>
              {fmResult.yearByYear.map((y, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 120px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
                  <span>{y.year === 0 ? "Initial" : `Year ${y.year}`}</span>
                  <span style={{ textAlign: "right", color: y.cashFlow < 0 ? colors.red : colors.green, fontWeight: 500 }}>
                    {y.cashFlow < 0 ? `-$${fmt(Math.abs(Math.round(y.cashFlow)))}` : `$${fmt(Math.round(y.cashFlow))}`}
                  </span>
                  <span style={{ textAlign: "right", color: y.cumulativeCashFlow < 0 ? colors.red : colors.green }}>
                    {y.cumulativeCashFlow < 0 ? `-$${fmt(Math.abs(Math.round(y.cumulativeCashFlow)))}` : `$${fmt(Math.round(y.cumulativeCashFlow))}`}
                  </span>
                  <span style={{ textAlign: "right", color: "#666" }}>${fmt(Math.round(y.balance))}</span>
                </div>
              ))}
              </div>

              {/* Sensitivity table */}
              {fmResult.sensitivity && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 12, marginTop: 24 }}>Sensitivity Analysis</div>
                  <div className="admin-table-scroll">
                  <div style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 100px 80px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
                    <span>Scenario</span><span style={{ textAlign: "right" }}>Exit Value</span><span style={{ textAlign: "right" }}>LP Return</span><span style={{ textAlign: "right" }}>LP IRR</span><span style={{ textAlign: "right" }}>LP MOIC</span>
                  </div>
                  {fmResult.sensitivity.map((s, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 120px 120px 100px 80px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13, background: s.label === "+0%" ? "#F8F7F4" : "transparent" }}>
                      <span style={{ fontWeight: 500 }}>{s.label}</span>
                      <span style={{ textAlign: "right" }}>${fmt(s.exitValue)}</span>
                      <span style={{ textAlign: "right", color: colors.green }}>${fmt(Math.round(s.lpReturn))}</span>
                      <span style={{ textAlign: "right" }}>{s.lpIRR != null ? `${(s.lpIRR * 100).toFixed(1)}%` : "--"}</span>
                      <span style={{ textAlign: "right" }}>{s.lpMOIC}x</span>
                    </div>
                  ))}
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      )}
    </>
  );
}

// ─── DOCUMENT MANAGER (dashboard + detail + upload) ───
function DocumentManager({ toast, hideHeader }) {
  const { projects } = useAdminData();
  const [docs, setDocs] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docDetail, setDocDetail] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showBulkK1, setShowBulkK1] = useState(false);
  const [bulkK1Files, setBulkK1Files] = useState(null);
  const [bulkK1Project, setBulkK1Project] = useState("");
  const [bulkK1Year, setBulkK1Year] = useState(new Date().getFullYear().toString());
  const [bulkK1Results, setBulkK1Results] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkK1Assigns, setBulkK1Assigns] = useState({});
  const [bulkK1Investors, setBulkK1Investors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSignModal, setShowSignModal] = useState(false);
  const [sigInvestors, setSigInvestors] = useState([]);
  const [sigSelectedIds, setSigSelectedIds] = useState([]);
  const [sigSubject, setSigSubject] = useState("");
  const [sigSending, setSigSending] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Assign investors state
  const [showAssignInvestors, setShowAssignInvestors] = useState(false);
  const [assignInvestors, setAssignInvestorsList] = useState([]);
  const [assignSelectedIds, setAssignSelectedIds] = useState([]);
  const [assignSaving, setAssignSaving] = useState(false);

  // Upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Reporting");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadDocs(); }, []);
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
  const docSort = useSortable("name");

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
        {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
        <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedDoc(null); setDocDetail(null); }}>← Back to documents</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 6 }}>{docDetail.name}</h2>
            <div style={{ fontSize: 12, color: colors.mutedText }}>
              {docDetail.project?.name || "General"} · {docDetail.category} · {docDetail.date} · {docDetail.size}
              <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 3, fontSize: 10, background: docDetail.status === "published" ? "#EFE" : "#FFF8E1", color: docDetail.status === "published" ? colors.green : "#B8860B" }}>{docDetail.status}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={openSignModal} style={{ fontSize: 12 }}>Request Signature</Button>
            <Button variant="outline" onClick={() => setConfirmAction({ title: "Delete Document", message: `Delete "${docDetail.name}"? This cannot be undone.`, danger: true, onConfirm: async () => { setConfirmAction(null); try { await deleteDocument(docDetail.id); toast("Document deleted"); setSelectedDoc(null); setDocDetail(null); loadDocs(); } catch (e) { toast(e.message, "error"); } } })} style={{ fontSize: 12, color: colors.red, borderColor: colors.red }}>Delete</Button>
          </div>
        </div>

        {/* Signature Request Modal */}
        <Modal open={showSignModal} onClose={() => setShowSignModal(false)} title="Request Signature" maxWidth={480}>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Select investors to sign <strong>{docDetail.name}</strong></p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Subject</label>
            <input value={sigSubject} onChange={e => setSigSubject(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Signers</label>
            <div style={{ border: "1px solid #DDD", borderRadius: 4, maxHeight: 200, overflow: "auto" }}>
              {sigInvestors.map(inv => (
                <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={sigSelectedIds.includes(inv.id)}
                    onChange={e => setSigSelectedIds(prev => e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id))} />
                  <span style={{ fontWeight: 500 }}>{inv.name}</span>
                  <span style={{ color: colors.mutedText }}>{inv.email}</span>
                </label>
              ))}
              {sigInvestors.length === 0 && <div style={{ padding: 14, color: colors.mutedText, fontSize: 12 }}>Loading investors...</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setShowSignModal(false)}>Cancel</Button>
            <Button onClick={handleSendSignature} disabled={sigSending} style={{ opacity: sigSending ? 0.5 : 1 }}>
              {sigSending ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </Modal>

        {/* Access audit table */}
        <Card className="admin-table-scroll" padding="0" style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em" }}>
            <span>Investor</span><span>Email</span><span>Viewed</span><span>Downloaded</span><span>Acknowledged</span>
          </div>
          {docDetail.accessList.length > 0 ? docDetail.accessList.map((a, i) => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "12px 20px", borderBottom: i < docDetail.accessList.length - 1 ? `1px solid ${colors.lightBorder}` : "none", fontSize: 13, alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>
                {a.name}
                {a.directAssignment && <span style={{ fontSize: 10, color: colors.red, marginLeft: 6 }}>Direct</span>}
              </span>
              <span style={{ color: "#666" }}>{a.email}</span>
              <span style={{ color: a.viewedAt ? colors.green : "#CCC" }}>{a.viewedAt ? new Date(a.viewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
              <span style={{ color: a.downloadedAt ? colors.green : "#CCC" }}>{a.downloadedAt ? new Date(a.downloadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
              <span style={{ color: a.acknowledgedAt ? colors.green : "#CCC" }}>{a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
            </div>
          )) : (
            <div style={{ padding: 20, color: colors.mutedText, textAlign: "center", fontSize: 13 }}>No investor access records</div>
          )}
        </Card>

        {/* Signer Status Section (B.5 + B.7) */}
        {docDetail.signatureRequests && docDetail.signatureRequests.length > 0 && (
          <Card padding="0" style={{ overflow: "hidden", marginTop: 20 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 13, fontWeight: 600, color: "#666" }}>Signature Status</div>
            {docDetail.signatureRequests.map(req => (
              <div key={req.id}>
                <div style={{ padding: "10px 20px", fontSize: 12, color: colors.mutedText, background: colors.cardBg, borderBottom: `1px solid ${colors.lightBorder}` }}>
                  Request: {req.subject || "Signature Request"} — {req.status || "active"}
                </div>
                {(req.signers || []).map(signer => (
                  <div key={signer.id || signer.userId} style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 120px", padding: "10px 20px", borderBottom: `1px solid ${colors.lightBorder}`, fontSize: 13, alignItems: "center" }}>
                    <span style={{ fontWeight: 500 }}>{signer.name || signer.investorName || "Unknown"}</span>
                    <span><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: signer.status === "signed" ? "#EFE" : signer.status === "declined" ? "#FEE" : "#FFF8E1", color: signer.status === "signed" ? colors.green : signer.status === "declined" ? colors.red : "#B8860B" }}>{signer.status || "pending"}</span></span>
                    <span style={{ fontSize: 12, color: colors.mutedText }}>{signer.signedAt ? new Date(signer.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "\u2014"}</span>
                    {(signer.status === "pending" || !signer.status) && (
                      <Button variant="outline" onClick={async () => {
                        try {
                          const BASE = import.meta.env.VITE_API_URL || "";
                          const token = localStorage.getItem("token");
                          await fetch(`${BASE}/notifications/test`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: "signature_required", userId: signer.userId }) });
                          toast("Reminder sent");
                        } catch (e) { toast("Failed to send reminder", "error"); }
                      }} style={{ padding: "3px 8px", fontSize: 10 }}>Send Reminder</Button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </Card>
        )}

        {/* Assign Investors */}
        <div style={{ marginTop: 20 }}>
          {!showAssignInvestors ? (
            <Button variant="outline" onClick={async () => {
              const investors = await fetchAdminInvestors();
              setAssignInvestorsList(Array.isArray(investors) ? investors : investors.investors || []);
              setAssignSelectedIds(docDetail.accessList.filter(a => a.directAssignment).map(a => a.userId || a.id));
              setShowAssignInvestors(true);
            }}>Assign to Investors</Button>
          ) : (
            <Card>
              <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 16 }}>Assign Investors</h3>
              <div style={{ border: "1px solid #DDD", borderRadius: 4, maxHeight: 260, overflow: "auto", marginBottom: 16 }}>
                {assignInvestors.map(inv => (
                  <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={assignSelectedIds.includes(inv.id)}
                      onChange={e => setAssignSelectedIds(prev => e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id))} />
                    <span style={{ fontWeight: 500 }}>{inv.name}</span>
                    <span style={{ color: colors.mutedText }}>{inv.email}</span>
                  </label>
                ))}
                {assignInvestors.length === 0 && <div style={{ padding: 14, color: colors.mutedText, fontSize: 12 }}>No investors found</div>}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="outline" onClick={() => setShowAssignInvestors(false)}>Cancel</Button>
                <Button disabled={assignSaving} onClick={async () => {
                  setAssignSaving(true);
                  try {
                    await assignDocument(docDetail.id, assignSelectedIds);
                    toast("Investor assignments updated");
                    const detail = await fetchAdminDocumentDetail(docDetail.id);
                    setDocDetail(detail);
                    setShowAssignInvestors(false);
                  } catch (e) { toast(e.message, "error"); }
                  finally { setAssignSaving(false); }
                }} style={{ opacity: assignSaving ? 0.5 : 1 }}>
                  {assignSaving ? "Saving..." : "Save Assignments"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </>
    );
  }

  // Upload form
  if (showUpload) {
    return (
      <>
        <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={() => setShowUpload(false)}>← Back to documents</p>
        <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>Upload Document</h2>
        <form onSubmit={handleUpload} style={{ background: colors.white, borderRadius: 12, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", maxWidth: 520 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Document Name</label>
            <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Q3 2025 — Porthaven Quarterly Report" style={inputStyle} required />
          </div>
          <div className="admin-form-row" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
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
            <Button variant="outline" type="button" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading} style={{ padding: "10px 24px", opacity: uploading ? 0.5 : 1 }}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </>
    );
  }

  // Document list dashboard
  return (
    <>
      {!hideHeader && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 300 }}>Documents</h1>
          <p style={{ fontSize: 13, color: colors.mutedText, marginTop: 4 }}>{docs.length} documents</p>
        </div>
      </div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: colors.mutedText }}>{hideHeader ? `${docs.length} documents` : ""}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={() => { setShowBulkK1(!showBulkK1); setShowUpload(false); }}>{showBulkK1 ? "Cancel" : "Bulk K-1 Upload"}</Button>
          <Button onClick={() => { setShowUpload(true); setShowBulkK1(false); }}>Upload Document</Button>
        </div>
      </div>

      {/* Bulk K-1 Upload */}
      {showBulkK1 && (
        <Card padding="24px" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Bulk K-1 Upload</div>
          <p style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>Upload multiple K-1 documents at once. Files are auto-matched to investors by name in the filename (e.g., "K1_JamesChen_2025.pdf").</p>
          <div className="admin-form-row" style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Select K-1 Files</label>
              <input type="file" multiple accept=".pdf" onChange={e => setBulkK1Files(e.target.files)} style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Tax Year</label>
              <input value={bulkK1Year} onChange={e => setBulkK1Year(e.target.value)} style={{ ...inputStyle, width: 80 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Project (optional)</label>
              <select value={bulkK1Project} onChange={e => setBulkK1Project(e.target.value)} style={{ ...inputStyle, width: 160 }}>
                <option value="">General</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <Button disabled={!bulkK1Files || bulkUploading} onClick={async () => {
              setBulkUploading(true);
              try {
                const fd = new FormData();
                for (const f of bulkK1Files) fd.append("files", f);
                if (bulkK1Project) fd.append("projectId", bulkK1Project);
                fd.append("taxYear", bulkK1Year);
                const result = await bulkUploadK1(fd);
                setBulkK1Results(result);
                setBulkK1Assigns({});
                if (result.unmatched > 0) { fetchAdminInvestors().then(inv => setBulkK1Investors(Array.isArray(inv) ? inv : inv.investors || [])); }
                toast(`Uploaded ${result.total} K-1s: ${result.matched} matched, ${result.unmatched} unmatched`);
                loadDocs();
              } catch (err) { toast(err.message, "error"); }
              setBulkUploading(false);
            }}>{bulkUploading ? "Uploading..." : "Upload All"}</Button>
          </div>
          {bulkK1Results && (
            <div style={{ borderTop: `1px solid ${colors.lightBorder}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Results: {bulkK1Results.matched} matched, {bulkK1Results.unmatched} unmatched</div>
              {bulkK1Results.results.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F8F7F4", fontSize: 12, gap: 8 }}>
                  <span>{r.filename}</span>
                  {r.status === "matched" ? (
                    <span style={{ color: colors.green, fontWeight: 500 }}>Matched &rarr; {r.matched.name}</span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <select value={bulkK1Assigns[r.documentId || i] || ""} onChange={e => setBulkK1Assigns(prev => ({ ...prev, [r.documentId || i]: e.target.value }))} style={{ ...inputStyle, width: 180, padding: "4px 8px", fontSize: 11 }}>
                        <option value="">Select investor...</option>
                        {bulkK1Investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                      </select>
                      <Button disabled={!bulkK1Assigns[r.documentId || i]} onClick={async () => {
                        const userId = parseInt(bulkK1Assigns[r.documentId || i]);
                        if (!r.documentId) { toast("No document ID available", "error"); return; }
                        try {
                          await assignDocument(r.documentId, [userId]);
                          toast("Document assigned");
                          setBulkK1Results(prev => ({ ...prev, results: prev.results.map((x, j) => j === i ? { ...x, status: "matched", matched: { name: bulkK1Investors.find(inv => inv.id === userId)?.name || "Assigned" } } : x), matched: prev.matched + 1, unmatched: prev.unmatched - 1 }));
                        } catch (e) { toast(e.message, "error"); }
                      }} style={{ padding: "3px 8px", fontSize: 10, opacity: bulkK1Assigns[r.documentId || i] ? 1 : 0.5 }}>Assign</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

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
      {loading ? <Spinner /> : (
        <Card className="admin-table-scroll" padding="0" style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 80px 80px 80px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE" }}>
            <SortableHeader columns={[
              { key: "name", label: "Document" },
              { key: "project", label: "Project" },
              { key: "category", label: "Category" },
              { key: "totalInvestors", label: "Investors" },
              { key: "viewed", label: "Viewed" },
              { key: "downloaded", label: "Downloaded" },
            ]} sortBy={docSort.sortBy} sortDir={docSort.sortDir} onSort={docSort.onSort} />
          </div>
          {docSort.sortData(docs).map((d, i) => (
            <div key={d.id} onClick={() => openDoc(d)} style={{
              display: "grid", gridTemplateColumns: "2fr 100px 100px 80px 80px 80px",
              padding: "14px 20px", borderBottom: i < docs.length - 1 ? `1px solid ${colors.lightBorder}` : "none",
              cursor: "pointer", fontSize: 13, alignItems: "center",
            }}
              onMouseEnter={e => e.currentTarget.style.background = colors.cardBg}
              onMouseLeave={e => e.currentTarget.style.background = colors.white}>
              <div>
                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{d.name}{d.date && (Date.now() - new Date(d.date).getTime()) < 7 * 86400000 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: `${colors.red}18`, color: colors.red, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>NEW</span>}</div>
                <div style={{ fontSize: 11, color: "#BBB" }}>{d.date} · {d.size}</div>
              </div>
              <span style={{ fontSize: 12, color: "#666" }}>{d.project}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", background: colors.lightBorder, borderRadius: 3 }}>{d.category}</span>
              <span>{d.totalInvestors}</span>
              <span style={{ color: d.viewed > 0 ? colors.green : "#CCC" }}>{d.viewed}</span>
              <span style={{ color: d.downloaded > 0 ? colors.green : "#CCC" }}>{d.downloaded}</span>
            </div>
          ))}
          {docs.length === 0 && <div style={{ padding: 24, color: colors.mutedText, textAlign: "center" }}>No documents found</div>}
        </Card>
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
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityForm, setEntityForm] = useState({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [assignProjList, setAssignProjList] = useState([]);
  const [assignProjId, setAssignProjId] = useState("");
  const [assignProjCommitted, setAssignProjCommitted] = useState("");
  const [assignProjCalled, setAssignProjCalled] = useState("");
  const [assignProjCurrentValue, setAssignProjCurrentValue] = useState("");
  const [assignProjSaving, setAssignProjSaving] = useState(false);

  useEffect(() => { fetchInvestorProfile(investorId).then(setProfile); loadEntities(); }, [investorId]);
  function loadEntities() { fetchEntities(investorId).then(setEntities).catch(() => setEntities([])); }

  async function handleCreateEntity(e) {
    e.preventDefault();
    try {
      if (editingEntity) {
        await updateEntity(editingEntity.id, entityForm);
        toast("Entity updated");
        setEditingEntity(null);
      } else {
        await createEntity(investorId, entityForm);
        toast("Entity created");
      }
      setShowEntityForm(false);
      setEntityForm({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });
      loadEntities();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDeleteEntity(entityId) {
    try { await deleteEntity(entityId); toast("Entity deleted"); loadEntities(); } catch (err) { toast(err.message, "error"); }
  }

  if (!profile) return <p style={{ color: colors.mutedText }}>Loading...</p>;

  const section = { background: colors.white, borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  return (
    <>
      <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={onBack}>← Back to investors</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: colors.lightBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#666" }}>
            {profile.initials || profile.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 400 }}>{profile.name}</h1>
            <div style={{ fontSize: 13, color: colors.mutedText }}>{profile.email} · {profile.role === "INVESTOR" ? "Limited Partner" : profile.role} · Joined {profile.joined}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "4px 12px", borderRadius: 4, fontSize: 12, fontWeight: 500, background: profile.status === "ACTIVE" ? "#EFE" : profile.status === "PENDING" ? "#FFF8E1" : "#FEE", color: profile.status === "ACTIVE" ? colors.green : profile.status === "PENDING" ? "#B8860B" : colors.red }}>{profile.status}</span>
          {(profile.status === "LOCKED" || profile.locked) && (
            <Button onClick={async () => {
              try { await unlockInvestor(investorId); toast("Account unlocked"); const updated = await fetchInvestorProfile(investorId); setProfile(updated); } catch (e) { toast(e.message, "error"); }
            }} style={{ padding: "4px 12px", fontSize: 11, background: "#D97706" }}>Unlock Account</Button>
          )}
        </div>
      </div>

      {/* Groups */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Groups</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profile.groups.length > 0 ? profile.groups.map(g => (
            <span key={g.id} style={{ padding: "4px 12px", borderRadius: 16, fontSize: 12, background: g.color ? `${g.color}20` : colors.lightBorder, color: g.color || "#666", border: `1px solid ${g.color ? `${g.color}40` : "#E0DDD8"}` }}>{g.name}</span>
          )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No groups assigned</span>}
        </div>
      </Card>

      {/* Investment Entities */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={sectionTitle}>Investment Entities</div>
          <Button variant="outline" onClick={() => setShowEntityForm(!showEntityForm)} style={{ padding: "4px 10px", fontSize: 11 }}>{showEntityForm ? "Cancel" : "Add Entity"}</Button>
        </div>
        {showEntityForm && (
          <form onSubmit={handleCreateEntity} style={{ padding: "12px", background: colors.cardBg, borderRadius: 4, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Name</label>
                <input value={entityForm.name} onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))} required style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="Entity name" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Type</label>
                <select value={entityForm.type} onChange={e => setEntityForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}>
                  <option>Individual</option><option>LLC</option><option>Trust</option><option>IRA</option><option>Corporation</option><option>Partnership</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Tax ID</label>
                <input value={entityForm.taxId} onChange={e => setEntityForm(f => ({ ...f, taxId: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="EIN/SSN" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Address</label>
                <input value={entityForm.address} onChange={e => setEntityForm(f => ({ ...f, address: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="123 Main St" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>State/Province</label>
                <input value={entityForm.state} onChange={e => setEntityForm(f => ({ ...f, state: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. BC" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 4 }}>
                <input type="checkbox" checked={entityForm.isDefault} onChange={e => setEntityForm(f => ({ ...f, isDefault: e.target.checked }))} />
                <label style={{ fontSize: 11, color: "#666" }}>Default entity</label>
              </div>
              <Button type="submit" style={{ padding: "6px 12px", fontSize: 11 }}>{editingEntity ? "Save" : "Create"}</Button>
            </div>
          </form>
        )}
        <div className="admin-table-scroll">
        {entities.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 60px 70px 40px 40px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
            <span>Entity Name</span><span>Type</span><span>Tax ID</span><span>State</span><span>Default</span><span></span><span></span>
          </div>
        ) : null}
        {entities.map(e => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 60px 70px 40px 40px", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13, alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 500 }}>{e.name}</span>
              {e.address && <div style={{ fontSize: 11, color: "#999" }}>{e.address}</div>}
            </div>
            <span style={{ color: "#666" }}>{e.type}</span>
            <span style={{ color: colors.mutedText, fontSize: 11 }}>{e.taxId || "\u2014"}</span>
            <span style={{ color: colors.mutedText }}>{e.state || "\u2014"}</span>
            <span>{e.isDefault ? <span style={{ fontSize: 10, padding: "2px 6px", background: "#EFE", color: colors.green, borderRadius: 3 }}>Default</span> : ""}</span>
            <span onClick={() => { setEditingEntity(e); setEntityForm({ name: e.name, type: e.type, taxId: e.taxId || "", address: e.address || "", state: e.state || "", isDefault: e.isDefault }); setShowEntityForm(true); }} style={{ fontSize: 11, color: colors.red, cursor: "pointer" }}>Edit</span>
            <span onClick={() => handleDeleteEntity(e.id)} style={{ fontSize: 14, color: "#CCC", cursor: "pointer" }}>&times;</span>
          </div>
        ))}
        </div>
        {entities.length === 0 && !showEntityForm && <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No entities</span>}
      </Card>

      {/* Projects + KPIs */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Project Investments</div>
        {profile.projects.length > 0 ? profile.projects.map(p => (
          <div key={p.projectId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${colors.lightBorder}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.projectName}</div>
              <div style={{ fontSize: 11, color: colors.mutedText }}>{p.projectStatus}</div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#666", alignItems: "center" }}>
              <span>${fmt(p.committed)} committed</span>
              <span>${fmt(p.currentValue)} value</span>
              <span>{p.irr}% IRR <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "#EFE", color: colors.green, marginLeft: 2, verticalAlign: "middle" }}>calculated</span></span>
              <span>{p.moic}x MOIC <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "#EFE", color: colors.green, marginLeft: 2, verticalAlign: "middle" }}>calculated</span></span>
            </div>
          </div>
        )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No project assignments</span>}

        {/* Assign to Project */}
        <div style={{ marginTop: 16 }}>
          {!showAssignProject ? (
            <Button variant="outline" onClick={async () => {
              const projects = await fetchAdminProjects();
              setAssignProjList(Array.isArray(projects) ? projects : []);
              setShowAssignProject(true);
            }} style={{ fontSize: 12 }}>Assign to Project</Button>
          ) : (
            <div style={{ background: colors.cardBg, borderRadius: 8, padding: "16px", border: "1px solid #E8E5DE", marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Assign to Project</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Project</label>
                <select value={assignProjId} onChange={e => setAssignProjId(e.target.value)} style={inputStyle}>
                  <option value="">Select project...</option>
                  {assignProjList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Committed ($)</label>
                  <input type="number" value={assignProjCommitted} onChange={e => setAssignProjCommitted(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Called ($)</label>
                  <input type="number" value={assignProjCalled} onChange={e => setAssignProjCalled(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Current Value ($)</label>
                  <input type="number" value={assignProjCurrentValue} onChange={e => setAssignProjCurrentValue(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="outline" onClick={() => setShowAssignProject(false)} style={{ fontSize: 12 }}>Cancel</Button>
                <Button disabled={assignProjSaving || !assignProjId} onClick={async () => {
                  setAssignProjSaving(true);
                  try {
                    await assignInvestorProject(investorId, {
                      projectId: assignProjId,
                      committed: Number(assignProjCommitted) || 0,
                      called: Number(assignProjCalled) || 0,
                      currentValue: Number(assignProjCurrentValue) || 0,
                    });
                    toast("Investor assigned to project");
                    const updated = await fetchInvestorProfile(investorId);
                    setProfile(updated);
                    setShowAssignProject(false);
                    setAssignProjId(""); setAssignProjCommitted(""); setAssignProjCalled(""); setAssignProjCurrentValue("");
                  } catch (e) { toast(e.message, "error"); }
                  finally { setAssignProjSaving(false); }
                }} style={{ fontSize: 12, opacity: assignProjSaving ? 0.5 : 1 }}>
                  {assignProjSaving ? "Saving..." : "Assign"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Cash Flows */}
      {profile.projects.length > 0 && (
        <InvestorCashFlowsSection investorId={investorId} investorName={profile.name} projects={profile.projects} toast={toast} />
      )}

      {/* Documents Access */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Document Access ({(profile.documents.assigned.length + profile.documents.projectDocs.length + profile.documents.generalDocs.length)} documents)</div>
        {[...profile.documents.assigned, ...profile.documents.projectDocs, ...profile.documents.generalDocs].slice(0, 10).map((d, i) => (
          <div key={`${d.id}-${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
            <span>{d.name}</span>
            <span style={{ color: colors.mutedText, fontSize: 12 }}>{d.category} · {d.date}</span>
          </div>
        ))}
      </Card>

      {/* Recent Messages */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Recent Messages</div>
        {profile.recentThreads.length > 0 ? profile.recentThreads.map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {t.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.red }} />}
              <span>{t.subject}</span>
            </div>
            <span style={{ color: colors.mutedText, fontSize: 11 }}>{new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {t.targetType}</span>
          </div>
        )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No messages</span>}
      </Card>

      {/* Activity Timeline */}
      <ActivityTimeline userId={investorId} />
    </>
  );
}

// ─── ACTIVITY TIMELINE (audit log for a specific user) ───
function ActivityTimeline({ userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog({ userId, limit: 20 }).then(setActivities).catch(() => setActivities([])).finally(() => setLoading(false));
  }, [userId]);

  const actionIcon = (a) => {
    if (a === "login") return "🔑";
    if (a.includes("download")) return "📥";
    if (a.includes("upload")) return "📤";
    if (a.includes("signature")) return "✍️";
    if (a.includes("profile")) return "👤";
    if (a.includes("message")) return "💬";
    if (a === "logout") return "🚪";
    return "•";
  };

  const section = { background: colors.white, borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Activity Timeline</div>
      {loading ? <p style={{ fontSize: 12, color: "#BBB" }}>Loading...</p> : activities.length === 0 ? (
        <p style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No recorded activity</p>
      ) : (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 8, top: 4, bottom: 4, width: 1, background: "#E8E5DE" }} />
          {activities.map((a, i) => (
            <div key={a.id} style={{ position: "relative", paddingBottom: i < activities.length - 1 ? 16 : 0, fontSize: 13 }}>
              <div style={{ position: "absolute", left: -20, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#F8F7F4", border: "1px solid #E8E5DE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
                {actionIcon(a.action)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{a.action.replace(/_/g, " ")}</span>
                  {a.resource && <span style={{ color: colors.mutedText, marginLeft: 6 }}>{a.resource}</span>}
                </div>
                <span style={{ fontSize: 11, color: "#BBB", whiteSpace: "nowrap", marginLeft: 12 }}>
                  {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
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
      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, marginRight: 6, background: positive ? "#EFE" : "#FEE", color: positive ? colors.green : colors.red }}>
        {positive ? "\u2191" : "\u2193"} {label}: {display}
      </span>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Post a construction update..." style={{ ...inputStyle, flex: 1 }} />
        <Button onClick={handlePostUpdate}>Post</Button>
        {updates.length >= 2 && (
          <Button variant="outline" onClick={() => setCompareMode(!compareMode)} style={{ background: compareMode ? "#FEE" : colors.white, color: compareMode ? colors.red : colors.darkText }}>
            {compareMode ? "Exit Compare" : "Compare"}
          </Button>
        )}
      </div>

      {compareMode && updates.length >= 2 ? (
        <Card style={{ marginBottom: 16 }}>
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
        </Card>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          {updates.length > 0 ? updates.map((u, i) => (
            <div key={u.id} style={{ padding: "12px 0", borderBottom: i < updates.length - 1 ? "1px solid #F5F3F0" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: colors.mutedText }}>{u.date}</div>
                {u.completionPct != null && <span style={{ fontSize: 10, color: colors.mutedText, padding: "2px 6px", border: "1px solid #E8E5DE", borderRadius: 3 }}>{u.completionPct}% complete</span>}
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
                      <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: d.positive ? "#EFE" : "#FEE", color: d.positive ? colors.green : colors.red }}>
                        {d.positive ? "\u2191" : "\u2193"} {d.label}: {d.value}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          )) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No updates posted</p>}
        </Card>
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
    <Card style={{ marginBottom: 16 }}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: "12px 16px", background: colors.cardBg, borderRadius: 4, border: "1px solid #E8E5DE" }}>
        <div>
          <div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em" }}>Capital Called</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: colors.red }}>${fmt(totalContributed)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em" }}>Distributed</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: colors.green }}>${fmt(totalDistributed)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em" }}>Net</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: netCF >= 0 ? colors.green : colors.red }}>{netCF >= 0 ? "+" : "-"}${fmt(Math.abs(netCF))}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Cash Flow History ({cashFlowsList.length} records)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={() => setShowCfModal(true)}>Record Cash Flow</Button>
          <Button variant="outline" onClick={handleRecalculate} disabled={recalculating} style={{ opacity: recalculating ? 0.5 : 1 }}>
            {recalculating ? "Recalculating..." : "Recalculate IRR/MOIC"}
          </Button>
        </div>
      </div>
      {cashFlowsList.length > 0 ? (
        <div className="admin-table-scroll">
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 100px 100px 80px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
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
                  <button type="submit" style={{ fontSize: 10, padding: "3px 6px", background: colors.green, color: colors.white, border: "none", borderRadius: 3, cursor: "pointer" }}>Save</button>
                  <button type="button" onClick={() => setEditingCf(null)} style={{ fontSize: 10, padding: "3px 6px", background: colors.white, color: colors.mutedText, border: "1px solid #DDD", borderRadius: 3, cursor: "pointer" }}>X</button>
                </div>
              </form>
            ) : (
              <div key={cf.id || i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 100px 100px 80px", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
                <span style={{ color: colors.mutedText, fontSize: 12 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                <span style={{ fontWeight: 500 }}>{cf.investorName || `User ${cf.userId}`}</span>
                <span style={{ color: "#666" }}>{cf.description || cf.type}</span>
                <span style={{ textAlign: "right", fontWeight: 500, color: cf.amount < 0 ? colors.red : colors.green }}>
                  {cf.amount < 0 ? `-$${fmt(Math.abs(cf.amount))}` : `+$${fmt(cf.amount)}`}
                </span>
                <span style={{ textAlign: "right", fontSize: 11, color: colors.mutedText, textTransform: "capitalize" }}>{(cf.type || "").replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <span onClick={() => startEdit(cf)} style={{ fontSize: 11, color: "#666", cursor: "pointer" }}>Edit</span>
                  <span onClick={() => handleDelete(cf.id)} style={{ fontSize: 11, color: colors.red, cursor: "pointer" }}>Del</span>
                </div>
              </div>
            )
          ))}
        </div>
      ) : <p style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No cash flows recorded</p>}

      {/* Record Cash Flow Modal */}
      <Modal open={showCfModal} onClose={() => setShowCfModal(false)} title="Record Cash Flow" maxWidth={420}>
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
            <Button variant="outline" type="button" onClick={() => setShowCfModal(false)}>Cancel</Button>
            <Button type="submit">Record</Button>
          </div>
        </form>
      </Modal>
    </Card>
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

  const section = { background: colors.white, borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  if (loading) return <Card style={{ marginBottom: 16 }}><div style={sectionTitle}>Cash Flows</div><p style={{ color: "#BBB", fontSize: 13 }}>Loading...</p></Card>;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Cash Flows ({cashFlows.length} records)</div>
      {cashFlows.length > 0 && (
        <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: "10px 14px", background: colors.cardBg, borderRadius: 4, border: "1px solid #E8E5DE" }}>
          <div><div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase" }}>Total Contributed</div><div style={{ fontSize: 15, fontWeight: 500, color: colors.red }}>${fmt(totalContributed)}</div></div>
          <div><div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase" }}>Total Distributed</div><div style={{ fontSize: 15, fontWeight: 500, color: colors.green }}>${fmt(totalDistributed)}</div></div>
        </div>
      )}
      {cashFlows.length > 0 ? (
        <div className="admin-table-scroll">
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
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
                  <button type="submit" style={{ fontSize: 9, padding: "3px 5px", background: colors.green, color: colors.white, border: "none", borderRadius: 3, cursor: "pointer" }}>OK</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 9, padding: "3px 5px", background: colors.white, color: colors.mutedText, border: "1px solid #DDD", borderRadius: 3, cursor: "pointer" }}>X</button>
                </div>
              </form>
            ) : (
              <div key={cf.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 12 }}>
                <span style={{ color: colors.mutedText, fontSize: 11 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                <span style={{ fontWeight: 500 }}>{cf.projectName}</span>
                <span style={{ color: "#666" }}>{cf.description || cf.type}</span>
                <span style={{ textAlign: "right", fontWeight: 500, color: cf.amount < 0 ? colors.red : colors.green }}>{cf.amount < 0 ? `-$${fmt(Math.abs(cf.amount))}` : `+$${fmt(cf.amount)}`}</span>
                <span style={{ textAlign: "right", fontSize: 10, color: colors.mutedText, textTransform: "capitalize" }}>{(cf.type || "").replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <span onClick={() => startEdit(cf)} style={{ fontSize: 11, color: "#666", cursor: "pointer" }}>Edit</span>
                  <span onClick={() => handleDelete(cf.id)} style={{ fontSize: 11, color: colors.red, cursor: "pointer" }}>Del</span>
                </div>
              </div>
            )
          ))}
        </div>
      ) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No cash flows</span>}
    </Card>
  );
}

// ─── GROUP MANAGER ───
function GroupManager({ toast, hideHeader }) {
  const { investors } = useAdminData();
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(colors.red);
  const [newParentId, setNewParentId] = useState("");
  const [newTier, setNewTier] = useState("primary");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [addSearch, setAddSearch] = useState("");

  useEffect(() => { loadGroups(); }, []);
  function loadGroups() { fetchGroups().then(setGroups); }

  // Build tree structure
  const rootGroups = groups.filter(g => !g.parentId);
  const childGroupsOf = (parentId) => groups.filter(g => g.parentId === parentId);
  const totalMembers = (g) => {
    const children = childGroupsOf(g.id);
    return g.memberCount + children.reduce((s, c) => s + (c.memberCount || 0), 0);
  };

  const tierLabels = { primary: "Primary LP", "sub-lp": "Sub-LP", "fund-of-funds": "Fund of Funds" };
  const tierColors = { primary: colors.green, "sub-lp": "#8B7128", "fund-of-funds": "#4466AA" };

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
      {!hideHeader && <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 24 }}>Investor Groups</h1>}

      {/* Create group */}
      <form onSubmit={handleCreate} className="admin-form-row" style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
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
        <Button type="submit">Create Group</Button>
      </form>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Group list */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <Card padding="0" style={{ overflow: "hidden" }}>
            {groups.length === 0 ? <div style={{ padding: 20, color: colors.mutedText, textAlign: "center", fontSize: 13 }}>No groups yet</div> : (() => {
              const renderGroup = (g, indent = 0) => {
                const children = childGroupsOf(g.id);
                return [
                  <div key={g.id} onClick={() => openGroup(g.id)} style={{
                    padding: "12px 16px", paddingLeft: 16 + indent * 20, borderBottom: `1px solid ${colors.lightBorder}`,
                    cursor: "pointer", background: selectedGroup === g.id ? "#F8F7F4" : colors.white,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {indent > 0 && <span style={{ color: "#CCC", fontSize: 10 }}>&#x2514;</span>}
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color || "#CCC" }} />
                      <span style={{ fontSize: 13, fontWeight: selectedGroup === g.id ? 500 : 400 }}>{g.name}</span>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${tierColors[g.tier] || "#999"}15`, color: tierColors[g.tier] || "#999" }}>{tierLabels[g.tier] || g.tier}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: colors.mutedText }}>{totalMembers(g)}</span>
                      <span onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }} style={{ fontSize: 14, color: "#CCC", cursor: "pointer" }}>&times;</span>
                    </div>
                  </div>,
                  ...children.flatMap(c => renderGroup(c, indent + 1)),
                ];
              };
              return rootGroups.flatMap(g => renderGroup(g));
            })()}
          </Card>
        </div>

        {/* Group detail */}
        <div style={{ flex: 1 }}>
          {groupDetail ? (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: groupDetail.color || "#CCC" }} />
                <h2 style={{ fontSize: 18, fontWeight: 500 }}>{groupDetail.name}</h2>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: `${tierColors[groupDetail.tier] || "#999"}15`, color: tierColors[groupDetail.tier] || "#999" }}>{tierLabels[groupDetail.tier] || groupDetail.tier}</span>
                <span style={{ fontSize: 12, color: colors.mutedText }}>{groupDetail.members.length} members</span>
              </div>
              {groupDetail.parent && (
                <div style={{ fontSize: 12, color: colors.mutedText, marginBottom: 12 }}>Parent: <strong onClick={() => openGroup(groupDetail.parent.id)} style={{ cursor: "pointer", color: colors.red }}>{groupDetail.parent.name}</strong></div>
              )}
              {groupDetail.children && groupDetail.children.length > 0 && (
                <div style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>
                  Sub-groups: {groupDetail.children.map((c, i) => (
                    <span key={c.id}><strong onClick={() => openGroup(c.id)} style={{ cursor: "pointer", color: colors.red }}>{c.name}</strong> ({c.memberCount}){i < groupDetail.children.length - 1 ? ", " : ""}</span>
                  ))}
                </div>
              )}

              {/* Add member search */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search investors to add..." style={inputStyle} />
                {addResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: colors.white, border: "1px solid #E8E5DE", borderTop: "none", borderRadius: "0 0 4px 4px", zIndex: 10, maxHeight: 180, overflow: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
                    {addResults.slice(0, 6).map(inv => (
                      <div key={inv.id} onClick={() => { handleAddMember(inv.id); setAddSearch(""); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${colors.lightBorder}` }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8F7F4"}
                        onMouseLeave={e => e.currentTarget.style.background = colors.white}>
                        <span style={{ fontWeight: 500 }}>{inv.name}</span>
                        <span style={{ color: colors.mutedText, marginLeft: 8, fontSize: 12 }}>{inv.email}</span>
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
                    <span style={{ fontSize: 12, color: colors.mutedText, marginLeft: 10 }}>{m.email}</span>
                  </div>
                  <span onClick={() => handleRemoveMember(m.id)} style={{ fontSize: 12, color: colors.red, cursor: "pointer" }}>Remove</span>
                </div>
              ))}
              {groupDetail.members.length === 0 && <div style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No members — search above to add investors</div>}
            </Card>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>Select a group to manage members</div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── STAFF MANAGER ───
// ─── TOGGLE SWITCH COMPONENT ───
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 10, position: "relative", transition: "background .2s",
        background: checked ? colors.red : "#DDD", cursor: "pointer",
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: colors.white, position: "absolute", top: 2,
          left: checked ? 18 : 2, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </div>
      <span style={{ color: checked ? colors.darkText : "#999" }}>{label}</span>
    </label>
  );
}

// Permission groups for intuitive UI
const PERMISSION_GROUPS = {
  "Navigation Access": {
    description: "Control which pages this user can access",
    flags: [
      { key: "dashboard", label: "Dashboard" },
      { key: "projects", label: "Projects" },
      { key: "investors", label: "Investors" },
      { key: "documents", label: "Documents" },
      { key: "inbox", label: "Inbox / Messages" },
      { key: "signatures", label: "Signatures" },
      { key: "finance", label: "Financial Tools" },
      { key: "prospects", label: "Prospects" },
      { key: "audit", label: "Audit Log" },
      { key: "settings", label: "Settings" },
    ],
  },
  "Staff Management": {
    description: "Who can manage other users",
    flags: [
      { key: "staff", label: "Manage Staff" },
      { key: "inviteUsers", label: "Invite New Users" },
      { key: "deactivateUsers", label: "Deactivate Users" },
      { key: "groups", label: "Manage Groups" },
    ],
  },
  "Content Actions": {
    description: "What actions this user can perform",
    flags: [
      { key: "uploadDocuments", label: "Upload Documents" },
      { key: "editKPIs", label: "Edit Project KPIs" },
      { key: "manageWaterfall", label: "Configure Waterfall" },
      { key: "exportData", label: "Export Data (CSV/PDF)" },
      { key: "bulkOperations", label: "Bulk Operations" },
    ],
  },
  "Audit & Compliance": {
    description: "Access to sensitive operational data",
    flags: [
      { key: "viewAuditLog", label: "View Audit Log" },
    ],
  },
};

// Permission presets
const PRESETS = {
  "Full Admin": Object.fromEntries(
    Object.values(PERMISSION_GROUPS).flatMap(g => g.flags.map(f => [f.key, true]))
  ),
  "Project Manager": {
    dashboard: true, projects: true, investors: true, documents: true, inbox: true, signatures: true,
    finance: true, prospects: false, audit: false, settings: false, staff: false, inviteUsers: false,
    deactivateUsers: false, groups: false, uploadDocuments: true, editKPIs: true, manageWaterfall: false,
    exportData: true, bulkOperations: false, viewAuditLog: false,
  },
  "Accounting": {
    dashboard: true, projects: true, investors: true, documents: true, inbox: false, signatures: false,
    finance: true, prospects: false, audit: true, settings: false, staff: false, inviteUsers: false,
    deactivateUsers: false, groups: false, uploadDocuments: true, editKPIs: false, manageWaterfall: false,
    exportData: true, bulkOperations: false, viewAuditLog: true,
  },
  "Read Only": Object.fromEntries(
    Object.values(PERMISSION_GROUPS).flatMap(g => g.flags.map(f => [f.key, ["dashboard", "projects", "investors", "documents"].includes(f.key)]))
  ),
};

function StaffManager({ toast, hideHeader }) {
  const [staff, setStaff] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("ADMIN");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffFlags, setStaffFlags] = useState(null);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [credentialDialog, setCredentialDialog] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => { loadStaff(); }, []);
  function loadStaff() { fetchStaff().then(setStaff).catch(() => toast("Failed to load staff", "error")); }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      const result = await createStaff({ name, email, role });
      setCredentialDialog({ name: result.name, email, tempPassword: result.tempPassword, action: "created" });
      setShowAdd(false); setName(""); setEmail(""); setRole("ADMIN"); loadStaff();
    } catch (err) { toast(err.message, "error"); }
  }

  function handleUpdate(id, data) {
    if (data.role) {
      setConfirmAction({ title: "Change Role", message: `Change this user's role to ${data.role}?`, onConfirm: async () => { setConfirmAction(null); try { await updateStaff(id, data); toast("Updated"); loadStaff(); } catch (e) { toast(e.message, "error"); } } });
      return;
    }
    updateStaff(id, data).then(() => { toast("Updated"); loadStaff(); }).catch(e => toast(e.message, "error"));
  }

  function handleDeactivate(s) {
    setConfirmAction({ title: "Deactivate Staff", message: `Deactivate ${s.name}? They will no longer be able to log in.`, danger: true, onConfirm: async () => { setConfirmAction(null); try { await deactivateStaff(s.id); toast(`${s.name} deactivated`); loadStaff(); if (selectedStaff?.id === s.id) setSelectedStaff(null); } catch (e) { toast(e.message, "error"); } } });
  }

  async function handleReactivate(s) {
    try { await reactivateStaff(s.id); toast(`${s.name} reactivated`); loadStaff(); } catch (e) { toast(e.message, "error"); }
  }

  function handleResetPassword(s) {
    setConfirmAction({ title: "Reset Password", message: `Reset password for ${s.name}? A new temporary password will be emailed to them.`, onConfirm: async () => { setConfirmAction(null); try { const result = await resetStaffPassword(s.id); setCredentialDialog({ name: s.name, email: s.email, tempPassword: result.tempPassword, action: "reset" }); } catch (e) { toast(e.message, "error"); } } });
  }

  async function openPermissions(s) {
    setSelectedStaff(s);
    setLoadingFlags(true);
    try {
      const data = await fetchUserFlags(s.id);
      setStaffFlags(data.overrides || {});
    } catch { setStaffFlags({}); }
    finally { setLoadingFlags(false); }
  }

  async function toggleFlag(key, value) {
    const updated = { ...staffFlags, [key]: value };
    setStaffFlags(updated);
    try {
      await updateUserFlags(selectedStaff.id, { [key]: value });
    } catch (e) { toast(e.message, "error"); }
  }

  async function applyPreset(presetName) {
    const preset = PRESETS[presetName];
    setStaffFlags(preset);
    try {
      await updateUserFlags(selectedStaff.id, preset);
      toast(`Applied "${presetName}" preset`);
    } catch (e) { toast(e.message, "error"); }
  }

  return (
    <>
      {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
      {!hideHeader && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300 }}>Company Staff</h1>
      </div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "Add Staff"}</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="admin-form-row" style={{ background: colors.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
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
          <Button type="submit">Add</Button>
        </form>
      )}

      <div className="admin-perm-grid" style={{ display: "grid", gridTemplateColumns: selectedStaff ? "1fr 1fr" : "1fr", gap: 24 }}>
        {/* Staff list */}
        <Card padding="0" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {staff.length} Staff Members — click to manage permissions
          </div>
          {staff.map(s => (
            <div key={s.id} onClick={() => openPermissions(s)} style={{
              padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", transition: "background .15s",
              background: selectedStaff?.id === s.id ? "#FFF5F5" : colors.white,
              borderLeft: selectedStaff?.id === s.id ? `3px solid ${colors.red}` : "3px solid transparent",
            }}
              onMouseEnter={e => { if (selectedStaff?.id !== s.id) e.currentTarget.style.background = colors.cardBg; }}
              onMouseLeave={e => { if (selectedStaff?.id !== s.id) e.currentTarget.style.background = colors.white; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select value={s.role} onChange={e => { e.stopPropagation(); handleUpdate(s.id, { role: e.target.value }); }} onClick={e => e.stopPropagation()} style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, width: "auto" }}>
                    <option value="ADMIN">Admin</option>
                    <option value="GP">GP</option>
                  </select>
                  <Button variant="outline" onClick={e => { e.stopPropagation(); handleResetPassword(s); }} title="Reset password" style={{ padding: "3px 8px", fontSize: 10 }}>Reset PW</Button>
                  {s.status === "ACTIVE" ? (
                    <Button variant="outline" onClick={e => { e.stopPropagation(); handleDeactivate(s); }} title="Deactivate" style={{ padding: "3px 8px", fontSize: 10, color: colors.red, borderColor: colors.red }}>Deactivate</Button>
                  ) : (
                    <Button variant="outline" onClick={e => { e.stopPropagation(); handleReactivate(s); }} title="Reactivate" style={{ padding: "3px 8px", fontSize: 10, color: colors.green, borderColor: colors.green }}>Reactivate</Button>
                  )}
                  <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 10, background: s.status === "ACTIVE" ? "#EFE" : "#FEE", color: s.status === "ACTIVE" ? colors.green : colors.red }}>{s.status}</span>
                </div>
              </div>
            </div>
          ))}
          {staff.length === 0 && <div style={{ padding: 24, color: colors.mutedText, textAlign: "center" }}>No staff members</div>}
        </Card>

        {/* Permissions panel */}
        {selectedStaff && (
          <div style={{ background: colors.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8E5DE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Permissions: {selectedStaff.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Role: {selectedStaff.role}</div>
              </div>
              <Button variant="outline" onClick={() => setSelectedStaff(null)} style={{ padding: "4px 12px", fontSize: 11 }}>Close</Button>
            </div>

            {/* Quick presets */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}`, background: colors.cardBg }}>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Quick Presets</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(PRESETS).map(p => (
                  <Button variant="outline" key={p} onClick={() => applyPreset(p)} 
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.red; e.currentTarget.style.color = colors.red; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#DDD"; e.currentTarget.style.color = colors.darkText; }} style={{ padding: "5px 12px", fontSize: 11, borderRadius: 16,
                    background: colors.white, borderColor: "#DDD" }}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {loadingFlags ? <Spinner /> : (
              <div style={{ maxHeight: 480, overflowY: "auto" }}>
                {Object.entries(PERMISSION_GROUPS).map(([groupName, group]) => (
                  <div key={groupName} style={{ padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{groupName}</div>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>{group.description}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {group.flags.map(f => (
                        <Toggle key={f.key} label={f.label} checked={staffFlags?.[f.key] !== false} onChange={v => toggleFlag(f.key, v)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credential dialog */}
      <Modal open={!!credentialDialog} onClose={() => setCredentialDialog(null)} title={credentialDialog?.action === "created" ? "Staff Member Created" : "Password Reset"} maxWidth={440}>
        {credentialDialog && (
          <>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>
              {credentialDialog.action === "created"
                ? `${credentialDialog.name} has been added and a welcome email has been sent.`
                : `Password has been reset for ${credentialDialog.name} and an email has been sent.`}
            </p>
            <div style={{ background: colors.cardBg, border: "1px solid #ECEAE5", borderRadius: 8, padding: "16px 20px", marginBottom: 16, fontFamily: "monospace", fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>Email: <strong>{credentialDialog.email}</strong></div>
              <div>Password: <strong>{credentialDialog.tempPassword}</strong></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(credentialDialog.tempPassword); toast("Password copied"); }}>Copy Password</Button>
              <Button onClick={() => setCredentialDialog(null)}>Done</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

// ─── STATEMENT MANAGER ───
function StatementManager({ toast }) {
  const { projects: stmtProjects } = useAdminData();
  const [statements, setStatements] = useState([]);
  const [filter, setFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [stmtSearch, setStmtSearch] = useState("");
  const stmtSort = useSortable("createdAt", "desc");

  // Detail/preview panel
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("preview"); // preview | data

  // Rejection modal
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Generate form - period inputs
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genPeriod, setGenPeriod] = useState("");
  const [genPeriodStart, setGenPeriodStart] = useState("");
  const [genPeriodEnd, setGenPeriodEnd] = useState("");

  // Capital call form state
  const [showCapCallForm, setShowCapCallForm] = useState(false);
  const [capCallProjectId, setCapCallProjectId] = useState("");
  const [capCallAmount, setCapCallAmount] = useState("");
  const [capCallDueDate, setCapCallDueDate] = useState("");
  const [capCallWireInstructions, setCapCallWireInstructions] = useState("");
  const [capCallGenerating, setCapCallGenerating] = useState(false);

  // Quarterly report form state
  const [showQtrReportForm, setShowQtrReportForm] = useState(false);
  const [qtrReportProjectId, setQtrReportProjectId] = useState("");
  const [qtrReportQuarter, setQtrReportQuarter] = useState("");
  const [qtrReportSummary, setQtrReportSummary] = useState("");
  const [qtrReportGenerating, setQtrReportGenerating] = useState(false);

  const authHeader = { Authorization: `Bearer ${localStorage.getItem("northstar_token")}` };

  useEffect(() => { loadStatements(); }, [filter]);

  async function loadStatements() {
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const data = await (await fetch(`/api/v1/statements${qs}`, { headers: authHeader })).json();
      setStatements(Array.isArray(data) ? data : []);
    } catch { setStatements([]); }
  }

  async function loadDetail(id) {
    setSelectedId(id);
    setDetailLoading(true);
    setDetailTab("preview");
    try {
      const res = await fetch(`/api/v1/statements/${id}`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed to load statement");
      setDetail(await res.json());
    } catch (e) { toast(e.message, "error"); setDetail(null); }
    finally { setDetailLoading(false); }
  }

  function closeDetail() { setSelectedId(null); setDetail(null); }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const body = {};
      if (genPeriod) body.period = genPeriod;
      if (genPeriodStart) body.periodStart = genPeriodStart;
      if (genPeriodEnd) body.periodEnd = genPeriodEnd;
      const res = await fetch("/api/v1/statements/generate", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      toast(`Generated ${data.count} draft statement(s)`);
      setShowGenerateForm(false);
      setGenPeriod(""); setGenPeriodStart(""); setGenPeriodEnd("");
      loadStatements();
    } catch (e) { toast(e.message, "error"); }
    finally { setGenerating(false); }
  }

  async function handleApprove(id) {
    try {
      await fetch(`/api/v1/statements/${id}/approve`, { method: "POST", headers: authHeader });
      toast("Statement approved");
      loadStatements();
      if (selectedId === id) loadDetail(id);
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleSend(id) {
    try {
      await fetch(`/api/v1/statements/${id}/send`, { method: "POST", headers: authHeader });
      toast("Statement sent");
      loadStatements();
      if (selectedId === id) loadDetail(id);
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleReject(id, reason) {
    try {
      await fetch(`/api/v1/statements/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ reason: reason || "Needs revision" }),
      });
      toast("Statement reverted to draft");
      setRejectingId(null);
      setRejectReason("");
      loadStatements();
      if (selectedId === id) loadDetail(id);
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleBulkApprove() {
    const ids = statements.filter(s => s.status === "DRAFT").map(s => s.id);
    if (ids.length === 0) return toast("No drafts to approve", "error");
    try {
      await fetch("/api/v1/statements/bulk-approve", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ ids }),
      });
      toast(`Approved ${ids.length} statement(s)`);
      loadStatements();
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleBulkSend() {
    const ids = statements.filter(s => s.status === "APPROVED").map(s => s.id);
    if (ids.length === 0) return toast("No approved statements to send", "error");
    try {
      await fetch("/api/v1/statements/bulk-send", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ ids }),
      });
      toast(`Sent ${ids.length} statement(s)`);
      loadStatements();
    } catch (e) { toast(e.message, "error"); }
  }

  const statusColors = { DRAFT: { bg: "#FFF8E1", text: "#B8860B" }, APPROVED: { bg: "#E8F5E9", text: colors.green }, SENT: { bg: "#E3F2FD", text: "#1565C0" }, REJECTED: { bg: "#FFEBEE", text: colors.red } };
  const drafts = statements.filter(s => s.status === "DRAFT").length;
  const approved = statements.filter(s => s.status === "APPROVED").length;
  const sent = statements.filter(s => s.status === "SENT").length;
  const cardShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)";
  const labelStyle = { display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 };

  // Filter + search
  const filteredStatements = statements.filter(s => {
    if (!stmtSearch) return true;
    const q = stmtSearch.toLowerCase();
    return (s.investorName || "").toLowerCase().includes(q)
      || (s.projectName || "").toLowerCase().includes(q)
      || (s.period || "").toLowerCase().includes(q)
      || (s.investorEmail || "").toLowerCase().includes(q);
  });

  // Format currency helper
  const fc = (v) => v != null ? "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "--";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 300 }}>Statements</h1>
            <p style={{ fontSize: 13, color: colors.mutedText, marginTop: 4 }}>Generate, review, and send capital account statements</p>
          </div>
          {drafts > 0 && (
            <span style={{ background: "#FFF8E1", color: "#B8860B", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12, marginLeft: 8 }}>
              {drafts} awaiting approval
            </span>
          )}
        </div>
        <Button onClick={() => setShowGenerateForm(!showGenerateForm)} disabled={generating}>
          {generating ? "Generating..." : "Generate All"}
        </Button>
      </div>

      {/* Generate form with period inputs */}
      {showGenerateForm && (
        <div style={{ background: colors.white, borderRadius: 12, padding: 24, boxShadow: cardShadow, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 20 }}>Generate Statements</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <FormInput label="Period Label" value={genPeriod} onChange={e => setGenPeriod(e.target.value)} placeholder="Q1 2026" style={{ flex: 1 }} />
            <FormInput label="Period Start" type="date" value={genPeriodStart} onChange={e => setGenPeriodStart(e.target.value)} style={{ flex: 1 }} />
            <FormInput label="Period End" type="date" value={genPeriodEnd} onChange={e => setGenPeriodEnd(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setShowGenerateForm(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating} style={{ opacity: generating ? 0.5 : 1 }}>
              {generating ? "Generating..." : "Generate Draft Statements"}
            </Button>
          </div>
        </div>
      )}

      {/* Workflow status cards */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Drafts", count: drafts, color: "#B8860B", action: drafts > 0 ? "Approve All" : null, onClick: handleBulkApprove },
          { label: "Approved", count: approved, color: colors.green, action: approved > 0 ? "Send All" : null, onClick: handleBulkSend },
          { label: "Sent", count: sent, color: "#1565C0", action: null },
        ].map((c, i) => (
          <div key={i} style={{ background: colors.white, borderRadius: 12, padding: "20px 24px", boxShadow: cardShadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 300, color: c.color }}>{c.count}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{c.label}</div>
              </div>
              {c.action && <Button variant="outline" onClick={c.onClick} style={{ padding: "6px 14px", fontSize: 11, color: c.color, borderColor: c.color }}>{c.action}</Button>}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 0, background: colors.white, borderRadius: 8, overflow: "hidden", border: "1px solid #E8E5DE", flex: 1 }}>
          {["all", "DRAFT", "APPROVED", "SENT"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 20px", fontSize: 12, border: "none", cursor: "pointer", fontFamily: fonts.sans, flex: 1,
              background: filter === f ? colors.red : colors.white, color: filter === f ? colors.white : "#666",
              transition: "background .15s, color .15s",
            }}>{f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <SearchBox value={stmtSearch} onChange={setStmtSearch} placeholder="Search statements..." />
      </div>

      {/* Rejection reason modal */}
      <Modal open={!!rejectingId} onClose={() => { setRejectingId(null); setRejectReason(""); }} title="Reject Statement" maxWidth={420}>
        <label style={labelStyle}>Reason for rejection</label>
        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
          placeholder="Describe what needs to be revised..."
          style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Button>
          <Button onClick={() => handleReject(rejectingId, rejectReason)} style={{ background: colors.red }}>
            Reject Statement
          </Button>
        </div>
      </Modal>

      {/* Statement detail panel */}
      {selectedId && (
        <div style={{ background: colors.white, borderRadius: 12, boxShadow: cardShadow, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #E8E5DE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button variant="outline" onClick={closeDetail} style={{ padding: "4px 10px", fontSize: 11 }}>Back</Button>
              <span style={{ fontWeight: 500, fontSize: 15 }}>Statement Detail</span>
              {detail && (
                <span style={{
                  padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                  background: statusColors[detail.status]?.bg || "#F5F5F5",
                  color: statusColors[detail.status]?.text || "#666",
                }}>{detail.status}</span>
              )}
            </div>
            {detail && (
              <div style={{ display: "flex", gap: 8 }}>
                {detail.status === "DRAFT" && (
                  <>
                    <Button variant="outline" onClick={() => handleApprove(detail.id)} style={{ padding: "6px 14px", fontSize: 11, color: colors.green, borderColor: colors.green }}>Approve</Button>
                    <Button variant="outline" onClick={() => { setRejectingId(detail.id); }} style={{ padding: "6px 14px", fontSize: 11, color: "#999" }}>Reject</Button>
                  </>
                )}
                {detail.status === "APPROVED" && (
                  <>
                    <Button onClick={() => handleSend(detail.id)} style={{ padding: "6px 14px", fontSize: 11 }}>Send</Button>
                    <Button variant="outline" onClick={() => { setRejectingId(detail.id); }} style={{ padding: "6px 14px", fontSize: 11, color: "#999" }}>Reject</Button>
                  </>
                )}
              </div>
            )}
          </div>

          {detailLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>Loading statement...</div>
          ) : detail ? (
            <>
              {/* Detail header info */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.lightBorder}`, display: "flex", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Investor</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{detail.investorName}</div>
                  <div style={{ fontSize: 12, color: colors.mutedText }}>{detail.investorEmail}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Project</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{detail.projectName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Period</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{detail.period || "--"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Created</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{new Date(detail.createdAt).toLocaleDateString()} by {detail.createdByName || "System"}</div>
                </div>
                {detail.approvedByName && (
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Approved</div>
                    <div style={{ fontSize: 13, marginTop: 2, color: colors.green }}>{detail.approvedByName} on {new Date(detail.approvedAt).toLocaleDateString()}</div>
                  </div>
                )}
                {detail.sentAt && (
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Sent</div>
                    <div style={{ fontSize: 13, marginTop: 2, color: "#1565C0" }}>{new Date(detail.sentAt).toLocaleDateString()}</div>
                  </div>
                )}
                {detail.rejectReason && (
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Rejection Reason</div>
                    <div style={{ fontSize: 13, marginTop: 2, color: colors.red }}>{detail.rejectReason}</div>
                  </div>
                )}
              </div>

              {/* Tabs: Preview / Data */}
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E8E5DE" }}>
                {[{ key: "preview", label: "HTML Preview" }, { key: "data", label: "Statement Data" }].map(t => (
                  <button key={t.key} onClick={() => setDetailTab(t.key)} style={{
                    padding: "10px 20px", fontSize: 12, border: "none", cursor: "pointer", fontFamily: fonts.sans,
                    background: detailTab === t.key ? "#F8F7F4" : colors.white, color: detailTab === t.key ? colors.red : "#666",
                    borderBottom: detailTab === t.key ? `2px solid ${colors.red}` : "2px solid transparent",
                    transition: "all .15s",
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Tab content */}
              {detailTab === "preview" && (
                <div style={{ padding: 24 }}>
                  {detail.html ? (
                    <div style={{ border: "1px solid #E8E5DE", borderRadius: 8, overflow: "hidden", background: colors.white }}>
                      <div dangerouslySetInnerHTML={{ __html: detail.html }}
                        style={{ padding: 24, maxHeight: 600, overflowY: "auto", fontSize: 13, lineHeight: 1.6 }} />
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: 40, color: colors.mutedText, fontSize: 13 }}>No HTML preview available for this statement.</div>
                  )}
                </div>
              )}

              {detailTab === "data" && (
                <div style={{ padding: 24 }}>
                  {detail.data ? (() => {
                    const d = typeof detail.data === "string" ? JSON.parse(detail.data) : detail.data;
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* Investor Info */}
                        {d.investor && (
                          <div style={{ background: colors.cardBg, borderRadius: 8, padding: 16, border: `1px solid ${colors.lightBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Investor Info</div>
                            {Object.entries(d.investor).map(([k, v]) => (
                              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: `1px solid ${colors.lightBorder}` }}>
                                <span style={{ color: colors.mutedText }}>{k}</span>
                                <span style={{ fontWeight: 500 }}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Project Info */}
                        {d.project && (
                          <div style={{ background: colors.cardBg, borderRadius: 8, padding: 16, border: `1px solid ${colors.lightBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Project Info</div>
                            {Object.entries(d.project).map(([k, v]) => (
                              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: `1px solid ${colors.lightBorder}` }}>
                                <span style={{ color: colors.mutedText }}>{k}</span>
                                <span style={{ fontWeight: 500 }}>{typeof v === "number" ? fc(v) : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Account Summary */}
                        {d.accountSummary && (
                          <div style={{ background: colors.cardBg, borderRadius: 8, padding: 16, border: `1px solid ${colors.lightBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Account Summary</div>
                            {Object.entries(d.accountSummary).map(([k, v]) => (
                              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: `1px solid ${colors.lightBorder}` }}>
                                <span style={{ color: colors.mutedText }}>{k}</span>
                                <span style={{ fontWeight: 500 }}>{typeof v === "number" ? fc(v) : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Transaction History */}
                        {d.transactions && Array.isArray(d.transactions) && d.transactions.length > 0 && (
                          <div style={{ background: colors.cardBg, borderRadius: 8, padding: 16, border: `1px solid ${colors.lightBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Transaction History</div>
                            {d.transactions.map((tx, ti) => (
                              <div key={ti} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: `1px solid ${colors.lightBorder}` }}>
                                <span style={{ color: colors.mutedText }}>{tx.date || tx.type || `#${ti + 1}`}</span>
                                <span style={{ fontWeight: 500 }}>{tx.description || tx.type || ""} {tx.amount != null ? fc(tx.amount) : ""}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Fallback: show raw keys not covered above */}
                        {Object.entries(d).filter(([k]) => !["investor", "project", "accountSummary", "transactions"].includes(k)).map(([k, v]) => (
                          <div key={k} style={{ background: colors.cardBg, borderRadius: 8, padding: 16, border: `1px solid ${colors.lightBorder}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>{k}</div>
                            <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, color: "#444" }}>{typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}</pre>
                          </div>
                        ))}
                      </div>
                    );
                  })() : (
                    <div style={{ textAlign: "center", padding: 40, color: colors.mutedText, fontSize: 13 }}>No parsed data available for this statement.</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>Failed to load statement detail.</div>
          )}
        </div>
      )}

      {/* Statement list table */}
      <div style={{ background: colors.white, borderRadius: 12, overflow: "hidden", boxShadow: cardShadow }}>
        {filteredStatements.length === 0 ? (
          <EmptyState title="No statements" subtitle={stmtSearch ? "No statements match your search" : "Click 'Generate All' to create draft statements for all investors"} />
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 100px 160px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", alignItems: "center" }}>
              <SortableHeader columns={[
                { key: "investorName", label: "Investor" },
                { key: "projectName", label: "Project" },
                { key: "period", label: "Period" },
                { key: "committed", label: "Committed" },
                { key: "nav", label: "NAV" },
                { key: "status", label: "Status" },
              ]} sortBy={stmtSort.sortBy} sortDir={stmtSort.sortDir} onSort={stmtSort.onSort} />
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>Date</span>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>Actions</span>
            </div>
            {/* Table rows */}
            {stmtSort.sortData(filteredStatements).map((s, i) => (
              <div key={s.id} onClick={() => loadDetail(s.id)} style={{
                display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 100px 160px",
                padding: "12px 20px", borderBottom: i < filteredStatements.length - 1 ? `1px solid ${colors.lightBorder}` : "none",
                alignItems: "center", cursor: "pointer", fontSize: 13,
                background: selectedId === s.id ? "#FBF9F6" : colors.white,
                transition: "background .1s",
              }}
                onMouseEnter={e => { if (selectedId !== s.id) e.currentTarget.style.background = colors.cardBg; }}
                onMouseLeave={e => { if (selectedId !== s.id) e.currentTarget.style.background = colors.white; }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{s.investorName || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{s.investorEmail || ""}</div>
                </div>
                <span style={{ color: "#555" }}>{s.projectName || "--"}</span>
                <span style={{ color: "#555", fontSize: 12 }}>{s.period || "--"}</span>
                <span style={{ fontSize: 12, color: "#555" }}>{s.committed != null ? fc(s.committed) : "--"}</span>
                <span style={{ fontSize: 12, color: "#555" }}>{s.nav != null ? fc(s.nav) : "--"}</span>
                <div>
                  <span style={{
                    padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                    background: statusColors[s.status]?.bg || "#F5F5F5",
                    color: statusColors[s.status]?.text || "#666",
                  }}>{s.status}</span>
                  {s.status === "APPROVED" && s.approvedByName && (
                    <div style={{ fontSize: 10, color: colors.green, marginTop: 2 }}>by {s.approvedByName}</div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "#888" }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  {s.status === "DRAFT" && (
                    <Button variant="outline" onClick={() => handleApprove(s.id)} style={{ padding: "4px 10px", fontSize: 10, color: colors.green, borderColor: colors.green }}>Approve</Button>
                  )}
                  {s.status === "APPROVED" && (
                    <>
                      <Button onClick={() => handleSend(s.id)} style={{ padding: "4px 10px", fontSize: 10 }}>Send</Button>
                      <Button variant="outline" onClick={() => { setRejectingId(s.id); }} style={{ padding: "4px 10px", fontSize: 10, color: "#999" }}>Reject</Button>
                    </>
                  )}
                  {s.status === "SENT" && s.sentAt && <span style={{ fontSize: 10, color: "#999" }}>Sent {new Date(s.sentAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Generate Capital Call */}
      <div style={{ marginTop: 32 }}>
        {!showCapCallForm ? (
          <Button variant="outline" onClick={() => setShowCapCallForm(true)}>Generate Capital Call</Button>
        ) : (
          <div style={{ background: colors.white, borderRadius: 12, padding: "24px", boxShadow: cardShadow }}>
            <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 20 }}>Generate Capital Call</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Project</label>
                <select value={capCallProjectId} onChange={e => setCapCallProjectId(e.target.value)} style={inputStyle} required>
                  <option value="">Select project...</option>
                  {stmtProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <FormInput label="Call Amount ($)" type="number" value={capCallAmount} onChange={e => setCapCallAmount(e.target.value)} placeholder="500000" style={{ flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <FormInput label="Due Date" type="date" value={capCallDueDate} onChange={e => setCapCallDueDate(e.target.value)} style={{ flex: 1 }} />
              <FormInput label="Wire Instructions" value={capCallWireInstructions} onChange={e => setCapCallWireInstructions(e.target.value)} placeholder="Bank name, routing, account..." style={{ flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setShowCapCallForm(false)}>Cancel</Button>
              <Button disabled={capCallGenerating || !capCallProjectId || !capCallAmount} onClick={async () => {
                setCapCallGenerating(true);
                try {
                  const res = await fetch("/api/v1/statements/generate-capital-call", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeader },
                    body: JSON.stringify({ projectId: capCallProjectId, callAmount: Number(capCallAmount), dueDate: capCallDueDate, wireInstructions: capCallWireInstructions }),
                  });
                  if (!res.ok) throw new Error("Failed to generate capital call");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "capital-call.pdf"; a.click();
                  URL.revokeObjectURL(url);
                  toast("Capital call generated and downloaded");
                  setShowCapCallForm(false);
                  setCapCallProjectId(""); setCapCallAmount(""); setCapCallDueDate(""); setCapCallWireInstructions("");
                } catch (e) { toast(e.message, "error"); }
                finally { setCapCallGenerating(false); }
              }} style={{ opacity: capCallGenerating ? 0.5 : 1 }}>
                {capCallGenerating ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Quarterly Report */}
      <div style={{ marginTop: 16 }}>
        {!showQtrReportForm ? (
          <Button variant="outline" onClick={() => setShowQtrReportForm(true)}>Generate Quarterly Report</Button>
        ) : (
          <div style={{ background: colors.white, borderRadius: 12, padding: "24px", boxShadow: cardShadow }}>
            <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 20 }}>Generate Quarterly Report</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Project</label>
                <select value={qtrReportProjectId} onChange={e => setQtrReportProjectId(e.target.value)} style={inputStyle} required>
                  <option value="">Select project...</option>
                  {stmtProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <FormInput label="Quarter" value={qtrReportQuarter} onChange={e => setQtrReportQuarter(e.target.value)} placeholder="Q1 2026" style={{ flex: 1 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Summary</label>
              <textarea value={qtrReportSummary} onChange={e => setQtrReportSummary(e.target.value)} rows={4} placeholder="Quarterly performance summary..." style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setShowQtrReportForm(false)}>Cancel</Button>
              <Button disabled={qtrReportGenerating || !qtrReportProjectId || !qtrReportQuarter} onClick={async () => {
                setQtrReportGenerating(true);
                try {
                  const res = await fetch("/api/v1/statements/generate-quarterly-report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeader },
                    body: JSON.stringify({ projectId: qtrReportProjectId, quarter: qtrReportQuarter, summary: qtrReportSummary }),
                  });
                  if (!res.ok) throw new Error("Failed to generate quarterly report");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `quarterly-report-${qtrReportQuarter.replace(/\s/g, "-")}.pdf`; a.click();
                  URL.revokeObjectURL(url);
                  toast("Quarterly report generated and downloaded");
                  setShowQtrReportForm(false);
                  setQtrReportProjectId(""); setQtrReportQuarter(""); setQtrReportSummary("");
                } catch (e) { toast(e.message, "error"); }
                finally { setQtrReportGenerating(false); }
              }} style={{ opacity: qtrReportGenerating ? 0.5 : 1 }}>
                {qtrReportGenerating ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── ADMIN INBOX (threads + compose with searchable recipient picker) ───
function SignatureManager({ toast, hideHeader }) {
  const [sigs, setSigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sigSearch, setSigSearch] = useState("");
  const sigSort = useSortable("subject");

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

  const statusColor = (s) => s === "signed" ? colors.green : s === "pending" ? "#B8860B" : s === "cancelled" ? "#999" : colors.red;
  const statusBg = (s) => s === "signed" ? "#EFE" : s === "pending" ? "#FFF8E1" : s === "cancelled" ? "#F5F5F5" : "#FEE";

  const filteredSigs = sigs.filter(sig => {
    if (!sigSearch) return true;
    const q = sigSearch.toLowerCase();
    return (sig.document?.name || "").toLowerCase().includes(q) || (sig.subject || "").toLowerCase().includes(q) || (sig.createdBy?.name || "").toLowerCase().includes(q) || (sig.status || "").toLowerCase().includes(q);
  }).map(sig => ({ ...sig, createdByName: sig.createdBy?.name, signerCount: sig.signers?.length || 0 }));

  return (
    <>
      {!hideHeader && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 300 }}>Signatures</h1>
          <p style={{ fontSize: 13, color: colors.mutedText, marginTop: 4 }}>{sigs.length} signature requests</p>
        </div>
      </div>}
      <div style={{ marginBottom: 20 }}>
        <SearchBox value={sigSearch} onChange={setSigSearch} placeholder="Search signatures..." />
      </div>
      {loading ? <p style={{ color: colors.mutedText }}>Loading...</p> : filteredSigs.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: 12, padding: 40, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", textAlign: "center", color: colors.mutedText, fontSize: 13 }}>
          {sigSearch ? "No matching signature requests." : "No signature requests yet. Use the Documents section to request signatures."}
        </div>
      ) : (
        <div className="admin-table-scroll" style={{ background: colors.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE" }}>
            <SortableHeader columns={[
              { key: "subject", label: "Document" },
              { key: "createdByName", label: "Created By" },
              { key: "signerCount", label: "Signers" },
              { key: "status", label: "Status" },
            ]} sortBy={sigSort.sortBy} sortDir={sigSort.sortDir} onSort={sigSort.onSort} />
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>Actions</span>
          </div>
          {sigSort.sortData(filteredSigs).map((sig, i) => (
            <div key={sig.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px", padding: "14px 20px", borderBottom: i < filteredSigs.length - 1 ? `1px solid ${colors.lightBorder}` : "none", fontSize: 13, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{sig.document?.name || sig.subject}</div>
                <div style={{ fontSize: 11, color: colors.mutedText, marginTop: 2 }}>{sig.subject}</div>
              </div>
              <span style={{ color: "#666" }}>{sig.createdByName}</span>
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
                  <Button variant="outline" onClick={() => handleCancel(sig.id)} style={{ fontSize: 11, padding: "4px 12px", color: colors.red, borderColor: colors.red }}>Cancel</Button>
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
  const [prospectSearch, setProspectSearch] = useState("");
  const prospectSort = useSortable("name");

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
    new: "#2563EB", contacted: "#8B7128", qualified: colors.green, converted: "#7C3AED", declined: "#999",
  };

  if (loading && !prospects.length) return <div style={{ padding: 40, color: colors.mutedText, textAlign: "center" }}>Loading prospects...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 400, color: colors.darkText }}>Prospect Leads</h2>
      </div>

      {/* Stats Badges */}
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All", count: stats.total },
            { key: "new", label: "New", count: stats.new, color: "#2563EB" },
            { key: "contacted", label: "Contacted", count: stats.contacted, color: "#8B7128" },
            { key: "qualified", label: "Qualified", count: stats.qualified, color: colors.green },
            { key: "converted", label: "Converted", count: stats.converted, color: "#7C3AED" },
            { key: "declined", label: "Declined", count: stats.declined, color: colors.mutedText },
          ].map(s => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{
              padding: "6px 14px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: fonts.sans,
              display: "flex", alignItems: "center", gap: 6,
              background: filterStatus === s.key ? (s.color || colors.darkText) : colors.white,
              color: filterStatus === s.key ? colors.white : (s.color || colors.darkText),
              border: `1px solid ${filterStatus === s.key ? "transparent" : "#DDD"}`,
              fontWeight: filterStatus === s.key ? 500 : 400,
            }}>
              {s.label}
              <span style={{
                padding: "1px 6px", borderRadius: 8, fontSize: 10,
                background: filterStatus === s.key ? "rgba(255,255,255,.25)" : `${s.color || colors.darkText}15`,
                color: filterStatus === s.key ? colors.white : (s.color || colors.darkText),
              }}>{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <SearchBox value={prospectSearch} onChange={setProspectSearch} placeholder="Search prospects..." />
      </div>

      {/* Table */}
      {(() => {
        const filteredProspects = prospectSort.sortData(prospects.filter(p => {
          if (!prospectSearch) return true;
          const q = prospectSearch.toLowerCase();
          return (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q) || (p.investmentRange || "").toLowerCase().includes(q) || (p.interestedProject?.name || "").toLowerCase().includes(q) || (p.status || "").toLowerCase().includes(q);
        }).map(p => ({ ...p, projectName: p.interestedProject?.name || "General" })));
        return (
      <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", background: colors.white }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
              {[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "investmentRange", label: "Interest Range" }, { key: "projectName", label: "Project" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Date" }].map(col => (
                <th key={col.key} onClick={() => prospectSort.onSort(col.key)} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", cursor: "pointer", userSelect: "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {prospectSort.sortBy === col.key && <span style={{ fontSize: 8 }}>{prospectSort.sortDir === "asc" ? "▲" : "▼"}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProspects.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>No prospects found</td></tr>
            )}
            {filteredProspects.map(p => (
              <>
                <tr key={p.id} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={{
                  borderBottom: "1px solid #F0EDEA", cursor: "pointer", transition: "background .1s",
                }} onMouseEnter={e => e.currentTarget.style.background = colors.cardBg}
                   onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: colors.darkText }}>{p.name}</td>
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
                  <td style={{ padding: "12px 16px", color: colors.mutedText, fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
                {expandedId === p.id && (
                  <tr key={`${p.id}-detail`}>
                    <td colSpan={6} style={{ padding: "16px 24px", background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Phone</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.phone || "Not provided"}</span></div>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Entity Type</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.entityType || "Not specified"}</span></div>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Accreditation</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.accreditationStatus || "Not specified"}</span></div>
                      </div>
                      {p.message && (
                        <div style={{ marginBottom: 16 }}>
                          <span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Message</span>
                          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, background: colors.white, padding: "12px 16px", borderRadius: 4, border: "1px solid #E8E5DE" }}>{p.message}</p>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "#888" }}>Update status:</span>
                        <select value={p.status} onChange={e => handleStatusChange(p.id, e.target.value)} style={{
                          padding: "6px 12px", border: "1px solid #DDD", borderRadius: 4, fontSize: 12, fontFamily: fonts.sans,
                        }}>
                          {["new", "contacted", "qualified", "converted", "declined"].map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                        {p.status !== "converted" && (
                          <Button onClick={async () => {
                            if (!confirm(`Convert "${p.name}" to an investor? This will send them an invitation.`)) return;
                            try {
                              await inviteInvestor({ name: p.name, email: p.email });
                              await updateProspectStatus(p.id, "converted");
                              toast(`${p.name} converted to investor`);
                              load();
                            } catch (e) { toast(e.message, "error"); }
                          }} style={{ padding: "4px 12px", fontSize: 11, background: "#7C3AED" }}>Convert to Investor</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
        );
      })()}
    </div>
  );
}

function AdminInbox({ user, toast }) {
  const { projects, investors } = useAdminData();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadDetail, setThreadDetail] = useState(null);
  const [reply, setReply] = useState("");
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread | from-investors
  const [sending, setSending] = useState(false);
  const [targetType, setTargetType] = useState("ALL");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [recipients, setRecipients] = useState([]); // { id, name, email }
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showBrowse, setShowBrowse] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => { loadThreads(); }, []);

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
        <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedThread(null); setThreadDetail(null); setReply(""); }}>← Back to inbox</p>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 6 }}>{threadDetail.subject}</h2>
          <div style={{ fontSize: 12, color: colors.mutedText }}>
            {threadDetail.messages.length} messages · Started by {threadDetail.creator.name}
            {threadDetail.project && <span> · {threadDetail.project}</span>}
            <span style={{ marginLeft: 8, padding: "2px 8px", background: colors.lightBorder, borderRadius: 3, fontSize: 10 }}>{threadDetail.targetType}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {threadDetail.messages.map((m) => {
            const isInvestor = m.sender.role === "INVESTOR";
            return (
              <div key={m.id} style={{ background: colors.white, border: `1px solid ${isInvestor ? "#ECEAE5" : "#DDE8DD"}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.03)", marginLeft: isInvestor ? 0 : 40, marginRight: isInvestor ? 40 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: isInvestor ? colors.lightBorder : `${colors.green}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: isInvestor ? "#666" : colors.green }}>
                      {m.sender.initials || m.sender.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{m.sender.name}</span>
                    <span style={{ fontSize: 11, color: colors.mutedText }}>{isInvestor ? "Investor" : "Staff"}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#BBB" }}>{new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.body}</div>
                {/* Read receipts (C.2) */}
                {m.readReceipts && m.readReceipts.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${colors.lightBorder}` }}>
                    {m.readReceipts.map((rr, ri) => (
                      <div key={ri} style={{ fontSize: 10, color: "#AAA", marginBottom: 2 }}>
                        Read by {rr.name || "Unknown"} — {new Date(rr.readAt || rr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Thread-level read receipts (C.2) */}
        {threadDetail.readReceipts && threadDetail.readReceipts.length > 0 && (
          <div style={{ background: colors.white, borderRadius: 8, padding: "10px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#AAA", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Read Receipts</div>
            {threadDetail.readReceipts.map((rr, ri) => (
              <div key={ri} style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
                Read by {rr.name || "Unknown"} — {new Date(rr.readAt || rr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            ))}
          </div>
        )}
        <div style={{ background: colors.white, borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." rows={3}
            style={{ ...inputStyle, border: "none", padding: 0, resize: "vertical" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Button onClick={handleReply} disabled={sending || !reply.trim()} style={{ opacity: sending || !reply.trim() ? 0.5 : 1 }}>
              {sending ? "Sending..." : "Reply"}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Compose view
  if (composing) {
    return (
      <>
        <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={() => setComposing(false)}>← Back to inbox</p>
        <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>New Message</h2>
        <form onSubmit={handleCompose} style={{ background: colors.white, borderRadius: 12, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          {/* Target type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Send To</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ val: "ALL", label: "All Investors" }, { val: "PROJECT", label: "Project" }, { val: "INDIVIDUAL", label: "Specific Investors" }].map(t => (
                <Button variant="outline" key={t.val} type="button" onClick={() => { setTargetType(t.val); setRecipients([]); }} style={{ fontSize: 12, padding: "6px 14px",
                  background: targetType === t.val ? colors.red : colors.white, color: targetType === t.val ? colors.white : colors.darkText, borderColor: targetType === t.val ? colors.red : "#DDD" }}>{t.label}</Button>
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
                  <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: `${colors.red}10`, border: `1px solid ${colors.red}30`, borderRadius: 16, fontSize: 12 }}>
                    {r.name}
                    <span onClick={() => removeRecipient(r.id)} style={{ cursor: "pointer", color: colors.red, fontWeight: 700, fontSize: 14, lineHeight: 1 }}>&times;</span>
                  </span>
                ))}
              </div>
              {/* Search input */}
              <div style={{ position: "relative" }}>
                <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Search investors by name or email..."
                  style={inputStyle} />
                {/* Dropdown results */}
                {searchResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: colors.white, border: "1px solid #E8E5DE", borderTop: "none", borderRadius: "0 0 4px 4px", zIndex: 10, maxHeight: 200, overflow: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
                    {searchResults.slice(0, 8).map(inv => (
                      <div key={inv.id} onClick={() => addRecipient(inv)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${colors.lightBorder}`, fontSize: 13 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8F7F4"}
                        onMouseLeave={e => e.currentTarget.style.background = colors.white}>
                        <div style={{ fontWeight: 500 }}>{inv.name}</div>
                        <div style={{ fontSize: 11, color: colors.mutedText }}>
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
                <span onClick={() => setShowBrowse(!showBrowse)} style={{ fontSize: 12, color: colors.red, cursor: "pointer" }}>
                  {showBrowse ? "Hide investor list" : "Browse all investors →"}
                </span>
              </div>
              {/* Investor table browser */}
              {showBrowse && (
                <div style={{ marginTop: 12, border: "1px solid #E8E5DE", borderRadius: 4, maxHeight: 250, overflow: "auto" }}>
                  {investors.filter(inv => !recipients.some(r => r.id === inv.id)).map((inv, i) => (
                    <div key={inv.id} onClick={() => addRecipient(inv)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8F7F4"}
                      onMouseLeave={e => e.currentTarget.style.background = colors.white}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{inv.name}</span>
                        <span style={{ color: colors.mutedText, marginLeft: 8, fontSize: 12 }}>{inv.email}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {inv.projects?.map(p => (
                          <span key={p.projectId} style={{ fontSize: 10, padding: "2px 6px", background: colors.lightBorder, borderRadius: 3 }}>{p.projectName}</span>
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
            <Button variant="outline" type="button" onClick={() => setComposing(false)}>Cancel</Button>
            <Button type="submit" disabled={sending} style={{ padding: "10px 24px", opacity: sending ? 0.5 : 1 }}>
              {sending ? "Sending..." : "Send Message"}
            </Button>
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
          <p style={{ fontSize: 13, color: colors.mutedText, marginTop: 4 }}>{unreadCount} unread · {threads.length} conversations</p>
        </div>
        <Button onClick={() => setComposing(true)}>New Message</Button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ val: "all", label: "All" }, { val: "unread", label: "Unread" }, { val: "from-investors", label: "From Investors" }].map(f => (
          <Button variant="outline" key={f.val} onClick={() => setFilter(f.val)} style={{ fontSize: 12, padding: "5px 14px",
            background: filter === f.val ? colors.lightBorder : colors.white, fontWeight: filter === f.val ? 500 : 400 }}>{f.label}{f.val === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}</Button>
        ))}
      </div>

      {loading ? <p style={{ color: colors.mutedText }}>Loading...</p> : (
        <div style={{ background: colors.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>No messages</div>
          ) : filtered.map((t, i) => (
            <div key={t.id} onClick={() => openThread(t)} style={{
              padding: "16px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${colors.lightBorder}` : "none",
              cursor: "pointer", display: "flex", gap: 12, background: t.unread ? `${colors.red}06` : "transparent",
              borderLeft: t.unread ? `3px solid ${colors.red}` : "3px solid transparent",
            }}
              onMouseEnter={e => e.currentTarget.style.background = colors.cardBg}
              onMouseLeave={e => e.currentTarget.style.background = t.unread ? `${colors.red}06` : "transparent"}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.unread ? colors.red : "transparent", marginTop: 7, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: t.unread ? 600 : 400 }}>{t.subject}</span>
                  <span style={{ fontSize: 11, color: "#BBB", flexShrink: 0 }}>
                    {t.lastMessage ? new Date(t.lastMessage.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: colors.mutedText }}>
                  {t.creator.name}
                  {t.creator.role === "INVESTOR" && <span style={{ marginLeft: 6, padding: "1px 6px", background: colors.lightBorder, borderRadius: 3, fontSize: 10 }}>Investor</span>}
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
  const [auditSearch, setAuditSearch] = useState("");
  const auditSort = useSortable("createdAt", "desc");

  const actionTypes = ["all", "login", "logout", "document_download", "document_upload", "signature_request", "signature_sign", "profile_update", "investor_invite", "project_update", "cash_flow_record", "prospect_submit"];

  function loadLogs() {
    setLoading(true); setError(null);
    const params = {};
    if (actionFilter !== "all") params.action = actionFilter;
    fetchAuditLog(params).then(setLogs).catch(e => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => { loadLogs(); }, [actionFilter]);

  const filteredLogs = auditSort.sortData(logs.filter(log => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (log.user || "").toLowerCase().includes(q) || (log.action || "").toLowerCase().includes(q) || (log.resource || "").toLowerCase().includes(q) || (log.ipAddress || "").toLowerCase().includes(q);
  }));

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 24 }}>Audit Log</h1>
      <p style={{ fontSize: 13, color: colors.mutedText, marginBottom: 24 }}>Compliance log of key system actions. Last 100 entries shown.</p>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <SearchBox value={auditSearch} onChange={setAuditSearch} placeholder="Search audit log..." />
      </div>

      {/* Filter by action */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {actionTypes.map(a => (
          <span key={a} onClick={() => setActionFilter(a)} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer",
            border: `1px solid ${actionFilter === a ? colors.red + "55" : "#DDD"}`,
            color: actionFilter === a ? colors.red : "#999",
            background: actionFilter === a ? `${colors.red}08` : colors.white,
          }}>{a.replace(/_/g, " ")}</span>
        ))}
      </div>

      {error && <AdminError message={error} onRetry={loadLogs} />}
      {loading ? <Spinner /> : filteredLogs.length === 0 ? (
        <EmptyState title="No audit log entries" subtitle={auditSearch ? "No entries match your search." : "Actions will appear here as users interact with the system."} />
      ) : (
        <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
                {[{ key: "createdAt", label: "Timestamp" }, { key: "user", label: "User" }, { key: "action", label: "Action" }, { key: "resource", label: "Resource" }, { key: "ipAddress", label: "IP" }].map(col => (
                  <th key={col.key} onClick={() => auditSort.onSort(col.key)} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText, cursor: "pointer", userSelect: "none" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {col.label}
                      {auditSort.sortBy === col.key && <span style={{ fontSize: 8 }}>{auditSort.sortDir === "asc" ? "▲" : "▼"}</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr key={log.id} style={{ borderBottom: i < filteredLogs.length - 1 ? "1px solid #E8E5DE" : "none" }}>
                  <td style={{ padding: "10px 14px", color: colors.mutedText, whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{log.user}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 3,
                      background: log.action === "login" ? `${colors.green}15` : log.action.includes("download") ? "#EEF" : `${colors.red}08`,
                      color: log.action === "login" ? colors.green : log.action.includes("download") ? "#44A" : "#666",
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>{log.action.replace(/_/g, " ")}</span>
                  </td>
                  <td style={{ padding: "10px 14px", color: colors.mutedText }}>{log.resource || "\u2014"}</td>
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

// ─── EMAIL SETTINGS MANAGER ───
function EmailSettingsManager({ toast }) {
  const [settings, setSettings] = useState(null);
  const [emailLog, setEmailLog] = useState([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logFilter, setLogFilter] = useState({ type: "", status: "" });

  const cardStyle = { background: colors.white, borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 16, fontWeight: 600, marginBottom: 16, color: colors.darkText };
  const fieldLabel = { fontSize: 12, fontWeight: 500, color: colors.mutedText, marginBottom: 4, display: "block" };
  const fieldGroup = { marginBottom: 14 };

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [s, l, st] = await Promise.all([
        fetchEmailSettings(),
        fetchEmailLog({ type: logFilter.type, status: logFilter.status, limit: 50 }),
        fetchEmailStats(),
      ]);
      setSettings(s);
      setEmailLog(l.logs || l || []);
      setStats(st || { sent: 0, failed: 0, skipped: 0 });
    } catch (e) {
      setError(e.message || "Failed to load email settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function loadLog() {
    try {
      const l = await fetchEmailLog({ type: logFilter.type, status: logFilter.status, limit: 50 });
      setEmailLog(l.logs || l || []);
    } catch (_) {}
  }

  useEffect(() => { if (!loading) loadLog(); }, [logFilter.type, logFilter.status]);

  async function handleSave(partial) {
    setSaving(true);
    try {
      const updated = await updateEmailSettings({ ...settings, ...partial });
      setSettings(updated);
      toast("Settings saved");
    } catch (e) {
      toast(e.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(key, val) {
    const patch = { [key]: val };
    setSettings(prev => ({ ...prev, ...patch }));
    await handleSave(patch);
  }

  async function handleTestEmail() {
    setTesting(true);
    try {
      await sendTestEmail();
      toast("Test email sent");
    } catch (e) {
      toast(e.message || "Test email failed", "error");
    } finally {
      setTesting(false);
    }
  }

  function onFieldChange(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  if (loading) return <Spinner />;
  if (error) return <AdminError message={error} onRetry={loadAll} />;
  if (!settings) return <EmptyState title="No email settings found" />;

  const toggleItems = [
    { key: "enableDocuments", label: "Document notifications" },
    { key: "enableSignatures", label: "Signature request notifications" },
    { key: "enableDistributions", label: "Distribution notifications" },
    { key: "enableMessages", label: "Message notifications" },
    { key: "enableCapitalCalls", label: "Capital call notifications" },
    { key: "enableWelcome", label: "Welcome emails" },
    { key: "enablePasswordReset", label: "Password reset emails" },
  ];

  const brandingFields = [
    { key: "fromName", label: "From Name", placeholder: "Northstar Capital" },
    { key: "fromAddress", label: "From Email", placeholder: "noreply@example.com" },
    { key: "replyToAddress", label: "Reply-To Address", placeholder: "support@example.com" },
    { key: "companyName", label: "Company Name", placeholder: "Northstar Capital Group" },
    { key: "companyAddress", label: "Company Address", placeholder: "123 Main St, Suite 100" },
    { key: "portalUrl", label: "Portal URL", placeholder: "https://portal.example.com" },
    { key: "brandColor", label: "Brand Color", placeholder: colors.red },
  ];

  const subjectFields = [
    { key: "subjectWelcome", label: "Welcome Email", placeholder: "Welcome to {{companyName}}" },
    { key: "subjectDocument", label: "New Document", placeholder: "New document available" },
    { key: "subjectSignature", label: "Signature Request", placeholder: "Document requires your signature" },
    { key: "subjectDistribution", label: "Distribution Notice", placeholder: "Distribution notice from {{companyName}}" },
    { key: "subjectMessage", label: "New Message", placeholder: "You have a new message" },
    { key: "subjectCapitalCall", label: "Capital Call", placeholder: "Capital call notice" },
    { key: "subjectPasswordReset", label: "Password Reset", placeholder: "Reset your password" },
  ];

  const statusColors = { sent: colors.green, failed: colors.red, skipped: "#B08C00" };

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 24 }}>Email Settings</h1>

      {/* Section A: Email Provider Status */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Email Provider</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: colors.mutedText }}>Provider: </span>
            <span style={{ fontWeight: 500 }}>{settings._provider || "Not configured"}</span>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: colors.mutedText }}>API Key: </span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 3,
              background: settings._providerConfigured ? `${colors.green}15` : `${colors.red}08`,
              color: settings._providerConfigured ? colors.green : colors.red,
            }}>
              {settings._providerConfigured ? "Configured" : "Not configured"}
            </span>
          </div>
          <Button variant="outline" onClick={handleTestEmail} disabled={testing} style={{ fontSize: 12, marginLeft: "auto" }}>
            {testing ? "Sending..." : "Send Test Email"}
          </Button>
        </div>
      </div>

      {/* Section B: Global Notification Toggles */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Notification Toggles</div>
        <p style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>Enable or disable specific email notification types globally.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {toggleItems.map(t => (
            <Toggle key={t.key} checked={!!settings[t.key]} onChange={(v) => handleToggle(t.key, v)} label={t.label} />
          ))}
        </div>
      </div>

      {/* Section C: Branding & Sender Configuration */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Branding & Sender</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {brandingFields.map(f => (
            <div key={f.key} style={fieldGroup}>
              <label style={fieldLabel}>{f.label}</label>
              <input
                style={inputStyle}
                value={settings[f.key] || ""}
                placeholder={f.placeholder}
                onChange={(e) => onFieldChange(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Button onClick={() => handleSave({})} disabled={saving}>
            {saving ? "Saving..." : "Save Branding"}
          </Button>
        </div>
      </div>

      {/* Section D: Subject Line Overrides */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Subject Line Overrides</div>
        <p style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>Customize subject lines for each email type. Leave blank to use defaults.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {subjectFields.map(f => (
            <div key={f.key} style={fieldGroup}>
              <label style={fieldLabel}>{f.label}</label>
              <input
                style={inputStyle}
                value={settings[f.key] || ""}
                placeholder={f.placeholder}
                onChange={(e) => onFieldChange(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Button onClick={() => handleSave({})} disabled={saving}>
            {saving ? "Saving..." : "Save Subjects"}
          </Button>
        </div>
      </div>

      {/* Section E: Delivery Log */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Delivery Log</div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Sent", value: stats.sent, color: colors.green },
            { label: "Failed", value: stats.failed, color: colors.red },
            { label: "Skipped", value: stats.skipped, color: "#B08C00" },
          ].map(s => (
            <div key={s.label} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              <span style={{ color: colors.mutedText }}>{s.label}:</span>
              <span style={{ fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select
            value={logFilter.type}
            onChange={(e) => setLogFilter(p => ({ ...p, type: e.target.value }))}
            style={{ ...inputStyle, width: "auto", minWidth: 160 }}
          >
            <option value="">All Types</option>
            {["document", "signature", "distribution", "message", "capital_call", "welcome", "password_reset"].map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <select
            value={logFilter.status}
            onChange={(e) => setLogFilter(p => ({ ...p, status: e.target.value }))}
            style={{ ...inputStyle, width: "auto", minWidth: 140 }}
          >
            <option value="">All Statuses</option>
            {["sent", "failed", "skipped"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Log table */}
        {emailLog.length === 0 ? (
          <EmptyState title="No delivery logs" subtitle="Emails will appear here once sent." />
        ) : (
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #E8E5DE" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
                  {["Date", "Recipient", "Type", "Subject", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emailLog.map((entry, i) => (
                  <tr key={entry.id || i} style={{ borderBottom: i < emailLog.length - 1 ? "1px solid #E8E5DE" : "none" }}>
                    <td style={{ padding: "10px 14px", color: colors.mutedText, whiteSpace: "nowrap" }}>
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "\u2014"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>{entry.recipient || "\u2014"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 3,
                        background: "#F5F4F0", color: "#666",
                        textTransform: "uppercase", letterSpacing: ".04em",
                      }}>{(entry.type || "").replace(/_/g, " ")}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: colors.mutedText, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.subject || "\u2014"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 3,
                        background: `${statusColors[entry.status] || "#999"}15`,
                        color: statusColors[entry.status] || "#999",
                        textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600,
                      }}>{entry.status || "\u2014"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
