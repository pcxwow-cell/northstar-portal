import { useState, useEffect } from "react";
import { fetchEmailSettings, updateEmailSettings, sendTestEmail, fetchEmailLog, fetchEmailStats } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Button from "../components/Button.jsx";

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

  const statusColors = { sent: colors.green, failed: colors.red, skipped: "#B08C00" };

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
      <div style={cardStyle}>
        <div style={sectionTitle}>Delivery Log</div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Sent", value: stats.sent, color: colors.green },
            { label: "Failed", value: stats.failed, color: colors.red },
            { label: "Skipped", value: stats.skipped, color: "#B08C00" },
          ].map(s => (
            <div key={s.label} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              <span style={{ color: colors.mutedText }}>{s.label}:</span>
              <span style={{ fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select
            value={logFilter.type}
            onChange={(e) => setLogFilter(p => ({ ...p, type: e.target.value }))}
            style={{ ...inputStyle, width: "auto", minWidth: 160 }}
          >
            <option value="">All Types</option>
            {["document", "signature", "distribution", "message", "capital_call", "welcome", "password_reset"].map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <select
            value={logFilter.status}
            onChange={(e) => setLogFilter(p => ({ ...p, status: e.target.value }))}
            style={{ ...inputStyle, width: "auto", minWidth: 140 }}
          >
            <option value="">All Statuses</option>
            {["sent", "failed", "skipped"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Log table */}
        {emailLog.length === 0 ? (
          <EmptyState title="No delivery logs" subtitle="Emails will appear here once sent." />
        ) : (
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #E8E5DE" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
                  {["Date", "Recipient", "Type", "Subject", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emailLog.map((entry, i) => (
                  <tr key={entry.id || i} style={{ borderBottom: i < emailLog.length - 1 ? "1px solid #E8E5DE" : "none" }}>
                    <td style={{ padding: "10px 14px", color: colors.mutedText, whiteSpace: "nowrap" }}>
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "\u2014"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>{entry.recipient || "\u2014"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 3,
                        background: "#F5F4F0", color: "#666",
                        textTransform: "uppercase", letterSpacing: ".04em",
                      }}>{(entry.type || "").replace(/_/g, " ")}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: colors.mutedText, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.subject || "\u2014"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 3,
                        background: `${statusColors[entry.status] || "#999"}15`,
                        color: statusColors[entry.status] || "#999",
                        textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600,
                      }}>{entry.status || "\u2014"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
