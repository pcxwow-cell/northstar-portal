import { useState, useEffect } from "react";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { fetchCapitalAccount, fetchCashFlows, downloadDocument, fmt, fmtCurrency } from "../api.js";
import Card from "../components/Card.jsx";
import Spinner from "../components/Spinner.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Tabs from "../components/Tabs.jsx";
import DataTable from "../components/DataTable.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const green = colors.green;

const formatType = (t) => t ? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

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

export default function Portfolio({ myProjects, investor, initialProjectId }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [selected, setSelected] = useState(() => {
    if (initialProjectId != null) {
      const idx = myProjects.findIndex(p => p.id === initialProjectId);
      return idx >= 0 ? idx : null;
    }
    return null;
  });
  const [capitalAccount, setCapitalAccount] = useState(null);
  const [cashFlows, setCashFlows] = useState([]);
  const [detailTab, setDetailTab] = useState("overview");
  const [detailLoading, setDetailLoading] = useState(false);
  const project = selected !== null ? myProjects[selected] : null;

  useEffect(() => {
    if (project && investor) {
      setDetailLoading(true);
      Promise.all([
        fetchCapitalAccount(investor.id, project.id).then(setCapitalAccount).catch(() => setCapitalAccount(null)),
        fetchCashFlows(investor.id, project.id).then(setCashFlows).catch(() => setCashFlows([])),
      ]).finally(() => setDetailLoading(false));
    }
  }, [selected, project?.id, investor?.id]);

  if (project) {
    const ca = capitalAccount || {};
    const displayIRR = ca.irr ?? project.irr;
    const displayMOIC = ca.moic ?? project.moic;

    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelected(null); setCapitalAccount(null); setCashFlows([]); }}>{"\u2190"} Back to portfolio</p>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 400 }}>{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p style={{ fontSize: 14, color: t2 }}>{project.location} {"\u00B7"} {project.type}</p>
        </div>
        <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Your Committed", value: `$${fmt(project.investorCommitted)}`, accent: red },
            { label: "Current Value", value: `$${fmt(project.currentValue)}`, accent: green },
            { label: "Net IRR", value: displayIRR != null ? `${displayIRR}%` : "--", sub: capitalAccount ? "calculated" : null, accent: "#D4A574", tooltip: "Internal Rate of Return" },
            { label: "MOIC", value: displayMOIC != null ? `${displayMOIC}x` : "--", sub: capitalAccount ? "calculated" : null, accent: "#5B8DEF", tooltip: "Multiple on Invested Capital" },
          ].map((m, i) => (
            <Card key={i} accent={m.accent} padding="24px">
              <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }} title={m.tooltip || ""}>{m.label}</div>
              <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
              {m.sub && <div style={{ fontSize: 9, color: green, marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>{m.sub}</div>}
            </Card>
          ))}
        </div>
        {/* Detail tabs */}
        <Tabs tabs={[
          { id: "overview", label: "Overview" },
          { id: "documents", label: "Documents" },
          { id: "updates", label: "Updates" },
          { id: "distributions", label: "Distributions" },
        ]} active={detailTab} onChange={setDetailTab} style={{ marginBottom: 32 }} />

        {detailLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
            <Spinner size={28} />
          </div>
        )}
        {detailTab === "overview" && !detailLoading && (<>
        {/* Capital Account Statement */}
        <LocalSectionHeader title="Capital Account" />
        <Card padding="0" style={{ overflow: "hidden", marginBottom: 40 }}>
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
              { label: "Current Value (NAV)", value: endingBalance, tooltip: "Net Asset Value" },
              { label: "Unrealized Gain / (Loss)", value: unrealizedGain, highlight: true },
            ];
            return rows.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderBottom: i < rows.length - 1 ? `1px solid ${line}` : "none", background: r.highlight ? `${line}44` : "transparent" }}>
                <span style={{ fontSize: 13, color: r.highlight ? t1 : t2, fontWeight: r.highlight ? 500 : 400 }} title={r.tooltip || ""}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: r.highlight ? 600 : 400, color: r.highlight ? (r.value >= 0 ? green : red) : t1 }}>
                  {r.value < 0 ? `-$${fmt(Math.abs(r.value))}` : `$${fmt(r.value)}`}
                </span>
              </div>
            ));
          })()}
        </Card>

        {/* Cash Flow Timeline */}
        {cashFlows.length > 0 && (
          <>
            <LocalSectionHeader title="Cash Flow History" />
            <div className="cashflow-grid" style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
              <div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 100px", padding: "10px 20px", borderBottom: `1px solid ${line}`, background: `${line}33` }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3 }}>Date</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3 }}>Description</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: "right" }}>Amount</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, textAlign: "right" }}>Type</span>
              </div>
              {cashFlows.map((cf, i) => (
                <div key={cf.id || i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 100px", padding: "12px 20px", borderBottom: i < cashFlows.length - 1 ? `1px solid ${line}` : "none", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: t3 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span style={{ fontSize: 13, color: t2 }}>{cf.description || formatType(cf.type)}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", color: cf.amount < 0 ? red : green }}>
                    {cf.amount < 0 ? `-$${fmt(Math.abs(cf.amount))}` : `+$${fmt(cf.amount)}`}
                  </span>
                  <span style={{ fontSize: 11, textAlign: "right", color: t3 }}>{formatType(cf.type)}</span>
                </div>
              ))}
              </div>
            </div>
          </>
        )}

        <LocalSectionHeader title="About" />
        <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, marginBottom: 20 }}>{project.description}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
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
        </>)}

        {detailTab === "documents" && (<>
        <LocalSectionHeader title="Documents" />
        {project.documents && project.documents.length > 0 ? (
          <Card padding="0" style={{ overflow: "hidden", marginBottom: 40 }}>
            {project.documents.map((d, i) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < project.documents.length - 1 ? `1px solid ${line}` : "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: t1 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{d.category} {"\u00B7"} {d.date} {"\u00B7"} {d.size}</div>
                </div>
                <span onClick={() => downloadDocument(d.id).catch(err => alert(err.message || "Download failed"))} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Download</span>
              </div>
            ))}
          </Card>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No documents yet.</div>
        )}
        </>)}

        {detailTab === "updates" && (<>
        <LocalSectionHeader title="Construction Updates" />
        {project.updates && project.updates.length > 0 ? project.updates.map((u, i) => {
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
        }) : (
          <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No updates yet.</div>
        )}
        </>)}

        {detailTab === "distributions" && (<>
        <LocalSectionHeader title="Distributions" />
        {cashFlows.filter(cf => cf.type === "distribution" || cf.amount > 0).length > 0 ? (
          <Card padding="0" style={{ overflow: "hidden", marginBottom: 40, background: surface }}>
            {cashFlows.filter(cf => cf.type === "distribution" || cf.amount > 0).map((cf, i, arr) => (
              <div key={cf.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < arr.length - 1 ? `1px solid ${line}` : "none" }}>
                <div>
                  <div style={{ fontSize: 13, color: t1 }}>{cf.description || formatType(cf.type)}</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: green }}>+${fmt(Math.abs(cf.amount))}</span>
              </div>
            ))}
          </Card>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No distributions yet.</div>
        )}
        </>)}
      </>
    );
  }

  if (myProjects.length === 0) {
    return (
      <>
        <SectionHeader title="Portfolio" subtitle="0 investments" size="lg" style={{ marginBottom: 40 }} />
        <EmptyState icon={"\uD83D\uDCBC"} title="No investments yet" subtitle="Your portfolio will appear here once you are assigned to one or more projects by your administrator." />
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Portfolio" subtitle={`${myProjects.length} investments \u00B7 $${fmt(myProjects.reduce((s, p) => s + p.currentValue, 0))} total value`} size="lg" style={{ marginBottom: 40 }} />
      <DataTable
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
          { key: "irr", label: "Net IRR", render: r => <span style={{ color: green }} title="Internal Rate of Return">{r.irr}%</span> },
          { key: "moic", label: "MOIC", render: r => <span style={{ color: t2 }} title="Multiple on Invested Capital">{r.moic}x</span> },
          { key: "completion", label: "Progress", render: r => <ProgressBar value={r.completion} color={r.completion === 100 ? green : red} /> },
        ]}
        data={myProjects}
        onRowClick={(row) => setSelected(myProjects.indexOf(row))}
      />
    </>
  );
}
