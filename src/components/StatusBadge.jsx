import { colors } from "../styles/theme.js";

const STATUS_COLORS = {
  ACTIVE: { bg: colors.successBg, color: colors.green },
  active: { bg: colors.successBg, color: colors.green },
  PENDING: { bg: colors.warningBg, color: colors.warningText },
  pending: { bg: colors.warningBg, color: colors.warningText },
  INACTIVE: { bg: colors.errorBg, color: colors.red },
  inactive: { bg: colors.errorBg, color: colors.red },
  LOCKED: { bg: colors.errorBg, color: colors.red },
  DRAFT: { bg: "#F5F5F5", color: "#666" },
  APPROVED: { bg: colors.successBg, color: colors.green },
  SENT: { bg: "#E8F4FE", color: "#2196F3" },
  REJECTED: { bg: colors.errorBg, color: colors.red },
  signed: { bg: colors.successBg, color: colors.green },
  declined: { bg: colors.errorBg, color: colors.red },
  published: { bg: colors.successBg, color: colors.green },
  new: { bg: `${colors.red}15`, color: colors.red },
};

export default function StatusBadge({ status, size = "md", style = {} }) {
  const { bg, color } = STATUS_COLORS[status] || { bg: "#F5F5F5", color: "#666" };
  const fontSize = size === "sm" ? 10 : 12;
  const padding = size === "sm" ? "2px 8px" : "3px 10px";
  return (
    <span role="status" aria-label={status} style={{ fontSize, padding, borderRadius: 4, fontWeight: 500, background: bg, color, display: "inline-block", ...style }}>
      {status}
    </span>
  );
}
