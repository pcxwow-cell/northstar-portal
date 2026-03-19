import { shadows, radius } from "../styles/theme.js";

export default function Card({ children, accent, padding = "20px 24px", style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: radius.lg, padding,
      boxShadow: shadows.card,
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}
