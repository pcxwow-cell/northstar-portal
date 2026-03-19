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


// ─── LOGIN PAGE ─────────────────────────────────────────
function LoginPage({ onLogin, onShowProspects }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  // MFA state
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const mfaInputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiLogin(email, password);
      if (result.requiresMfa) {
        setMfaPending(true);
        setMfaUserId(result.userId);
        setMfaToken(result.mfaToken);
        setLoading(false);
        setTimeout(() => mfaInputRefs[0].current?.focus(), 100);
        return;
      }
      onLogin(result);
    } catch (err) {
      // Check for lockout response
      if (err.lockedUntil) {
        setLockedUntil(new Date(err.lockedUntil));
      }
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const code = useBackupCode ? backupCode.trim() : mfaCode.join("");
    try {
      const data = await verifyMFA(mfaUserId, code, mfaToken);
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setLoading(false);
    }
  }

  function handleMfaDigit(index, value) {
    if (!/^\d*$/.test(value)) return;
    const updated = [...mfaCode];
    updated[index] = value.slice(-1);
    setMfaCode(updated);
    if (value && index < 5) mfaInputRefs[index + 1].current?.focus();
  }

  function handleMfaKeyDown(index, e) {
    if (e.key === "Backspace" && !mfaCode[index] && index > 0) {
      mfaInputRefs[index - 1].current?.focus();
    }
  }

  function handleMfaPaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const updated = [...mfaCode];
      for (let i = 0; i < 6; i++) updated[i] = pasted[i] || "";
      setMfaCode(updated);
      const nextEmpty = Math.min(pasted.length, 5);
      mfaInputRefs[nextEmpty].current?.focus();
      e.preventDefault();
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      // Always show success (don't reveal if email exists)
      setForgotSent(true);
    }
    setForgotLoading(false);
  }

  // Northstar's actual project images
  const projectImages = {
    porthaven: "https://northstardevelopment.ca/public/images/porthaven-1.jpg",
    livy: "https://northstardevelopment.ca/public/images/livy-2.jpeg",
    estrella: "https://northstardevelopment.ca/public/images/estrella-1.jpg",
    panorama: "https://northstardevelopment.ca/public/images/panorama-1.jpg",
  };

  return (
    <div style={{ fontFamily: sans, color: darkText, minHeight: "100vh", display: "flex", flexDirection: "column", background: colors.white }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .login-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .login-hero { display: none !important; }
          .login-form-wrap { max-width: 440px; margin: 0 auto; }
        }
        @media (max-width: 600px) {
          .login-container { padding: 24px 20px !important; }
          .login-header { padding: 20px 20px !important; }
          .login-footer { padding: 16px 20px !important; flex-direction: column; gap: 4px; text-align: center; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="login-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 48px", borderBottom: "1px solid #ECEAE5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NorthstarIcon size={28} color={red} />
          <NorthstarWordmark height={16} color={darkText} />
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#888" }}>
          <span>Vancouver, BC</span>
          <span style={{ color: "#DDD" }}>|</span>
          <span>Est. 2019</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="login-container" style={{ flex: 1, display: "flex", alignItems: "center", padding: "48px 48px" }}>
        <div className="login-grid" style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 80, maxWidth: 1100, width: "100%", margin: "0 auto", alignItems: "center" }}>

          {/* Left: Brand + projects */}
          <div className="login-hero" style={{ animation: "slideUp .8s ease" }}>
            <div style={{ marginBottom: 48 }}>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: red, fontWeight: 500, marginBottom: 16 }}>Investor Portal</p>
              <h1 style={{ fontSize: 42, fontWeight: 300, lineHeight: 1.2, color: darkText, marginBottom: 20, fontFamily: sans }}>
                Enlivening Communities<br />Through Mindful Development
              </h1>
              <p style={{ fontSize: 15, color: "#777", lineHeight: 1.7, maxWidth: 480 }}>
                Track your projects, review documents, and monitor construction progress — all in one place.
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 48, marginBottom: 48, paddingBottom: 40, borderBottom: "1px solid #ECEAE5" }}>
              {[
                { value: "$22.3M", label: "Total Development" },
                { value: "4", label: "Projects" },
                { value: "212+", label: "Units" },
              ].map((s, i) => (
                <div key={i} style={{ animation: `slideUp ${.8 + i * .15}s ease` }}>
                  <div style={{ fontSize: 30, fontWeight: 300, color: darkText, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#888" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Project cards — using Northstar's actual images */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { img: projectImages.porthaven, name: "Porthaven", loc: "Port Coquitlam", status: "Under Construction" },
                { img: projectImages.livy, name: "Livy", loc: "Port Coquitlam", status: "Pre-Development" },
                { img: projectImages.estrella, name: "Estrella", loc: "British Columbia", status: "Under Construction" },
                { img: projectImages.panorama, name: "Panorama B6", loc: "Surrey, BC", status: "Completed" },
              ].map((p, i) => (
                <div key={i} style={{
                  position: "relative", borderRadius: 12, overflow: "hidden", height: 140,
                  backgroundImage: `url(${p.img})`, backgroundSize: "cover", backgroundPosition: "center",
                  animation: `fadeIn ${.8 + i * .15}s ease`,
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 60%, transparent 100%)" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: colors.white, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>{p.loc}</div>
                  </div>
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <span style={{
                      fontSize: 9, padding: "3px 8px", borderRadius: 2,
                      background: p.status === "Completed" ? "rgba(61,122,84,.9)" : "rgba(0,0,0,.5)",
                      color: colors.white, letterSpacing: ".03em", backdropFilter: "blur(4px)",
                    }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Login form */}
          <div className="login-form-wrap" style={{ animation: "fadeIn .6s ease .2s both" }}>
            {mfaPending ? (
              /* ── MFA Verification Form ── */
              <form onSubmit={handleMfaSubmit} style={{
                background: colors.white, border: "1px solid #ECEAE5", borderRadius: 12, padding: "40px 32px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
              }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${red}10`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 16v2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, color: darkText }}>Two-Factor Authentication</h2>
                  <p style={{ fontSize: 13, color: colors.mutedText }}>Enter the code from your authenticator app</p>
                </div>
                {error && (
                  <div style={{ fontSize: 12, color: red, padding: "10px 14px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 16, background: `${red}08` }}>{error}</div>
                )}
                {!useBackupCode ? (
                  <>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }} onPaste={handleMfaPaste}>
                      {mfaCode.map((digit, i) => (
                        <input key={i} ref={mfaInputRefs[i]} type="text" inputMode="numeric" maxLength={1}
                          value={digit} onChange={e => handleMfaDigit(i, e.target.value)} onKeyDown={e => handleMfaKeyDown(i, e)}
                          style={{
                            width: 48, height: 56, textAlign: "center", fontSize: 24, fontWeight: 500, fontFamily: "monospace",
                            border: `2px solid ${digit ? red : "#E0DDD8"}`, borderRadius: 8, outline: "none", color: darkText,
                            background: "#FAFAFA", transition: "border-color .15s",
                          }}
                          onFocus={e => e.target.style.borderColor = red}
                          onBlur={e => { if (!digit) e.target.style.borderColor = "#E0DDD8"; }}
                        />
                      ))}
                    </div>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <span onClick={() => { setUseBackupCode(true); setError(""); }} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Use a backup code instead</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Backup Code</label>
                      <input type="text" value={backupCode} onChange={e => setBackupCode(e.target.value)} placeholder="Enter 8-character backup code"
                        style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 8, color: darkText, fontSize: 16, fontFamily: "monospace", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: ".15em" }}
                        onFocus={e => e.target.style.borderColor = red}
                        onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
                    </div>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <span onClick={() => { setUseBackupCode(false); setError(""); setBackupCode(""); }} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Use authenticator app instead</span>
                    </div>
                  </>
                )}
                <Button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px", background: loading ? `${red}AA` : red, color: colors.white,
                  border: "none", borderRadius: 8, fontSize: 14, fontFamily: sans, fontWeight: 500, cursor: loading ? "default" : "pointer",
                  letterSpacing: ".02em", transition: "background .15s", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
                }}>
                  {loading ? "Verifying..." : "Verify"}
                </Button>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <span onClick={() => { setMfaPending(false); setMfaCode(["","","","","",""]); setBackupCode(""); setUseBackupCode(false); setError(""); setPassword(""); }}
                    style={{ fontSize: 12, color: "#888", cursor: "pointer" }}>Back to login</span>
                </div>
              </form>
            ) : (
              /* ── Standard Login Form ── */
              <form onSubmit={handleSubmit} style={{
                background: colors.white, border: "1px solid #ECEAE5", borderRadius: 12, padding: "40px 32px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
              }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <NorthstarIcon size={40} color={red} />
                  <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, marginTop: 16, color: darkText }}>Investor Portal</h2>
                  <p style={{ fontSize: 13, color: colors.mutedText }}>Sign in to access your account</p>
                </div>
                {error && (
                  <div style={{ fontSize: 12, color: red, padding: "10px 14px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 16, background: `${red}08` }}>
                    {error}
                    {lockedUntil && new Date(lockedUntil) > new Date() && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                        Account locked for security. Try again in {Math.ceil((new Date(lockedUntil) - new Date()) / 60000)} minutes.
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="investor@example.com"
                    style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 8, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
                    onFocus={e => e.target.style.borderColor = red}
                    onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 8, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
                    onFocus={e => e.target.style.borderColor = red}
                    onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
                </div>
                <Button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px", background: loading ? `${red}AA` : red, color: colors.white,
                  border: "none", borderRadius: 8, fontSize: 14, fontFamily: sans, fontWeight: 500, cursor: loading ? "default" : "pointer",
                  letterSpacing: ".02em", transition: "background .15s", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
                }}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <div style={{ textAlign: "right", marginTop: 10 }}>
                  <span onClick={() => setShowForgot(true)} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Forgot password?</span>
                </div>
                <div style={{ marginTop: 14, padding: "14px 16px", border: "1px solid #ECEAE5", borderRadius: 4, background: cream }}>
                  <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Quick Demo Login</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="outline" type="button" onClick={() => { setEmail("j.chen@pacificventures.ca"); setPassword("northstar2025"); setTimeout(() => document.querySelector("form")?.requestSubmit(), 100); }} style={{ flex: 1, padding: "10px", background: colors.white, border: "1px solid #DDD", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: darkText, fontWeight: 500 }}>
                      Investor Demo
                    </Button>
                    <Button variant="outline" type="button" onClick={() => { setEmail("admin@northstardevelopment.ca"); setPassword("admin2025"); setTimeout(() => document.querySelector("form")?.requestSubmit(), 100); }} style={{ flex: 1, padding: "10px", background: colors.white, border: `1px solid ${red}40`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: red, fontWeight: 500 }}>
                      Admin Demo
                    </Button>
                  </div>
                </div>
              </form>
            )}
            <p style={{ fontSize: 12, color: colors.mutedText, textAlign: "center", marginTop: 20 }}>
              Interested in investing? <span onClick={onShowProspects} style={{ color: red, cursor: "pointer", fontWeight: 500 }}>Learn more →</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal open={showForgot} onClose={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} title="Reset Password" maxWidth={400}>
        {forgotSent ? (
          <>
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
              If an account exists with that email, we have sent a password reset link. Please check your inbox.
            </p>
            <p style={{ fontSize: 11, color: colors.mutedText, fontStyle: "italic" }}>
              (Demo mode — check the server console for the reset link)
            </p>
            <Button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} style={{ marginTop: 16, padding: "10px 24px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans }}>
              Back to Login
            </Button>
          </>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Enter your email address and we will send you a link to reset your password.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required placeholder="your@email.com"
                style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 4, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" type="button" onClick={() => { setShowForgot(false); setForgotEmail(""); }} style={{ flex: 1, padding: "10px", background: colors.white, border: "1px solid #DDD", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans, color: darkText }}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotLoading} style={{ flex: 1, padding: "10px", background: forgotLoading ? `${red}AA` : red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, cursor: forgotLoading ? "default" : "pointer", fontFamily: sans }}>
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Footer ── */}
      <div className="login-footer" style={{ padding: "20px 48px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", borderTop: "1px solid #ECEAE5" }}>
        <span>© 2026 Northstar Pacific Development Group</span>
        <span>710 – 1199 W Pender St, Vancouver BC V6E 2R1</span>
      </div>
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
