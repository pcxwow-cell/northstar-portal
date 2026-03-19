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
import StatCard from "./components/StatCard.jsx";
import StatusBadge from "./components/StatusBadge.jsx";
import SectionHeader from "./components/SectionHeader.jsx";
import Tabs from "./components/Tabs.jsx";
import DataTable from "./components/DataTable.jsx";
import SearchFilterBar from "./components/SearchFilterBar.jsx";
import AuditLogViewer from "./admin/AuditLog.jsx";
import EmailSettingsManager from "./admin/EmailSettings.jsx";
import SignatureManager from "./admin/SignatureManager.jsx";
import ProspectManager from "./admin/ProspectManager.jsx";
import GroupManager from "./admin/GroupManager.jsx";
import StaffManager from "./admin/StaffManager.jsx";
import AdminInbox from "./admin/AdminInbox.jsx";
import StatementManager from "./admin/StatementManager.jsx";
import Dashboard from "./admin/AdminDashboard.jsx";
import ProjectManager from "./admin/ProjectManager.jsx";
import InvestorManager from "./admin/InvestorManager.jsx";


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
      <SectionHeader title="People" size="lg" style={{ marginBottom: 8 }} />
      <Tabs tabs={subTabs} active={peopleTab} onChange={(id) => { setPeopleTab(id); setProfileId(null); }} style={{ marginBottom: 24 }} />
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
      <SectionHeader title="Documents" size="lg" style={{ marginBottom: 8 }} />
      <Tabs tabs={subTabs} active={docsTab} onChange={setDocsTab} style={{ marginBottom: 24 }} />
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
          <StatCard key={i} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs.map(t => ({ id: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} active={tab} onChange={setTab} />

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
                <StatusBadge status={t.status} size="sm" />
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
                  <StatCard key={i} label={c.label} value={c.value} />
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
              <StatusBadge status={docDetail.status} style={{ marginLeft: 8 }} />
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
                    <span><StatusBadge status={signer.status || "pending"} size="sm" /></span>
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
      {!hideHeader && <SectionHeader title="Documents" subtitle={`${docs.length} documents`} size="lg" style={{ marginBottom: 24 }} />}
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
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search documents..." filters={[
        { value: projectFilter, onChange: setProjectFilter, label: "Project filter", options: [{ value: "", label: "All Projects" }, ...projects.map(p => ({ value: p.id, label: p.name }))] },
        { value: categoryFilter, onChange: setCategoryFilter, label: "Category filter", options: [{ value: "", label: "All Categories" }, ...categories.map(c => ({ value: c, label: c }))] },
      ]} />

      {/* Document table */}
      {loading ? <Spinner /> : (
        <DataTable
          columns={[
            { key: "name", label: "Document", render: (d) => (
              <div>
                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{d.name}{d.date && (Date.now() - new Date(d.date).getTime()) < 7 * 86400000 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: `${colors.red}18`, color: colors.red, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>NEW</span>}</div>
                <div style={{ fontSize: 11, color: "#BBB" }}>{d.date} · {d.size}</div>
              </div>
            ) },
            { key: "project", label: "Project", muted: true },
            { key: "category", label: "Category", render: (d) => <span style={{ fontSize: 11, padding: "2px 8px", background: colors.lightBorder, borderRadius: 3 }}>{d.category}</span> },
            { key: "totalInvestors", label: "Investors" },
            { key: "viewed", label: "Viewed", render: (d) => <span style={{ color: d.viewed > 0 ? colors.green : "#CCC" }}>{d.viewed}</span> },
            { key: "downloaded", label: "Downloaded", render: (d) => <span style={{ color: d.downloaded > 0 ? colors.green : "#CCC" }}>{d.downloaded}</span> },
          ]}
          data={docSort.sortData(docs)}
          sortBy={docSort.sortBy}
          sortDir={docSort.sortDir}
          onSort={docSort.onSort}
          onRowClick={openDoc}
          emptyMessage="No documents found"
        />
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
          <StatusBadge status={profile.status} />
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

/* GroupManager extracted to ./admin/GroupManager.jsx */
