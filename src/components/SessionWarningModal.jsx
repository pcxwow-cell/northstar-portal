import { useTheme } from "../context/ThemeContext.jsx";
import Modal from "./Modal.jsx";
import { colors } from "../styles/theme.js";

const red = colors.red;

export default function SessionWarningModal({ onDismiss, onLogout }) {
  const th = useTheme();
  return (
    <Modal open={true} onClose={onDismiss} title="Session Expiring" maxWidth={400}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>&#x23F0;</div>
        <p style={{ fontSize: 13, color: th.t2, lineHeight: 1.6, marginBottom: 24 }}>
          Your session will expire in 5 minutes due to inactivity. Click below to stay signed in.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <span onClick={onLogout} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 4, border: `1px solid ${th.line}`, color: th.t3, cursor: "pointer" }}>Sign Out</span>
          <span onClick={onDismiss} style={{ fontSize: 13, padding: "10px 24px", borderRadius: 4, background: red, color: colors.white, cursor: "pointer", fontWeight: 500 }}>Stay Signed In</span>
        </div>
      </div>
    </Modal>
  );
}
