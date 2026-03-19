import { colors } from "../styles/theme.js";

export default function Spinner({ size = 32, color, style = {} }) {
  const c = color || colors.red;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 24, ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
        <circle cx="12" cy="12" r="10" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" opacity="0.3" />
        <circle cx="12" cy="12" r="10" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="25" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
