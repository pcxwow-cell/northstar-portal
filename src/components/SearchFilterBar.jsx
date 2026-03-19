import { inputStyle, colors } from "../styles/theme.js";

export default function SearchFilterBar({ search, onSearchChange, filters = [], placeholder = "Search...", style = {} }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", ...style }}>
      <input value={search} onChange={e => onSearchChange(e.target.value)} placeholder={placeholder}
        aria-label={placeholder || "Search"}
        style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
      {filters.map((f, i) => (
        <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
          aria-label={f.label || "Filter"}
          style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
          {f.options.map(o => (
            <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
