import { useState } from "react";
import { runFinancialModel, fmt } from "../api.js";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const green = colors.green;

function SectionHeaderLocal({ title, right }) {
  const { t1, t3 } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: t1 }}>{title}</h2>
      {right && <span style={{ fontSize: 12, color: t3 }}>{right}</span>}
    </div>
  );
}

export default function FinancialModelerPage({ myProjects, investor }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const project = myProjects[selectedIdx];

  const [exitValue, setExitValue] = useState("");

  if (!myProjects.length) return (
    <div style={{ padding: 40, textAlign: "center", color: t3 }}>
      <SectionHeader title="Financial Modeler" size="lg" />
      <p style={{ fontSize: 14, marginTop: 16 }}>No projects assigned to your account.</p>
    </div>
  );
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
      <SectionHeader title="Financial Modeler" subtitle="Scenario modeling with waterfall distribution analysis" size="lg" style={{ marginBottom: 40 }} />

      {/* Project selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: `${line}55`, borderRadius: 8, padding: 2, width: "fit-content" }}>
        {myProjects.map((p, i) => (
          <span key={p.id} onClick={() => { if (!loading) { setSelectedIdx(i); setResult(null); } }} style={{
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
      <Card padding="24px" style={{ background: surface, marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: t3, marginBottom: 16 }}>
          Total Investment: ${fmt(project.totalRaise || 0)} | Pref: {project.waterfall?.prefReturn || 8}% | Carry: {project.waterfall?.carry || 20}%
        </div>
        <div className="modeler-inputs" style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Exit Value ($)</div>
            <input type="number" value={exitValue} onChange={e => setExitValue(e.target.value)} placeholder={`e.g. ${fmt((project.totalRaise || 0) * 2)}`} style={inputSt} />
          </div>
          <div style={{ minWidth: 120 }}>
            <div style={{ fontSize: 11, color: t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Hold Period (yrs)</div>
            <input type="number" min="1" max="30" value={holdYears} onChange={e => setHoldYears(e.target.value)} style={inputSt} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Annual Cash Flow ($)</div>
            <input type="number" value={annualCF} onChange={e => setAnnualCF(e.target.value)} placeholder="0" style={inputSt} />
          </div>
          <Button onClick={handleRun} disabled={loading} style={{
            padding: "10px 24px", background: loading ? `${red}88` : red, color: colors.white,
            border: "none", borderRadius: 8, fontSize: 13, cursor: loading ? "default" : "pointer", fontFamily: sans, whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
          }}>{loading ? "Running..." : "Run Scenario"}</Button>
        </div>
      </Card>

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
              <Card key={i} accent={c.accent} padding="24px">
                <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{c.value}</div>
              </Card>
            ))}
          </div>

          {/* Waterfall breakdown */}
          <SectionHeaderLocal title="Waterfall Breakdown" />
          <Card padding="0" style={{ overflow: "hidden", marginBottom: 40, background: surface }}>
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
          </Card>

          {/* Year-by-year */}
          <SectionHeaderLocal title="Year-by-Year Cash Flow" />
          <div className="modeler-grid" style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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
              <SectionHeaderLocal title="Sensitivity Analysis" right="IRR at different exit values" />
              <div className="modeler-grid" style={{ borderRadius: 12, overflow: "hidden", marginBottom: 40, background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
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
