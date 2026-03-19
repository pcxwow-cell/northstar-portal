import { colors, fonts, shadows, radius } from "../styles/theme.js";
import { useWindowWidth } from "../hooks/useWindowWidth.js";
import EmptyState from "./EmptyState.jsx";

export default function DataTable({ columns, data, sortBy, sortDir, onSort, onRowClick, emptyMessage = "No data", emptyIcon }) {
  const width = useWindowWidth();

  if (width < 768 && data && data.length > 0) {
    return (
      <div style={{ background: colors.white, borderRadius: radius.lg, overflow: "hidden", boxShadow: shadows.card }}>
        {data.map((row, i) => (
          <div key={row.id || i} onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={{ padding: 16, borderBottom: i < data.length - 1 ? `1px solid ${colors.lightBorder}` : "none", cursor: onRowClick ? "pointer" : "default" }}>
            {columns.map(col => (
              <div key={col.key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: colors.mutedText }}>{col.label}</span>
                <span style={{ fontSize: 13 }}>{col.render ? col.render(row) : row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <table style={{ width: "100%", background: colors.white, borderRadius: radius.lg, overflow: "hidden", boxShadow: shadows.card, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
          {columns.map(col => (
            <th key={col.key} onClick={col.sortable !== false && onSort ? () => onSort(col.key) : undefined}
              aria-sort={sortBy === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
              style={{
                flex: col.flex || 1, padding: "12px 16px", fontSize: 11, fontWeight: 600,
                color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em",
                cursor: col.sortable !== false && onSort ? "pointer" : "default",
                textAlign: col.align || "left", userSelect: "none",
              }}>
              {col.label}{sortBy === col.key && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(!data || data.length === 0) ? (
          <tr><td colSpan={columns.length}><EmptyState title={emptyMessage} icon={emptyIcon} /></td></tr>
        ) : data.map((row, i) => (
          <tr key={row.id || i} onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={{
              borderBottom: i < data.length - 1 ? `1px solid ${colors.lightBorder}` : "none",
              cursor: onRowClick ? "pointer" : "default", transition: "background .15s",
            }}
            onMouseEnter={onRowClick ? e => e.currentTarget.style.background = colors.cardBg : undefined}
            onMouseLeave={onRowClick ? e => e.currentTarget.style.background = colors.white : undefined}>
            {columns.map(col => (
              <td key={col.key} style={{
                flex: col.flex || 1, padding: "14px 16px", fontSize: 13,
                fontWeight: col.bold ? 500 : 400, color: col.muted ? colors.mutedText : colors.darkText,
                textAlign: col.align || "left", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
