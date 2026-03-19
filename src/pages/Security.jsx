import { useState, useEffect } from "react";
import { colors, fonts, inputStyle as themeInputStyle } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { changePassword, fetchLoginHistory, setupMFA, verifyMFASetup, disableMFA, getMFAStatus, regenerateBackupCodes } from "../api.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import FormInput from "../components/FormInput.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import PasswordStrengthBar from "../components/PasswordStrengthBar.jsx";

const sans = fonts.sans;
const red = colors.red;
const green = colors.green;

export default function SecurityPage({ toast }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(10);
  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaSetupStep, setMfaSetupStep] = useState(0); // 0=none, 1=qr, 2=verify, 3=backup
  const [mfaQR, setMfaQR] = useState(null);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [mfaError, setMfaError] = useState("");
  const [mfaDisablePw, setMfaDisablePw] = useState("");
  const [showMfaDisable, setShowMfaDisable] = useState(false);

  useEffect(() => {
    fetchLoginHistory().then(setLoginHistory).catch(() => {});
    getMFAStatus().then(s => { setMfaEnabled(s.mfaEnabled); setMfaLoading(false); }).catch(() => setMfaLoading(false));
  }, []);

  async function handleMfaSetup() {
    setMfaError("");
    setMfaLoading(true);
    try {
      const data = await setupMFA();
      setMfaQR(data.qrCodeDataUrl);
      setMfaSecret(data.secret);
      setMfaSetupStep(1);
    } catch (err) { setMfaError(err.message); }
    setMfaLoading(false);
  }

  async function handleMfaVerify() {
    setMfaError("");
    setMfaLoading(true);
    try {
      const data = await verifyMFASetup(mfaVerifyCode);
      setMfaBackupCodes(data.backupCodes);
      setMfaEnabled(true);
      setMfaSetupStep(3);
      toast("Two-factor authentication enabled", "success");
    } catch (err) { setMfaError(err.message); }
    setMfaLoading(false);
  }

  async function handleMfaDisable() {
    setMfaError("");
    setMfaLoading(true);
    try {
      await disableMFA(mfaDisablePw);
      setMfaEnabled(false);
      setShowMfaDisable(false);
      setMfaDisablePw("");
      toast("Two-factor authentication disabled", "success");
    } catch (err) { setMfaError(err.message); }
    setMfaLoading(false);
  }

  async function handleRegenerateBackup() {
    setMfaError("");
    try {
      const data = await regenerateBackupCodes();
      setMfaBackupCodes(data.backupCodes);
      setMfaSetupStep(3);
    } catch (err) { setMfaError(err.message); }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(newPw)) { setPwError("Password must contain at least 1 uppercase letter"); return; }
    if (!/[a-z]/.test(newPw)) { setPwError("Password must contain at least 1 lowercase letter"); return; }
    if (!/[0-9]/.test(newPw)) { setPwError("Password must contain at least 1 number"); return; }
    if (!/[!@#$%^&*]/.test(newPw)) { setPwError("Password must contain at least 1 special character (!@#$%^&*)"); return; }
    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      toast("Password changed successfully", "success");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) { setPwError(err.message || "Failed to change password"); }
    setSaving(false);
  }

  const lastLogin = loginHistory.find(h => h.success);

  return (
    <>
      <SectionHeader title="Security" subtitle="Manage passwords, 2FA, and login history" size="lg" style={{ marginBottom: 40 }} />

      <div style={{ maxWidth: 600 }}>
        <Card padding="28px 24px" style={{ background: surface, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>Change Password</div>
          <form onSubmit={handleChangePassword}>
            {pwError && <div style={{ fontSize: 12, color: red, padding: "8px 12px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 12, background: `${red}08` }}>{pwError}</div>}
            <FormInput label="Current Password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <FormInput label="New Password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required />
              <PasswordStrengthBar password={newPw} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <FormInput label="Confirm New Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              {confirmPw && newPw !== confirmPw && <div style={{ fontSize: 11, color: red, marginTop: 4 }}>Passwords do not match</div>}
            </div>
            <Button type="submit" disabled={saving} style={{
              padding: "8px 20px", background: saving ? `${red}88` : red, color: colors.white,
              border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: saving ? "default" : "pointer",
            }}>{saving ? "Changing..." : "Change Password"}</Button>
          </form>
        </Card>

        {/* Two-Factor Authentication */}
        <Card padding="28px 24px" style={{ background: surface, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>Two-Factor Authentication</div>
          {mfaError && <div style={{ fontSize: 12, color: red, padding: "8px 12px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 12, background: `${red}08` }}>{mfaError}</div>}

          {mfaEnabled && mfaSetupStep === 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                <span style={{ fontSize: 14, color: t1, fontWeight: 500 }}>Two-factor authentication is enabled</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="outline" onClick={() => setShowMfaDisable(true)} style={{ padding: "7px 16px", background: colors.white, border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Disable</Button>
                <Button variant="outline" onClick={handleRegenerateBackup} style={{ padding: "7px 16px", background: colors.white, border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Regenerate Backup Codes</Button>
              </div>
              {showMfaDisable && (
                <div style={{ marginTop: 12, padding: 16, border: `1px solid ${line}`, borderRadius: 8, background: bg }}>
                  <div style={{ fontSize: 12, color: t2, marginBottom: 8 }}>Enter your password to disable 2FA:</div>
                  <input type="password" value={mfaDisablePw} onChange={e => setMfaDisablePw(e.target.value)} style={themeInputStyle} placeholder="Password" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <Button variant="outline" onClick={() => { setShowMfaDisable(false); setMfaDisablePw(""); setMfaError(""); }} style={{ padding: "7px 16px", background: colors.white, border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Cancel</Button>
                    <Button onClick={handleMfaDisable} disabled={!mfaDisablePw} style={{ padding: "7px 16px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, opacity: mfaDisablePw ? 1 : 0.5 }}>Confirm Disable</Button>
                  </div>
                </div>
              )}
            </>
          )}

          {!mfaEnabled && mfaSetupStep === 0 && (
            <>
              <p style={{ fontSize: 13, color: t2, marginBottom: 12, lineHeight: 1.5 }}>Add an extra layer of security to your account by requiring a verification code from an authenticator app (Google Authenticator, Authy, etc.) when signing in.</p>
              <Button onClick={handleMfaSetup} disabled={mfaLoading} style={{ padding: "8px 20px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: "pointer" }}>
                Enable Two-Factor Authentication
              </Button>
            </>
          )}

          {mfaSetupStep === 1 && (
            <>
              <p style={{ fontSize: 13, color: t2, marginBottom: 12 }}>Scan this QR code with your authenticator app:</p>
              {mfaQR && <div style={{ textAlign: "center", marginBottom: 16 }}><img src={mfaQR} alt="MFA QR Code" style={{ width: 200, height: 200, borderRadius: 8, border: `1px solid ${line}` }} /></div>}
              <div style={{ fontSize: 11, color: t3, marginBottom: 4 }}>Or enter this secret key manually:</div>
              <div style={{ fontSize: 14, fontFamily: "monospace", padding: "10px 14px", background: bg, borderRadius: 6, border: `1px solid ${line}`, marginBottom: 16, wordBreak: "break-all", letterSpacing: ".05em", userSelect: "all" }}>{mfaSecret}</div>
              <Button onClick={() => setMfaSetupStep(2)} style={{ padding: "8px 20px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: "pointer" }}>Next</Button>
            </>
          )}

          {mfaSetupStep === 2 && (
            <>
              <p style={{ fontSize: 13, color: t2, marginBottom: 12 }}>Enter the 6-digit code from your authenticator app to verify setup:</p>
              <input type="text" inputMode="numeric" maxLength={6} value={mfaVerifyCode} onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000" style={{ ...themeInputStyle, fontSize: 20, fontFamily: "monospace", textAlign: "center", letterSpacing: ".3em", maxWidth: 180 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button variant="outline" onClick={() => { setMfaSetupStep(0); setMfaVerifyCode(""); setMfaError(""); }} style={{ padding: "7px 16px", background: colors.white, border: `1px solid ${line}`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: t2 }}>Cancel</Button>
                <Button onClick={handleMfaVerify} disabled={mfaVerifyCode.length !== 6 || mfaLoading} style={{ padding: "7px 16px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, opacity: mfaVerifyCode.length === 6 ? 1 : 0.5 }}>Verify & Enable</Button>
              </div>
            </>
          )}

          {mfaSetupStep === 3 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1"/></svg>
                <span style={{ fontSize: 13, color: t1, fontWeight: 600 }}>Save these backup codes</span>
              </div>
              <p style={{ fontSize: 12, color: t2, marginBottom: 12 }}>Each code can only be used once. Store them somewhere safe {"\u2014"} you will not be able to see them again.</p>
              <div className="inline-stats-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 16, background: bg, borderRadius: 8, border: `1px solid ${line}`, marginBottom: 16 }}>
                {mfaBackupCodes.map((code, i) => (
                  <div key={i} style={{ fontFamily: "monospace", fontSize: 14, padding: "4px 0", letterSpacing: ".08em" }}>{code}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(mfaBackupCodes.join('\n')).then(() => toast("Backup codes copied to clipboard", "success")).catch(() => toast("Failed to copy codes", "error")); }} style={{ padding: "8px 20px", background: colors.white, border: `1px solid ${line}`, borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: "pointer", color: t2 }}>Copy All Codes</Button>
                <Button onClick={() => { setMfaSetupStep(0); setMfaVerifyCode(""); setMfaBackupCodes([]); }} style={{ padding: "8px 20px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: "pointer" }}>Done</Button>
              </div>
            </>
          )}
        </Card>

        {/* Login History */}
        <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Login History</div>
            <span onClick={() => setShowHistory(!showHistory)} style={{ fontSize: 11, color: t3, cursor: "pointer", padding: "3px 10px", border: `1px solid ${line}`, borderRadius: 3 }}>
              {showHistory ? "Hide" : "Show"}
            </span>
          </div>
          {lastLogin && (
            <div style={{ fontSize: 13, color: t2, marginBottom: showHistory ? 16 : 0 }}>
              Last login: {new Date(lastLogin.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at {new Date(lastLogin.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} from {lastLogin.ip ? lastLogin.ip.replace(/^::ffff:/, "") : "unknown"}
            </div>
          )}
          {showHistory && loginHistory.length > 0 && (
            <div className="login-history-grid" style={{ borderTop: `1px solid ${line}`, paddingTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px", fontSize: 10, color: t3, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 0", borderBottom: `1px solid ${line}` }}>
                <span>Date/Time</span><span>IP Address</span><span>Status</span>
              </div>
              {loginHistory.slice(0, historyLimit).map(h => (
                <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px", padding: "8px 0", borderBottom: `1px solid ${line}30`, fontSize: 12 }}>
                  <span style={{ color: t2 }}>{new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} {new Date(h.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                  <span style={{ color: t3 }}>{h.ip ? h.ip.replace(/^::ffff:/, "") : "\u2014"}</span>
                  <span style={{ color: h.success ? green : red, fontWeight: 500 }}>{h.success ? "Success" : "Failed"}</span>
                </div>
              ))}
              {loginHistory.length > historyLimit && (
                <div style={{ padding: "10px 0", textAlign: "center" }}>
                  <span onClick={() => setHistoryLimit(prev => prev + 10)} style={{ fontSize: 12, color: red, cursor: "pointer", padding: "6px 16px", border: `1px solid ${red}33`, borderRadius: 4 }}>Load More ({loginHistory.length - historyLimit} remaining)</span>
                </div>
              )}
            </div>
          )}
          {showHistory && loginHistory.length === 0 && (
            <div style={{ fontSize: 13, color: t3, fontStyle: "italic" }}>No login history available</div>
          )}
        </div>
      </div>
    </>
  );
}
