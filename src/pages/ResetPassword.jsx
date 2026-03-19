import { useState, useMemo } from "react";
import { resetPassword } from "../api.js";
import { colors, fonts } from "../styles/theme.js";
import Button from "../components/Button.jsx";
import { NorthstarIcon } from "../components/NorthstarIcon.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const darkText = colors.darkText;
const green = colors.green;

export default function ResetPasswordPage({ onBack }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Extract token from hash params e.g. #/reset-password?token=abc123
  const token = useMemo(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!token) { setError("Invalid or missing reset token."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => { window.location.hash = "#/login"; }, 2500);
    } catch (err) {
      setError(err.message || "Reset failed. The link may have expired.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F7F4", fontFamily: sans }}>
      <div style={{ background: colors.white, borderRadius: 12, padding: 40, maxWidth: 400, width: "90%", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <NorthstarIcon size={32} color={red} />
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 400, color: darkText, marginTop: 12 }}>Reset Password</h2>
        </div>
        {success ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, color: green, marginBottom: 12 }}>Password reset successfully.</p>
            <p style={{ fontSize: 13, color: "#888" }}>Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={{ fontSize: 12, color: red, marginBottom: 12, padding: "8px 12px", background: "#FFF5F5", borderRadius: 4 }}>{error}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Enter new password"
                style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 4, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm new password"
                style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 4, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box" }} />
            </div>
            <Button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: loading ? `${red}AA` : red, color: colors.white, border: "none", borderRadius: 4, fontSize: 14, cursor: loading ? "default" : "pointer", fontFamily: sans, fontWeight: 500 }}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <span onClick={() => { window.location.hash = "#/login"; }} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Back to Login</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
