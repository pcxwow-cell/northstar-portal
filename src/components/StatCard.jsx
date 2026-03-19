import { shadows, radius, colors, fonts } from "../styles/theme.js";

export default function StatCard({ label, value, sub, accent, onClick, style = {} }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: radius.lg, padding: "20px 24px",
      boxShadow: shadows.card, borderLeft: accent ? `3px solid ${accent}` : undefined,
      cursor: onClick ? "pointer" : "default", transition: "transform .15s, box-shadow .15s",
      ...style,
    }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadows.elevated; } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows.card; } : undefined}>
      <div style={{ fontSize: 28, fontWeight: 300, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: colors.mutedText, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
