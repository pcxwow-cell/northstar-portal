// Design tokens — single source of truth for all visual constants
export const colors = {
  red: "#EA2028",
  green: "#3D7A54",
  darkText: "#231F20",
  mutedText: "#767168",
  lightText: "#999",
  lightBorder: "#F0EDE8",
  border: "#E8E5DE",
  inputBorder: "#DDD",
  cardBg: "#FAFAF8",
  surface: "#FAF9F7",
  white: "#fff",
  danger: "#dc3545",
  errorBg: "#FEE",
  successBg: "#EFE",
  warningBg: "#FFF8E1",
  warningText: "#B8860B",
  sentBg: "#E8F4FE",
  sentText: "#2196F3",
  draftBg: "#F5F5F5",
  draftText: "#666",
};

export const fonts = {
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
};

export const shadows = {
  card: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
  elevated: "0 4px 20px rgba(0,0,0,.08)",
  modal: "0 8px 32px rgba(0,0,0,.15)",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, section: 48 };

export const radius = { sm: 4, md: 8, lg: 12, xl: 16 };

export const inputStyle = {
  width: "100%", padding: "10px 14px", border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.md, fontSize: 13, fontFamily: fonts.sans, boxSizing: "border-box",
};

export const btnStyle = {
  padding: "8px 16px", background: colors.red, color: colors.white, border: "none",
  borderRadius: radius.md, fontSize: 13, cursor: "pointer", fontFamily: fonts.sans,
  boxShadow: "0 1px 3px rgba(234,32,40,.3)",
};

export const btnOutline = {
  ...btnStyle, background: colors.white, color: colors.darkText,
  border: `1px solid ${colors.inputBorder}`, boxShadow: "none",
};

export const labelStyle = { fontSize: 11, color: colors.lightText, display: "block", marginBottom: 4 };
