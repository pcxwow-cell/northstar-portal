import { useState, useCallback, useEffect, useRef, createContext, useContext, useMemo, lazy, Suspense } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { login as apiLogin, logout as apiLogout, getMe, isAuthed as checkAuthed, fetchInvestorProjects, fetchDocuments, fetchDistributions, fetchMessages, fetchProjects, downloadDocument, fetchThreads, fetchThread, createThread, replyToThread, updateProfile, fetchSignatureRequests, signDocument, fetchNotificationPreferences, updateNotificationPreferences, fetchCapitalAccount, fetchCashFlows, calculateWaterfallApi, fetchEntities, createEntity, updateEntity, deleteEntity, runFinancialModel, changePassword, forgotPassword, resetPassword, fetchLoginHistory, setupMFA, verifyMFASetup, verifyMFA, disableMFA, getMFAStatus, regenerateBackupCodes, setToken, fmt, fmtCurrency } from "./api.js";

// Lazy load heavy components — they get their own chunks
const AdminPanel = lazy(() => import("./Admin.jsx"));
const ProspectPortal = lazy(() => import("./ProspectPortal.jsx"));

// ─── THEME ───────────────────────────────────────────────
export const serif = "'Cormorant Garamond', Georgia, serif";
export const sans = "'DM Sans', -apple-system, sans-serif";
export const red = "#EA2028";
export const darkText = "#231F20";
export const cream = "#FDFAF2";
export const green = "#3D7A54";

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
  light: { bg: "#F8F7F4", surface: "#FFFFFF", line: "#ECEAE5", t1: "#1A1816", t2: "#5C5850", t3: "#767168", hover: "#F0EDE8", headerBg: "#FFFFFFFA", avatarGrad: "linear-gradient(135deg, #EA2028, #c41920)" },
};

const ThemeContext = createContext(themes.light);
const useTheme = () => useContext(ThemeContext);

const bg = "#060606", surface = "#0C0C0C", line = "#1A1A1A", t1 = "#E8E4DE", t2 = "#8C887F", t3 = "#4A4843";

// ─── TOAST SYSTEM ────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} role="alert" aria-live="polite" onClick={() => onDismiss(t.id)} style={{
          background: surface, border: `1px solid ${t.type === "success" ? green : t.type === "error" ? red : line}`,
          borderRadius: 10, padding: "12px 20px", minWidth: 280, maxWidth: 400,
          fontFamily: sans, fontSize: 13, color: t1, cursor: "pointer",
          animation: "fadeIn .2s ease", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ color: t.type === "success" ? green : t.type === "error" ? red : t2 }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "↓"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, add, dismiss };
}

// ─── MODAL ───────────────────────────────────────────────
function Modal({ open, onClose, children, ariaLabel }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const modalRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    // Focus trap: focus the modal on open
    setTimeout(() => modalRef.current?.focus(), 50);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", animation: "fadeIn .15s ease",
    }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label={ariaLabel || "Dialog"} tabIndex={-1} onClick={e => e.stopPropagation()} style={{
        background: surface, border: `1px solid ${line}`, borderRadius: 12,
        padding: "32px", maxWidth: 520, width: "90%", maxHeight: "80vh", overflow: "auto",
        boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", outline: "none",
      }}>
        {children}
      </div>
    </div>
  );
}

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

function StatusBadge({ status }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const colors = {
    "Completed": green, "Under Construction": "#8B7128", "Pre-Development": red,
  };
  const c = colors[status] || t3;
  return (
    <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, background: `${c}12`, color: c, letterSpacing: ".03em", fontWeight: 500, backdropFilter: "blur(4px)" }}>
      {status}
    </span>
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

