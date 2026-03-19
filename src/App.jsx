import { useState, useCallback, useEffect, useRef, createContext, useContext, useMemo, lazy, Suspense } from "react";
import { ToastProvider, useToast } from "./context/ToastContext.jsx";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { login as apiLogin, logout as apiLogout, getMe, isAuthed as checkAuthed, fetchInvestorProjects, fetchDocuments, fetchDistributions, fetchMessages, fetchProjects, downloadDocument, fetchThreads, fetchThread, createThread, replyToThread, updateProfile, fetchSignatureRequests, signDocument, fetchNotificationPreferences, updateNotificationPreferences, fetchCapitalAccount, fetchCashFlows, calculateWaterfallApi, fetchEntities, createEntity, updateEntity, deleteEntity, runFinancialModel, changePassword, forgotPassword, resetPassword, fetchLoginHistory, setupMFA, verifyMFASetup, verifyMFA, disableMFA, getMFAStatus, regenerateBackupCodes, setToken, fmt, fmtCurrency, fetchMyFlags, fetchNotifications } from "./api.js";
import { colors, fonts, inputStyle, btnStyle, btnOutline, shadows, radius, labelStyle } from "./styles/theme.js";
import Button from "./components/Button.jsx";
import Card from "./components/Card.jsx";
import FormInput from "./components/FormInput.jsx";
import Modal from "./components/Modal.jsx";
import StatCard from "./components/StatCard.jsx";
import StatusBadge from "./components/StatusBadge.jsx";
import Spinner from "./components/Spinner.jsx";
import EmptyState from "./components/EmptyState.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import Tabs from "./components/Tabs.jsx";
import DataTable from "./components/DataTable.jsx";
import SearchFilterBar from "./components/SearchFilterBar.jsx";
import SectionHeaderShared from "./components/SectionHeader.jsx";
import ResetPasswordPage from "./pages/ResetPassword.jsx";
import ActivityPage from "./pages/Activity.jsx";
import DistributionsPage from "./pages/Distributions.jsx";
import FinancialModelerPage from "./pages/FinancialModeler.jsx";
import CapTablePage from "./pages/CapTable.jsx";
import DocumentsPage from "./pages/Documents.jsx";
import MessagesPage from "./pages/Messages.jsx";
import ProfilePage from "./pages/Profile.jsx";
import Portfolio from "./pages/Portfolio.jsx";
import Overview from "./pages/Overview.jsx";
import LoginPage from "./pages/Login.jsx";

// Lazy load heavy components — they get their own chunks
const AdminPanel = lazy(() => import("./Admin.jsx"));
const ProspectPortal = lazy(() => import("./ProspectPortal.jsx"));

// ─── THEME ───────────────────────────────────────────────
const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const darkText = colors.darkText;
const cream = colors.cream;
const green = colors.green;

// Northstar "N" icon — two parallelogram shapes from brand
export const NorthstarIcon = ({ size = 32, color = red }) => (
  <svg width={size} height={size} viewBox="0 0 163 162" fill="none">
    <polygon points="7.2,10 7.2,135.7 68.9,135.7 68.9,63.9" fill={color}/>
    <polygon points="152.2,152.2 152.2,26.5 90.6,26.5 90.6,98.3" fill={color}/>
  </svg>
);

