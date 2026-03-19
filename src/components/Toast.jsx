import { colors, fonts, shadows } from "../styles/theme.js";

const TYPE_COLORS = {
  success: colors.green,
  error: colors.danger,
  warning: colors.warningText,
  info: colors.sentText,
};

export default function Toast({ message, type = "success", onDismiss }) {
  return (
    <div role="alert" aria-live="polite" onClick={onDismiss} style={{
      padding: "12px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      background: TYPE_COLORS[type] || TYPE_COLORS.success,
      color: colors.white, boxShadow: shadows.elevated, cursor: onDismiss ? "pointer" : "default",
      fontFamily: fonts.sans, animation: "fadeIn .2s ease",
    }}>
      {message}
    </div>
  );
}
