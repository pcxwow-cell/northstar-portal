import { colors, fonts } from "../styles/theme.js";

export default function Tabs({ tabs, active, onChange, style = {} }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: `1px solid ${colors.lightBorder}`, marginBottom: 20, overflowX: "auto", ...style }}>
      {tabs.map(tab => (
        <button
          key={tab.id} role="tab" aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          tabIndex={active === tab.id ? 0 : -1}
          onKeyDown={(e) => {
            const idx = tabs.findIndex(t => t.id === tab.id);
            if (e.key === "ArrowRight" && idx < tabs.length - 1) { e.preventDefault(); onChange(tabs[idx + 1].id); }
            if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); onChange(tabs[idx - 1].id); }
          }}
          style={{
            padding: "10px 16px", fontSize: 13, fontWeight: active === tab.id ? 600 : 400,
            color: active === tab.id ? colors.red : colors.mutedText,
            background: "none", border: "none", borderBottom: active === tab.id ? `2px solid ${colors.red}` : "2px solid transparent",
            cursor: "pointer", fontFamily: fonts.sans, whiteSpace: "nowrap",
            transition: "color .15s, border-color .15s",
          }}>
          {tab.label}{tab.count != null && <span style={{ marginLeft: 6, fontSize: 11, color: colors.mutedText }}>({tab.count})</span>}
        </button>
      ))}
    </div>
  );
}
