import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../App.jsx";
import { fmt } from "../api.js";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import DataTable from "../components/DataTable.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const serif = fonts.serif;
const red = colors.red;
const green = colors.green;

const formatType = (t) => t ? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

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

export default function DistributionsPage({ allDistributions, myProjects }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const total = allDistributions.reduce((a, d) => a + d.amount, 0);
  return (
    <>
      <SectionHeader title="Distributions" subtitle={`$${fmt(total)} total distributed · ${allDistributions.length} payments`} size="lg" style={{ marginBottom: 40 }} />

      <div className="inline-stats-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Total Distributed", value: `$${fmt(total)}`, accent: red },
          { label: "Projects", value: [...new Set(allDistributions.map(d => d.project))].join(", ") || "—", accent: green },
          { label: "Next Estimated", value: "See distributions", accent: "#5B8DEF" },
        ].map((m, i) => (
          <Card key={i} accent={m.accent} padding="24px">
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: t3, marginBottom: 10, fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontFamily: serif, fontWeight: 400 }}>{m.value}</div>
          </Card>
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
        <EmptyState icon="$" title="No distributions have been recorded yet" subtitle="Distributions are typically paid quarterly and will appear here after processing." />
      ) : (
        <DataTable
          columns={[
            { key: "project", label: "Project", render: r => <span style={{ fontFamily: serif, fontWeight: 500 }}>{r.project}</span> },
            { key: "quarter", label: "Period" },
            { key: "date", label: "Payment Date", render: r => <span style={{ color: t2 }}>{r.date}</span> },
            { key: "amount", label: "Amount", render: r => `$${fmt(r.amount)}` },
            { key: "type", label: "Type", render: r => <span style={{ color: t3 }}>{formatType(r.type)}</span> },
            { key: "status", label: "Status", align: "right", sortable: false, render: (d) => <span style={{ fontSize: 11, color: green }}>{d.type ? formatType(d.type) : "Paid"}</span> },
          ]}
          data={allDistributions}
          emptyMessage="No distributions yet"
        />
      )}
    </>
  );
}
