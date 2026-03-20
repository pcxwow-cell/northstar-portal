import { useState } from "react";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { fmt } from "../api.js";
import Card from "./Card.jsx";
import Button from "./Button.jsx";

const serif = fonts.serif;
const red = colors.red;
const green = colors.green;

function getStorageKey(projectId) {
  return `northstar_scenarios_${projectId}`;
}

export function loadScenarios(projectId) {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveScenario(projectId, scenario) {
  const list = loadScenarios(projectId);
  list.unshift(scenario);
  localStorage.setItem(getStorageKey(projectId), JSON.stringify(list.slice(0, 20)));
}

export function deleteScenario(projectId, idx) {
  const list = loadScenarios(projectId);
  list.splice(idx, 1);
  localStorage.setItem(getStorageKey(projectId), JSON.stringify(list));
}

function ScenarioCard({ scenario, idx, onDelete, onCompare, compareMode }) {
  const [open, setOpen] = useState(false);
  const { line, t1, t2, t3 } = useTheme();
  const total = scenario.lpTotal + scenario.gpTotal;
  const lpPct = total > 0 ? ((scenario.lpTotal / total) * 100).toFixed(1) : 0;

  return (
    <div style={{ border: `1px solid ${line}`, borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", background: open ? `${line}33` : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500, fontFamily: serif, color: t1 }}>{scenario.name}</span>
          <span style={{ fontSize: 11, color: t3 }}>{new Date(scenario.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: t2 }}>${fmt(Math.round(scenario.inputAmount))}</span>
          <span style={{ fontSize: 11, color: green }}>LP {lpPct}%</span>
          {scenario.lpIRR != null && <span style={{ fontSize: 11, color: green }}>IRR {(scenario.lpIRR * 100).toFixed(1)}%</span>}
          <span style={{ fontSize: 11, color: t3 }}>{open ? "\u25B2" : "\u25BC"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12, paddingTop: 8 }}>
            <div><div style={{ fontSize: 10, color: t3, textTransform: "uppercase" }}>LP Total</div><div style={{ fontSize: 14, fontWeight: 500, color: green }}>${fmt(Math.round(scenario.lpTotal))}</div></div>
            <div><div style={{ fontSize: 10, color: t3, textTransform: "uppercase" }}>GP Total</div><div style={{ fontSize: 14, fontWeight: 500, color: red }}>${fmt(Math.round(scenario.gpTotal))}</div></div>
            <div><div style={{ fontSize: 10, color: t3, textTransform: "uppercase" }}>LP IRR</div><div style={{ fontSize: 14, fontWeight: 500 }}>{scenario.lpIRR != null ? `${(scenario.lpIRR * 100).toFixed(1)}%` : "--"}</div></div>
            <div><div style={{ fontSize: 10, color: t3, textTransform: "uppercase" }}>LP MOIC</div><div style={{ fontSize: 14, fontWeight: 500 }}>{scenario.lpMOIC != null ? `${scenario.lpMOIC.toFixed(2)}x` : "--"}</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); onCompare(idx); }} style={{ padding: "4px 10px", fontSize: 11 }}>{compareMode ? "Unselect" : "Compare"}</Button>
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); onDelete(idx); }} style={{ padding: "4px 10px", fontSize: 11, color: red, borderColor: red }}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareView({ scenarios, onClose }) {
  const { line, t1, t2, t3 } = useTheme();
  if (scenarios.length < 2) return null;
  const [a, b] = scenarios;

  const rows = [
    { label: "Input Amount", a: `$${fmt(Math.round(a.inputAmount))}`, b: `$${fmt(Math.round(b.inputAmount))}` },
    { label: "LP Total", a: `$${fmt(Math.round(a.lpTotal))}`, b: `$${fmt(Math.round(b.lpTotal))}`, diff: a.lpTotal - b.lpTotal },
    { label: "GP Total", a: `$${fmt(Math.round(a.gpTotal))}`, b: `$${fmt(Math.round(b.gpTotal))}`, diff: a.gpTotal - b.gpTotal },
    { label: "LP IRR", a: a.lpIRR != null ? `${(a.lpIRR * 100).toFixed(1)}%` : "--", b: b.lpIRR != null ? `${(b.lpIRR * 100).toFixed(1)}%` : "--" },
    { label: "LP MOIC", a: a.lpMOIC != null ? `${a.lpMOIC.toFixed(2)}x` : "--", b: b.lpMOIC != null ? `${b.lpMOIC.toFixed(2)}x` : "--" },
  ];

  return (
    <Card padding="20px" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: t1, margin: 0 }}>Scenario Comparison</h3>
        <Button variant="outline" onClick={onClose} style={{ padding: "4px 10px", fontSize: 11 }}>Close</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 100px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, padding: "8px 0", borderBottom: `1px solid ${line}` }}>
        <span>Metric</span><span>{a.name}</span><span>{b.name}</span><span style={{ textAlign: "right" }}>Difference</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 100px", padding: "10px 0", borderBottom: i < rows.length - 1 ? `1px solid ${line}` : "none", fontSize: 13 }}>
          <span style={{ color: t3, fontWeight: 500 }}>{r.label}</span>
          <span style={{ color: t1 }}>{r.a}</span>
          <span style={{ color: t1 }}>{r.b}</span>
          <span style={{ textAlign: "right", color: r.diff != null ? (r.diff > 0 ? green : r.diff < 0 ? red : t3) : t3 }}>
            {r.diff != null ? `${r.diff > 0 ? "+" : ""}$${fmt(Math.round(Math.abs(r.diff)))}` : "--"}
          </span>
        </div>
      ))}
    </Card>
  );
}

export default function SavedScenarios({ projectId, refreshKey }) {
  const { t1, t3 } = useTheme();
  const [scenarios, setScenarios] = useState(() => loadScenarios(projectId));
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  // Refresh when refreshKey changes (new scenario saved)
  useState(() => { setScenarios(loadScenarios(projectId)); }, [refreshKey, projectId]);

  function handleDelete(idx) {
    deleteScenario(projectId, idx);
    setScenarios(loadScenarios(projectId));
    setCompareIds(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
  }

  function handleCompare(idx) {
    setCompareIds(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx);
      if (prev.length >= 2) return [prev[1], idx];
      return [...prev, idx];
    });
  }

  if (scenarios.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: 400, color: t1, margin: 0 }}>Saved Scenarios ({scenarios.length})</h3>
        {compareIds.length === 2 && (
          <Button onClick={() => setShowCompare(true)} style={{ padding: "6px 14px", fontSize: 12 }}>Compare Selected</Button>
        )}
      </div>
      {compareIds.length > 0 && compareIds.length < 2 && (
        <p style={{ fontSize: 11, color: t3, marginBottom: 8 }}>Select one more scenario to compare</p>
      )}
      {scenarios.map((s, i) => (
        <ScenarioCard key={s.date + i} scenario={s} idx={i} onDelete={handleDelete} onCompare={handleCompare} compareMode={compareIds.includes(i)} />
      ))}
      {showCompare && compareIds.length === 2 && (
        <CompareView scenarios={[scenarios[compareIds[0]], scenarios[compareIds[1]]]} onClose={() => { setShowCompare(false); setCompareIds([]); }} />
      )}
    </div>
  );
}
