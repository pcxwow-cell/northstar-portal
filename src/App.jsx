import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { investor, projects, myProjects, allDocuments, allDistributions, generalDocuments, messages, fmt, fmtCurrency } from "./data.js";

// ─── THEME ───────────────────────────────────────────────
const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'DM Sans', -apple-system, sans-serif";
const red = "#B33A3A";
const green = "#3D7A54";

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
function Overview({ onNavigate }) {
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
        {messages.slice(0, 3).map((m, i) => (
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
function Portfolio() {
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
function CapTablePage() {
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
function DocumentsPage({ toast }) {
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
function DistributionsPage() {
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
function MessagesPage({ toast, msgs, setMsgs }) {
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

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (email === "j.chen@pacificventures.ca" && password === "northstar2025") {
        sessionStorage.setItem("northstar_auth", "true");
        onLogin();
      } else {
        setError("Invalid email or password");
        setLoading(false);
      }
    }, 600);
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: sans, color: t1, display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 80, maxWidth: 900, width: "100%", alignItems: "center", animation: "fadeIn .5s ease" }}>
          <div>
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontFamily: serif, fontSize: 42, fontWeight: 400, letterSpacing: ".08em", lineHeight: 1.1 }}>NORTHSTAR</div>
              <div style={{ fontSize: 12, letterSpacing: ".18em", color: t3, textTransform: "uppercase", marginTop: 8 }}>Pacific Development Group</div>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 300, lineHeight: 1.4, color: t2, marginBottom: 32 }}>
              Institutional-grade real estate<br />investment, made transparent.
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: line, borderRadius: 2, overflow: "hidden", marginBottom: 32 }}>
              {[
                { label: "Active Projects", value: projects.length },
                { label: "Under Development", value: projects.filter(p => p.status !== "Completed").length },
                { label: "Western Canada", value: "Focus" },
              ].map((m, i) => (
                <div key={i} style={{ background: surface, padding: "20px 16px" }}>
                  <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: t3, marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400, color: t1 }}>{m.value}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: t3, lineHeight: 1.7 }}>
              Value-add multifamily & mixed-use investments across Western Canada.
              Track your projects, review documents, and monitor construction progress — all in one place.
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit} style={{ border: `1px solid ${line}`, borderRadius: 4, padding: 32, background: surface }}>
              <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, marginBottom: 4 }}>Investor Portal</h2>
              <p style={{ fontSize: 12, color: t3, marginBottom: 24 }}>Sign in to access your account</p>
              {error && (
                <div style={{ fontSize: 12, color: red, padding: "8px 12px", border: `1px solid ${red}33`, borderRadius: 2, marginBottom: 16, background: `${red}0A` }}>{error}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="investor@example.com"
                  style={{ width: "100%", padding: "10px 12px", background: bg, border: `1px solid ${line}`, borderRadius: 2, color: t1, fontSize: 13, fontFamily: sans, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = `${red}66`}
                  onBlur={e => e.target.style.borderColor = line} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 12px", background: bg, border: `1px solid ${line}`, borderRadius: 2, color: t1, fontSize: 13, fontFamily: sans, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = `${red}66`}
                  onBlur={e => e.target.style.borderColor = line} />
              </div>
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "11px", background: loading ? `${red}88` : red, color: "#fff",
                border: "none", borderRadius: 2, fontSize: 13, fontFamily: sans, cursor: loading ? "default" : "pointer",
                letterSpacing: ".04em", transition: "background .15s",
              }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div style={{ marginTop: 20, padding: "12px", border: `1px solid ${line}`, borderRadius: 2, background: bg }}>
                <div style={{ fontSize: 10, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Demo Credentials</div>
                <div style={{ fontSize: 12, color: t2 }}>j.chen@pacificventures.ca</div>
                <div style={{ fontSize: 12, color: t2 }}>northstar2025</div>
              </div>
            </form>
          </div>
        </div>
      </div>
      <footer style={{ borderTop: `1px solid ${line}`, padding: "20px 48px", display: "flex", justifyContent: "space-between", fontSize: 11, color: t3 }}>
        <span>© 2026 Northstar Pacific Development Group</span>
        <span>710 – 1199 W Pender, Vancouver BC V6E 2R1</span>
      </footer>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("northstar_auth") === "true");
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("northstar_theme") || "dark");
  const [view, setView] = useState("overview");
  const [msgs, setMsgs] = useState(messages.map(m => ({ ...m })));
  const toast = useToast();
  const th = themes[themeMode];

  function toggleTheme() {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    localStorage.setItem("northstar_theme", next);
  }

  function handleLogout() {
    sessionStorage.removeItem("northstar_auth");
    setAuthed(false);
    setView("overview");
  }

  if (!authed) return (
    <ThemeContext.Provider value={th}>
      <LoginPage onLogin={() => setAuthed(true)} />
    </ThemeContext.Provider>
  );

  const pages = {
    overview: <Overview onNavigate={setView} />,
    portfolio: <Portfolio />,
    captable: <CapTablePage />,
    documents: <DocumentsPage toast={toast} />,
    distributions: <DistributionsPage />,
    messages: <MessagesPage toast={toast} msgs={msgs} setMsgs={setMsgs} />,
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
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <header style={{
        borderBottom: `1px solid ${th.line}`, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 48px", height: 60,
        position: "sticky", top: 0, zIndex: 10,
        background: th.headerBg, backdropFilter: "blur(16px)",
        transition: "background .3s, border-color .3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: serif, fontSize: 19, fontWeight: 400, letterSpacing: ".06em", color: th.t1 }}>NORTHSTAR</span>
            <span style={{ fontSize: 10, letterSpacing: ".14em", color: th.t3, textTransform: "uppercase" }}>Investor Portal</span>
          </div>
          <div style={{ width: 1, height: 20, background: th.line }} />
          <nav style={{ display: "flex", gap: 24 }}>
            {navItems.map(n => (
              <span key={n.id} onClick={() => setView(n.id)} style={{
                fontSize: 12.5, fontWeight: 400, cursor: "pointer", userSelect: "none",
                color: view === n.id ? th.t1 : th.t3,
                borderBottom: view === n.id ? `1px solid ${red}` : "1px solid transparent",
                paddingBottom: 2, transition: "color .15s, border-color .15s",
              }}
                onMouseEnter={e => { if (view !== n.id) e.currentTarget.style.color = th.t2 }}
                onMouseLeave={e => { if (view !== n.id) e.currentTarget.style.color = th.t3 }}>
                {n.label}
                {n.id === "messages" && msgs.some(m => m.unread) && (
                  <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: red, marginLeft: 4, verticalAlign: "middle" }} />
                )}
              </span>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span onClick={toggleTheme} style={{ fontSize: 14, cursor: "pointer", padding: "4px 8px", borderRadius: 2, border: `1px solid ${th.line}`, transition: "border-color .15s" }}
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {themeMode === "dark" ? "\u2600" : "\u263D"}
          </span>
          <span style={{ fontSize: 12, color: th.t3 }}>{investor.name}</span>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: th.avatarGrad,
            border: `1px solid ${th.line}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 10, fontWeight: 500, color: th.t2,
          }}>{investor.initials}</div>
          <span onClick={handleLogout} style={{ fontSize: 11, color: th.t3, cursor: "pointer", padding: "4px 10px", border: `1px solid ${th.line}`, borderRadius: 2, transition: "color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = red}
            onMouseLeave={e => e.currentTarget.style.color = th.t3}>
            Sign Out
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 48px 96px" }}>
        {pages[view]}
      </main>

      <footer style={{ borderTop: `1px solid ${th.line}`, padding: "20px 48px", display: "flex", justifyContent: "space-between", fontSize: 11, color: th.t3 }}>
        <span>© 2026 Northstar Pacific Development Group</span>
        <span>710 – 1199 W Pender, Vancouver BC V6E 2R1</span>
      </footer>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
    </ThemeContext.Provider>);
}
