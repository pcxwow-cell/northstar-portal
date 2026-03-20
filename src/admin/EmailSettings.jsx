import { useState, useEffect } from "react";
import { fetchEmailSettings, updateEmailSettings, sendTestEmail, fetchEmailLog, fetchEmailStats } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Button from "../components/Button.jsx";
import EmailDeliveryLog from "./EmailDeliveryLog.jsx";

function AdminError({ message, onRetry }) {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p style={{ color: colors.red, marginBottom: 12 }}>{message}</p>
      {onRetry && <Button onClick={onRetry} variant="outline">Retry</Button>}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 10, position: "relative", transition: "background .2s",
        background: checked ? colors.red : "#DDD", cursor: "pointer",
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: colors.white, position: "absolute", top: 2,
          left: checked ? 18 : 2, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </div>
      <span style={{ color: checked ? colors.darkText : "#999" }}>{label}</span>
    </label>
  );
}

export default function EmailSettingsManager({ toast }) {
  const [settings, setSettings] = useState(null);
  const [emailLog, setEmailLog] = useState([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logFilter, setLogFilter] = useState({ type: "", status: "" });

  const cardStyle = { background: colors.white, borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 16, fontWeight: 600, marginBottom: 16, color: colors.darkText };
  const fieldLabel = { fontSize: 12, fontWeight: 500, color: colors.mutedText, marginBottom: 4, display: "block" };
  const fieldGroup = { marginBottom: 14 };

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [s, l, st] = await Promise.all([
        fetchEmailSettings(),
        fetchEmailLog({ type: logFilter.type, status: logFilter.status, limit: 50 }),
        fetchEmailStats(),
      ]);
      setSettings(s);
      setEmailLog(l.logs || l || []);
      setStats(st || { sent: 0, failed: 0, skipped: 0 });
    } catch (e) {
      setError(e.message || "Failed to load email settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function loadLog() {
    try {
      const l = await fetchEmailLog({ type: logFilter.type, status: logFilter.status, limit: 50 });
      setEmailLog(l.logs || l || []);
    } catch (_) {}
  }

  useEffect(() => { if (!loading) loadLog(); }, [logFilter.type, logFilter.status]);

  async function handleSave(partial) {
    setSaving(true);
    try {
      const updated = await updateEmailSettings({ ...settings, ...partial });
      setSettings(updated);
      toast("Settings saved");
    } catch (e) {
      toast(e.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(key, val) {
    const patch = { [key]: val };
    setSettings(prev => ({ ...prev, ...patch }));
    await handleSave(patch);
  }

  async function handleTestEmail() {
    setTesting(true);
    try {
      await sendTestEmail();
      toast("Test email sent");
    } catch (e) {
      toast(e.message || "Test email failed", "error");
    } finally {
      setTesting(false);
    }
  }

  function onFieldChange(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  if (loading) return <Spinner />;
  if (error) return <AdminError message={error} onRetry={loadAll} />;
  if (!settings) return <EmptyState title="No email settings found" />;

  const toggleItems = [
    { key: "enableDocuments", label: "Document notifications" },
    { key: "enableSignatures", label: "Signature request notifications" },
    { key: "enableDistributions", label: "Distribution notifications" },
    { key: "enableMessages", label: "Message notifications" },
    { key: "enableCapitalCalls", label: "Capital call notifications" },
    { key: "enableWelcome", label: "Welcome emails" },
    { key: "enablePasswordReset", label: "Password reset emails" },
  ];

  const brandingFields = [
    { key: "fromName", label: "From Name", placeholder: "Northstar Capital" },
    { key: "fromAddress", label: "From Email", placeholder: "noreply@example.com" },
    { key: "replyToAddress", label: "Reply-To Address", placeholder: "support@example.com" },
    { key: "companyName", label: "Company Name", placeholder: "Northstar Capital Group" },
    { key: "companyAddress", label: "Company Address", placeholder: "123 Main St, Suite 100" },
    { key: "portalUrl", label: "Portal URL", placeholder: "https://portal.example.com" },
    { key: "brandColor", label: "Brand Color", placeholder: colors.red },
  ];

  const subjectFields = [
    { key: "subjectWelcome", label: "Welcome Email", placeholder: "Welcome to {{companyName}}" },
    { key: "subjectDocument", label: "New Document", placeholder: "New document available" },
    { key: "subjectSignature", label: "Signature Request", placeholder: "Document requires your signature" },
    { key: "subjectDistribution", label: "Distribution Notice", placeholder: "Distribution notice from {{companyName}}" },
    { key: "subjectMessage", label: "New Message", placeholder: "You have a new message" },
    { key: "subjectCapitalCall", label: "Capital Call", placeholder: "Capital call notice" },
    { key: "subjectPasswordReset", label: "Password Reset", placeholder: "Reset your password" },
  ];

  return (
    <>
      <SectionHeader title="Email Settings" size="lg" style={{ marginBottom: 24 }} />

      {/* Section A: Email Provider Status */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Email Provider</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: colors.mutedText }}>Provider: </span>
            <span style={{ fontWeight: 500 }}>{settings._provider || "Not configured"}</span>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: colors.mutedText }}>API Key: </span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 3,
              background: settings._providerConfigured ? `${colors.green}15` : `${colors.red}08`,
              color: settings._providerConfigured ? colors.green : colors.red,
            }}>
              {settings._providerConfigured ? "Configured" : "Not configured"}
            </span>
          </div>
          <Button variant="outline" onClick={handleTestEmail} disabled={testing} style={{ fontSize: 12, marginLeft: "auto" }}>
            {testing ? "Sending..." : "Send Test Email"}
          </Button>
        </div>
      </div>

      {/* Section B: Global Notification Toggles */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Notification Toggles</div>
        <p style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>Enable or disable specific email notification types globally.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {toggleItems.map(t => (
            <Toggle key={t.key} checked={!!settings[t.key]} onChange={(v) => handleToggle(t.key, v)} label={t.label} />
          ))}
        </div>
      </div>

      {/* Section C: Branding & Sender Configuration */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Branding & Sender</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {brandingFields.map(f => (
            <div key={f.key} style={fieldGroup}>
              <label style={fieldLabel}>{f.label}</label>
              <input
                style={inputStyle}
                value={settings[f.key] || ""}
                placeholder={f.placeholder}
                onChange={(e) => onFieldChange(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Button onClick={() => handleSave({})} disabled={saving}>
            {saving ? "Saving..." : "Save Branding"}
          </Button>
        </div>
      </div>

      {/* Section C2: Email Template Preview */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Email Template Preview</div>
        <p style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>Preview how emails will appear with your current branding settings.</p>
        <div style={{ border: "1px solid #E8E5DE", borderRadius: 8, overflow: "hidden", maxWidth: 520, margin: "0 auto" }}>
          {/* Email header */}
          <div style={{ background: settings.brandColor || colors.red, padding: "20px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: ".08em" }}>
              {settings.companyName || "Your Company"}
            </div>
          </div>
          {/* Email body */}
          <div style={{ padding: "28px 28px 24px", background: "#fff" }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, color: "#333" }}>New Document Available</div>
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
              Hello James, a new document has been shared with you on the {settings.companyName || "Your Company"} investor portal. Please log in to review and acknowledge the document.
            </p>
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <span style={{ display: "inline-block", padding: "10px 28px", background: settings.brandColor || colors.red, color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                View Document
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#999", marginTop: 20, lineHeight: 1.5 }}>
              If you did not expect this email, please contact your account representative.
            </p>
          </div>
          {/* Email footer */}
          <div style={{ padding: "16px 28px", background: "#F8F7F4", borderTop: "1px solid #E8E5DE", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#999", lineHeight: 1.6 }}>
              {settings.footerText || `${settings.companyName || "Your Company"} Investor Portal`}
            </div>
            {settings.companyAddress && <div style={{ fontSize: 10, color: "#BBB", marginTop: 4 }}>{settings.companyAddress}</div>}
            {settings.portalUrl && <div style={{ fontSize: 10, color: "#BBB", marginTop: 2 }}>{settings.portalUrl}</div>}
          </div>
        </div>
      </div>

      {/* Section D: Subject Line Overrides */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Subject Line Overrides</div>
        <p style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>Customize subject lines for each email type. Leave blank to use defaults.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {subjectFields.map(f => (
            <div key={f.key} style={fieldGroup}>
              <label style={fieldLabel}>{f.label}</label>
              <input
                style={inputStyle}
                value={settings[f.key] || ""}
                placeholder={f.placeholder}
                onChange={(e) => onFieldChange(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Button onClick={() => handleSave({})} disabled={saving}>
            {saving ? "Saving..." : "Save Subjects"}
          </Button>
        </div>
      </div>

      {/* Section E: Delivery Log */}
      <EmailDeliveryLog stats={stats} emailLog={emailLog} logFilter={logFilter} setLogFilter={setLogFilter} cardStyle={cardStyle} sectionTitle={sectionTitle} />
    </>
  );
}
