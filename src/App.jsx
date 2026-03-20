import { useState, useEffect, lazy, Suspense } from "react";
import { useToast } from "./context/ToastContext.jsx";
import { logout as apiLogout, getMe, isAuthed as checkAuthed, fetchInvestorProjects, fetchDocuments, fetchDistributions, fetchMessages, fetchProjects, fetchMyFlags, fetchNotifications, markNotificationRead } from "./api.js";
import { colors, fonts } from "./styles/theme.js";
import Button from "./components/Button.jsx";
import Card from "./components/Card.jsx";
import Spinner from "./components/Spinner.jsx";
import { NorthstarIcon, NorthstarWordmark } from "./components/NorthstarIcon.jsx";
import SessionWarningModal from "./components/SessionWarningModal.jsx";
import useSessionTimeout from "./hooks/useSessionTimeout.js";
import ResetPasswordPage from "./pages/ResetPassword.jsx";
import ActivityPage from "./pages/Activity.jsx";
import DistributionsPage from "./pages/Distributions.jsx";
import FinancialModelerPage from "./pages/FinancialModeler.jsx";
import CapTablePage from "./pages/CapTable.jsx";
import DocumentsPage from "./pages/Documents.jsx";
import MessagesPage from "./pages/Messages.jsx";
import ProfilePage from "./pages/Profile.jsx";
import SecurityPage from "./pages/Security.jsx";
import Portfolio from "./pages/Portfolio.jsx";
import Overview from "./pages/Overview.jsx";
import LoginPage from "./pages/Login.jsx";
import { ThemeContext, useTheme, themes } from "./context/ThemeContext.jsx";

// Lazy load heavy components — they get their own chunks
const AdminPanel = lazy(() => import("./Admin.jsx"));
const ProspectPortal = lazy(() => import("./ProspectPortal.jsx"));

const sans = fonts.sans;
const red = colors.red;


