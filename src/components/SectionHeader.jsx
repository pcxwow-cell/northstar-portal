import { fonts, colors } from "../styles/theme.js";

export default function SectionHeader({ title, subtitle, right, size = "md", style = {} }) {
  const fontSize = size === "lg" ? 28 : size === "sm" ? 16 : 20;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: subtitle ? 8 : 20, ...style }}>
      <div>
        <h2 style={{ fontSize, fontWeight: size === "lg" ? 300 : 500, margin: 0, fontFamily: fonts.sans }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: colors.mutedText, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
