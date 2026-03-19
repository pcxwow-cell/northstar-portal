import { createContext, useContext } from "react";
import { colors } from "../styles/theme.js";

export const themes = {
  dark: { bg: "#0A0A0F", surface: "#0C0C0C", line: "#1A1A1A", t1: "#E8E4DE", t2: "#8C887F", t3: "#4A4843", hover: "#0F0F0F", headerBg: "#0A0A0FF0", avatarGrad: "linear-gradient(135deg, #EA2028, #c41920)" },
  light: { bg: "#F8F7F4", surface: colors.white, line: "#ECEAE5", t1: "#1A1816", t2: "#5C5850", t3: colors.mutedText, hover: colors.lightBorder, headerBg: "#FFFFFFFA", avatarGrad: "linear-gradient(135deg, #EA2028, #c41920)" },
};

export const ThemeContext = createContext(themes.light);
export const useTheme = () => useContext(ThemeContext);