// ─── SKELETON LOADING ───────────────────────────────────
function SkeletonBlock({ width = "100%", height = 16, style = {} }) {
  const th = useTheme();
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: `linear-gradient(90deg, ${th.line}00 0%, ${th.line} 50%, ${th.line}00 100%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );
}

function OverviewSkeleton() {
  const th = useTheme();
  return (
    <div aria-busy="true">
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <SkeletonBlock width={120} height={12} style={{ marginBottom: 12 }} />
        <SkeletonBlock width={280} height={28} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={220} height={14} />
      </div>
      {/* Stat cards */}
      <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: th.surface, padding: "20px 24px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <SkeletonBlock width={80} height={10} style={{ marginBottom: 12 }} />
            <SkeletonBlock width={120} height={26} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={100} height={11} />
          </div>
        ))}
      </div>
      {/* Project cards */}
      <div className="project-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 48 }}>
        {[0,1].map(i => (
          <Card key={i} padding="0" style={{ overflow: "hidden" }}>
            <SkeletonBlock height={140} style={{ borderRadius: 0 }} />
            <div style={{ padding: 20 }}>
              <SkeletonBlock width={160} height={16} style={{ marginBottom: 16 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[0,1,2].map(j => <SkeletonBlock key={j} height={32} />)}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* Chart skeleton */}
      <SkeletonBlock height={180} style={{ borderRadius: 12, marginBottom: 48 }} />
    </div>
  );
}


// ─── APP ─────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(checkAuthed);
  const [user, setUser] = useState(null);
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("northstar_theme") || "light");
  const [view, setView] = useState("overview");
  const [msgs, setMsgs] = useState([]);
  // Default to prospect portal for unauthenticated visitors, login only on #/login
  const [showLogin, setShowLogin] = useState(() => {
    return window.location.hash === "#/login";
  });
  const [showResetPassword, setShowResetPassword] = useState(() => {
    return window.location.hash.includes("reset-password");
  });
  const toast = useToast();
  const [announcement, setAnnouncement] = useState("");
  const [featureFlags, setFeatureFlags] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [navParams, setNavParams] = useState({});
  const th = themes[themeMode];

  function navigateTo(page, params) {
    setView(page);
    setNavParams(params || {});
  }

  // Listen for hash changes
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash;
      if (hash.includes("reset-password")) {
        setShowResetPassword(true);
        setShowLogin(false);
      } else if (hash === "#/login") {
        setShowResetPassword(false);
        setShowLogin(true);
      } else {
        setShowResetPassword(false);
        setShowLogin(false);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Load data after auth
  async function loadData(u) {
    try {
      setLoading(true);
      const [myProjects, docs, dists, msgList, allProjects] = await Promise.all([
        fetchInvestorProjects(u.id),
        fetchDocuments(u.id),
        fetchDistributions(u.id),
        fetchMessages(),
        fetchProjects(),
      ]);
      setAppData({ investor: u, projects: allProjects, myProjects, allDocuments: docs, allDistributions: dists });
      setMsgs(msgList.map(m => ({ ...m })));
    } catch (err) {
      console.error("Failed to load data:", err);
      apiLogout();
      setAuthed(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  // On mount, if token exists, fetch user + data
  useEffect(() => {
    if (authed) {
      getMe().then(u => {
        setUser(u);
        if (u.role === "ADMIN" || u.role === "GP") { setLoading(false); return; }
        return loadData(u);
      }).catch(() => { setAuthed(false); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Feature flags — load once on mount, silently ignore failures (demo mode)
  useEffect(() => {
    fetchMyFlags().then(setFeatureFlags).catch(() => setFeatureFlags(null));
  }, []);

  // Fetch notifications for bell indicator + dropdown
  useEffect(() => {
    if (authed) {
      fetchNotifications().then(notifs => {
        const list = Array.isArray(notifs) ? notifs : [];
        setNotifications(list);
        setNotifCount(list.filter(n => !n.read).length);
      }).catch(() => {});
    }
  }, [authed]);

  function handleMarkNotifRead(id) {
    markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setNotifCount(prev => Math.max(0, prev - 1));
  }

  function handleMarkAllNotifsRead() {
    notifications.filter(n => !n.read).forEach(n => markNotificationRead(n.id).catch(() => {}));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotifCount(0);
  }

  function toggleTheme() {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    localStorage.setItem("northstar_theme", next);
  }

  function handleLogout() {
    apiLogout();
    setAuthed(false);
    setUser(null);
    setAppData(null);
    setView("overview");
  }

  const { showWarning, dismissWarning } = useSessionTimeout(authed, handleLogout);

  async function handleLogin(u) {
    setUser(u);
    setAuthed(true);
    // Admin users don't need investor data — admin panel handles its own fetching
    if (u.role === "ADMIN" || u.role === "GP") {
      setLoading(false);
      return;
    }
    await loadData(u);
  }

  if (!authed || (!appData && !user)) return (
    <ThemeContext.Provider value={th}>
      {loading ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: th.bg, fontFamily: sans, color: th.t2, gap: 16 }}>
          <NorthstarIcon size={40} color={red} />
          <Spinner size={28} />
        </div>
      ) : showResetPassword ? (
        <ResetPasswordPage onBack={() => { setShowResetPassword(false); window.location.hash = "#/login"; }} />
      ) : showLogin ? (
        <LoginPage onLogin={handleLogin} onShowProspects={() => { setShowLogin(false); window.location.hash = ""; }} />
      ) : (
        <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg }}><Spinner size={32} /></div>}>
          <ProspectPortal onNavigateLogin={() => { setShowLogin(true); window.location.hash = "#/login"; }} />
        </Suspense>
      )}
    </ThemeContext.Provider>
  );

  // Admin users get the admin panel
  if (user && (user.role === "ADMIN" || user.role === "GP")) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F3EF" }}><Spinner size={32} /></div>}>
        <AdminPanel user={user} onLogout={handleLogout} />
      </Suspense>
    );
  }

  if (!appData) return (
    <ThemeContext.Provider value={th}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: th.bg, fontFamily: sans, color: th.t2, gap: 16 }}>
        <NorthstarIcon size={40} color={red} />
        <Spinner size={28} />
      </div>
    </ThemeContext.Provider>
  );

  const { investor, projects, myProjects, allDocuments, allDistributions } = appData;

  const pages = {
    overview: loading ? <OverviewSkeleton /> : <Overview onNavigate={navigateTo} investor={investor} projects={projects} myProjects={myProjects} allDistributions={allDistributions} msgs={msgs} onOpenThread={(threadId) => { navigateTo("messages", { threadId }); }} />,
    portfolio: <Portfolio myProjects={myProjects} investor={investor} initialProjectId={navParams.projectId} />,
    captable: <CapTablePage myProjects={myProjects} investor={investor} toast={toast} />,
    modeler: <FinancialModelerPage myProjects={myProjects} investor={investor} />,
    documents: <DocumentsPage toast={toast} allDocuments={allDocuments} myProjects={myProjects} investor={investor} />,
    distributions: <DistributionsPage allDistributions={allDistributions} myProjects={myProjects} />,
    messages: <MessagesPage toast={toast} investor={investor} initialThreadId={navParams.threadId} onMarkRead={(threadId) => setMsgs(prev => prev.map(m => m.id === threadId ? { ...m, unread: false } : m))} />,
    activity: <ActivityPage toast={toast} onNavigate={navigateTo} />,
    profile: <ProfilePage investor={investor} toast={toast} onUpdate={(u) => setAppData(prev => ({ ...prev, investor: { ...prev.investor, ...u } }))} />,
    security: <SecurityPage toast={toast} />,
  };

  const allNavItems = [
    { id: "overview", label: "Overview" },
    { id: "portfolio", label: "Portfolio" },
    { id: "captable", label: "Cap Table" },
    { id: "modeler", label: "Modeler" },
    { id: "documents", label: "Documents" },
    { id: "distributions", label: "Distributions" },
    { id: "messages", label: "Messages" },
    { id: "activity", label: "Activity" },
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
  ];

  // Filter nav by feature flags (if loaded). If flags not loaded, show all.
  const navItems = featureFlags
    ? allNavItems.filter(n => featureFlags[n.id] !== false)
    : allNavItems;

  return (
    <ThemeContext.Provider value={th}>
    <div style={{ background: th.bg, color: th.t1, fontFamily: sans, minHeight: "100vh", transition: "background .3s, color .3s" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        *:focus-visible { outline: 2px solid #EA2028; outline-offset: 2px; border-radius: 4px; }
        button:active, [role="button"]:active { transform: scale(0.97); }
        button, [role="button"] { transition: transform .1s ease; }
        .skip-link { position: absolute; left: -9999px; top: auto; width: 1px; height: 1px; overflow: hidden; z-index: 100; }
        .skip-link:focus { position: fixed; top: 8px; left: 8px; width: auto; height: auto; padding: 8px 16px; background: #EA2028; color: ${colors.white}; border-radius: 6px; font-size: 13px; font-family: 'DM Sans', sans-serif; text-decoration: none; z-index: 10000; }
        .app-topbar { padding: 0 48px; }
        .app-topbar .user-name { display: inline; }
        .app-subnav { padding: 0 48px; }
        .app-subnav-inner { display: flex; gap: 32px; }
        .app-nav-mobile { display: none; }
        .app-main { padding: 48px 48px 96px; }
        .app-footer { padding: 20px 48px; flex-direction: row; }
        @media (max-width: 900px) {
          .app-topbar { padding: 0 16px; }
          .app-topbar .user-name { display: none; }
          .app-topbar .brand-wordmark { display: none; }
          .app-topbar .brand-label { display: none; }
          .app-topbar .brand-sep { display: none; }
          .app-topbar .theme-toggle { display: none; }
          .app-subnav { display: none; }
          .app-nav-mobile { display: flex; overflow-x: auto; gap: 0; border-bottom: 1px solid var(--line-color); padding: 0 16px; }
          .app-main { padding: 24px 20px 80px; }
          .app-footer { padding: 16px 20px; flex-direction: column; gap: 4px; text-align: center; }
        }
        @media (max-width: 768px) {
          .responsive-table table { display: none; }
          .responsive-table .mobile-cards { display: block; }
          .stat-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .stat-grid-3 { grid-template-columns: 1fr !important; }
          .project-grid-2 { grid-template-columns: 1fr !important; }
          .chart-grid-2 { grid-template-columns: 1fr !important; }
          .profile-grid-2 { grid-template-columns: 1fr !important; }
          .login-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .login-hero { display: none !important; }

          /* Universal: all card-style containers with fixed-column grids become scrollable */
          .cashflow-grid, .waterfall-grid, .captable-grid, .modeler-grid, .dist-grid, .data-grid, .login-history-grid {
            overflow-x: auto; -webkit-overflow-scrolling: touch;
            margin-left: -4px; margin-right: -4px; padding: 0 4px;
          }
          .cashflow-grid > div, .waterfall-grid > div, .captable-grid > div,
          .modeler-grid > div, .dist-grid > div, .data-grid > div, .login-history-grid > div { min-width: 480px; }

          /* Message search + sort controls stack on mobile */
          .msg-search-row { flex-direction: column !important; }
          .msg-search-row select { width: 100%; }

          /* Financial modeler inputs stack on mobile */
          .modeler-inputs { flex-direction: column !important; align-items: stretch !important; }
          .modeler-inputs > div { width: 100% !important; min-width: 0 !important; }
          .modeler-inputs > button { width: 100%; }

          /* Multi-col stat/info grids collapse */
          .inline-stats-3 { grid-template-columns: 1fr !important; }
          .inline-stats-2 { grid-template-columns: 1fr !important; }
          .project-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .entity-grid { grid-template-columns: 1fr !important; }
          .security-grid { grid-template-columns: 1fr !important; }
          .action-grid { grid-template-columns: 1fr !important; }
          .onboarding-steps { flex-direction: column !important; gap: 8px !important; }

          /* Reduce font sizes on small screens */
          h1 { font-size: 22px !important; }
          h2 { font-size: 18px !important; }
        }
        @media (max-width: 480px) {
          .stat-grid-4 { grid-template-columns: 1fr !important; }
          .project-stats { grid-template-columns: 1fr !important; }
          .app-main { padding: 16px 12px 72px; }
          .app-topbar { padding: 0 12px; }
          .app-nav-mobile { padding: 0 8px; }
        }
        @media (min-width: 769px) {
          .responsive-table .mobile-cards { display: none; }
        }
      `}</style>

      {/* Skip to content link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Top bar: logo + user actions */}
      <header className="app-topbar" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 60, position: "sticky", top: 0, zIndex: 10,
        background: th.headerBg, backdropFilter: "blur(16px)",
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
        transition: "background .3s",
        "--line-color": th.line,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NorthstarIcon size={28} color={red} />
            <span className="brand-wordmark"><NorthstarWordmark height={15} color={th.t1} /></span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Notification bell with dropdown */}
          <div style={{ position: "relative" }}>
            <Button aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} unread)` : ""}`} onClick={() => setBellOpen(prev => !prev)} variant="ghost" style={{ position: "relative", fontSize: 16, cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: `1px solid ${bellOpen ? red : th.line}`, transition: "border-color .15s", lineHeight: 1, background: "transparent", color: "inherit" }}>
              &#x1F514;
              {notifCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "50%", background: red, color: colors.white, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>{notifCount > 99 ? "99+" : notifCount}</span>
              )}
            </Button>
            {bellOpen && <>
              <div onClick={() => setBellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360, maxHeight: 420, overflowY: "auto", background: th.surface, border: `1px solid ${th.line}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)", zIndex: 100 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${th.line}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: th.t1 }}>Notifications</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {notifCount > 0 && <span onClick={handleMarkAllNotifsRead} style={{ fontSize: 11, color: red, cursor: "pointer" }}>Mark all read</span>}
                    <span onClick={() => { setBellOpen(false); navigateTo("activity"); }} style={{ fontSize: 11, color: th.t3, cursor: "pointer" }}>View all</span>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: th.t3, fontSize: 13 }}>No notifications yet</div>
                ) : notifications.slice(0, 8).map(n => {
                  const icons = { document_uploaded: "\uD83D\uDCC4", distribution: "\uD83D\uDCB0", capital_call: "\uD83D\uDCCA", message: "\uD83D\uDCAC", signature_request: "\u270D\uFE0F", project_update: "\uD83C\uDFD7\uFE0F" };
                  const navMap = { document_uploaded: "documents", distribution: "distributions", capital_call: "portfolio", message: "messages", signature_request: "documents", project_update: "portfolio" };
                  return (
                    <div key={n.id} onClick={() => { if (!n.read) handleMarkNotifRead(n.id); setBellOpen(false); navigateTo(navMap[n.type] || "activity"); }} style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${th.line}`, cursor: "pointer", background: n.read ? "transparent" : `${red}06`, transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = th.hover}
                      onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : `${red}06`}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{icons[n.type] || "\uD83D\uDCCC"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: th.t1, fontWeight: n.read ? 400 : 500, lineHeight: 1.4, marginBottom: 2 }}>{n.message || n.title}</div>
                        {n.preview && <div style={{ fontSize: 12, color: th.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{n.preview}</div>}
                        <div style={{ fontSize: 11, color: th.t3 }}>
                          {n.project && <span>{n.project} · </span>}
                          {n.createdAt ? (() => { const d = Date.now() - new Date(n.createdAt).getTime(); return d < 3600000 ? `${Math.max(1, Math.floor(d / 60000))}m ago` : d < 86400000 ? `${Math.floor(d / 3600000)}h ago` : `${Math.floor(d / 86400000)}d ago`; })() : ""}
                        </div>
                      </div>
                      {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: red, flexShrink: 0, marginTop: 6 }} />}
                    </div>
                  );
                })}
              </div>
            </>}
          </div>
          <Button className="theme-toggle" onClick={toggleTheme} aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"} variant="ghost" style={{ fontSize: 14, cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: `1px solid ${th.line}`, transition: "border-color .15s", lineHeight: 1, background: "transparent", color: "inherit" }}
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {themeMode === "dark" ? "\u2600" : "\u263D"}
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="user-name" style={{ fontSize: 12, color: th.t3, fontWeight: 400 }}>{investor.name}</span>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: th.avatarGrad,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 600, color: colors.white,
            }}>{investor.initials}</div>
          </div>
          <Button onClick={handleLogout} aria-label="Sign out of your account" variant="ghost" style={{ fontSize: 12, color: th.t3, cursor: "pointer", padding: "5px 14px", border: `1px solid ${th.line}`, borderRadius: 6, transition: "color .15s, border-color .15s", background: "transparent", fontFamily: sans }}
            onMouseEnter={e => { e.currentTarget.style.color = red; e.currentTarget.style.borderColor = red; }}
            onMouseLeave={e => { e.currentTarget.style.color = th.t3; e.currentTarget.style.borderColor = th.line; }}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="app-subnav" role="navigation" aria-label="Main navigation" style={{
        position: "sticky", top: 60, zIndex: 9,
        background: th.headerBg, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${th.line}`,
        transition: "background .3s, border-color .3s",
      }}>
        <div className="app-subnav-inner" style={{ maxWidth: 1080, margin: "0 auto", gap: 4 }}
          onKeyDown={e => {
            const items = navItems.map(n => n.id);
            const idx = items.indexOf(view);
            if (e.key === "ArrowRight" && idx < items.length - 1) { e.preventDefault(); setView(items[idx + 1]); setAnnouncement(`Navigated to ${navItems[idx + 1].label}`); }
            if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); setView(items[idx - 1]); setAnnouncement(`Navigated to ${navItems[idx - 1].label}`); }
          }}>
          {navItems.map(n => (
            <Button key={n.id} aria-current={view === n.id ? "page" : undefined} onClick={() => { setView(n.id); setAnnouncement(`Navigated to ${n.label}`); }} variant="ghost" style={{
              fontSize: 13, fontWeight: view === n.id ? 500 : 400, cursor: "pointer", userSelect: "none",
              color: view === n.id ? red : th.t3,
              padding: "8px 16px",
              borderRadius: 6,
              background: view === n.id ? "#EA20280D" : "transparent",
              transition: "all .15s",
              border: "none", fontFamily: sans, lineHeight: "inherit",
            }}
              onMouseEnter={e => { if (view !== n.id) { e.currentTarget.style.background = th.hover; e.currentTarget.style.color = th.t1; } }}
              onMouseLeave={e => { if (view !== n.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = th.t3; } }}>
              {n.label}
              {n.id === "messages" && msgs.some(m => m.unread) && (
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: red, marginLeft: 6, verticalAlign: "middle" }} />
              )}
            </Button>
          ))}
        </div>
      </nav>

      {/* Mobile nav */}
      <nav className="app-nav-mobile" role="tablist" aria-label="Main navigation" style={{
        position: "sticky", top: 60, zIndex: 9,
        background: th.headerBg, backdropFilter: "blur(16px)",
        padding: "0 8px",
      }}>
        {navItems.map(n => (
          <Button key={n.id} role="tab" aria-selected={view === n.id} onClick={() => { setView(n.id); setAnnouncement(`Navigated to ${n.label}`); }} variant="ghost" style={{
            fontSize: 12, padding: "8px 14px", cursor: "pointer", userSelect: "none",
            color: view === n.id ? red : th.t3,
            background: view === n.id ? "#EA20280D" : "transparent",
            borderRadius: 6, border: "none", fontFamily: sans, lineHeight: "inherit",
            whiteSpace: "nowrap", transition: "all .15s",
          }}>
            {n.label}
            {n.id === "messages" && msgs.some(m => m.unread) && (
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: red, marginLeft: 3, verticalAlign: "middle" }} />
            )}
          </Button>
        ))}
      </nav>

      <main id="main-content" className="app-main" role="main" aria-label="Dashboard content" style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div key={view} style={{ animation: "fadeIn .25s ease" }}>
          {pages[view]}
        </div>
      </main>

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
        {announcement}
      </div>

      <footer className="app-footer" style={{ borderTop: `1px solid ${th.line}`, display: "flex", justifyContent: "space-between", fontSize: 11, color: th.t3 }}>
        <span>© 2026 Northstar Pacific Development Group</span>
        <span>710 – 1199 W Pender, Vancouver BC V6E 2R1</span>
      </footer>

      {showWarning && <SessionWarningModal onDismiss={dismissWarning} onLogout={handleLogout} />}
    </div>
    </ThemeContext.Provider>);
}
