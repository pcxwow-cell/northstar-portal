import { colors, fonts } from "../styles/theme.js";
import EmptyState from "./EmptyState.jsx";

export default function DataTable({ columns, data, sortBy, sortDir, onSort, onRowClick, emptyMessage = "No data", emptyIcon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
      {/* Header */}
      <div style={{ display: "flex", padding: "0 0 0", borderBottom: `1px solid ${colors.border}` }}>
        {columns.map(col => (
          <div key={col.key} onClick={col.sortable !== false && onSort ? () => onSort(col.key) : undefined} style={{
            flex: col.flex || 1, padding: "12px 16px", fontSize: 11, fontWeight: 600,
            color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em",
            cursor: col.sortable !== false && onSort ? "pointer" : "default",
            textAlign: col.align || "left", userSelect: "none",
          }}
            aria-sort={sortBy === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
            {col.label}{sortBy === col.key && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
          </div>
        ))}
      </div>
      {/* Rows */}
      {(!data || data.length === 0) ? (
        <EmptyState title={emptyMessage} icon={emptyIcon} />
      ) : data.map((row, i) => (
        <div key={row.id || i} onClick={onRowClick ? () => onRowClick(row) : undefined} style={{
          display: "flex", padding: 0, borderBottom: i < data.length - 1 ? `1px solid ${colors.lightBorder}` : "none",
          cursor: onRowClick ? "pointer" : "default", transition: "background .15s",
        }}
          onMouseEnter={onRowClick ? e => e.currentTarget.style.background = colors.cardBg : undefined}
          onMouseLeave={onRowClick ? e => e.currentTarget.style.background = "#fff" : undefined}>
          {columns.map(col => (
            <div key={col.key} style={{
              flex: col.flex || 1, padding: "14px 16px", fontSize: 13,
              fontWeight: col.bold ? 500 : 400, color: col.muted ? colors.mutedText : colors.darkText,
              textAlign: col.align || "left", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {col.render ? col.render(row) : row[col.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
