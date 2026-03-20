import { colors, inputStyle } from "../styles/theme.js";
import EmptyState from "../components/EmptyState.jsx";

const statusColors = { sent: colors.green, failed: colors.red, skipped: "#B08C00" };

export default function EmailDeliveryLog({ stats, emailLog, logFilter, setLogFilter, cardStyle, sectionTitle }) {
  return (
    <div style={cardStyle}>
      <div style={sectionTitle}>Delivery Log</div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Sent", value: stats.sent, color: colors.green },
          { label: "Failed", value: stats.failed, color: colors.red },
          { label: "Skipped", value: stats.skipped, color: "#B08C00" },
        ].map(s => (
          <div key={s.label} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            <span style={{ color: colors.mutedText }}>{s.label}:</span>
            <span style={{ fontWeight: 600 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={logFilter.type}
          onChange={(e) => setLogFilter(p => ({ ...p, type: e.target.value }))}
          style={{ ...inputStyle, width: "auto", minWidth: 160 }}
        >
          <option value="">All Types</option>
          {["document", "signature", "distribution", "message", "capital_call", "welcome", "password_reset"].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select
          value={logFilter.status}
          onChange={(e) => setLogFilter(p => ({ ...p, status: e.target.value }))}
          style={{ ...inputStyle, width: "auto", minWidth: 140 }}
        >
          <option value="">All Statuses</option>
          {["sent", "failed", "skipped"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Log table */}
      {emailLog.length === 0 ? (
        <EmptyState title="No delivery logs" subtitle="Emails will appear here once sent." />
      ) : (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #E8E5DE" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
                {["Date", "Recipient", "Type", "Subject", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emailLog.map((entry, i) => (
                <tr key={entry.id || i} style={{ borderBottom: i < emailLog.length - 1 ? "1px solid #E8E5DE" : "none" }}>
                  <td style={{ padding: "10px 14px", color: colors.mutedText, whiteSpace: "nowrap" }}>
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "\u2014"}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{entry.recipient || "\u2014"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 3,
                      background: "#F5F4F0", color: "#666",
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>{(entry.type || "").replace(/_/g, " ")}</span>
                  </td>
                  <td style={{ padding: "10px 14px", color: colors.mutedText, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.subject || "\u2014"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 3,
                      background: `${statusColors[entry.status] || "#999"}15`,
                      color: statusColors[entry.status] || "#999",
                      textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600,
                    }}>{entry.status || "\u2014"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
