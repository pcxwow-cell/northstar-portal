import { useState, useRef } from "react";
import { colors, fonts } from "../styles/theme.js";
import { NorthstarIcon, NorthstarWordmark } from "../App.jsx";
import { login as apiLogin, verifyMFA, forgotPassword, setToken } from "../api.js";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";

const sans = fonts.sans;
const red = colors.red;
const darkText = colors.darkText;
const cream = colors.cream;

export default function LoginPage({ onLogin, onShowProspects }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  // MFA state
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const mfaInputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiLogin(email, password);
      if (result.requiresMfa) {
        setMfaPending(true);
        setMfaUserId(result.userId);
        setMfaToken(result.mfaToken);
        setLoading(false);
        setTimeout(() => mfaInputRefs[0].current?.focus(), 100);
        return;
      }
      onLogin(result);
    } catch (err) {
      if (err.lockedUntil) {
        setLockedUntil(new Date(err.lockedUntil));
      }
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const code = useBackupCode ? backupCode.trim() : mfaCode.join("");
    try {
      const data = await verifyMFA(mfaUserId, code, mfaToken);
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setLoading(false);
    }
  }

  function handleMfaDigit(index, value) {
    if (!/^\d*$/.test(value)) return;
    const updated = [...mfaCode];
    updated[index] = value.slice(-1);
    setMfaCode(updated);
    if (value && index < 5) mfaInputRefs[index + 1].current?.focus();
  }

  function handleMfaKeyDown(index, e) {
    if (e.key === "Backspace" && !mfaCode[index] && index > 0) {
      mfaInputRefs[index - 1].current?.focus();
    }
  }

  function handleMfaPaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const updated = [...mfaCode];
      for (let i = 0; i < 6; i++) updated[i] = pasted[i] || "";
      setMfaCode(updated);
      const nextEmpty = Math.min(pasted.length, 5);
      mfaInputRefs[nextEmpty].current?.focus();
      e.preventDefault();
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      // Always show success (don't reveal if email exists)
      setForgotSent(true);
    }
    setForgotLoading(false);
  }

  // Northstar's actual project images
  const projectImages = {
    porthaven: "https://northstardevelopment.ca/public/images/porthaven-1.jpg",
    livy: "https://northstardevelopment.ca/public/images/livy-2.jpeg",
    estrella: "https://northstardevelopment.ca/public/images/estrella-1.jpg",
    panorama: "https://northstardevelopment.ca/public/images/panorama-1.jpg",
  };

  return (
    <div style={{ fontFamily: sans, color: darkText, minHeight: "100vh", display: "flex", flexDirection: "column", background: colors.white }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .login-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .login-hero { display: none !important; }
          .login-form-wrap { max-width: 440px; margin: 0 auto; }
        }
        @media (max-width: 600px) {
          .login-container { padding: 24px 20px !important; }
          .login-header { padding: 20px 20px !important; }
          .login-footer { padding: 16px 20px !important; flex-direction: column; gap: 4px; text-align: center; }
        }
      `}</style>

      {/* Header */}
      <div className="login-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 48px", borderBottom: "1px solid #ECEAE5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NorthstarIcon size={28} color={red} />
          <NorthstarWordmark height={16} color={darkText} />
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#888" }}>
          <span>Vancouver, BC</span>
          <span style={{ color: "#DDD" }}>|</span>
          <span>Est. 2019</span>
        </div>
      </div>

      {/* Main content */}
      <div className="login-container" style={{ flex: 1, display: "flex", alignItems: "center", padding: "48px 48px" }}>
        <div className="login-grid" style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 80, maxWidth: 1100, width: "100%", margin: "0 auto", alignItems: "center" }}>

          {/* Left: Brand + projects */}
          <div className="login-hero" style={{ animation: "slideUp .8s ease" }}>
            <div style={{ marginBottom: 48 }}>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: red, fontWeight: 500, marginBottom: 16 }}>Investor Portal</p>
              <h1 style={{ fontSize: 42, fontWeight: 300, lineHeight: 1.2, color: darkText, marginBottom: 20, fontFamily: sans }}>
                Enlivening Communities<br />Through Mindful Development
              </h1>
              <p style={{ fontSize: 15, color: "#777", lineHeight: 1.7, maxWidth: 480 }}>
                Track your projects, review documents, and monitor construction progress {"\u2014"} all in one place.
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 48, marginBottom: 48, paddingBottom: 40, borderBottom: "1px solid #ECEAE5" }}>
              {[
                { value: "$22.3M", label: "Total Development" },
                { value: "4", label: "Projects" },
                { value: "212+", label: "Units" },
              ].map((s, i) => (
                <div key={i} style={{ animation: `slideUp ${.8 + i * .15}s ease` }}>
                  <div style={{ fontSize: 30, fontWeight: 300, color: darkText, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#888" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Project cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { img: projectImages.porthaven, name: "Porthaven", loc: "Port Coquitlam", status: "Under Construction" },
                { img: projectImages.livy, name: "Livy", loc: "Port Coquitlam", status: "Pre-Development" },
                { img: projectImages.estrella, name: "Estrella", loc: "British Columbia", status: "Under Construction" },
                { img: projectImages.panorama, name: "Panorama B6", loc: "Surrey, BC", status: "Completed" },
              ].map((p, i) => (
                <div key={i} style={{
                  position: "relative", borderRadius: 12, overflow: "hidden", height: 140,
                  backgroundImage: `url(${p.img})`, backgroundSize: "cover", backgroundPosition: "center",
                  animation: `fadeIn ${.8 + i * .15}s ease`,
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 60%, transparent 100%)" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: colors.white, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>{p.loc}</div>
                  </div>
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <span style={{
                      fontSize: 9, padding: "3px 8px", borderRadius: 2,
                      background: p.status === "Completed" ? "rgba(61,122,84,.9)" : "rgba(0,0,0,.5)",
                      color: colors.white, letterSpacing: ".03em", backdropFilter: "blur(4px)",
                    }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Login form */}
          <div className="login-form-wrap" style={{ animation: "fadeIn .6s ease .2s both" }}>
            {mfaPending ? (
              /* MFA Verification Form */
              <form onSubmit={handleMfaSubmit} style={{
                background: colors.white, border: "1px solid #ECEAE5", borderRadius: 12, padding: "40px 32px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
              }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${red}10`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 16v2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, color: darkText }}>Two-Factor Authentication</h2>
                  <p style={{ fontSize: 13, color: colors.mutedText }}>Enter the code from your authenticator app</p>
                </div>
                {error && (
                  <div style={{ fontSize: 12, color: red, padding: "10px 14px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 16, background: `${red}08` }}>{error}</div>
                )}
                {!useBackupCode ? (
                  <>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }} onPaste={handleMfaPaste}>
                      {mfaCode.map((digit, i) => (
                        <input key={i} ref={mfaInputRefs[i]} type="text" inputMode="numeric" maxLength={1}
                          value={digit} onChange={e => handleMfaDigit(i, e.target.value)} onKeyDown={e => handleMfaKeyDown(i, e)}
                          style={{
                            width: 48, height: 56, textAlign: "center", fontSize: 24, fontWeight: 500, fontFamily: "monospace",
                            border: `2px solid ${digit ? red : "#E0DDD8"}`, borderRadius: 8, outline: "none", color: darkText,
                            background: "#FAFAFA", transition: "border-color .15s",
                          }}
                          onFocus={e => e.target.style.borderColor = red}
                          onBlur={e => { if (!digit) e.target.style.borderColor = "#E0DDD8"; }}
                        />
                      ))}
                    </div>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <span onClick={() => { setUseBackupCode(true); setError(""); }} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Use a backup code instead</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Backup Code</label>
                      <input type="text" value={backupCode} onChange={e => setBackupCode(e.target.value)} placeholder="Enter 8-character backup code"
                        style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 8, color: darkText, fontSize: 16, fontFamily: "monospace", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: ".15em" }}
                        onFocus={e => e.target.style.borderColor = red}
                        onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
                    </div>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <span onClick={() => { setUseBackupCode(false); setError(""); setBackupCode(""); }} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Use authenticator app instead</span>
                    </div>
                  </>
                )}
                <Button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px", background: loading ? `${red}AA` : red, color: colors.white,
                  border: "none", borderRadius: 8, fontSize: 14, fontFamily: sans, fontWeight: 500, cursor: loading ? "default" : "pointer",
                  letterSpacing: ".02em", transition: "background .15s", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
                }}>
                  {loading ? "Verifying..." : "Verify"}
                </Button>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <span onClick={() => { setMfaPending(false); setMfaCode(["","","","","",""]); setBackupCode(""); setUseBackupCode(false); setError(""); setPassword(""); }}
                    style={{ fontSize: 12, color: "#888", cursor: "pointer" }}>Back to login</span>
                </div>
              </form>
            ) : (
              /* Standard Login Form */
              <form onSubmit={handleSubmit} style={{
                background: colors.white, border: "1px solid #ECEAE5", borderRadius: 12, padding: "40px 32px",
                boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
              }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <NorthstarIcon size={40} color={red} />
                  <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, marginTop: 16, color: darkText }}>Investor Portal</h2>
                  <p style={{ fontSize: 13, color: colors.mutedText }}>Sign in to access your account</p>
                </div>
                {error && (
                  <div style={{ fontSize: 12, color: red, padding: "10px 14px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 16, background: `${red}08` }}>
                    {error}
                    {lockedUntil && new Date(lockedUntil) > new Date() && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                        Account locked for security. Try again in {Math.ceil((new Date(lockedUntil) - new Date()) / 60000)} minutes.
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="investor@example.com"
                    style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 8, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
                    onFocus={e => e.target.style.borderColor = red}
                    onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                    style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 8, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
                    onFocus={e => e.target.style.borderColor = red}
                    onBlur={e => e.target.style.borderColor = "#E0DDD8"} />
                </div>
                <Button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px", background: loading ? `${red}AA` : red, color: colors.white,
                  border: "none", borderRadius: 8, fontSize: 14, fontFamily: sans, fontWeight: 500, cursor: loading ? "default" : "pointer",
                  letterSpacing: ".02em", transition: "background .15s", boxShadow: "0 1px 3px rgba(234,32,40,.3)",
                }}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <div style={{ textAlign: "right", marginTop: 10 }}>
                  <span onClick={() => setShowForgot(true)} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Forgot password?</span>
                </div>
                <div style={{ marginTop: 14, padding: "14px 16px", border: "1px solid #ECEAE5", borderRadius: 4, background: cream }}>
                  <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Quick Demo Login</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="outline" type="button" onClick={() => { setEmail("j.chen@pacificventures.ca"); setPassword("northstar2025"); setTimeout(() => document.querySelector("form")?.requestSubmit(), 100); }} style={{ flex: 1, padding: "10px", background: colors.white, border: "1px solid #DDD", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: darkText, fontWeight: 500 }}>
                      Investor Demo
                    </Button>
                    <Button variant="outline" type="button" onClick={() => { setEmail("admin@northstardevelopment.ca"); setPassword("admin2025"); setTimeout(() => document.querySelector("form")?.requestSubmit(), 100); }} style={{ flex: 1, padding: "10px", background: colors.white, border: `1px solid ${red}40`, borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans, color: red, fontWeight: 500 }}>
                      Admin Demo
                    </Button>
                  </div>
                </div>
              </form>
            )}
            <p style={{ fontSize: 12, color: colors.mutedText, textAlign: "center", marginTop: 20 }}>
              Interested in investing? <span onClick={onShowProspects} style={{ color: red, cursor: "pointer", fontWeight: 500 }}>Learn more {"\u2192"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal open={showForgot} onClose={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} title="Reset Password" maxWidth={400}>
        {forgotSent ? (
          <>
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
              If an account exists with that email, we have sent a password reset link. Please check your inbox.
            </p>
            <p style={{ fontSize: 11, color: colors.mutedText, fontStyle: "italic" }}>
              (Demo mode {"\u2014"} check the server console for the reset link)
            </p>
            <Button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} style={{ marginTop: 16, padding: "10px 24px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans }}>
              Back to Login
            </Button>
          </>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Enter your email address and we will send you a link to reset your password.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required placeholder="your@email.com"
                style={{ width: "100%", padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E0DDD8", borderRadius: 4, color: darkText, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" type="button" onClick={() => { setShowForgot(false); setForgotEmail(""); }} style={{ flex: 1, padding: "10px", background: colors.white, border: "1px solid #DDD", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans, color: darkText }}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotLoading} style={{ flex: 1, padding: "10px", background: forgotLoading ? `${red}AA` : red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, cursor: forgotLoading ? "default" : "pointer", fontFamily: sans }}>
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Footer */}
      <div className="login-footer" style={{ padding: "20px 48px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", borderTop: "1px solid #ECEAE5" }}>
        <span>{"\u00A9"} 2026 Northstar Pacific Development Group</span>
        <span>710 {"\u2013"} 1199 W Pender St, Vancouver BC V6E 2R1</span>
      </div>
    </div>
  );
}
