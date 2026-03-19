import { colors, fonts } from "../styles/theme.js";

export default function EmptyState({ icon, title = "No data", subtitle, action, style = {} }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", ...style }}>
      {icon && <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 500, color: colors.mutedText, marginBottom: subtitle ? 6 : 0 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: colors.lightText, lineHeight: 1.5 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