function Table({ columns, rows, onRowClick, sortable, sortKey: externalSortKey, sortDir: externalSortDir, onSort }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [internalSortKey, setInternalSortKey] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState("asc");

  const sortKey = externalSortKey !== undefined ? externalSortKey : internalSortKey;
  const sortDir = externalSortDir !== undefined ? externalSortDir : internalSortDir;

  function handleSort(key) {
    if (!sortable) return;
    if (onSort) { onSort(key); return; }
    if (key === internalSortKey) setInternalSortDir(d => d === "asc" ? "desc" : "asc");
    else { setInternalSortKey(key); setInternalSortDir("asc"); }
  }

  let displayRows = rows;
  if (sortable && sortKey && !onSort) {
    displayRows = [...rows].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  return (
    <div style={{ border: `1px solid ${line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
          {columns.map(c => c.label).join(", ")} data table
        </caption>
        <thead>
          <tr style={{ borderBottom: `1px solid ${line}`, background: surface }}>
            {columns.map(c => (
              <th key={c.key} scope="col" onClick={() => c.sortKey !== false && handleSort(c.key)} style={{
                padding: "13px 16px", textAlign: c.align || "left", fontWeight: 400, fontSize: 10,
                letterSpacing: ".08em", textTransform: "uppercase", color: t3, width: c.width,
                cursor: sortable && c.sortKey !== false ? "pointer" : "default", userSelect: "none",
              }}>
                {c.label}
                {sortable && sortKey === c.key && <span style={{ marginLeft: 4, fontSize: 9 }}>{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: "32px 16px", textAlign: "center", color: t3, fontSize: 13 }}>No data</td></tr>
          ) : displayRows.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row, i)} style={{ borderBottom: i < displayRows.length - 1 ? `1px solid ${line}` : "none", cursor: onRowClick ? "pointer" : "default", transition: "background .12s" }}
              onMouseEnter={e => e.currentTarget.style.background = hover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "14px 16px", textAlign: c.align || "left" }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── LOADING SPINNER ─────────────────────────────────────
function LoadingSpinner({ size = 24, color = red }) {
  return (
    <div role="status" aria-label="Loading" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes northstarSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: size, height: size,
        border: `2px solid ${color}22`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "northstarSpin .7s linear infinite",
      }} />
    </div>
  );
}

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
function EmptyState({ icon, title, subtitle }) {
  const th = useTheme();
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: sans }}>
      {icon && <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.3 }}>{icon}</div>}
      <div style={{ fontSize: 16, fontWeight: 500, color: th.t2, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: th.t3 }}>{subtitle}</div>}
    </div>
  );
}

// ─── LOADING PAGE (full-page loader for data fetch) ─────
function LoadingPage() {
  const th = useTheme();
  return (
    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16 }}>
      <LoadingSpinner size={32} />
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

// ─── RESPONSIVE TABLE ───────────────────────────────────
function ResponsiveTable({ columns, rows, onRowClick, sortable, emptyMessage }) {
  const th = useTheme();
  // Primary column is the first one
  const primaryCol = columns[0];
  const secondaryCols = columns.slice(1);
  return (
    <div className="responsive-table">
      <Table columns={columns} rows={rows} onRowClick={onRowClick} sortable={sortable} />
      <div className="mobile-cards" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: th.t3, fontSize: 13 }}>{emptyMessage || "No data"}</div>
        ) : rows.map((row, i) => (
          <div key={i} onClick={() => onRowClick?.(row, i)} style={{
            background: th.surface, borderRadius: 10, padding: "16px 20px",
            border: `1px solid ${th.line}`, cursor: onRowClick ? "pointer" : "default",
            boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
            transition: "transform .15s, box-shadow .15s",
          }}
            onMouseEnter={e => { if (onRowClick) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.08)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)"; }}>
            {/* Primary header */}
            <div style={{ fontSize: 14, fontWeight: 500, color: th.t1, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${th.line}` }}>
              {primaryCol.render ? primaryCol.render(row) : row[primaryCol.key]}
            </div>
            {/* Label-value grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              {secondaryCols.map(c => (
                <div key={c.key}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", color: th.t3, marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 13, color: th.t1 }}>{c.render ? c.render(row) : row[c.key]}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
          <div key={i} style={{ background: th.surface, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <SkeletonBlock height={140} style={{ borderRadius: 0 }} />
            <div style={{ padding: 20 }}>
              <SkeletonBlock width={160} height={16} style={{ marginBottom: 16 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[0,1,2].map(j => <SkeletonBlock key={j} height={32} />)}
              </div>
            </div>
          </div>
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
      <div style={{ borderRadius: 12, overflow: "hidden", background: th.surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ padding: "16px 20px", borderBottom: i < 4 ? `1px solid ${th.line}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <SkeletonBlock width={200} height={14} style={{ marginBottom: 6 }} />
              <SkeletonBlock width={280} height={11} />
            </div>
            <SkeletonBlock width={70} height={24} />
          </div>
        ))}
      </div>
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
      <div style={{ borderRadius: 12, overflow: "hidden", background: th.surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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
      </div>
    </div>
  );
}

// ─── ANIMATED NUMBER ────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "", duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef();

  useEffect(() => {
    const target = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    if (isNaN(target)) { setDisplay(value); return; }

    const start = Date.now();
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(target * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [value, duration]);

  return <>{prefix}{typeof display === "number" ? display.toLocaleString() : display}{suffix}</>;
}

// ─── PAGE: OVERVIEW ──────────────────────────────────────
// ─── ONBOARDING WIZARD ─────────────────────────────────
function OnboardingWizard({ investor, onComplete }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Welcome to Northstar", desc: "Your investor portal gives you full transparency into your real estate investments. Let's take a quick tour.", icon: "\u{1F3E0}" },
    { title: "Your Dashboard", desc: "See your portfolio at a glance — total contributed, current value, distributions, and IRR across all projects.", icon: "\u{1F4CA}" },
    { title: "Documents & Signatures", desc: "Access investment documents, K-1s, and sign agreements electronically — all in one place.", icon: "\u{1F4C4}" },
    { title: "Messaging", desc: "Communicate directly with Northstar staff through secure threaded messages. You'll get email notifications for new messages.", icon: "\u{2709}\u{FE0F}" },
    { title: "You're All Set!", desc: "Explore your portal. You can update your profile, enable two-factor authentication, and set notification preferences in Settings.", icon: "\u{2705}" },
  ];
  const s = steps[step];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: surface, borderRadius: 16, padding: "40px 36px", maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.15)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{s.icon}</div>
        <h2 style={{ fontSize: 20, fontWeight: 500, color: t1, marginBottom: 8 }}>{s.title}</h2>
        <p style={{ fontSize: 14, color: t2, lineHeight: 1.6, marginBottom: 32 }}>{s.desc}</p>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? red : `${line}`, transition: "all .2s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ padding: "10px 20px", border: `1px solid ${line}`, borderRadius: 6, background: "transparent", color: t2, fontSize: 13, cursor: "pointer" }}>Back</button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} style={{ padding: "10px 24px", border: "none", borderRadius: 6, background: red, color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Next</button>
          ) : (
            <button onClick={() => { localStorage.setItem("northstar_onboarded", "true"); onComplete(); }} style={{ padding: "10px 24px", border: "none", borderRadius: 6, background: red, color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Get Started</button>
          )}
          {step === 0 && (
            <button onClick={() => { localStorage.setItem("northstar_onboarded", "true"); onComplete(); }} style={{ padding: "10px 16px", border: "none", borderRadius: 6, background: "transparent", color: t3, fontSize: 12, cursor: "pointer" }}>Skip tour</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Overview({ onNavigate, investor, projects, myProjects, allDistributions, msgs }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("northstar_onboarded"));
  return (
    <>
      {showOnboarding && <OnboardingWizard investor={investor} onComplete={() => setShowOnboarding(false)} />}
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: red, fontWeight: 600, marginBottom: 8 }}>
          Your Investments
        </p>
        <h1 style={{ fontFamily: sans, fontSize: 28, fontWeight: 300, lineHeight: 1.2, color: t1 }}>
          Good afternoon, {investor.name?.split(" ")[0] || "Investor"}
        </h1>
        <p style={{ fontSize: 14, color: t3, marginTop: 4 }}>
          Northstar Pacific Development Group · {investor.role}
        </p>
      </div>

      {/* Portfolio summary cards */}
      {(() => {
        const totalContributed = myProjects.reduce((s, p) => s + (p.investorCommitted || 0), 0);
        const totalValue = myProjects.reduce((s, p) => s + (p.currentValue || 0), 0);
        const totalDistributed = allDistributions.reduce((s, d) => s + d.amount, 0);
        const gainLoss = totalValue + totalDistributed - totalContributed;
        return (
          <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
            {[
              { label: "Total Contributed", value: `$${fmt(totalContributed)}`, rawValue: totalContributed, prefix: "$", sub: `across ${myProjects.length} projects`, accent: red },
              { label: "Current Value", value: `$${fmt(totalValue)}`, rawValue: totalValue, prefix: "$", sub: gainLoss >= 0 ? `+$${fmt(gainLoss)} gain` : `-$${fmt(Math.abs(gainLoss))} loss`, subColor: gainLoss >= 0 ? green : red, accent: green },
              { label: "Total Distributed", value: `$${fmt(totalDistributed)}`, rawValue: totalDistributed, prefix: "$", sub: `${allDistributions.length} payments`, accent: "#D4A574" },
              { label: "Weighted IRR", value: `${(myProjects.reduce((s, p) => s + (p.irr || 0) * (p.investorCommitted || 0), 0) / (totalContributed || 1)).toFixed(1)}%`, sub: "blended across projects", accent: "#5B8DEF" },
            ].map((s, i) => (
              <div key={i} role="region" aria-label={`${s.label}: ${s.value}`} style={{ background: surface, padding: "20px 24px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", borderLeft: `3px solid ${s.accent}`, transition: "transform .15s, box-shadow .15s, border-color .2s", cursor: "default", border: "1px solid transparent", borderLeftWidth: 3, borderLeftColor: s.accent }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"; e.currentTarget.style.borderColor = `${s.accent}33`; e.currentTarget.style.borderLeftColor = s.accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.borderLeftColor = s.accent; }}>
                <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 8, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 300, color: t1 }}>{s.rawValue != null ? <AnimatedNumber value={s.rawValue} prefix={s.prefix || ""} /> : s.value}</div>
                <div style={{ fontSize: 11, color: s.subColor || t3, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Project cards */}
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: t3, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Active Projects</span>
        <span style={{ fontSize: 11, color: red, cursor: "pointer", letterSpacing: "normal", textTransform: "none", fontWeight: 500 }} onClick={() => onNavigate("portfolio")}>View All →</span>
      </div>
      <div className="project-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20, marginBottom: 48 }}>
        {myProjects.map((p) => {
          const projectImgMap = { Porthaven: "https://northstardevelopment.ca/public/images/porthaven-1.jpg", Livy: "https://northstardevelopment.ca/public/images/livy-2.jpeg", Estrella: "https://northstardevelopment.ca/public/images/estrella-1.jpg", "Panorama Building 6": "https://northstardevelopment.ca/public/images/panorama-1.jpg" };
          const img = projectImgMap[p.name];
          return (
          <div key={p.id} style={{ background: surface, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", cursor: "pointer", transition: "transform .15s, box-shadow .15s, border-color .2s", border: "1px solid transparent" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.1)"; e.currentTarget.style.borderColor = `${red}22`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)"; e.currentTarget.style.borderColor = "transparent"; }}
            onClick={() => onNavigate("portfolio")}>
            {/* Hero image */}
            {img && (
              <div style={{ height: 140, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.4) 0%, transparent 60%)" }} />
                <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,.9)", color: "#231F20", fontWeight: 500, zIndex: 1, backdropFilter: "blur(4px)" }}>{p.status}</span>
                <div style={{ position: "absolute", bottom: 12, left: 16, color: "#fff", fontSize: 18, fontWeight: 500, zIndex: 1 }}>{p.name}</div>
              </div>
            )}
            <div style={{ padding: "20px" }}>
              {!img && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: ".02em" }}>{p.name}</div>
                  <StatusBadge status={p.status} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 9, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Invested</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>${fmt(p.investorCommitted)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Current Value</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>${fmt(p.currentValue)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Net IRR</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: green }}>{p.irr}%</div>
                </div>
              </div>
              <ProgressBar value={p.completion} color={p.completion === 100 ? green : red} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: t3 }}>
                <span>Construction Progress</span><span>{p.completion}%</span>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Performance charts side by side */}
      <SectionHeader title="Value Tracking" right="Trailing 12 months" />
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 48 }}>
        {myProjects.map(p => (
          <div key={p.id} style={{ borderRadius: 12, padding: "24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize: 13, fontFamily: serif, fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: t3, marginBottom: 16 }}>{p.status} · {p.moic}x MOIC</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={p.performanceHistory}>
                <defs>
                  <linearGradient id={`ng${p.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={red} stopOpacity={.12} />
                    <stop offset="100%" stopColor={red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: t3, fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: t3, fontSize: 10 }} tickFormatter={v => `$${v}K`} />
                <Tooltip content={<ChartTooltip prefix="$" suffix="K" />} />
                <Area type="monotone" dataKey="value" stroke={red} strokeWidth={1.5} fill={`url(#ng${p.id})`} name="Value" />
                <Area type="monotone" dataKey="benchmark" stroke={t3} strokeWidth={1} strokeDasharray="3 3" fill="none" name="Cost Basis" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Distributions summary */}
      {allDistributions.length > 0 && (
        <>
          <SectionHeader title="Recent Distributions" right={<span style={{ color: red, cursor: "pointer" }} onClick={() => onNavigate("distributions")}>View all →</span>} />
          <div style={{ borderRadius: 12, padding: "24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 48 }}>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={allDistributions.slice().reverse().map(d => ({ q: `${d.quarter.replace("20", "'")}`, v: d.amount / 1000, project: d.project }))} barSize={20}>
                <XAxis dataKey="q" axisLine={false} tickLine={false} tick={{ fill: t3, fontSize: 10 }} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip prefix="$" suffix="K" />} />
                <Bar dataKey="v" fill={red} radius={[1, 1, 0, 0]} opacity={.8} name="Distribution" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ borderTop: `1px solid ${line}`, marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: t3 }}>Total Distributed: <span style={{ color: t1 }}>${fmt(allDistributions.reduce((s, d) => s + d.amount, 0))}</span></span>
              <span style={{ color: t3 }}>From: <span style={{ color: t2 }}>{[...new Set(allDistributions.map(d => d.project))].join(", ")}</span></span>
            </div>
          </div>
        </>
      )}

      {/* Activity Feed */}
      <SectionHeader title="Recent Activity" />
      <div style={{ borderRadius: 12, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", padding: "6px 0", marginBottom: 40 }}>
        {(() => {
          const activities = [];
          // Build activity items from available data
          allDistributions.slice(0, 2).forEach(d => {
            activities.push({ icon: "$", color: green, text: `Distribution received: $${fmt(d.amount)}`, sub: `${d.project} · ${d.date}`, time: d.date });
          });
          allDocuments.slice(0, 2).forEach(d => {
            activities.push({ icon: "\u{1F4C4}", color: "#5B8DEF", text: `Document available: ${d.name}`, sub: `${d.project || "General"} · ${d.category}`, time: d.date });
          });
          msgs.filter(m => m.unread).slice(0, 1).forEach(m => {
            activities.push({ icon: "\u{2709}", color: red, text: `New message from ${m.from || "Northstar"}`, sub: m.subject, time: "New" });
          });
          if (activities.length === 0) return <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: t3 }}>No recent activity</div>;
          return activities.slice(0, 5).map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "14px 20px", borderBottom: i < activities.length - 1 ? `1px solid ${line}` : "none", alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${a.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: t1 }}>{a.text}</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{a.sub}</div>
              </div>
              <div style={{ fontSize: 10, color: t3, flexShrink: 0 }}>{a.time}</div>
            </div>
          ));
        })()}
      </div>

      {/* Recent messages preview */}
      <SectionHeader title="Recent Messages" right={<span style={{ color: red, cursor: "pointer" }} onClick={() => onNavigate("messages")}>All messages →</span>} />
      {msgs.length === 0 ? (
        <EmptyState title="No messages yet" subtitle="Start a conversation with Northstar." />
      ) : (
      <div style={{ borderRadius: 12, overflow: "hidden", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", padding: "8px 0" }}>
        {msgs.slice(0, 3).map((m, i) => (
          <div key={m.id} style={{ display: "flex", gap: 12, padding: "14px 20px", borderBottom: i < 2 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s", alignItems: "flex-start" }}
            onMouseEnter={e => e.currentTarget.style.background = hover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: hover, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: t3, flexShrink: 0 }}>
              {m.from?.split(" ").map(n => n[0]).join("") || "NS"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: m.unread ? 500 : 400 }}>{m.from}</div>
              <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{m.subject}</div>
            </div>
            {m.unread && <div style={{ width: 8, height: 8, borderRadius: "50%", background: red, flexShrink: 0, marginTop: 6 }} />}
          </div>
        ))}
      </div>
      )}
    </>
  );
}

// ─── PAGE: PORTFOLIO ─────────────────────────────────────
function Portfolio({ myProjects, investor }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [selected, setSelected] = useState(null);
  const [capitalAccount, setCapitalAccount] = useState(null);
  const [cashFlows, setCashFlows] = useState([]);
  const project = selected !== null ? myProjects[selected] : null;

  useEffect(() => {
    if (project && investor) {
      fetchCapitalAccount(investor.id, project.id).then(setCapitalAccount).catch(() => setCapitalAccount(null));
      fetchCashFlows(investor.id, project.id).then(setCashFlows).catch(() => setCashFlows([]));
    }
  }, [selected, project?.id, investor?.id]);

  if (project) {
    const ca = capitalAccount || {};
    const displayIRR = ca.irr ?? project.irr;
    const displayMOIC = ca.moic ?? project.moic;

    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelected(null); setCapitalAccount(null); setCashFlows([]); }}>← Back to portfolio</p>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 400 }}>{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p style={{ fontSize: 14, color: t2 }}>{project.location} · {project.type}</p>
        </div>
        <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Your Committed", value: `$${fmt(project.investorCommitted)}`, accent: red },
            { label: "Current Value", value: `$${fmt(project.currentValue)}`, accent: green },
            { label: "Net IRR", value: displayIRR != null ? `${displayIRR}%` : "--", sub: capitalAccount ? "calculated" : null, accent: "#D4A574" },
            { label: "MOIC", value: displayMOIC != null ? `${displayMOIC}x` : "--", sub: capitalAccount ? "calculated" : null, accent: "#5B8DEF" },
          ].map((m, i) => (
            <div key={i} style={{ background: surface, padding: "24px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", borderLeft: `3px solid ${m.accent}` }}>
              <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
              {m.sub && <div style={{ fontSize: 9, color: green, marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>{m.sub}</div>}
            </div>
          ))}
        </div>
        {/* Capital Account Statement */}
        <SectionHeader title="Capital Account" />
        <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          {(() => {
            const contributed = capitalAccount ? ca.called : (project.investorCalled || project.investorCommitted || 0);
            const distributed = capitalAccount ? ca.totalDistributed : (project.distributions || []).reduce((s, d) => s + d.amount, 0);
            const endingBalance = capitalAccount ? ca.currentValue : (project.currentValue || 0);
            const unrealizedGain = capitalAccount ? ca.unrealizedGainLoss : (endingBalance - contributed + distributed);
            const rows = [
              { label: "Capital Committed", value: capitalAccount ? ca.committed : project.investorCommitted },
              { label: "Capital Called / Contributed", value: contributed },
              { label: "Unfunded Commitment", value: capitalAccount ? ca.unfunded : ((project.investorCommitted || 0) - contributed) },
              { label: "Total Distributions Received", value: distributed },
              { label: "Current Value (NAV)", value: endingBalance },
              { label: "Unrealized Gain / (Loss)", value: unrealizedGain, highlight: true },
            ];
            return rows.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderBottom: i < rows.length - 1 ? `1px solid ${line}` : "none", background: r.highlight ? `${line}44` : "transparent" }}>
                <span style={{ fontSize: 13, color: r.highlight ? t1 : t2, fontWeight: r.highlight ? 500 : 400 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: r.highlight ? 600 : 400, color: r.highlight ? (r.value >= 0 ? green : red) : t1 }}>
                  {r.value < 0 ? `-$${fmt(Math.abs(r.value))}` : `$${fmt(r.value)}`}
                </span>
              </div>
            ));
          })()}
        </div>

        {/* Cash Flow Timeline */}
        {cashFlows.length > 0 && (
          <>
            <SectionHeader title="Cash Flow History" />
            <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 100px", padding: "10px 20px", borderBottom: `1px solid ${line}`, background: `${line}33` }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3 }}>Date</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3 }}>Description</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: "right" }}>Amount</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: "right" }}>Type</span>
              </div>
              {cashFlows.map((cf, i) => (
                <div key={cf.id || i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 100px", padding: "12px 20px", borderBottom: i < cashFlows.length - 1 ? `1px solid ${line}` : "none", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: t3 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span style={{ fontSize: 13, color: t2 }}>{cf.description || cf.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", color: cf.amount < 0 ? red : green }}>
                    {cf.amount < 0 ? `-$${fmt(Math.abs(cf.amount))}` : `+$${fmt(cf.amount)}`}
                  </span>
                  <span style={{ fontSize: 11, textAlign: "right", color: t3, textTransform: "capitalize" }}>{(cf.type || "").replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 40 }}>
          <div>
            <SectionHeader title="About" />
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, marginBottom: 20 }}>{project.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Size", value: `${project.sqft} sf` },
                { label: "Units", value: project.units ? `${project.unitsSold || 0} sold / ${project.units} total` : "N/A" },
                { label: "Completion", value: `${project.completion}%` },
                { label: "Total Raise", value: fmtCurrency(project.totalRaise) },
                ...(project.estimatedCompletion ? [{ label: "Est. Completion", value: new Date(project.estimatedCompletion).toLocaleDateString("en-US", { month: "short", year: "numeric" }) }] : []),
                ...(project.revenue ? [{ label: "Revenue", value: fmtCurrency(project.revenue) }] : []),
              ].map((d, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${line}` }}>
                  <div style={{ fontSize: 10, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{d.label}</div>
                  <div style={{ fontSize: 13 }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeader title="Construction Updates" />
            {project.updates.map((u, i) => {
              const prev = i < project.updates.length - 1 ? project.updates[i + 1] : null;
              const deltas = [];
              if (u.completionPct != null && prev?.completionPct != null && u.completionPct !== prev.completionPct) {
                const d = u.completionPct - prev.completionPct;
                deltas.push({ label: "Completion", value: `${d > 0 ? "+" : ""}${d}%`, positive: d > 0 });
              }
              if (u.unitsSold != null && prev?.unitsSold != null && u.unitsSold !== prev.unitsSold) {
                const d = u.unitsSold - prev.unitsSold;
                deltas.push({ label: "Units Sold", value: `${d > 0 ? "+" : ""}${d}`, positive: d > 0 });
              }
              if (u.revenue != null && prev?.revenue != null && u.revenue !== prev.revenue) {
                const d = u.revenue - prev.revenue;
                deltas.push({ label: "Revenue", value: `${d > 0 ? "+" : ""}${fmtCurrency(d)}`, positive: d > 0 });
              }
              return (
                <div key={u.id || i} style={{ padding: "16px 0", borderBottom: i < project.updates.length - 1 ? `1px solid ${line}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: t3 }}>{u.date}</div>
                    {u.completionPct != null && <span style={{ fontSize: 10, color: t3, padding: "2px 6px", border: `1px solid ${line}`, borderRadius: 3 }}>{u.completionPct}% complete</span>}
                  </div>
                  <div style={{ fontSize: 13, color: t2, lineHeight: 1.6 }}>{u.text}</div>
                  {deltas.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {deltas.map((d, j) => (
                        <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: d.positive ? `${green}15` : `${red}10`, color: d.positive ? green : red }}>
                          {d.positive ? "\u2191" : "\u2193"} {d.label}: {d.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Documents */}
        {project.documents && project.documents.length > 0 && (
          <>
            <SectionHeader title="Documents" />
            <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
              {project.documents.map((d, i) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < project.documents.length - 1 ? `1px solid ${line}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 400, color: t1 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{d.category} · {d.date} · {d.size}</div>
                  </div>
                  <span onClick={() => downloadDocument(d.id).catch(() => {})} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Download</span>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Portfolio</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>{myProjects.length} investments · ${fmt(myProjects.reduce((s, p) => s + p.currentValue, 0))} total value</p>
      </div>
      <Table
        columns={[
          { key: "name", label: "Project", render: r => (
            <div>
              <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 500, letterSpacing: ".02em" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{r.type}</div>
            </div>
          )},
          { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
          { key: "investorCommitted", label: "Committed", render: r => `$${fmt(r.investorCommitted)}` },
          { key: "currentValue", label: "Current Value", render: r => `$${fmt(r.currentValue)}` },
          { key: "irr", label: "Net IRR", render: r => <span style={{ color: green }}>{r.irr}%</span> },
          { key: "moic", label: "MOIC", render: r => <span style={{ color: t2 }}>{r.moic}x</span> },
          { key: "completion", label: "Progress", width: 120, render: r => <ProgressBar value={r.completion} color={r.completion === 100 ? green : red} /> },
        ]}
        rows={myProjects}
        onRowClick={(_, i) => setSelected(i)}
      />
    </>
  );
}

// ─── PAGE: CAP TABLE ─────────────────────────────────────
function CapTablePage({ myProjects, investor }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [waterfallInput, setWaterfallInput] = useState("");
  const [waterfallResult, setWaterfallResult] = useState(null);
  const [waterfallLoading, setWaterfallLoading] = useState(false);
  const project = myProjects[selectedIdx];

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Cap Table</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>Project-level capitalization</p>
      </div>

      {/* Project selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: `${line}55`, borderRadius: 8, padding: 2, width: "fit-content" }}>
        {myProjects.map((p, i) => (
          <span key={p.id} onClick={() => setSelectedIdx(i)} style={{
            fontSize: 12, padding: "6px 16px", borderRadius: 6, cursor: "pointer",
            color: selectedIdx === i ? t1 : t3,
            background: selectedIdx === i ? surface : "transparent",
            boxShadow: selectedIdx === i ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            fontWeight: selectedIdx === i ? 500 : 400,
            transition: "all .15s",
          }}>{p.name}</span>
        ))}
      </div>

      <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Total Raise", value: fmtCurrency(project.totalRaise), accent: red },
          { label: "Capital Called", value: fmtCurrency(project.capTable.reduce((s, r) => s + r.called, 0)), accent: green },
          { label: "Stakeholders", value: project.capTable.length, accent: "#D4A574" },
          { label: "Your Ownership", value: `${project.capTable.find(r => r.holder === investor.name)?.ownership || 0}%`, accent: "#5B8DEF" },
        ].map((m, i) => (
          <div key={i} style={{ background: surface, padding: "24px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", borderLeft: `3px solid ${m.accent}` }}>
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Export CSV */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <span onClick={() => exportCSV(
          ["Holder", "Class", "Committed", "Called", "Unfunded", "Ownership %"],
          project.capTable.map(r => [r.holder, r.type, r.committed, r.called, r.unfunded, r.ownership]),
          `northstar-captable-${project.name.toLowerCase().replace(/\s+/g, "-")}.csv`
        )} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Export CSV</span>
      </div>

      <ResponsiveTable
        sortable
        columns={[
          { key: "holder", label: "Holder", render: r => <span style={{ fontWeight: r.holder === investor.name ? 500 : 400, color: r.holder === investor.name ? t1 : t2 }}>{r.holder}</span> },
          { key: "type", label: "Class", render: r => <span style={{ color: t3 }}>{r.type}</span> },
          { key: "committed", label: "Committed", render: r => `$${fmt(r.committed)}` },
          { key: "called", label: "Called", render: r => <span style={{ color: t2 }}>${fmt(r.called)}</span> },
          { key: "unfunded", label: "Unfunded", render: r => <span style={{ color: r.unfunded > 0 ? "#8B7128" : t3 }}>${fmt(r.unfunded)}</span> },
          { key: "ownership", label: "Ownership", width: 140, render: r => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 60, height: 3, background: line, borderRadius: 1, overflow: "hidden" }}>
                <div style={{ width: `${(r.ownership / 35) * 100}%`, height: "100%", background: red, opacity: .6, borderRadius: 1 }} />
              </div>
              <span style={{ color: t2, fontSize: 12 }}>{r.ownership}%</span>
            </div>
          )},
        ]}
        rows={project.capTable}
        emptyMessage="No cap table data"
      />

      {/* Waterfall */}
      {project.waterfall.tiers.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <SectionHeader title="Distribution Waterfall" right={`${project.waterfall.prefReturn}% pref · ${project.waterfall.carry}% carry`} />
          <div style={{ borderRadius: 12, overflow: "hidden", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            {project.waterfall.tiers.map((tier, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 120px", padding: "16px 20px", borderBottom: i < project.waterfall.tiers.length - 1 ? `1px solid ${line}` : "none", alignItems: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 14 }}>{tier.name}</div>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: t3 }}>LP: </span><span style={{ color: t2 }}>{tier.lpShare}</span>
                  <span style={{ color: t3, marginLeft: 16 }}>GP: </span><span style={{ color: t2 }}>{tier.gpShare}</span>
                </div>
                <div style={{ fontSize: 12, color: t3 }}>{tier.threshold}</div>
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 2,
                    background: tier.status === "complete" ? `${green}18` : tier.status === "accruing" ? `${red}18` : `${t3}18`,
                    color: tier.status === "complete" ? green : tier.status === "accruing" ? red : t3,
                    textTransform: "uppercase", letterSpacing: ".06em"
                  }}>{tier.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waterfall Scenario Calculator */}
      <div style={{ marginTop: 48 }}>
        <SectionHeader title="Run Waterfall Scenario" />
        <div style={{ borderRadius: 12, padding: "24px", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Total Distributable Amount ($)</div>
              <input
                type="number"
                value={waterfallInput}
                onChange={e => setWaterfallInput(e.target.value)}
                placeholder={`e.g. ${fmt(project.totalRaise)}`}
                style={{ width: "100%", padding: "10px 14px", background: `${line}33`, border: `1px solid ${line}`, borderRadius: 8, fontSize: 14, fontFamily: sans, color: t1, boxSizing: "border-box", outline: "none" }}
              />
            </div>
            <button
              onClick={async () => {
                const amount = parseFloat(waterfallInput) || project.totalRaise;
                setWaterfallLoading(true);
                try {
                  const lpCap = project.capTable.reduce((s, r) => r.type !== "GP Interest" ? s + r.called : s, 0);
                  const result = await calculateWaterfallApi({
                    totalDistributable: amount,
                    structure: {
                      prefReturnPct: project.waterfall?.prefReturn || 8,
                      gpCatchupPct: 100,
                      carryPct: project.waterfall?.carry || 20,
                      lpCapital: lpCap,
                      holdPeriodYears: 2,
                    },
                  });
                  setWaterfallResult(result);
                } catch (err) {
                  console.error("Waterfall calc error:", err);
                }
                setWaterfallLoading(false);
              }}
              disabled={waterfallLoading}
              style={{ padding: "10px 24px", background: red, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: sans, opacity: waterfallLoading ? 0.5 : 1, whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(234,32,40,.3)" }}
            >
              {waterfallLoading ? "Calculating..." : "Calculate"}
            </button>
          </div>

          {waterfallResult && (
            <>
              {/* Summary bar */}
              <div style={{ display: "flex", height: 32, borderRadius: 2, overflow: "hidden", marginBottom: 20 }}>
                {(() => {
                  const total = waterfallResult.lpTotal + waterfallResult.gpTotal;
                  const lpPct = total > 0 ? (waterfallResult.lpTotal / total) * 100 : 0;
                  const gpPct = total > 0 ? (waterfallResult.gpTotal / total) * 100 : 0;
                  return (
                    <>
                      <div style={{ width: `${lpPct}%`, background: green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 500, transition: "width .3s" }}>
                        LP {lpPct.toFixed(1)}%
                      </div>
                      <div style={{ width: `${gpPct}%`, background: red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 500, transition: "width .3s" }}>
                        GP {gpPct.toFixed(1)}%
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Tier breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 120px", padding: "10px 0", borderBottom: `1px solid ${line}` }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3 }}>Tier</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: "right" }}>LP Amount</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: "right" }}>GP Amount</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: "right" }}>Total</span>
              </div>
              {waterfallResult.tiers.map((tier, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 120px", padding: "14px 0", borderBottom: i < waterfallResult.tiers.length - 1 ? `1px solid ${line}` : "none", alignItems: "center" }}>
                  <span style={{ fontFamily: serif, fontSize: 14, color: t1 }}>{tier.name}</span>
                  <span style={{ fontSize: 13, color: green, textAlign: "right" }}>${fmt(Math.round(tier.lpAmount))}</span>
                  <span style={{ fontSize: 13, color: red, textAlign: "right" }}>${fmt(Math.round(tier.gpAmount))}</span>
                  <span style={{ fontSize: 13, color: t2, textAlign: "right" }}>${fmt(Math.round(tier.total))}</span>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 120px", padding: "14px 0", borderTop: `2px solid ${line}`, marginTop: 4 }}>
                <span style={{ fontFamily: serif, fontSize: 14, fontWeight: 600, color: t1 }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: green, textAlign: "right" }}>${fmt(Math.round(waterfallResult.lpTotal))}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: red, textAlign: "right" }}>${fmt(Math.round(waterfallResult.gpTotal))}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: t1, textAlign: "right" }}>${fmt(Math.round(waterfallResult.lpTotal + waterfallResult.gpTotal))}</span>
              </div>
              {waterfallResult.lpIRR != null && (
                <div style={{ marginTop: 12, fontSize: 12, color: t3 }}>
                  Estimated LP IRR: <span style={{ color: green, fontWeight: 500 }}>{(waterfallResult.lpIRR * 100).toFixed(1)}%</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── PAGE: DOCUMENTS ─────────────────────────────────────
function DocumentsPage({ toast, allDocuments, myProjects, investor }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [filter, setFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [signModal, setSignModal] = useState(null);
  const [reviewDoc, setReviewDoc] = useState(null);
  const [signedDocs, setSignedDocs] = useState({});
  const [pendingSigs, setPendingSigs] = useState([]);
  const [signingId, setSigningId] = useState(null);

  useEffect(() => {
    fetchSignatureRequests().then(sigs => {
      const pending = sigs.filter(s => s.status === "pending" && s.signers?.some(sg => sg.userId === investor.id && sg.status === "pending"));
      setPendingSigs(pending);
    }).catch(() => {});
  }, [investor.id]);

  async function handleSignNow(sig) {
    const mySigner = sig.signers.find(s => s.userId === investor.id);
    if (!mySigner) return;
    setSigningId(mySigner.id);
    try {
      await signDocument(mySigner.id);
      toast.add(`Signature submitted for ${sig.document?.name || sig.subject}`, "success");
      setPendingSigs(prev => prev.filter(s => s.id !== sig.id));
    } catch (err) {
      toast.add(err.message || "Signing failed", "error");
    } finally { setSigningId(null); }
  }
  const categories = ["All", ...new Set(allDocuments.map(d => d.category))];
  const projectNames = ["All", ...new Set(allDocuments.map(d => d.project))];
  const filtered = allDocuments.filter(d =>
    (filter === "All" || d.category === filter) &&
    (projectFilter === "All" || d.project === projectFilter)
  );

  function handleAction(d, e) {
    e.stopPropagation();
    if (d.status === "pending_signature" && !signedDocs[d.id]) {
      setSignModal(d);
    } else if (d.status === "action_required") {
      setReviewDoc(d);
    } else {
      downloadDocument(d.id).then(() => {
        toast.add(`Downloaded ${d.name}`, "success");
      }).catch((err) => {
        toast.add(err.message || "Download failed", "error");
      });
    }
  }

  function handleSign() {
    setSignedDocs(prev => ({ ...prev, [signModal.id]: true }));
    toast.add(`Signature submitted for ${signModal.name}`, "success");
    setSignModal(null);
  }

  function getActionLabel(d) {
    if (d.status === "pending_signature" && signedDocs[d.id]) return "Signed ✓";
    if (d.status === "pending_signature") return "Sign";
    if (d.status === "action_required") return "Review";
    return "Download";
  }

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Documents</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>{allDocuments.length} documents · {allDocuments.filter(d => d.status !== "published" && !signedDocs[d.id]).length} requiring action</p>
      </div>

      {/* Pending Signatures */}
      {pendingSigs.length > 0 && (
        <div style={{ marginBottom: 28, border: `1px solid ${red}33`, borderRadius: 12, background: `${red}08`, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: red, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>Pending Signatures</div>
          {pendingSigs.map(sig => (
            <div key={sig.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${line}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: t1 }}>{sig.document?.name || sig.subject}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{sig.subject}</div>
              </div>
              <button onClick={() => handleSignNow(sig)} disabled={signingId !== null} style={{
                padding: "8px 20px", background: red, color: "#fff", border: "none", borderRadius: 4,
                fontSize: 13, fontFamily: sans, cursor: signingId ? "default" : "pointer", opacity: signingId === sig.id ? 0.5 : 1,
              }}>
                {signingId === sig.id ? "Signing..." : "Sign Now"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Project filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, background: `${line}55`, borderRadius: 8, padding: 2, width: "fit-content" }}>
        {projectNames.map(p => (
          <span key={p} onClick={() => setProjectFilter(p)} style={{
            fontSize: 12, padding: "6px 14px", borderRadius: 6, cursor: "pointer",
            color: projectFilter === p ? t1 : t3,
            background: projectFilter === p ? surface : "transparent",
            boxShadow: projectFilter === p ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            fontWeight: projectFilter === p ? 500 : 400,
            transition: "all .15s",
          }}>{p}</span>
        ))}
      </div>
      {/* Category filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {categories.map(c => (
          <span key={c} onClick={() => setFilter(c)} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 2, cursor: "pointer",
            border: `1px solid ${filter === c ? line : "transparent"}`,
            color: filter === c ? t2 : t3,
            transition: "all .15s",
          }}>{c}</span>
        ))}
      </div>

      {/* Export CSV */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <span onClick={() => exportCSV(
          ["Name", "Project", "Category", "Date", "Size", "Status"],
          filtered.map(d => [d.name, d.project, d.category, d.date, d.size, d.status]),
          "northstar-documents.csv"
        )} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Export CSV</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="\uD83D\uDCC4" title="No documents available" subtitle="Documents will appear here when they are uploaded to your projects." />
      ) : (
      <div style={{ borderRadius: 12, overflow: "hidden", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        {filtered.map((d, i) => (
          <div key={`${d.id}-${d.project}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={e => e.currentTarget.style.background = hover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            onClick={() => { window.open(d.file, "_blank"); }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                {d.name}
                {d.status === "action_required" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `${red}22`, color: red, textTransform: "uppercase", letterSpacing: ".06em" }}>Action Required</span>}
                {d.status === "pending_signature" && !signedDocs[d.id] && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `#8B712822`, color: "#8B7128", textTransform: "uppercase", letterSpacing: ".06em" }}>Pending Signature</span>}
                {signedDocs[d.id] && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `${green}22`, color: green, textTransform: "uppercase", letterSpacing: ".06em" }}>Signed</span>}
              </div>
              <div style={{ fontSize: 11, color: t3, marginTop: 3 }}>{d.project} · {d.category} · {d.date} · {d.size}</div>
            </div>
            <span onClick={(e) => handleAction(d, e)} style={{
              fontSize: 11, padding: "5px 12px", borderRadius: 2, transition: "all .15s",
              border: `1px solid ${d.status === "pending_signature" && !signedDocs[d.id] ? red + "55" : signedDocs[d.id] ? green + "55" : line}`,
              color: d.status === "pending_signature" && !signedDocs[d.id] ? red : signedDocs[d.id] ? green : t3,
            }}>
              {getActionLabel(d)}
            </span>
          </div>
        ))}
      </div>
      )}

      {/* Sign Modal */}
      <Modal open={!!signModal} onClose={() => setSignModal(null)} ariaLabel="Sign document">
        {signModal && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `#8B712822`, color: "#8B7128", textTransform: "uppercase", letterSpacing: ".06em" }}>Signature Required</span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>{signModal.name}</h2>
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, marginBottom: 24 }}>
              Please review and sign this document. By clicking "Sign Document" below, you confirm that you have read and agree to the terms outlined in this agreement.
            </p>
            <div style={{ border: `1px solid ${line}`, borderRadius: 2, padding: 20, marginBottom: 24, background: surface }}>
              <p style={{ fontSize: 12, color: t3, marginBottom: 12 }}>Electronic Signature</p>
              <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: t1, borderBottom: `1px solid ${t3}`, paddingBottom: 8 }}>
                {investor.name}
              </div>
              <p style={{ fontSize: 11, color: t3, marginTop: 8 }}>
                Signed electronically · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <span onClick={() => setSignModal(null)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Cancel</span>
              <span onClick={handleSign} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, background: red, color: "#fff", cursor: "pointer" }}>Sign Document</span>
            </div>
          </>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal open={!!reviewDoc} onClose={() => setReviewDoc(null)} ariaLabel="Review document">
        {reviewDoc && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `${red}22`, color: red, textTransform: "uppercase", letterSpacing: ".06em" }}>Action Required</span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>{reviewDoc.name}</h2>
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, marginBottom: 20 }}>
              This document requires your review and acknowledgment.
            </p>
            <div style={{ border: `1px solid ${line}`, borderRadius: 2, padding: 20, marginBottom: 24, background: surface }}>
              <iframe src={reviewDoc.file} style={{ width: "100%", height: 300, border: "none", borderRadius: 2 }} title={reviewDoc.name} />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <span onClick={() => setReviewDoc(null)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Close</span>
              <span onClick={() => { window.open(reviewDoc.file, "_blank"); toast.add(`Opened ${reviewDoc.name}`, "success"); setReviewDoc(null); }} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, background: red, color: "#fff", cursor: "pointer" }}>Open Full Document</span>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

