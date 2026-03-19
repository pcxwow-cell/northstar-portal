import { colors } from "../styles/theme.js";
import { useTheme } from "../App.jsx";

const red = colors.red;
const green = colors.green;

export default function PasswordStrengthBar({ password }) {
  const { t2, t3 } = useTheme();
  if (!password) return null;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  let criteria = 0;
  if (hasUpper) criteria++;
  if (hasLower) criteria++;
  if (hasNumber) criteria++;

  let strength = "weak", color = red, width = "33%";
  if (password.length >= 8 && criteria >= 3 && hasSpecial) { strength = "strong"; color = green; width = "100%"; }
  else if (password.length >= 8 && criteria >= 2) { strength = "medium"; color = "#D4A017"; width = "66%"; }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 6, background: `${t3}40`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width, background: color, borderRadius: 20, transition: "width .3s, background .3s" }} />
      </div>
      <div style={{ fontSize: 11, color, marginTop: 4, textTransform: "capitalize" }}>{strength}</div>
    </div>
  );
}
