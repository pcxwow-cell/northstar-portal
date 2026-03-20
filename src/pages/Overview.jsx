import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { fmt } from "../api.js";
import Card from "../components/Card.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const green = colors.green;

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

function ChartTooltip({ active, payload, label, prefix = "$", suffix = "K" }) {
  const { surface, line, t1, t3 } = useTheme();
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

function LocalSectionHeader({ title, right }) {
  const { t1, t3 } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: t1 }}>{title}</h2>
      {right && <span style={{ fontSize: 12, color: t3 }}>{right}</span>}
    </div>
  );
}

function ProgressBar({ value, color }) {
  const { line, t3 } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: `${line}88`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color === green ? green : "linear-gradient(90deg, #EA2028, #ff4a4a)", borderRadius: 20, transition: "width .8s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: t3, minWidth: 28, textAlign: "right" }}>{value}%</span>
    </div>
  );
}

export default function Overview({ onNavigate, investor, projects, myProjects, allDistributions, msgs, onOpenThread }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  return (
    <>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: red, fontWeight: 600, marginBottom: 8 }}>
          Your Investments
        </p>
        <h1 style={{ fontFamily: sans, fontSize: 28, fontWeight: 300, lineHeight: 1.2, color: t1 }}>
          Good afternoon, {investor.name?.split(" ")[0] || "Investor"}
        </h1>
        <p style={{ fontSize: 14, color: t3, marginTop: 4 }}>
          Northstar Pacific Development Group {"\u00B7"} {investor.role}
        </p>
      </div>

      {/* Portfolio summary cards */}
      {(() => {
        if (myProjects.length === 0) {
          return (
            <Card padding="40px" style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{"\uD83D\uDCCA"}</div>
              <div style={{ fontSize: 15, color: t1, fontWeight: 500, marginBottom: 8 }}>Welcome to your investor portal</div>
              <div style={{ fontSize: 13, color: t3, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>Your portfolio is being set up. You'll see your investments here once assigned by your administrator.</div>
            </Card>
          );
        }
        const totalContributed = myProjects.reduce((s, p) => s + (p.investorCommitted || 0), 0);
        const totalValue = myProjects.reduce((s, p) => s + (p.currentValue || 0), 0);
        const totalDistributed = allDistributions.reduce((s, d) => s + d.amount, 0);
        const gainLoss = totalValue + totalDistributed - totalContributed;
        const validIRR = myProjects.filter(p => p.irr != null);
        const weightedIRR = validIRR.length > 0
          ? (validIRR.reduce((s, p) => s + (p.irr || 0) * (p.investorCommitted || 0), 0) / (validIRR.reduce((s, p) => s + (p.investorCommitted || 0), 0) || 1)).toFixed(1) + "%"
          : "\u2014";
        return (
          <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
            <StatCard label="Total Contributed" value={<AnimatedNumber value={totalContributed} prefix="$" />} sub={`across ${myProjects.length} projects`} accent={red} />
            <StatCard label="Current Value" value={<AnimatedNumber value={totalValue} prefix="$" />} sub={<span style={{ color: gainLoss >= 0 ? green : red }}>{gainLoss >= 0 ? `+$${fmt(gainLoss)} gain` : `-$${fmt(Math.abs(gainLoss))} loss`}</span>} accent={green} />
            <StatCard label="Total Distributed" value={<AnimatedNumber value={totalDistributed} prefix="$" />} sub={`${allDistributions.length} payments`} accent="#D4A574" />
            <StatCard label="Weighted IRR" value={weightedIRR} sub="blended across projects" accent="#5B8DEF" />
          </div>
        );
      })()}

      {/* Cross-project capital summary */}
      {myProjects.length > 1 && (() => {
        const totalCommitted = myProjects.reduce((s, p) => s + (p.investorCommitted || 0), 0);
        const totalCalled = myProjects.reduce((s, p) => s + (p.investorCalled || p.investorCommitted || 0), 0);
        const totalCurrentValue = myProjects.reduce((s, p) => s + (p.currentValue || 0), 0);
        const totalDists = allDistributions.reduce((s, d) => s + d.amount, 0);
        return (
          <Card padding="24px" style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, fontWeight: 600, marginBottom: 16 }}>Capital Summary Across All Projects</div>
            <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {[
                { label: "Total Committed", value: `$${fmt(totalCommitted)}`, color: t1 },
                { label: "Total Called", value: `$${fmt(totalCalled)}`, color: t1 },
                { label: "Total Current Value", value: `$${fmt(totalCurrentValue)}`, color: green },
                { label: "Total Distributions", value: `$${fmt(totalDists)}`, color: "#D4A574" },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: 9, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 400, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Portfolio Allocation Chart */}
      {myProjects.length > 1 && (() => {
        const PIE_COLORS = [red, green, "#D4A574", "#5B8DEF", "#7C3AED", "#E07C24"];
        const totalVal = myProjects.reduce((s, p) => s + (p.currentValue || 0), 0);
        const pieData = myProjects.filter(p => p.currentValue > 0).map(p => ({
          name: p.name, value: p.currentValue, pct: totalVal > 0 ? ((p.currentValue / totalVal) * 100).toFixed(1) : 0,
        }));
        return pieData.length > 0 ? (
          <div style={{ marginBottom: 48 }}>
            <LocalSectionHeader title="Portfolio Allocation" />
            <Card padding="24px">
              <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `$${fmt(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {pieData.map((d, i) => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: t1, flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: t2 }}>${fmt(d.value)}</span>
                      <span style={{ fontSize: 11, color: t3, minWidth: 40, textAlign: "right" }}>{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        ) : null;
      })()}

      {/* Project cards */}
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: t3, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Active Projects</span>
        <span style={{ fontSize: 11, color: red, cursor: "pointer", letterSpacing: "normal", textTransform: "none", fontWeight: 500 }} onClick={() => onNavigate("portfolio")}>View All {"\u2192"}</span>
      </div>
      <div className="project-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20, marginBottom: 48 }}>
        {myProjects.map((p) => {
          const fallbackImgMap = { Porthaven: "https://northstardevelopment.ca/public/images/porthaven-1.jpg", Livy: "https://northstardevelopment.ca/public/images/livy-2.jpeg", Estrella: "https://northstardevelopment.ca/public/images/estrella-1.jpg", "Panorama Building 6": "https://northstardevelopment.ca/public/images/panorama-1.jpg" };
          const img = p.imageUrl || fallbackImgMap[p.name];
          return (
          <div key={p.id} style={{ background: surface, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", cursor: "pointer", transition: "transform .15s, box-shadow .15s, border-color .2s", border: "1px solid transparent" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.1)"; e.currentTarget.style.borderColor = `${red}22`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)"; e.currentTarget.style.borderColor = "transparent"; }}
            onClick={() => onNavigate("portfolio", { projectId: p.id })}>
            {/* Hero image */}
            {img && (
              <div style={{ height: 140, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.4) 0%, transparent 60%)" }} />
                <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,.9)", color: colors.darkText, fontWeight: 500, zIndex: 1, backdropFilter: "blur(4px)" }}>{p.status}</span>
                <div style={{ position: "absolute", bottom: 12, left: 16, color: colors.white, fontSize: 18, fontWeight: 500, zIndex: 1 }}>{p.name}</div>
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
        {myProjects.length === 0 && <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No projects yet.</div>}
      </div>

      {/* Performance charts side by side */}
      <LocalSectionHeader title="Value Tracking" right="Trailing 12 months" />
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 48 }}>
        {myProjects.length === 0 && <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No performance data yet.</div>}
        {myProjects.map(p => (
          <Card key={p.id} padding="24px">
            <div style={{ fontSize: 13, fontFamily: serif, fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: t3, marginBottom: 16 }}>{p.status} {"\u00B7"} <span title="Multiple on Invested Capital">{p.moic}x MOIC</span></div>
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
          </Card>
        ))}
      </div>

      {/* Distributions summary */}
      {allDistributions.length > 0 && (
        <>
          <LocalSectionHeader title="Recent Distributions" right={<span style={{ color: red, cursor: "pointer" }} onClick={() => onNavigate("distributions")}>View all {"\u2192"}</span>} />
          <Card padding="24px" style={{ marginBottom: 48 }}>
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
          </Card>
        </>
      )}

      {/* Recent messages preview */}
      <LocalSectionHeader title="Recent Messages" right={<span style={{ color: red, cursor: "pointer" }} onClick={() => onNavigate("messages")}>All messages {"\u2192"}</span>} />
      {msgs.length === 0 ? (
        <EmptyState title="No messages yet" subtitle="Start a conversation with Northstar." />
      ) : (
      <Card padding="8px 0" style={{ overflow: "hidden" }}>
        {msgs.slice(0, 3).map((m, i) => (
          <div key={m.id} onClick={() => { onNavigate("messages", { threadId: m.threadId || m.id }); }} style={{ display: "flex", gap: 12, padding: "14px 20px", borderBottom: i < 2 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s", alignItems: "flex-start" }}
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
      </Card>
      )}
    </>
  );
}
