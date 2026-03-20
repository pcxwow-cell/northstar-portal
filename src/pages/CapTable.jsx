import { useState } from "react";
import { colors, fonts, inputStyle } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { calculateWaterfallApi, fmt, fmtCurrency } from "../api.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import SavedScenarios, { saveScenario, loadScenarios } from "../components/SavedScenarios.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const green = colors.green;

function LocalSectionHeader({ title, right }) {
  const { t1, t3 } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: t1 }}>{title}</h2>
      {right && <span style={{ fontSize: 12, color: t3 }}>{right}</span>}
    </div>
  );
}

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

export default function CapTablePage({ myProjects, investor, toast }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [waterfallInput, setWaterfallInput] = useState("");
  const [waterfallResult, setWaterfallResult] = useState(null);
  const [waterfallLoading, setWaterfallLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const project = myProjects[selectedIdx];

  if (!myProjects.length) return (
    <div style={{ padding: 40, textAlign: "center", color: t3 }}>
      <SectionHeader title="Cap Table" size="lg" />
      <p style={{ fontSize: 14, marginTop: 16 }}>No projects assigned to your account.</p>
    </div>
  );

  return (
    <>
      <SectionHeader title="Cap Table" subtitle="Project-level capitalization" size="lg" style={{ marginBottom: 40 }} />

      {/* Project selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: `${line}55`, borderRadius: 8, padding: 2, width: "fit-content" }}>
        {myProjects.map((p, i) => (
          <Button key={p.id} onClick={() => setSelectedIdx(i)} variant="ghost" style={{
            fontSize: 12, padding: "6px 16px", borderRadius: 6, cursor: "pointer",
            color: selectedIdx === i ? t1 : t3,
            background: selectedIdx === i ? surface : "transparent",
            boxShadow: selectedIdx === i ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            fontWeight: selectedIdx === i ? 500 : 400,
            transition: "all .15s", border: "none", fontFamily: sans, lineHeight: "inherit",
          }}>{p.name}</Button>
        ))}
      </div>

      <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Total Raise", value: fmtCurrency(project.totalRaise), accent: red },
          { label: "Capital Called", value: fmtCurrency(project.capTable.reduce((s, r) => s + r.called, 0)), accent: green },
          { label: "Stakeholders", value: project.capTable.length, accent: "#D4A574" },
          { label: "Your Ownership", value: `${project.capTable.find(r => r.holder === investor.name)?.ownership || 0}%`, accent: "#5B8DEF" },
        ].map((m, i) => (
          <Card key={i} accent={m.accent} padding="24px">
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
          </Card>
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

      <DataTable
        columns={[
          { key: "holder", label: "Holder", render: r => <span style={{ fontWeight: r.holder === investor.name ? 500 : 400, color: r.holder === investor.name ? t1 : t2 }}>{r.holder}</span> },
          { key: "type", label: "Class", render: r => <span style={{ color: t3 }}>{r.type}</span> },
          { key: "committed", label: "Committed", render: r => `$${fmt(r.committed)}` },
          { key: "called", label: "Called", render: r => <span style={{ color: t2 }}>${fmt(r.called)}</span> },
          { key: "unfunded", label: "Unfunded", render: r => <span style={{ color: r.unfunded > 0 ? "#8B7128" : t3 }}>${fmt(r.unfunded)}</span> },
          { key: "ownership", label: "Ownership", render: r => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 60, height: 3, background: line, borderRadius: 1, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(r.ownership, 100)}%`, height: "100%", background: red, opacity: .6, borderRadius: 1 }} />
              </div>
              <span style={{ color: t2, fontSize: 12 }}>{r.ownership}%</span>
            </div>
          )},
        ]}
        data={project.capTable}
        emptyMessage="No cap table data"
      />

      {/* Waterfall */}
      {project.waterfall.tiers.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <LocalSectionHeader title="Distribution Waterfall" right={`${project.waterfall.prefReturn}% pref · ${project.waterfall.carry}% carry`} />
          <Card padding="0" style={{ overflow: "hidden" }} className="waterfall-grid">
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
          </Card>
        </div>
      )}

      {/* Waterfall Scenario Calculator */}
      <div style={{ marginTop: 48 }}>
        <LocalSectionHeader title="Run Waterfall Scenario" />
        <Card padding="24px" style={{ marginBottom: 40 }} className="waterfall-grid">
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
            <Button onClick={async () => {
                const amount = parseFloat(waterfallInput);
                if (!amount || isNaN(amount)) { toast("Enter a valid amount", "error"); return; }
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
              }} disabled={waterfallLoading} style={{ padding: "10px 24px", background: red, color: colors.white, border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: sans, opacity: waterfallLoading ? 0.5 : 1, whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(234,32,40,.3)" }}>
              {waterfallLoading ? "Calculating..." : "Calculate"}
            </Button>
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
                      <div style={{ width: `${lpPct}%`, background: green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: colors.white, fontWeight: 500, transition: "width .3s" }}>
                        LP {lpPct.toFixed(1)}%
                      </div>
                      <div style={{ width: `${gpPct}%`, background: red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: colors.white, fontWeight: 500, transition: "width .3s" }}>
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

              {/* Save Scenario */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${line}` }}>
                <input value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="Scenario name..." style={{ flex: 1, padding: "8px 12px", background: `${line}33`, border: `1px solid ${line}`, borderRadius: 6, fontSize: 13, fontFamily: sans, color: t1, outline: "none", boxSizing: "border-box" }} />
                <Button onClick={() => {
                  const name = scenarioName.trim() || `Scenario ${loadScenarios(project.id).length + 1}`;
                  const lpCap = project.capTable.reduce((s, r) => r.type !== "GP Interest" ? s + r.called : s, 0);
                  const lpMOIC = lpCap > 0 ? waterfallResult.lpTotal / lpCap : null;
                  saveScenario(project.id, {
                    name, date: new Date().toISOString(), inputAmount: parseFloat(waterfallInput),
                    lpTotal: waterfallResult.lpTotal, gpTotal: waterfallResult.gpTotal,
                    lpIRR: waterfallResult.lpIRR, lpMOIC,
                    tiers: waterfallResult.tiers,
                  });
                  setSavedRefreshKey(k => k + 1);
                  setScenarioName("");
                  toast("Scenario saved");
                }} variant="outline" style={{ padding: "8px 16px", fontSize: 12, whiteSpace: "nowrap" }}>Save Scenario</Button>
              </div>
            </>
          )}
        </Card>

        {/* Saved Scenarios */}
        <SavedScenarios projectId={project.id} refreshKey={savedRefreshKey} />
      </div>
    </>
  );
}
