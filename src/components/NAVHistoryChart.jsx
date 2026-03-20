import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { fetchPerformanceHistory, fmt } from "../api.js";
import Card from "./Card.jsx";

const serif = fonts.serif;
const green = colors.green;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 2, background: p.color, display: "inline-block" }} />
          <span>{p.name}: ${fmt(Math.round(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

export default function NAVHistoryChart({ projectId }) {
  const { line, t1, t3 } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchPerformanceHistory(projectId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return null;
  if (!data || data.length === 0) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: t1 }}>Value History</h2>
        <span style={{ fontSize: 12, color: t3 }}>12-month NAV trend</span>
      </div>
      <Card padding="20px" style={{ overflow: "hidden" }}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${line}88`} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: t3 }} axisLine={{ stroke: line }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: t3 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke={green} strokeWidth={2} dot={{ r: 3, fill: green }} activeDot={{ r: 5 }} name="NAV" />
            <Line type="monotone" dataKey="benchmark" stroke={`${t3}88`} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Benchmark" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t3 }}>
            <span style={{ width: 16, height: 2, background: green, display: "inline-block" }} /> NAV
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t3 }}>
            <span style={{ width: 16, height: 2, background: `${t3}88`, display: "inline-block", borderTop: "1px dashed" }} /> Benchmark
          </div>
        </div>
      </Card>
    </div>
  );
}
