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
import ProjectDetail from "./admin/ProjectDetail.jsx";


// ─── PEOPLE SECTION (consolidated: Investors + Groups + Staff) ───
function PeopleSection({ profileId, setProfileId, peopleTab, setPeopleTab, toast, initialAction, onActionConsumed }) {
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
          : <InvestorManager toast={toast} onViewProfile={(id) => setProfileId(id)} hideHeader initialAction={initialAction} onActionConsumed={onActionConsumed} />
      )}
      {peopleTab === "groups" && <GroupManager toast={toast} hideHeader />}
      {peopleTab === "staff" && <StaffManager toast={toast} hideHeader />}
    </>
  );
}

// ─── DOCUMENTS SECTION (consolidated: Documents + Signatures) ───
function DocumentsSection({ docsTab, setDocsTab, toast, initialAction, onActionConsumed }) {
  const subTabs = [
    { id: "documents", label: "All Documents" },
    { id: "signatures", label: "Signatures" },
  ];

  return (
    <>
      <SectionHeader title="Documents" size="lg" style={{ marginBottom: 8 }} />
      <Tabs tabs={subTabs} active={docsTab} onChange={setDocsTab} style={{ marginBottom: 24 }} />
      {docsTab === "documents" && <DocumentManager toast={toast} hideHeader initialAction={initialAction} onActionConsumed={onActionConsumed} />}
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
  const [pendingAction, setPendingAction] = useState(null);

  // Clear pending action after it's consumed
  function consumeAction() { setPendingAction(null); }

  const pages = {
    dashboard: <Dashboard onNavigate={(v, opts) => {
      const action = opts?.action || null;
      if (v === "investors") { setView("people"); setPeopleTab("investors"); setPendingAction(action); }
      else if (v === "documents") { setView("documents"); setDocsTab("documents"); setPendingAction(action); }
      else { setView(v); setPendingAction(action); }
    }} />,
    projects: projectDetailId
      ? <ProjectDetail projectId={projectDetailId} onBack={() => setProjectDetailId(null)} toast={toast} />
      : <ProjectManager toast={toast} onViewProject={(id) => setProjectDetailId(id)} />,
    people: <PeopleSection profileId={profileId} setProfileId={setProfileId} peopleTab={peopleTab} setPeopleTab={setPeopleTab} toast={toast} initialAction={pendingAction} onActionConsumed={consumeAction} />,
    documents: <DocumentsSection docsTab={docsTab} setDocsTab={setDocsTab} toast={toast} initialAction={pendingAction} onActionConsumed={consumeAction} />,
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

