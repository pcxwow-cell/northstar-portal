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
import DocumentManager from "./admin/DocumentManager.jsx";
import InvestorProfile from "./admin/InvestorProfile.jsx";


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

