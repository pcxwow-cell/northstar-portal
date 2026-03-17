import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { login as apiLogin, logout as apiLogout, getMe, isAuthed as checkAuthed, fetchInvestorProjects, fetchDocuments, fetchDistributions, fetchMessages, fetchProjects, fmt, fmtCurrency } from "./api.js";

// ─── THEME ───────────────────────────────────────────────
const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'DM Sans', -apple-system, sans-serif";
const red = "#EA2028";
const darkText = "#231F20";
const cream = "#FDFAF2";
const green = "#3D7A54";

// Northstar "N" icon — two parallelogram shapes from brand
const NorthstarIcon = ({ size = 32, color = red }) => (
  <svg width={size} height={size} viewBox="0 0 163 162" fill="none">
    <polygon points="7.2,10 7.2,135.7 68.9,135.7 68.9,63.9" fill={color}/>
    <polygon points="152.2,152.2 152.2,26.5 90.6,26.5 90.6,98.3" fill={color}/>
  </svg>
);

// Northstar wordmark — geometric letter paths from brand SVG
const NorthstarWordmark = ({ height = 20, color = darkText }) => (
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
  dark: { bg: "#060606", surface: "#0C0C0C", line: "#1A1A1A", t1: "#E8E4DE", t2: "#8C887F", t3: "#4A4843", hover: "#0F0F0F", headerBg: "#060606F0", avatarGrad: "linear-gradient(135deg, #222, #181818)" },
  light: { bg: "#F5F3EF", surface: "#FFFFFF", line: "#E2DFD8", t1: "#1A1816", t2: "#5C5850", t3: "#9C978D", hover: "#EDE9E3", headerBg: "#F5F3EFF0", avatarGrad: "linear-gradient(135deg, #DDD, #C8C8C8)" },
};

const ThemeContext = createContext(themes.dark);
const useTheme = () => useContext(ThemeContext);

const bg = "#060606", surface = "#0C0C0C", line = "#1A1A1A", t1 = "#E8E4DE", t2 = "#8C887F", t3 = "#4A4843";

// ─── TOAST SYSTEM ────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{
          background: surface, border: `1px solid ${t.type === "success" ? green : t.type === "error" ? red : line}`,
          borderRadius: 4, padding: "12px 20px", minWidth: 280, maxWidth: 400,
          fontFamily: sans, fontSize: 13, color: t1, cursor: "pointer",
          animation: "fadeIn .2s ease", boxShadow: "0 8px 32px rgba(0,0,0,.5)",
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
function Modal({ open, onClose, children }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", animation: "fadeIn .15s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: surface, border: `1px solid ${line}`, borderRadius: 4,
        padding: "32px", maxWidth: 520, width: "90%", maxHeight: "80vh", overflow: "auto",
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
    <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: 3, padding: "8px 12px", fontSize: 12, fontFamily: sans }}>
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
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 2, border: `1px solid ${c}44`, color: c, letterSpacing: ".03em" }}>
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

