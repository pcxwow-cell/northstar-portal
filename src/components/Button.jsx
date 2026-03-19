import { btnStyle, btnOutline, colors, fonts } from "../styles/theme.js";

export default function Button({ children, variant = "primary", size = "md", onClick, disabled, type = "button", style = {}, ...rest }) {
  const base = variant === "outline" ? btnOutline : variant === "danger" ? { ...btnStyle, background: colors.danger } : variant === "ghost" ? { ...btnOutline, border: "none" } : btnStyle;
  const sizeStyle = size === "sm" ? { padding: "4px 12px", fontSize: 11 } : {};
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...sizeStyle, opacity: disabled ? 0.6 : 1, ...style }} {...rest}>
      {children}
    </button>
  );
}