// Northstar wordmark — geometric letter paths from brand SVG
export const NorthstarWordmark = ({ height = 20, color = darkText }) => (
  <svg height={height} viewBox="0 0 499.5 72" fill="none">
    <path d="M17,8v7l22.7,22.7V8h8.4V66h-8.4V48.8L17,26.1V66H8.6V8L17,8L17,8z" fill={color}/>
    <path d="M66.4,26c0-12.3,7-18.9,20-18.9s20,6.6,20,18.9v22c0,12.4-7,19-20,19s-20-6.6-20-19V26z M74.8,47.9c0,7.5,4.1,11.6,11.6,11.6C94,59.6,98,55.5,98,47.9V26c0-7.5-4-11.6-11.6-11.6c-7.5,0-11.6,4.1-11.6,11.6V47.9z" fill={color}/>
    <path d="M124.5,8h21.6c11.9,0,18.3,6.1,18.3,17.3c0,9.8-4.9,15.7-14.2,17l13.9,13.9V66h-8.4v-7l-16.5-16.5h-6.5V66h-8.4V8L124.5,8z M132.9,35.3h13.3c6.5,0,10-3.6,10-10c0-6.5-3.5-10-10-10h-13.3V35.3L132.9,35.3z" fill={color}/>
    <path d="M175.3,15.1V8h43.5v7.1h-17.6V66h-8.5V15.1H175.3z" fill={color}/>
    <path d="M243.7,8v25h22.7V8h8.4V66h-8.4V40h-22.7v26h-8.4V8H243.7z" fill={color}/>
    <path d="M301,47.7c0,7.7,4.5,11.9,12.9,11.9c7.2,0,11.1-3.1,11.1-8.9c0-16-31.2-4-31.2-27.4c0-10.5,6.3-16.3,18.2-16.3c12.8,0,19.7,6.7,19.7,19.2h-7.9c0-7.7-4.1-11.9-11.9-11.9c-6.5,0-10,3-10,8.5c0,15.8,31.2,3.8,31.2,27.2c0,10.9-6.7,16.8-19.3,16.8c-13.4,0-20.6-6.7-20.6-19.2L301,47.7L301,47.7z" fill={color}/>
    <path d="M342.1,15.1V8h43.5v7.1H368V66h-8.5V15.1H342.1L342.1,15.1z" fill={color}/>
    <path d="M454.4,8h21.6c11.9,0,18.3,6.1,18.3,17.3c0,9.8-4.9,15.7-14.2,17l13.9,13.9V66h-8.4v-7l-16.5-16.5h-6.5V66h-8.4L454.4,8L454.4,8z M462.8,35.3h13.3c6.5,0,10-3.6,10-10c0-6.5-3.5-10-10-10h-13.3V35.3L462.8,35.3z" fill={color}/>
    <polygon points="418.7,7.6 414,7.6 397,24.6 397,66 405.4,66 405.4,27.4 416.3,16.4 427.3,27.4 427.3,66 435.7,66 435.7,24.6" fill={color}/>
  </svg>
);

const themes = {
  dark: { bg: "#0A0A0F", surface: "#0C0C0C", line: "#1A1A1A", t1: "#E8E4DE", t2: "#8C887F", t3: "#4A4843", hover: "#0F0F0F", headerBg: "#0A0A0FF0", avatarGrad: "linear-gradient(135deg, #EA2028, #c41920)" },
  light: { bg: "#F8F7F4", surface: colors.white, line: "#ECEAE5", t1: "#1A1816", t2: "#5C5850", t3: colors.mutedText, hover: colors.lightBorder, headerBg: "#FFFFFFFA", avatarGrad: "linear-gradient(135deg, #EA2028, #c41920)" },
};

const ThemeContext = createContext(themes.light);
export const useTheme = () => useContext(ThemeContext);

const bg = "#060606", surface = "#0C0C0C", line = "#1A1A1A", t1 = "#E8E4DE", t2 = "#8C887F", t3 = "#4A4843";


// ─── SHARED COMPONENTS ───────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = "$", suffix = "K" }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: sans, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
      <div style={{ color: t3, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || t1 }}>{p.name}: {prefix}{fmt(p.value)}{suffix}</div>
      ))}
    </div>
  );
}


function SectionHeader({ title, right }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: t1 }}>{title}</h2>
      {right && <span style={{ fontSize: 12, color: t3 }}>{right}</span>}
    </div>
  );
}

// ─── LOADING SPINNER ─────────────────────────────────────
// Using shared Spinner component from ./components/Spinner.jsx

// ─── ERROR BANNER ────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  const th = useTheme();
  return (
    <div role="alert" style={{
      padding: "14px 20px", borderRadius: 4,
      background: `${red}10`, border: `1px solid ${red}30`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontFamily: sans, fontSize: 13, color: red,
    }}>
      <span>{message || "Something went wrong."}</span>
      {onRetry && (
        <span onClick={onRetry} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 3, border: `1px solid ${red}44`, cursor: "pointer", marginLeft: 16, flexShrink: 0 }}>Retry</span>
      )}
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────
// Using shared EmptyState component from ./components/EmptyState.jsx

// ─── LOADING PAGE (full-page loader for data fetch) ─────
function LoadingPage() {
  const th = useTheme();
  return (
    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16 }}>
      <Spinner size={32} />
      <span style={{ fontSize: 13, color: th.t3 }}>Loading...</span>
    </div>
  );
}

