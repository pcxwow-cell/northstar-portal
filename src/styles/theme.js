// Design tokens — single source of truth for all visual constants
export const colors = {
  red: "#EA2028",
  green: "#3D7A54",
  darkText: "#231F20",
  mutedText: "#767168",
  lightText: "#999",
  lightBorder: "#F0EDE8",
  border: "#E8E5DE",
  cardBg: "#FAFAF8",
  surface: "#FAF9F7",
  white: "#fff",
  errorBg: "#FEE",
  successBg: "#EFE",
  warningBg: "#FFF8E1",
  warningText: "#B8860B",
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
  width: "100%", padding: "10px 14px", border: `1px solid #DDD`,
  borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', -apple-system, sans-serif",
  boxSizing: "border-box",
};

export const btnStyle = {
  padding: "8px 16px", background: "#EA2028", color: "#fff", border: "none",
  borderRadius: 8, fontSize: 13, cursor: "pointer",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
  boxShadow: "0 1px 3px rgba(234,32,40,.3)",
};

export const btnOutline = {
  ...btnStyle, background: "#fff", color: "#231F20",
  border: "1px solid #DDD", boxShadow: "none",
};

export const labelStyle = { fontSize: 11, color: "#888", display: "block", marginBottom: 4 };