function Table({ columns, rows, onRowClick }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  return (
    <div style={{ border: `1px solid ${line}`, borderRadius: 2, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${line}`, background: surface }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: "13px 16px", textAlign: c.align || "left", fontWeight: 400, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: t3, width: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row, i)} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${line}` : "none", cursor: onRowClick ? "pointer" : "default", transition: "background .12s" }}
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

function ProgressBar({ value, color }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: line, borderRadius: 1, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color || red, borderRadius: 1, transition: "width .8s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: t3, minWidth: 28, textAlign: "right" }}>{value}%</span>
    </div>
  );
}

// ─── PAGE: OVERVIEW ──────────────────────────────────────
function Overview({ onNavigate, investor, projects, myProjects, allDistributions, msgs }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  return (
    <>
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: t3, marginBottom: 10 }}>
          Your Investments
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 40, fontWeight: 300, lineHeight: 1.1, color: t1, letterSpacing: "-.02em" }}>
          {myProjects.length} Active Projects
        </h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 10 }}>
          Northstar Pacific Development Group · {investor.role}
        </p>
      </div>

      {/* Project cards */}
      <SectionHeader title="Projects" right={<span style={{ color: red, cursor: "pointer" }} onClick={() => onNavigate("portfolio")}>View details →</span>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 1, background: line, borderRadius: 2, overflow: "hidden", marginBottom: 48 }}>
        {myProjects.map((p) => (
          <div key={p.id} style={{ background: surface, padding: "28px", cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={e => e.currentTarget.style.background = hover}
            onMouseLeave={e => e.currentTarget.style.background = surface}
            onClick={() => onNavigate("portfolio")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, letterSpacing: ".02em" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 3 }}>{p.location} · {p.type}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Invested</div>
                <div style={{ fontSize: 16, fontFamily: serif }}>${fmt(p.investorCommitted)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Current Value</div>
                <div style={{ fontSize: 16, fontFamily: serif }}>${fmt(p.currentValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Net IRR</div>
                <div style={{ fontSize: 16, fontFamily: serif, color: green }}>{p.irr}%</div>
              </div>
            </div>
            <ProgressBar value={p.completion} color={p.completion === 100 ? green : red} />
          </div>
        ))}
      </div>

      {/* Performance charts side by side */}
      <SectionHeader title="Value Tracking" right="Trailing 12 months" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 48 }}>
        {myProjects.map(p => (
          <div key={p.id} style={{ border: `1px solid ${line}`, borderRadius: 2, padding: "20px", background: surface }}>
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
          <div style={{ border: `1px solid ${line}`, borderRadius: 2, padding: "20px", background: surface, marginBottom: 48 }}>
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

      {/* Recent messages preview */}
      <SectionHeader title="Recent Messages" right={<span style={{ color: red, cursor: "pointer" }} onClick={() => onNavigate("messages")}>All messages →</span>} />
      <div style={{ border: `1px solid ${line}`, borderRadius: 2, overflow: "hidden" }}>
        {msgs.slice(0, 3).map((m, i) => (
          <div key={m.id} style={{ display: "flex", gap: 16, padding: "16px 20px", borderBottom: i < 2 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={e => e.currentTarget.style.background = hover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.unread ? red : "transparent", marginTop: 6, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: m.unread ? 500 : 400 }}>{m.subject}</span>
                <span style={{ fontSize: 11, color: t3 }}>{m.date}</span>
              </div>
              <div style={{ fontSize: 12, color: t3 }}>{m.from} · {m.role}</div>
              <div style={{ fontSize: 12, color: t3, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 600 }}>{m.preview}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── PAGE: PORTFOLIO ─────────────────────────────────────
function Portfolio({ myProjects }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [selected, setSelected] = useState(null);
  const project = selected !== null ? myProjects[selected] : null;

  if (project) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => setSelected(null)}>← Back to portfolio</p>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 400 }}>{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p style={{ fontSize: 14, color: t2 }}>{project.location} · {project.type}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: line, borderRadius: 2, overflow: "hidden", marginBottom: 40 }}>
          {[
            { label: "Your Committed", value: `$${fmt(project.investorCommitted)}` },
            { label: "Current Value", value: `$${fmt(project.currentValue)}` },
            { label: "Net IRR", value: `${project.irr}%` },
            { label: "MOIC", value: `${project.moic}x` },
          ].map((m, i) => (
            <div key={i} style={{ background: surface, padding: "24px" }}>
              <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 40 }}>
          <div>
            <SectionHeader title="About" />
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, marginBottom: 20 }}>{project.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Size", value: `${project.sqft} sf` },
                { label: "Units", value: project.units || "N/A" },
                { label: "Completion", value: `${project.completion}%` },
                { label: "Total Raise", value: fmtCurrency(project.totalRaise) },
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
            {project.updates.map((u, i) => (
              <div key={i} style={{ padding: "16px 0", borderBottom: i < project.updates.length - 1 ? `1px solid ${line}` : "none" }}>
                <div style={{ fontSize: 11, color: t3, marginBottom: 6 }}>{u.date}</div>
                <div style={{ fontSize: 13, color: t2, lineHeight: 1.6 }}>{u.text}</div>
              </div>
            ))}
          </div>
        </div>
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
  const project = myProjects[selectedIdx];

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Cap Table</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>Project-level capitalization</p>
      </div>

      {/* Project selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {myProjects.map((p, i) => (
          <span key={p.id} onClick={() => setSelectedIdx(i)} style={{
            fontSize: 12, padding: "6px 16px", borderRadius: 2, cursor: "pointer",
            border: `1px solid ${selectedIdx === i ? red + "55" : line}`,
            color: selectedIdx === i ? t1 : t3,
            background: selectedIdx === i ? `${red}11` : "transparent",
            transition: "all .15s",
          }}>{p.name}</span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: line, borderRadius: 2, overflow: "hidden", marginBottom: 40 }}>
        {[
          { label: "Total Raise", value: fmtCurrency(project.totalRaise) },
          { label: "Capital Called", value: fmtCurrency(project.capTable.reduce((s, r) => s + r.called, 0)) },
          { label: "Stakeholders", value: project.capTable.length },
          { label: "Your Ownership", value: `${project.capTable.find(r => r.holder === investor.name)?.ownership || 0}%` },
        ].map((m, i) => (
          <div key={i} style={{ background: surface, padding: "24px" }}>
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <Table
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
      />

      {/* Waterfall */}
      {project.waterfall.tiers.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <SectionHeader title="Distribution Waterfall" right={`${project.waterfall.prefReturn}% pref · ${project.waterfall.carry}% carry`} />
          <div style={{ border: `1px solid ${line}`, borderRadius: 2, overflow: "hidden" }}>
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
      window.open(d.file, "_blank");
      toast.add(`Downloading ${d.name}`, "success");
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

      {/* Project filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {projectNames.map(p => (
          <span key={p} onClick={() => setProjectFilter(p)} style={{
            fontSize: 12, padding: "6px 14px", borderRadius: 2, cursor: "pointer",
            border: `1px solid ${projectFilter === p ? red + "55" : line}`,
            color: projectFilter === p ? t1 : t3,
            background: projectFilter === p ? `${red}11` : "transparent",
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

      <div style={{ border: `1px solid ${line}`, borderRadius: 2, overflow: "hidden" }}>
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

      {/* Sign Modal */}
      <Modal open={!!signModal} onClose={() => setSignModal(null)}>
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
      <Modal open={!!reviewDoc} onClose={() => setReviewDoc(null)}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: line, borderRadius: 2, overflow: "hidden", marginBottom: 40 }}>
        {[
          { label: "Total Distributed", value: `$${fmt(total)}` },
          { label: "Projects", value: [...new Set(allDistributions.map(d => d.project))].join(", ") || "—" },
          { label: "Next Estimated", value: "Oct 2025" },
        ].map((m, i) => (
          <div key={i} style={{ background: surface, padding: "24px" }}>
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <SectionHeader title="Distribution History" />
      <Table
        columns={[
          { key: "project", label: "Project", render: r => <span style={{ fontFamily: serif, fontWeight: 500 }}>{r.project}</span> },
          { key: "quarter", label: "Period" },
          { key: "date", label: "Payment Date", render: r => <span style={{ color: t2 }}>{r.date}</span> },
          { key: "amount", label: "Amount", render: r => `$${fmt(r.amount)}` },
          { key: "type", label: "Type", render: r => <span style={{ color: t3 }}>{r.type}</span> },
          { key: "status", label: "Status", align: "right", render: () => <span style={{ fontSize: 11, color: green }}>Paid</span> },
        ]}
        rows={allDistributions}
      />
    </>
  );
}

// ─── PAGE: MESSAGES ──────────────────────────────────────
function MessagesPage({ toast, msgs, setMsgs, investor }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState({});
  const msg = selected !== null ? msgs[selected] : null;

  function handleSelect(i) {
    setSelected(i);
    setMsgs(prev => prev.map((m, idx) => idx === i ? { ...m, unread: false } : m));
  }

  function handleSend() {
    if (!reply.trim()) return;
    const newReply = { from: investor.name, text: reply, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) };
    setReplies(prev => ({ ...prev, [msg.id]: [...(prev[msg.id] || []), newReply] }));
    setReply("");
    toast.add("Reply sent", "success");
  }

  if (msg) {
    const msgReplies = replies[msg.id] || [];
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelected(null); setReply(""); }}>← Back to messages</p>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginBottom: 8 }}>{msg.subject}</h1>
          <div style={{ fontSize: 12, color: t3 }}>{msg.from} · {msg.role} · {msg.date}</div>
        </div>
        <div style={{ border: `1px solid ${line}`, borderRadius: 2, padding: "32px", background: surface }}>
          <p style={{ fontSize: 14, color: t2, lineHeight: 1.8 }}>{msg.preview}</p>
          <p style={{ fontSize: 14, color: t2, lineHeight: 1.8, marginTop: 16 }}>
            We continue to be pleased with the progress across the portfolio. Please don't hesitate to reach out if you have any questions or would like to schedule a call to discuss further.
          </p>
          <p style={{ fontSize: 14, color: t2, lineHeight: 1.8, marginTop: 16 }}>
            Best regards,<br />{msg.from}
          </p>
        </div>
        {msgReplies.map((r, i) => (
          <div key={i} style={{ marginTop: 16, border: `1px solid ${line}`, borderRadius: 2, padding: "20px 32px", background: hover }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: t1, fontWeight: 500 }}>{r.from}</span>
              <span style={{ fontSize: 11, color: t3 }}>{r.date}</span>
            </div>
            <p style={{ fontSize: 14, color: t2, lineHeight: 1.8 }}>{r.text}</p>
          </div>
        ))}
        <div style={{ marginTop: 24, padding: "16px 20px", border: `1px solid ${line}`, borderRadius: 2, display: "flex", alignItems: "center", gap: 12 }}>
          <input type="text" placeholder="Type a reply..." value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            style={{ flex: 1, background: "transparent", border: "none", color: t1, fontSize: 13, fontFamily: sans, outline: "none" }} />
          <span onClick={handleSend} style={{
            fontSize: 12, padding: "6px 16px", borderRadius: 2, cursor: "pointer",
            background: reply.trim() ? red : `${red}44`, color: "#fff", transition: "background .15s",
          }}>Send</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 300 }}>Messages</h1>
        <p style={{ fontSize: 14, color: t2, marginTop: 6 }}>{msgs.filter(m => m.unread).length} unread · {msgs.length} total</p>
      </div>
      <div style={{ border: `1px solid ${line}`, borderRadius: 2, overflow: "hidden" }}>
        {msgs.map((m, i) => (
          <div key={m.id} onClick={() => handleSelect(i)} style={{ display: "flex", gap: 16, padding: "18px 20px", borderBottom: i < msgs.length - 1 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={e => e.currentTarget.style.background = hover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.unread ? red : "transparent", marginTop: 7, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: m.unread ? 500 : 400 }}>{m.subject}</span>
                <span style={{ fontSize: 11, color: t3 }}>{m.date}</span>
              </div>
              <div style={{ fontSize: 12, color: t3 }}>{m.from} · {m.role}</div>
              <div style={{ fontSize: 12, color: t3, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 700 }}>{m.preview}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── LOGIN PAGE ─────────────────────────────────────────
function LoginPage({ onLogin }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await apiLogin(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
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
                  <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#AAA" }}>{s.label}</div>
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
                  position: "relative", borderRadius: 4, overflow: "hidden", height: 140,
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
            <form onSubmit={handleSubmit} style={{
              background: "#fff", border: "1px solid #ECEAE5", borderRadius: 8, padding: "40px 32px",
              boxShadow: "0 8px 40px rgba(0,0,0,.06)",
            }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <NorthstarIcon size={40} color={red} />
                <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, marginTop: 16, color: darkText }}>Investor Portal</h2>
                <p style={{ fontSize: 13, color: "#999" }}>Sign in to access your account</p>
              </div>
              {error && (
                <div style={{ fontSize: 12, color: red, padding: "10px 14px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 16, background: `${red}08` }}>{error}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="investor@example.com"
                  style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 4, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
                  onFocus={e => e.target.style.borderColor = red}
                  onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 4, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
                  onFocus={e => e.target.style.borderColor = red}
                  onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
              </div>
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px", background: loading ? `${red}AA` : red, color: "#fff",
                border: "none", borderRadius: 4, fontSize: 14, fontFamily: sans, fontWeight: 500, cursor: loading ? "default" : "pointer",
                letterSpacing: ".02em", transition: "background .15s",
              }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div style={{ marginTop: 24, padding: "14px 16px", border: "1px solid #ECEAE5", borderRadius: 4, background: cream }}>
                <div style={{ fontSize: 9, color: "#AAA", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Demo Credentials</div>
                <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>j.chen@pacificventures.ca</div>
                <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>northstar2025</div>
              </div>
            </form>
            <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 20 }}>
              Interested in investing? <span style={{ color: red, cursor: "pointer", fontWeight: 500 }}>Contact us →</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="login-footer" style={{ padding: "20px 48px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#AAA", borderTop: "1px solid #ECEAE5" }}>
        <span>© 2026 Northstar Pacific Development Group</span>
        <span>710 – 1199 W Pender St, Vancouver BC V6E 2R1</span>
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
  const toast = useToast();
  const th = themes[themeMode];

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
      getMe().then(u => { setUser(u); return loadData(u); }).catch(() => { setAuthed(false); setLoading(false); });
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

  async function handleLogin(u) {
    setUser(u);
    setAuthed(true);
    await loadData(u);
  }

  if (!authed || !appData) return (
    <ThemeContext.Provider value={th}>
      {loading ? (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg, fontFamily: sans, color: th.t2 }}>Loading...</div>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </ThemeContext.Provider>
  );

  const { investor, projects, myProjects, allDocuments, allDistributions } = appData;

  const pages = {
    overview: <Overview onNavigate={setView} investor={investor} projects={projects} myProjects={myProjects} allDistributions={allDistributions} msgs={msgs} />,
    portfolio: <Portfolio myProjects={myProjects} />,
    captable: <CapTablePage myProjects={myProjects} investor={investor} />,
    documents: <DocumentsPage toast={toast} allDocuments={allDocuments} myProjects={myProjects} investor={investor} />,
    distributions: <DistributionsPage allDistributions={allDistributions} myProjects={myProjects} />,
    messages: <MessagesPage toast={toast} msgs={msgs} setMsgs={setMsgs} investor={investor} />,
  };

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "portfolio", label: "Portfolio" },
    { id: "captable", label: "Cap Table" },
    { id: "documents", label: "Documents" },
    { id: "distributions", label: "Distributions" },
    { id: "messages", label: "Messages" },
  ];

  return (
    <ThemeContext.Provider value={th}>
    <div style={{ background: th.bg, color: th.t1, fontFamily: sans, minHeight: "100vh", transition: "background .3s, color .3s" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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
      `}</style>

      {/* Top bar: logo + user actions */}
      <header className="app-topbar" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, position: "sticky", top: 0, zIndex: 10,
        background: th.headerBg, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${th.line}`,
        transition: "background .3s, border-color .3s",
        "--line-color": th.line,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NorthstarIcon size={24} color={red} />
          <span className="brand-wordmark"><NorthstarWordmark height={14} color={th.t1} /></span>
          <span className="brand-label brand-sep" style={{ fontSize: 10, letterSpacing: ".12em", color: th.t3, textTransform: "uppercase", marginLeft: 6, paddingLeft: 14, borderLeft: `1px solid ${th.line}` }}>Investor Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="theme-toggle" onClick={toggleTheme} style={{ fontSize: 14, cursor: "pointer", padding: "4px 8px", borderRadius: 4, border: `1px solid ${th.line}`, transition: "border-color .15s", lineHeight: 1 }}
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {themeMode === "dark" ? "\u2600" : "\u263D"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: th.avatarGrad,
              border: `1px solid ${th.line}`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 11, fontWeight: 500, color: th.t2,
            }}>{investor.initials}</div>
            <span className="user-name" style={{ fontSize: 13, color: th.t1, fontWeight: 400 }}>{investor.name}</span>
          </div>
          <span onClick={handleLogout} style={{ fontSize: 12, color: th.t3, cursor: "pointer", padding: "5px 14px", border: `1px solid ${th.line}`, borderRadius: 4, transition: "color .15s, border-color .15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = red; e.currentTarget.style.borderColor = red; }}
            onMouseLeave={e => { e.currentTarget.style.color = th.t3; e.currentTarget.style.borderColor = th.line; }}>
            Sign Out
          </span>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="app-subnav" style={{
        position: "sticky", top: 56, zIndex: 9,
        background: th.headerBg, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${th.line}`,
        transition: "background .3s, border-color .3s",
      }}>
        <div className="app-subnav-inner" style={{ maxWidth: 1080, margin: "0 auto" }}>
          {navItems.map(n => (
            <span key={n.id} onClick={() => setView(n.id)} style={{
              fontSize: 13, fontWeight: view === n.id ? 500 : 400, cursor: "pointer", userSelect: "none",
              color: view === n.id ? th.t1 : th.t3,
              padding: "12px 0",
              borderBottom: view === n.id ? `2px solid ${red}` : "2px solid transparent",
              marginBottom: -1,
              transition: "color .15s, border-color .15s",
            }}
              onMouseEnter={e => { if (view !== n.id) e.currentTarget.style.color = th.t2 }}
              onMouseLeave={e => { if (view !== n.id) e.currentTarget.style.color = th.t3 }}>
              {n.label}
              {n.id === "messages" && msgs.some(m => m.unread) && (
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: red, marginLeft: 6, verticalAlign: "middle" }} />
              )}
            </span>
          ))}
        </div>
      </nav>

      {/* Mobile nav */}
      <nav className="app-nav-mobile" style={{
        position: "sticky", top: 56, zIndex: 9,
        background: th.headerBg, backdropFilter: "blur(16px)",
        padding: "0 8px",
      }}>
        {navItems.map(n => (
          <span key={n.id} onClick={() => setView(n.id)} style={{
            fontSize: 12, padding: "10px 14px", cursor: "pointer", userSelect: "none",
            color: view === n.id ? th.t1 : th.t3,
            borderBottom: view === n.id ? `2px solid ${red}` : "2px solid transparent",
            whiteSpace: "nowrap", transition: "color .15s",
          }}>
            {n.label}
            {n.id === "messages" && msgs.some(m => m.unread) && (
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: red, marginLeft: 3, verticalAlign: "middle" }} />
            )}
          </span>
        ))}
      </nav>

      <main className="app-main" style={{ maxWidth: 1080, margin: "0 auto" }}>
        {pages[view]}
      </main>

      <footer className="app-footer" style={{ borderTop: `1px solid ${th.line}`, display: "flex", justifyContent: "space-between", fontSize: 11, color: th.t3 }}>
        <span>© 2026 Northstar Pacific Development Group</span>
        <span>710 – 1199 W Pender, Vancouver BC V6E 2R1</span>
      </footer>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
    </ThemeContext.Provider>);
}