// ─── PAGE: DISTRIBUTIONS ─────────────────────────────────
function DistributionsPage({ allDistributions, myProjects }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const total = allDistributions.reduce((a, d) => a + d.amount, 0);
  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Distributions</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>${fmt(total)} total distributed · {allDistributions.length} payments</p>
      </div>

      <div className="stat-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Total Distributed", value: `$${fmt(total)}`, accent: red },
          { label: "Projects", value: [...new Set(allDistributions.map(d => d.project))].join(", ") || "—", accent: green },
          { label: "Next Estimated", value: "Q2 2026", accent: "#5B8DEF" },
        ].map((m, i) => (
          <div key={i} style={{ background: surface, padding: "24px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", borderLeft: `3px solid ${m.accent}` }}>
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: t1 }}>Distribution History</h2>
        <span onClick={() => exportCSV(
          ["Project", "Period", "Payment Date", "Amount", "Type"],
          allDistributions.map(d => [d.project, d.quarter, d.date, d.amount, d.type]),
          "northstar-distributions.csv"
        )} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Export CSV</span>
      </div>
      {allDistributions.length === 0 ? (
        <EmptyState icon="$" title="No distributions have been made yet" subtitle="Distribution payments will appear here when they are processed." />
      ) : (
        <ResponsiveTable
          sortable
          columns={[
            { key: "project", label: "Project", render: r => <span style={{ fontFamily: serif, fontWeight: 500 }}>{r.project}</span> },
            { key: "quarter", label: "Period" },
            { key: "date", label: "Payment Date", render: r => <span style={{ color: t2 }}>{r.date}</span> },
            { key: "amount", label: "Amount", render: r => `$${fmt(r.amount)}` },
            { key: "type", label: "Type", render: r => <span style={{ color: t3 }}>{r.type}</span> },
            { key: "status", label: "Status", align: "right", sortKey: false, render: () => <span style={{ fontSize: 11, color: green }}>Paid</span> },
          ]}
          rows={allDistributions}
          emptyMessage="No distributions yet"
        />
      )}
    </>
  );
}