// ─── CSV EXPORT UTILITY ─────────────────────────────────
function exportCSV(headers, rows, filename) {
  const escape = (v) => {
    const s = String(v == null ? "" : v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── FORMAT TYPE UTILITY ─────────────────────────────────
const formatType = (t) => t ? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

function ProgressBar({ value, color }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: `${line}88`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color === green ? green : "linear-gradient(90deg, #EA2028, #ff4a4a)", borderRadius: 20, transition: "width .8s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: t3, minWidth: 28, textAlign: "right" }}>{value}%</span>
    </div>
  );
}


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

function DocumentsSkeleton() {
  const th = useTheme();
  return (
    <div aria-busy="true">
      <div style={{ marginBottom: 40 }}>
        <SkeletonBlock width={180} height={36} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={240} height={14} />
      </div>
      <Card padding="0" style={{ overflow: "hidden", background: th.surface }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ padding: "16px 20px", borderBottom: i < 4 ? `1px solid ${th.line}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <SkeletonBlock width={200} height={14} style={{ marginBottom: 6 }} />
              <SkeletonBlock width={280} height={11} />
            </div>
            <SkeletonBlock width={70} height={24} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function MessagesSkeleton() {
  const th = useTheme();
  return (
    <div aria-busy="true">
      <div style={{ marginBottom: 40 }}>
        <SkeletonBlock width={180} height={36} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={200} height={14} />
      </div>
      <Card padding="0" style={{ overflow: "hidden", background: th.surface }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "18px 20px", borderBottom: i < 3 ? `1px solid ${th.line}` : "none" }}>
            <SkeletonBlock width={7} height={7} style={{ borderRadius: "50%", marginTop: 7, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock width={220} height={14} style={{ marginBottom: 8 }} />
              <SkeletonBlock width={160} height={12} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="80%" height={12} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}


// ─── SESSION TIMEOUT HOOK ────────────────────────────────
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING = 25 * 60 * 1000; // 25 minutes — warn at 5 min remaining

function useSessionTimeout(authed, onTimeout) {
  const [showWarning, setShowWarning] = useState(false);
  const lastActivity = useRef(Date.now());
  const warningTimer = useRef(null);
  const logoutTimer = useRef(null);

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);
    if (authed) {
      warningTimer.current = setTimeout(() => setShowWarning(true), SESSION_WARNING);
      logoutTimer.current = setTimeout(() => onTimeout(), SESSION_TIMEOUT);
    }
  }, [authed, onTimeout]);

  useEffect(() => {
    if (!authed) { setShowWarning(false); return; }
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetTimers();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [authed, resetTimers]);

  return { showWarning, dismissWarning: () => setShowWarning(false) };
}

// ─── SESSION WARNING MODAL ──────────────────────────────
function SessionWarningModal({ onDismiss, onLogout }) {
  const th = useTheme();
  return (
    <Modal open={true} onClose={onDismiss} title="Session Expiring" maxWidth={400}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>&#x23F0;</div>
        <p style={{ fontSize: 13, color: th.t2, lineHeight: 1.6, marginBottom: 24 }}>
          Your session will expire in 5 minutes due to inactivity. Click below to stay signed in.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <span onClick={onLogout} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 4, border: `1px solid ${th.line}`, color: th.t3, cursor: "pointer" }}>Sign Out</span>
          <span onClick={onDismiss} style={{ fontSize: 13, padding: "10px 24px", borderRadius: 4, background: red, color: colors.white, cursor: "pointer", fontWeight: 500 }}>Stay Signed In</span>
        </div>
      </div>
    </Modal>
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

  // Fetch notification count for bell indicator
  useEffect(() => {
    if (authed) {
      fetchNotifications().then(notifs => {
        const unread = Array.isArray(notifs) ? notifs.filter(n => !n.read).length : 0;
        setNotifCount(unread);
      }).catch(() => {});
    }
  }, [authed]);

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
    messages: <MessagesPage toast={toast} investor={investor} initialThreadId={navParams.threadId} />,
    activity: <ActivityPage toast={toast} onNavigate={navigateTo} />,
    profile: <ProfilePage investor={investor} toast={toast} onUpdate={(u) => setAppData(prev => ({ ...prev, investor: { ...prev.investor, ...u } }))} />,
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
          {/* Notification bell */}
          <Button aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} unread)` : ""}`} onClick={() => navigateTo("activity")} variant="ghost" style={{ position: "relative", fontSize: 16, cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: `1px solid ${th.line}`, transition: "border-color .15s", lineHeight: 1, background: "transparent", color: "inherit" }}>
            &#x1F514;
            {notifCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "50%", background: red, color: colors.white, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>{notifCount > 99 ? "99+" : notifCount}</span>
            )}
          </Button>
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