// ─── PAGE: MESSAGES (Threaded) ──────────────────────────
function MessagesPage({ toast, investor }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadDetail, setThreadDetail] = useState(null);
  const [reply, setReply] = useState("");
  const [composing, setComposing] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadThreads(); }, []);

  async function loadThreads() {
    try { const t = await fetchThreads(); setThreads(t); } catch (e) { if (!e.message?.includes("unreachable")) console.error(e); }
    finally { setLoading(false); }
  }

  async function openThread(thread) {
    setSelectedThread(thread);
    try {
      const detail = await fetchThread(thread.id);
      setThreadDetail(detail);
      // Update unread status in list
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: false } : t));
    } catch (e) { toast.add("Failed to load thread", "error"); }
  }

  async function handleReply() {
    if (!reply.trim() || !threadDetail) return;
    setSending(true);
    try {
      const msg = await replyToThread(threadDetail.id, reply);
      setThreadDetail(prev => ({ ...prev, messages: [...prev.messages, msg] }));
      setReply("");
      toast.add("Reply sent", "success");
    } catch (e) { toast.add(e.message, "error"); }
    finally { setSending(false); }
  }

  async function handleCompose(e) {
    e.preventDefault();
    if (!composeSubject.trim() || !composeBody.trim()) return;
    setSending(true);
    try {
      await createThread({ subject: composeSubject, body: composeBody });
      toast.add("Message sent to Northstar", "success");
      setComposing(false); setComposeSubject(""); setComposeBody("");
      loadThreads();
    } catch (e) { toast.add(e.message, "error"); }
    finally { setSending(false); }
  }

  // Thread detail view
  if (threadDetail) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedThread(null); setThreadDetail(null); setReply(""); }}>← Back to messages</p>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginBottom: 8 }}>{threadDetail.subject}</h1>
          <div style={{ fontSize: 12, color: t3 }}>
            {threadDetail.messages.length} message{threadDetail.messages.length > 1 ? "s" : ""} · Started by {threadDetail.creator.name}
            {threadDetail.project && <span> · {threadDetail.project}</span>}
          </div>
        </div>

        {/* Message thread */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {threadDetail.messages.map((m) => {
            const isMe = m.sender.role === "INVESTOR";
            return (
              <div key={m.id} style={{
                border: `1px solid ${line}`, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.03)",
                background: isMe ? hover : surface,
                marginLeft: isMe ? 48 : 0, marginRight: isMe ? 0 : 48,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isMe ? `${red}22` : `${line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: isMe ? red : t2 }}>
                      {m.sender.initials || m.sender.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{m.sender.name}</span>
                    {!isMe && <span style={{ fontSize: 11, color: t3 }}>· {m.sender.role === "ADMIN" ? "Northstar" : m.sender.role}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: t3 }}>{new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div style={{ fontSize: 14, color: t2, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{m.body}</div>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        <div style={{ borderRadius: 12, padding: "16px 20px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..."
            rows={3} style={{ width: "100%", background: "transparent", border: "none", color: t1, fontSize: 14, fontFamily: sans, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <span onClick={!sending ? handleReply : undefined} style={{
              fontSize: 13, padding: "8px 20px", borderRadius: 4, cursor: sending ? "default" : "pointer",
              background: reply.trim() && !sending ? red : `${red}44`, color: "#fff", fontWeight: 500,
            }}>{sending ? "Sending..." : "Send Reply"}</span>
          </div>
        </div>
      </>
    );
  }

  // Compose view
  if (composing) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => setComposing(false)}>← Back to messages</p>
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginBottom: 32 }}>New Message</h1>
        <form onSubmit={handleCompose} style={{ borderRadius: 12, padding: "28px 24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ fontSize: 12, color: t3, marginBottom: 20, padding: "10px 14px", background: hover, borderRadius: 4 }}>
            To: Northstar Pacific Development Group
          </div>
          <div style={{ marginBottom: 16 }}>
            <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Subject" required
              style={{ width: "100%", padding: "12px 14px", background: "transparent", border: `1px solid ${line}`, borderRadius: 4, color: t1, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your message..." rows={6} required
              style={{ width: "100%", padding: "12px 14px", background: "transparent", border: `1px solid ${line}`, borderRadius: 4, color: t1, fontSize: 14, fontFamily: sans, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <span onClick={() => setComposing(false)} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 4, cursor: "pointer", border: `1px solid ${line}`, color: t2 }}>Cancel</span>
            <button type="submit" disabled={sending} style={{ fontSize: 13, padding: "10px 24px", borderRadius: 4, cursor: sending ? "default" : "pointer", background: sending ? `${red}88` : red, color: "#fff", border: "none", fontWeight: 500, fontFamily: sans }}>
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </>
    );
  }

  // Thread list
  const unreadCount = threads.filter(t => t.unread).length;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Messages</h1>
          <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>{unreadCount} unread · {threads.length} conversations</p>
        </div>
        <span onClick={() => setComposing(true)} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 4, cursor: "pointer", background: red, color: "#fff", fontWeight: 500 }}>New Message</span>
      </div>
      {loading ? (
        <MessagesSkeleton />
      ) : threads.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <EmptyState title="No messages yet" subtitle="Start a conversation with Northstar." />
          <span onClick={() => setComposing(true)} style={{ fontSize: 13, color: red, cursor: "pointer", marginTop: 8, display: "inline-block" }}>Send your first message →</span>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: "hidden", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          {threads.map((t, i) => (
            <div key={t.id} onClick={() => openThread(t)} style={{ display: "flex", gap: 14, padding: "18px 20px", borderBottom: i < threads.length - 1 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s", background: t.unread ? `${red}06` : "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = hover}
              onMouseLeave={e => e.currentTarget.style.background = t.unread ? `${red}06` : "transparent"}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.unread ? red : "transparent", marginTop: 7, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: t.unread ? 600 : 400, color: t1 }}>{t.subject}</span>
                  <span style={{ fontSize: 11, color: t3, flexShrink: 0, marginLeft: 12 }}>
                    {t.lastMessage ? new Date(t.lastMessage.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: t3 }}>
                  {t.lastMessage?.sender.name || t.creator.name}
                  {t.messageCount > 1 && <span> · {t.messageCount} messages</span>}
                  {t.project && <span> · {t.project}</span>}
                </div>
                {t.lastMessage && (
                  <div style={{ fontSize: 12, color: t3, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.lastMessage.body.substring(0, 120)}{t.lastMessage.body.length > 120 ? "..." : ""}
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

// ─── PAGE: PROFILE ──────────────────────────────────────
// ─── PAGE: FINANCIAL MODELER ──────────────────────────────
function FinancialModelerPage({ myProjects, investor }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const project = myProjects[selectedIdx];

  const [exitValue, setExitValue] = useState("");
  const [holdYears, setHoldYears] = useState("5");
  const [annualCF, setAnnualCF] = useState("0");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    setLoading(true);
    try {
      const r = await runFinancialModel({
        projectId: project.id,
        scenario: {
          totalInvestment: project.totalRaise || 0,
          holdPeriodYears: parseInt(holdYears) || 5,
          exitValue: parseFloat(exitValue) || (project.totalRaise || 0) * 2,
          annualCashFlow: parseFloat(annualCF) || 0,
          prefReturnPct: project.waterfall?.prefReturn || 8,
          gpCatchupPct: 100,
          carryPct: project.waterfall?.carry || 20,
        },
      });
      setResult(r);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const inputSt = { width: "100%", padding: "10px 14px", background: `${line}33`, border: `1px solid ${line}`, borderRadius: 8, fontSize: 14, fontFamily: sans, color: t1, boxSizing: "border-box", outline: "none" };

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Financial Modeler</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>Scenario modeling with waterfall distribution analysis</p>
      </div>

      {/* Project selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: `${line}55`, borderRadius: 8, padding: 2, width: "fit-content" }}>
        {myProjects.map((p, i) => (
          <span key={p.id} onClick={() => { setSelectedIdx(i); setResult(null); }} style={{
            fontSize: 12, padding: "6px 16px", borderRadius: 6, cursor: "pointer",
            color: selectedIdx === i ? t1 : t3,
            background: selectedIdx === i ? surface : "transparent",
            boxShadow: selectedIdx === i ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            fontWeight: selectedIdx === i ? 500 : 400,
            transition: "all .15s",
          }}>{p.name}</span>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ borderRadius: 12, padding: 24, background: surface, marginBottom: 32, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        <div style={{ fontSize: 12, color: t3, marginBottom: 16 }}>
          Total Investment: ${fmt(project.totalRaise || 0)} | Pref: {project.waterfall?.prefReturn || 8}% | Carry: {project.waterfall?.carry || 20}%
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Exit Value ($)</div>
            <input type="number" value={exitValue} onChange={e => setExitValue(e.target.value)} placeholder={`e.g. ${fmt((project.totalRaise || 0) * 2)}`} style={inputSt} />
          </div>
          <div style={{ width: 140 }}>
            <div style={{ fontSize: 11, color: t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Hold Period (yrs)</div>
            <input type="number" min="1" max="30" value={holdYears} onChange={e => setHoldYears(e.target.value)} style={inputSt} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Annual Cash Flow ($)</div>
            <input type="number" value={annualCF} onChange={e => setAnnualCF(e.target.value)} placeholder="0" style={inputSt} />
          </div>
          <button onClick={handleRun} disabled={loading} style={{
            padding: "10px 24px", background: loading ? `${red}88` : red, color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, cursor: loading ? "default" : "pointer", fontFamily: sans, whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
          }}>{loading ? "Running..." : "Run Scenario"}</button>
        </div>
      </div>

      {result && (
        <>
          {/* Summary cards */}
          <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
            {[
              { label: "LP IRR", value: result.lpIRR != null ? `${(result.lpIRR * 100).toFixed(1)}%` : "--", accent: red },
              { label: "LP MOIC", value: `${result.lpMOIC}x`, accent: green },
              { label: "Equity Multiple", value: `${result.equityMultiple}x`, accent: "#D4A574" },
              { label: "Cash on Cash", value: `${result.cashOnCash}%`, accent: "#5B8DEF" },
            ].map((c, i) => (
              <div key={i} style={{ background: surface, padding: 24, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", borderLeft: `3px solid ${c.accent}` }}>
                <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Waterfall breakdown */}
          <SectionHeader title="Waterfall Breakdown" />
          <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            {result.waterfallBreakdown.map((tier, i) => {
              const total = tier.lpAmount + tier.gpAmount;
              const lpPct = total > 0 ? (tier.lpAmount / total) * 100 : 0;
              return (
                <div key={i} style={{ padding: "16px 20px", borderBottom: i < result.waterfallBreakdown.length - 1 ? `1px solid ${line}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontFamily: serif, fontSize: 14, color: t1 }}>{tier.name}</span>
                    <span style={{ fontSize: 12, color: t3 }}>LP: ${fmt(Math.round(tier.lpAmount))} | GP: ${fmt(Math.round(tier.gpAmount))}</span>
                  </div>
                  <div style={{ height: 10, background: `${line}55`, borderRadius: 2, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${lpPct}%`, background: green, height: "100%" }} />
                    <div style={{ width: `${100 - lpPct}%`, background: `${red}88`, height: "100%" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Year-by-year */}
          <SectionHeader title="Year-by-Year Cash Flow" />
          <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", padding: "10px 20px", borderBottom: `1px solid ${line}`, background: `${line}33` }}>
              {["Year", "Cash Flow", "Cumulative", "Balance"].map(h => (
                <span key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: h === "Year" ? "left" : "right" }}>{h}</span>
              ))}
            </div>
            {result.yearByYear.map((y, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", padding: "12px 20px", borderBottom: i < result.yearByYear.length - 1 ? `1px solid ${line}` : "none" }}>
                <span style={{ fontSize: 13, color: t2 }}>{y.year === 0 ? "Initial" : `Year ${y.year}`}</span>
                <span style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: y.cashFlow < 0 ? red : green }}>
                  {y.cashFlow < 0 ? `-$${fmt(Math.abs(Math.round(y.cashFlow)))}` : `$${fmt(Math.round(y.cashFlow))}`}
                </span>
                <span style={{ textAlign: "right", fontSize: 13, color: y.cumulativeCashFlow < 0 ? red : green }}>
                  {y.cumulativeCashFlow < 0 ? `-$${fmt(Math.abs(Math.round(y.cumulativeCashFlow)))}` : `$${fmt(Math.round(y.cumulativeCashFlow))}`}
                </span>
                <span style={{ textAlign: "right", fontSize: 13, color: t2 }}>${fmt(Math.round(y.balance))}</span>
              </div>
            ))}
          </div>

          {/* Sensitivity */}
          {result.sensitivity && (
            <>
              <SectionHeader title="Sensitivity Analysis" right="IRR at different exit values" />
              <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 100px 80px", padding: "10px 20px", borderBottom: `1px solid ${line}`, background: `${line}33` }}>
                  {["", "Exit Value", "LP Return", "LP IRR", "MOIC"].map(h => (
                    <span key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: h === "" ? "left" : "right" }}>{h}</span>
                  ))}
                </div>
                {result.sensitivity.map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 100px 80px", padding: "12px 20px", borderBottom: i < result.sensitivity.length - 1 ? `1px solid ${line}` : "none", background: s.label === "+0%" ? `${line}22` : "transparent" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{s.label}</span>
                    <span style={{ textAlign: "right", fontSize: 13, color: t2 }}>${fmt(s.exitValue)}</span>
                    <span style={{ textAlign: "right", fontSize: 13, color: green }}>${fmt(Math.round(s.lpReturn))}</span>
                    <span style={{ textAlign: "right", fontSize: 13, color: t1 }}>{s.lpIRR != null ? `${(s.lpIRR * 100).toFixed(1)}%` : "--"}</span>
                    <span style={{ textAlign: "right", fontSize: 13, color: t2 }}>{s.lpMOIC}x</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

// ─── PASSWORD STRENGTH INDICATOR ────────────────────────
function PasswordStrengthBar({ password }) {
  const { t2, t3 } = useTheme();
  if (!password) return null;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  let criteria = 0;
  if (hasUpper) criteria++;
  if (hasLower) criteria++;
  if (hasNumber) criteria++;

  let strength = "weak", color = red, width = "33%";
  if (password.length >= 8 && criteria >= 3 && hasSpecial) { strength = "strong"; color = green; width = "100%"; }
  else if (password.length >= 8 && criteria >= 2) { strength = "medium"; color = "#D4A017"; width = "66%"; }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 6, background: `${t3}40`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width, background: color, borderRadius: 20, transition: "width .3s, background .3s" }} />
      </div>
      <div style={{ fontSize: 11, color, marginTop: 4, textTransform: "capitalize" }}>{strength}</div>
    </div>
  );
}

// ─── SECURITY SECTION (Password Change + MFA + Login History) ──
function SecuritySection({ toast, inputStyle }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaSetupStep, setMfaSetupStep] = useState(0); // 0=none, 1=qr, 2=verify, 3=backup
  const [mfaQR, setMfaQR] = useState(null);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [mfaError, setMfaError] = useState("");
  const [mfaDisablePw, setMfaDisablePw] = useState("");
  const [showMfaDisable, setShowMfaDisable] = useState(false);

  useEffect(() => {
    fetchLoginHistory().then(setLoginHistory).catch(() => {});
    getMFAStatus().then(s => { setMfaEnabled(s.mfaEnabled); setMfaLoading(false); }).catch(() => setMfaLoading(false));
  }, []);

  async function handleMfaSetup() {
    setMfaError("");
    setMfaLoading(true);
    try {
      const data = await setupMFA();
      setMfaQR(data.qrCodeDataUrl);
      setMfaSecret(data.secret);
      setMfaSetupStep(1);
    } catch (err) { setMfaError(err.message); }
    setMfaLoading(false);
  }

  async function handleMfaVerify() {
    setMfaError("");
    setMfaLoading(true);
    try {
      const data = await verifyMFASetup(mfaVerifyCode);
      setMfaBackupCodes(data.backupCodes);
      setMfaEnabled(true);
      setMfaSetupStep(3);
      toast.add("Two-factor authentication enabled", "success");
    } catch (err) { setMfaError(err.message); }
    setMfaLoading(false);
  }

  async function handleMfaDisable() {
    setMfaError("");
    setMfaLoading(true);
    try {
      await disableMFA(mfaDisablePw);
      setMfaEnabled(false);
      setShowMfaDisable(false);
      setMfaDisablePw("");
      toast.add("Two-factor authentication disabled", "success");
    } catch (err) { setMfaError(err.message); }
    setMfaLoading(false);
  }

  async function handleRegenerateBackup() {
    setMfaError("");
    try {
      const data = await regenerateBackupCodes();
      setMfaBackupCodes(data.backupCodes);
      setMfaSetupStep(3);
    } catch (err) { setMfaError(err.message); }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(newPw)) { setPwError("Password must contain at least 1 uppercase letter"); return; }
    if (!/[a-z]/.test(newPw)) { setPwError("Password must contain at least 1 lowercase letter"); return; }
    if (!/[0-9]/.test(newPw)) { setPwError("Password must contain at least 1 number"); return; }
    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      toast.add("Password changed successfully", "success");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) { setPwError(err.message || "Failed to change password"); }
    setSaving(false);
  }

  const lastLogin = loginHistory.find(h => h.success);

  return (
    <>
      <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>Change Password</div>
        <form onSubmit={handleChangePassword}>
          {pwError && <div style={{ fontSize: 12, color: red, padding: "8px 12px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 12, background: `${red}08` }}>{pwError}</div>}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: t3, fontWeight: 500, marginBottom: 4 }}>Current Password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: t3, fontWeight: 500, marginBottom: 4 }}>New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required style={inputStyle} />
            <PasswordStrengthBar password={newPw} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, color: t3, fontWeight: 500, marginBottom: 4 }}>Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required style={inputStyle} />
            {confirmPw && newPw !== confirmPw && <div style={{ fontSize: 11, color: red, marginTop: 4 }}>Passwords do not match</div>}
          </div>
          <button type="submit" disabled={saving} style={{
            padding: "8px 20px", background: saving ? `${red}88` : red, color: "#fff",
            border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: saving ? "default" : "pointer",
          }}>{saving ? "Changing..." : "Change Password"}</button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>Two-Factor Authentication</div>
        {mfaError && <div style={{ fontSize: 12, color: red, padding: "8px 12px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 12, background: `${red}08` }}>{mfaError}</div>}

        {mfaEnabled && mfaSetupStep === 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              <span style={{ fontSize: 14, color: t1, fontWeight: 500 }}>Two-factor authentication is enabled</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowMfaDisable(true)} style={{ padding: "7px 16px", background: "#fff", border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Disable</button>
              <button onClick={handleRegenerateBackup} style={{ padding: "7px 16px", background: "#fff", border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Regenerate Backup Codes</button>
            </div>
            {showMfaDisable && (
              <div style={{ marginTop: 12, padding: 16, border: `1px solid ${line}`, borderRadius: 8, background: bg }}>
                <div style={{ fontSize: 12, color: t2, marginBottom: 8 }}>Enter your password to disable 2FA:</div>
                <input type="password" value={mfaDisablePw} onChange={e => setMfaDisablePw(e.target.value)} style={inputStyle} placeholder="Password" />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => { setShowMfaDisable(false); setMfaDisablePw(""); setMfaError(""); }} style={{ padding: "7px 16px", background: "#fff", border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Cancel</button>
                  <button onClick={handleMfaDisable} disabled={!mfaDisablePw} style={{ padding: "7px 16px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, opacity: mfaDisablePw ? 1 : 0.5 }}>Confirm Disable</button>
                </div>
              </div>
            )}
          </>
        )}

        {!mfaEnabled && mfaSetupStep === 0 && (
          <>
            <p style={{ fontSize: 13, color: t2, marginBottom: 12, lineHeight: 1.5 }}>Add an extra layer of security to your account by requiring a verification code from an authenticator app (Google Authenticator, Authy, etc.) when signing in.</p>
            <button onClick={handleMfaSetup} disabled={mfaLoading} style={{ padding: "8px 20px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: "pointer" }}>
              Enable Two-Factor Authentication
            </button>
          </>
        )}

        {mfaSetupStep === 1 && (
          <>
            <p style={{ fontSize: 13, color: t2, marginBottom: 12 }}>Scan this QR code with your authenticator app:</p>
            {mfaQR && <div style={{ textAlign: "center", marginBottom: 16 }}><img src={mfaQR} alt="MFA QR Code" style={{ width: 200, height: 200, borderRadius: 8, border: `1px solid ${line}` }} /></div>}
            <div style={{ fontSize: 11, color: t3, marginBottom: 4 }}>Or enter this secret key manually:</div>
            <div style={{ fontSize: 14, fontFamily: "monospace", padding: "10px 14px", background: bg, borderRadius: 6, border: `1px solid ${line}`, marginBottom: 16, wordBreak: "break-all", letterSpacing: ".05em", userSelect: "all" }}>{mfaSecret}</div>
            <button onClick={() => setMfaSetupStep(2)} style={{ padding: "8px 20px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: "pointer" }}>Next</button>
          </>
        )}

        {mfaSetupStep === 2 && (
          <>
            <p style={{ fontSize: 13, color: t2, marginBottom: 12 }}>Enter the 6-digit code from your authenticator app to verify setup:</p>
            <input type="text" inputMode="numeric" maxLength={6} value={mfaVerifyCode} onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000" style={{ ...inputStyle, fontSize: 20, fontFamily: "monospace", textAlign: "center", letterSpacing: ".3em", maxWidth: 180 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => { setMfaSetupStep(0); setMfaVerifyCode(""); setMfaError(""); }} style={{ padding: "7px 16px", background: "#fff", border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Cancel</button>
              <button onClick={handleMfaVerify} disabled={mfaVerifyCode.length !== 6 || mfaLoading} style={{ padding: "7px 16px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, opacity: mfaVerifyCode.length === 6 ? 1 : 0.5 }}>Verify & Enable</button>
            </div>
          </>
        )}

        {mfaSetupStep === 3 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1"/></svg>
              <span style={{ fontSize: 13, color: t1, fontWeight: 600 }}>Save these backup codes</span>
            </div>
            <p style={{ fontSize: 12, color: t2, marginBottom: 12 }}>Each code can only be used once. Store them somewhere safe — you will not be able to see them again.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 16, background: bg, borderRadius: 8, border: `1px solid ${line}`, marginBottom: 16 }}>
              {mfaBackupCodes.map((code, i) => (
                <div key={i} style={{ fontFamily: "monospace", fontSize: 14, padding: "4px 0", letterSpacing: ".08em" }}>{code}</div>
              ))}
            </div>
            <button onClick={() => { setMfaSetupStep(0); setMfaVerifyCode(""); setMfaBackupCodes([]); }} style={{ padding: "8px 20px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: "pointer" }}>Done</button>
          </>
        )}
      </div>

      {/* Login History */}
      <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Login History</div>
          <span onClick={() => setShowHistory(!showHistory)} style={{ fontSize: 11, color: t3, cursor: "pointer", padding: "3px 10px", border: `1px solid ${line}`, borderRadius: 3 }}>
            {showHistory ? "Hide" : "Show"}
          </span>
        </div>
        {lastLogin && (
          <div style={{ fontSize: 13, color: t2, marginBottom: showHistory ? 16 : 0 }}>
            Last login: {new Date(lastLogin.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at {new Date(lastLogin.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} from {lastLogin.ip ? lastLogin.ip.replace(/^::ffff:/, "") : "unknown"}
          </div>
        )}
        {showHistory && loginHistory.length > 0 && (
          <div style={{ borderTop: `1px solid ${line}`, paddingTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px", fontSize: 10, color: t3, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 0", borderBottom: `1px solid ${line}` }}>
              <span>Date/Time</span><span>IP Address</span><span>Status</span>
            </div>
            {loginHistory.slice(0, 10).map(h => (
              <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px", padding: "8px 0", borderBottom: `1px solid ${line}30`, fontSize: 12 }}>
                <span style={{ color: t2 }}>{new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} {new Date(h.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                <span style={{ color: t3 }}>{h.ip ? h.ip.replace(/^::ffff:/, "") : "—"}</span>
                <span style={{ color: h.success ? green : red, fontWeight: 500 }}>{h.success ? "Success" : "Failed"}</span>
              </div>
            ))}
          </div>
        )}
        {showHistory && loginHistory.length === 0 && (
          <div style={{ fontSize: 13, color: t3, fontStyle: "italic" }}>No login history available</div>
        )}
      </div>
    </>
  );
}

function ProfilePage({ investor, toast, onUpdate }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [name, setName] = useState(investor.name);
  const [email, setEmail] = useState(investor.email);
  const [initials, setInitials] = useState(investor.initials || "");
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [entities, setEntities] = useState([]);
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [entityForm, setEntityForm] = useState({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });

  useEffect(() => {
    fetchNotificationPreferences().then(p => setNotifPrefs(p)).catch(() => {});
    if (investor.id) loadEntities();
  }, []);

  function loadEntities() { fetchEntities(investor.id).then(setEntities).catch(() => setEntities([])); }

  async function handleCreateEntity(e) {
    e.preventDefault();
    try {
      await createEntity(investor.id, entityForm);
      toast.add("Entity created", "success");
      setShowEntityForm(false);
      setEntityForm({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });
      loadEntities();
    } catch (err) { toast.add(err.message, "error"); }
  }

  async function handleDeleteEntity(entityId) {
    try { await deleteEntity(entityId); toast.add("Entity deleted", "success"); loadEntities(); } catch (err) { toast.add(err.message, "error"); }
  }

  async function handlePrefToggle(key) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences({ [key]: updated[key] });
    } catch (err) {
      toast.add("Failed to update preferences", "error");
      setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    } finally { setSavingPrefs(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({ name, email, initials });
      onUpdate(updated);
      toast.add("Profile updated", "success");
    } catch (err) {
      toast.add(err.message || "Failed to update", "error");
    } finally { setSaving(false); }
  }

  const inputStyle = { width: "100%", padding: "12px 14px", background: "transparent", border: `1px solid ${line}`, borderRadius: 8, color: t1, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" };

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Profile</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>Manage your account information</p>
      </div>

      <div className="profile-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        {/* Profile form */}
        <form onSubmit={handleSave}>
          <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${red}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, color: red }}>
                {initials || name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, color: t1 }}>{name}</div>
                <div style={{ fontSize: 12, color: t3 }}>{investor.role} · Joined {investor.joined}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: t3, fontWeight: 500, marginBottom: 6 }}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: t3, fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: t3, fontWeight: 500, marginBottom: 6 }}>Initials</label>
              <input value={initials} onChange={e => setInitials(e.target.value)} maxLength={3} style={{ ...inputStyle, width: 80 }} />
            </div>
            <button type="submit" disabled={saving} style={{
              padding: "10px 24px", background: saving ? `${red}88` : red, color: "#fff",
              border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: saving ? "default" : "pointer",
            }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Account info */}
        <div>
          <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>Investment Summary</div>
            {(investor.projectIds || []).length > 0 ? (
              <div style={{ fontSize: 13, color: t2 }}>
                <div style={{ marginBottom: 8 }}>Active Projects: <strong>{investor.projectIds.length}</strong></div>
                <div>Account Status: <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 11, background: `${green}20`, color: green }}>Active</span></div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: t3, fontStyle: "italic" }}>No active investments</div>
            )}
          </div>
          <SecuritySection toast={toast} inputStyle={inputStyle} />
        </div>
      </div>

      {/* Investment Entities */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 300 }}>Investment Entities</h2>
          <span onClick={() => setShowEntityForm(!showEntityForm)} style={{ fontSize: 12, padding: "6px 14px", border: `1px solid ${line}`, borderRadius: 4, cursor: "pointer", color: t3 }}>{showEntityForm ? "Cancel" : "Add Entity"}</span>
        </div>
        {showEntityForm && (
          <form onSubmit={handleCreateEntity} style={{ borderRadius: 12, padding: "20px 24px", background: surface, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: "block", marginBottom: 4 }}>Entity Name</label>
                <input value={entityForm.name} onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} placeholder="e.g. Chen Family Trust" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: "block", marginBottom: 4 }}>Type</label>
                <select value={entityForm.type} onChange={e => setEntityForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                  <option>Individual</option><option>LLC</option><option>Trust</option><option>IRA</option><option>Corporation</option><option>Partnership</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: "block", marginBottom: 4 }}>Tax ID</label>
                <input value={entityForm.taxId} onChange={e => setEntityForm(f => ({ ...f, taxId: e.target.value }))} style={inputStyle} placeholder="EIN or SSN" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: "block", marginBottom: 4 }}>State</label>
                <input value={entityForm.state} onChange={e => setEntityForm(f => ({ ...f, state: e.target.value }))} style={inputStyle} placeholder="e.g. BC" />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                <label style={{ fontSize: 12, color: t2, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={entityForm.isDefault} onChange={e => setEntityForm(f => ({ ...f, isDefault: e.target.checked }))} /> Default
                </label>
                <button type="submit" style={{ padding: "8px 16px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans }}>Create</button>
              </div>
            </div>
          </form>
        )}
        <div style={{ borderRadius: 12, overflow: "hidden", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          {entities.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No investment entities. Add one to manage your investments.</div>
          ) : entities.map((ent, i) => (
            <div key={ent.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < entities.length - 1 ? `1px solid ${line}` : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: t1 }}>{ent.name}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>
                  {ent.type}{ent.state ? ` \u00B7 ${ent.state}` : ""}{ent.taxId ? ` \u00B7 ${ent.taxId}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {ent.isDefault && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: `${green}20`, color: green }}>Default</span>}
                {ent.investmentCount > 0 && <span style={{ fontSize: 11, color: t3 }}>{ent.investmentCount} investment{ent.investmentCount > 1 ? "s" : ""}</span>}
                {ent.investmentCount === 0 && <span onClick={() => handleDeleteEntity(ent.id)} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Remove</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      {notifPrefs && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 300, marginBottom: 20 }}>Notification Preferences</h2>
          <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, maxWidth: 520, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <p style={{ fontSize: 13, color: t3, marginBottom: 20 }}>Choose which email notifications you receive.</p>
            {[
              { key: "emailDocuments", label: "New Documents", desc: "When a new document is uploaded to your portal" },
              { key: "emailSignatures", label: "Signature Requests", desc: "When your signature is required on a document" },
              { key: "emailDistributions", label: "Distributions", desc: "When a distribution payment is processed" },
              { key: "emailMessages", label: "Messages", desc: "When you receive a new message from Northstar" },
              { key: "emailCapitalCalls", label: "Capital Calls", desc: "When a capital call notice is issued" },
            ].map(item => (
              <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${line}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: t1 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{item.desc}</div>
                </div>
                <div onClick={() => handlePrefToggle(item.key)} style={{
                  width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                  background: notifPrefs[item.key] ? red : `${t3}44`,
                  position: "relative", transition: "background .2s",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 2,
                    left: notifPrefs[item.key] ? 22 : 2,
                    transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
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
    <div style={{ fontFamily: sans, color: darkText, minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
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
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#fff", marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>{p.loc}</div>
                  </div>
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <span style={{
                      fontSize: 9, padding: "3px 8px", borderRadius: 2,
                      background: p.status === "Completed" ? "rgba(61,122,84,.9)" : "rgba(0,0,0,.5)",
                      color: "#fff", letterSpacing: ".03em", backdropFilter: "blur(4px)",
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
                background: "#fff", border: "1px solid #ECEAE5", borderRadius: 12, padding: "40px 32px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
              }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${red}10`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 16v2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, color: darkText }}>Two-Factor Authentication</h2>
                  <p style={{ fontSize: 13, color: "#767168" }}>Enter the code from your authenticator app</p>
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
                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px", background: loading ? `${red}AA` : red, color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontFamily: sans, fontWeight: 500, cursor: loading ? "default" : "pointer",
                  letterSpacing: ".02em", transition: "background .15s", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
                }}>
                  {loading ? "Verifying..." : "Verify"}
                </button>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <span onClick={() => { setMfaPending(false); setMfaCode(["","","","","",""]); setBackupCode(""); setUseBackupCode(false); setError(""); setPassword(""); }}
                    style={{ fontSize: 12, color: "#888", cursor: "pointer" }}>Back to login</span>
                </div>
              </form>
            ) : (
              /* ── Standard Login Form ── */
              <form onSubmit={handleSubmit} style={{
                background: "#fff", border: "1px solid #ECEAE5", borderRadius: 12, padding: "40px 32px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
              }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <NorthstarIcon size={40} color={red} />
                  <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, marginTop: 16, color: darkText }}>Investor Portal</h2>
                  <p style={{ fontSize: 13, color: "#767168" }}>Sign in to access your account</p>
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
                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px", background: loading ? `${red}AA` : red, color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontFamily: sans, fontWeight: 500, cursor: loading ? "default" : "pointer",
                  letterSpacing: ".02em", transition: "background .15s", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
                }}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
                <div style={{ textAlign: "right", marginTop: 10 }}>
                  <span onClick={() => setShowForgot(true)} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Forgot password?</span>
                </div>
                <div style={{ marginTop: 14, padding: "14px 16px", border: "1px solid #ECEAE5", borderRadius: 4, background: cream }}>
                  <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Quick Demo Login</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => { setEmail("j.chen@pacificventures.ca"); setPassword("northstar2025"); setTimeout(() => document.querySelector("form")?.requestSubmit(), 100); }}
                      style={{ flex: 1, padding: "10px", background: "#fff", border: "1px solid #DDD", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: darkText, fontWeight: 500 }}>
                      Investor Demo
                    </button>
                    <button type="button" onClick={() => { setEmail("admin@northstardevelopment.ca"); setPassword("admin2025"); setTimeout(() => document.querySelector("form")?.requestSubmit(), 100); }}
                      style={{ flex: 1, padding: "10px", background: "#fff", border: `1px solid ${red}40`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: red, fontWeight: 500 }}>
                      Admin Demo
                    </button>
                  </div>
                </div>
              </form>
            )}
            <p style={{ fontSize: 12, color: "#767168", textAlign: "center", marginTop: 20 }}>
              Interested in investing? <span onClick={onShowProspects} style={{ color: red, cursor: "pointer", fontWeight: 500 }}>Learn more →</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} style={{
          position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 12, padding: "32px", maxWidth: 400, width: "90%",
            boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 400, marginBottom: 8, color: darkText }}>Reset Password</h3>
            {forgotSent ? (
              <>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
                  If an account exists with that email, we have sent a password reset link. Please check your inbox.
                </p>
                <p style={{ fontSize: 11, color: "#767168", fontStyle: "italic" }}>
                  (Demo mode — check the server console for the reset link)
                </p>
                <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                  style={{ marginTop: 16, padding: "10px 24px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans }}>
                  Back to Login
                </button>
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
                  <button type="button" onClick={() => { setShowForgot(false); setForgotEmail(""); }}
                    style={{ flex: 1, padding: "10px", background: "#fff", border: "1px solid #DDD", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans, color: darkText }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading}
                    style={{ flex: 1, padding: "10px", background: forgotLoading ? `${red}AA` : red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: forgotLoading ? "default" : "pointer", fontFamily: sans }}>
                    {forgotLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: th.surface, border: `1px solid ${th.line}`, borderRadius: 12,
        padding: "32px", maxWidth: 400, width: "90%", textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>&#x23F0;</div>
        <h3 style={{ fontFamily: sans, fontSize: 18, fontWeight: 500, color: th.t1, marginBottom: 8 }}>Session Expiring</h3>
        <p style={{ fontSize: 13, color: th.t2, lineHeight: 1.6, marginBottom: 24 }}>
          Your session will expire in 5 minutes due to inactivity. Click below to stay signed in.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <span onClick={onLogout} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 4, border: `1px solid ${th.line}`, color: th.t3, cursor: "pointer" }}>Sign Out</span>
          <span onClick={onDismiss} style={{ fontSize: 13, padding: "10px 24px", borderRadius: 4, background: red, color: "#fff", cursor: "pointer", fontWeight: 500 }}>Stay Signed In</span>
        </div>
      </div>
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
  const toast = useToast();
  const [announcement, setAnnouncement] = useState("");
  const th = themes[themeMode];

  // Listen for hash changes
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash;
      if (hash === "#/login") {
        setShowLogin(true);
      } else {
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
          <LoadingSpinner size={28} />
        </div>
      ) : showLogin ? (
        <LoginPage onLogin={handleLogin} onShowProspects={() => { setShowLogin(false); window.location.hash = ""; }} />
      ) : (
        <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg }}><LoadingSpinner size={32} /></div>}>
          <ProspectPortal onNavigateLogin={() => { setShowLogin(true); window.location.hash = "#/login"; }} />
        </Suspense>
      )}
    </ThemeContext.Provider>
  );

  // Admin users get the admin panel
  if (user && (user.role === "ADMIN" || user.role === "GP")) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F3EF" }}><LoadingSpinner size={32} /></div>}>
        <AdminPanel user={user} onLogout={handleLogout} />
      </Suspense>
    );
  }

  if (!appData) return (
    <ThemeContext.Provider value={th}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: th.bg, fontFamily: sans, color: th.t2, gap: 16 }}>
        <NorthstarIcon size={40} color={red} />
        <LoadingSpinner size={28} />
      </div>
    </ThemeContext.Provider>
  );

  const { investor, projects, myProjects, allDocuments, allDistributions } = appData;

  const pages = {
    overview: <Overview onNavigate={setView} investor={investor} projects={projects} myProjects={myProjects} allDistributions={allDistributions} msgs={msgs} />,
    portfolio: <Portfolio myProjects={myProjects} investor={investor} />,
    captable: <CapTablePage myProjects={myProjects} investor={investor} />,
    modeler: <FinancialModelerPage myProjects={myProjects} investor={investor} />,
    documents: <DocumentsPage toast={toast} allDocuments={allDocuments} myProjects={myProjects} investor={investor} />,
    distributions: <DistributionsPage allDistributions={allDistributions} myProjects={myProjects} />,
    messages: <MessagesPage toast={toast} investor={investor} />,
    profile: <ProfilePage investor={investor} toast={toast} onUpdate={(u) => setAppData(prev => ({ ...prev, investor: { ...prev.investor, ...u } }))} />,
  };

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "portfolio", label: "Portfolio" },
    { id: "captable", label: "Cap Table" },
    { id: "modeler", label: "Modeler" },
    { id: "documents", label: "Documents" },
    { id: "distributions", label: "Distributions" },
    { id: "messages", label: "Messages" },
    { id: "profile", label: "Profile" },
  ];

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
        .skip-link:focus { position: fixed; top: 8px; left: 8px; width: auto; height: auto; padding: 8px 16px; background: #EA2028; color: #fff; border-radius: 6px; font-size: 13px; font-family: 'DM Sans', sans-serif; text-decoration: none; z-index: 10000; }
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
          .modeler-grid { grid-template-columns: 1fr !important; }
          h1 { font-size: 28px !important; }
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
          <button className="theme-toggle" onClick={toggleTheme} aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"} style={{ fontSize: 14, cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: `1px solid ${th.line}`, transition: "border-color .15s", lineHeight: 1, background: "transparent", color: "inherit" }}
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {themeMode === "dark" ? "\u2600" : "\u263D"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="user-name" style={{ fontSize: 12, color: th.t3, fontWeight: 400 }}>{investor.name}</span>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: th.avatarGrad,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff",
            }}>{investor.initials}</div>
          </div>
          <button onClick={handleLogout} aria-label="Sign out of your account" style={{ fontSize: 12, color: th.t3, cursor: "pointer", padding: "5px 14px", border: `1px solid ${th.line}`, borderRadius: 6, transition: "color .15s, border-color .15s", background: "transparent", fontFamily: sans }}
            onMouseEnter={e => { e.currentTarget.style.color = red; e.currentTarget.style.borderColor = red; }}
            onMouseLeave={e => { e.currentTarget.style.color = th.t3; e.currentTarget.style.borderColor = th.line; }}>
            Sign Out
          </button>
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
            <span key={n.id} role="link" tabIndex={0} aria-current={view === n.id ? "page" : undefined} onClick={() => { setView(n.id); setAnnouncement(`Navigated to ${n.label}`); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setView(n.id); setAnnouncement(`Navigated to ${n.label}`); } }} style={{
              fontSize: 13, fontWeight: view === n.id ? 500 : 400, cursor: "pointer", userSelect: "none",
              color: view === n.id ? red : th.t3,
              padding: "8px 16px",
              borderRadius: 6,
              background: view === n.id ? "#EA20280D" : "transparent",
              transition: "all .15s",
            }}
              onMouseEnter={e => { if (view !== n.id) { e.currentTarget.style.background = th.hover; e.currentTarget.style.color = th.t1; } }}
              onMouseLeave={e => { if (view !== n.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = th.t3; } }}>
              {n.label}
              {n.id === "messages" && msgs.some(m => m.unread) && (
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: red, marginLeft: 6, verticalAlign: "middle" }} />
              )}
            </span>
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
          <span key={n.id} role="tab" tabIndex={0} aria-selected={view === n.id} onClick={() => { setView(n.id); setAnnouncement(`Navigated to ${n.label}`); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setView(n.id); setAnnouncement(`Navigated to ${n.label}`); } }} style={{
            fontSize: 12, padding: "8px 14px", cursor: "pointer", userSelect: "none",
            color: view === n.id ? red : th.t3,
            background: view === n.id ? "#EA20280D" : "transparent",
            borderRadius: 6,
            whiteSpace: "nowrap", transition: "all .15s",
          }}>
            {n.label}
            {n.id === "messages" && msgs.some(m => m.unread) && (
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: red, marginLeft: 3, verticalAlign: "middle" }} />
            )}
          </span>
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

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      {showWarning && <SessionWarningModal onDismiss={dismissWarning} onLogout={handleLogout} />}
    </div>
    </ThemeContext.Provider>);
}
