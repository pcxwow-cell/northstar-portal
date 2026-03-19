import { useState, useEffect } from "react";
import { fetchStaff, createStaff, updateStaff, deactivateStaff, reactivateStaff, resetStaffPassword, fetchUserFlags, updateUserFlags } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

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

const PERMISSION_GROUPS = {
  "Navigation Access": {
    description: "Control which pages this user can access",
    flags: [
      { key: "dashboard", label: "Dashboard" },
      { key: "projects", label: "Projects" },
      { key: "investors", label: "Investors" },
      { key: "documents", label: "Documents" },
      { key: "inbox", label: "Inbox / Messages" },
      { key: "signatures", label: "Signatures" },
      { key: "finance", label: "Financial Tools" },
      { key: "prospects", label: "Prospects" },
      { key: "audit", label: "Audit Log" },
      { key: "settings", label: "Settings" },
    ],
  },
  "Staff Management": {
    description: "Who can manage other users",
    flags: [
      { key: "staff", label: "Manage Staff" },
      { key: "inviteUsers", label: "Invite New Users" },
      { key: "deactivateUsers", label: "Deactivate Users" },
      { key: "groups", label: "Manage Groups" },
    ],
  },
  "Content Actions": {
    description: "What actions this user can perform",
    flags: [
      { key: "uploadDocuments", label: "Upload Documents" },
      { key: "editKPIs", label: "Edit Project KPIs" },
      { key: "manageWaterfall", label: "Configure Waterfall" },
      { key: "exportData", label: "Export Data (CSV/PDF)" },
      { key: "bulkOperations", label: "Bulk Operations" },
    ],
  },
  "Audit & Compliance": {
    description: "Access to sensitive operational data",
    flags: [
      { key: "viewAuditLog", label: "View Audit Log" },
    ],
  },
};

const PRESETS = {
  "Full Admin": Object.fromEntries(
    Object.values(PERMISSION_GROUPS).flatMap(g => g.flags.map(f => [f.key, true]))
  ),
  "Project Manager": {
    dashboard: true, projects: true, investors: true, documents: true, inbox: true, signatures: true,
    finance: true, prospects: false, audit: false, settings: false, staff: false, inviteUsers: false,
    deactivateUsers: false, groups: false, uploadDocuments: true, editKPIs: true, manageWaterfall: false,
    exportData: true, bulkOperations: false, viewAuditLog: false,
  },
  "Accounting": {
    dashboard: true, projects: true, investors: true, documents: true, inbox: false, signatures: false,
    finance: true, prospects: false, audit: true, settings: false, staff: false, inviteUsers: false,
    deactivateUsers: false, groups: false, uploadDocuments: true, editKPIs: false, manageWaterfall: false,
    exportData: true, bulkOperations: false, viewAuditLog: true,
  },
  "Read Only": Object.fromEntries(
    Object.values(PERMISSION_GROUPS).flatMap(g => g.flags.map(f => [f.key, ["dashboard", "projects", "investors", "documents"].includes(f.key)]))
  ),
};

export default function StaffManager({ toast, hideHeader }) {
  const [staff, setStaff] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("ADMIN");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffFlags, setStaffFlags] = useState(null);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [credentialDialog, setCredentialDialog] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => { loadStaff(); }, []);
  function loadStaff() { fetchStaff().then(setStaff).catch(() => toast("Failed to load staff", "error")); }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      const result = await createStaff({ name, email, role });
      setCredentialDialog({ name: result.name, email, tempPassword: result.tempPassword, action: "created" });
      setShowAdd(false); setName(""); setEmail(""); setRole("ADMIN"); loadStaff();
    } catch (err) { toast(err.message, "error"); }
  }

  function handleUpdate(id, data) {
    if (data.role) {
      setConfirmAction({ title: "Change Role", message: `Change this user's role to ${data.role}?`, onConfirm: async () => { setConfirmAction(null); try { await updateStaff(id, data); toast("Updated"); loadStaff(); } catch (e) { toast(e.message, "error"); } } });
      return;
    }
    updateStaff(id, data).then(() => { toast("Updated"); loadStaff(); }).catch(e => toast(e.message, "error"));
  }

  function handleDeactivate(s) {
    setConfirmAction({ title: "Deactivate Staff", message: `Deactivate ${s.name}? They will no longer be able to log in.`, danger: true, onConfirm: async () => { setConfirmAction(null); try { await deactivateStaff(s.id); toast(`${s.name} deactivated`); loadStaff(); if (selectedStaff?.id === s.id) setSelectedStaff(null); } catch (e) { toast(e.message, "error"); } } });
  }

  async function handleReactivate(s) {
    try { await reactivateStaff(s.id); toast(`${s.name} reactivated`); loadStaff(); } catch (e) { toast(e.message, "error"); }
  }

  function handleResetPassword(s) {
    setConfirmAction({ title: "Reset Password", message: `Reset password for ${s.name}? A new temporary password will be emailed to them.`, onConfirm: async () => { setConfirmAction(null); try { const result = await resetStaffPassword(s.id); setCredentialDialog({ name: s.name, email: s.email, tempPassword: result.tempPassword, action: "reset" }); } catch (e) { toast(e.message, "error"); } } });
  }

  async function openPermissions(s) {
    setSelectedStaff(s);
    setLoadingFlags(true);
    try {
      const data = await fetchUserFlags(s.id);
      setStaffFlags(data.overrides || {});
    } catch { setStaffFlags({}); }
    finally { setLoadingFlags(false); }
  }

  async function toggleFlag(key, value) {
    const updated = { ...staffFlags, [key]: value };
    setStaffFlags(updated);
    try {
      await updateUserFlags(selectedStaff.id, { [key]: value });
    } catch (e) { toast(e.message, "error"); }
  }

  async function applyPreset(presetName) {
    const preset = PRESETS[presetName];
    setStaffFlags(preset);
    try {
      await updateUserFlags(selectedStaff.id, preset);
      toast(`Applied "${presetName}" preset`);
    } catch (e) { toast(e.message, "error"); }
  }

  return (
    <>
      {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
      {!hideHeader && <SectionHeader title="Company Staff" size="lg" style={{ marginBottom: 24 }} />}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "Add Staff"}</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="admin-form-row" style={{ background: colors.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#888" }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="Jane Smith" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "#888" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="jane@northstardevelopment.ca" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#888" }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
              <option value="ADMIN">Admin</option>
              <option value="GP">General Partner</option>
            </select>
          </div>
          <Button type="submit">Add</Button>
        </form>
      )}

      <div className="admin-perm-grid" style={{ display: "grid", gridTemplateColumns: selectedStaff ? "1fr 1fr" : "1fr", gap: 24 }}>
        {/* Staff list */}
        <Card padding="0" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {staff.length} Staff Members — click to manage permissions
          </div>
          {staff.map(s => (
            <div key={s.id} onClick={() => openPermissions(s)} style={{
              padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", transition: "background .15s",
              background: selectedStaff?.id === s.id ? "#FFF5F5" : colors.white,
              borderLeft: selectedStaff?.id === s.id ? `3px solid ${colors.red}` : "3px solid transparent",
            }}
              onMouseEnter={e => { if (selectedStaff?.id !== s.id) e.currentTarget.style.background = colors.cardBg; }}
              onMouseLeave={e => { if (selectedStaff?.id !== s.id) e.currentTarget.style.background = colors.white; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.email}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select value={s.role} onChange={e => { e.stopPropagation(); handleUpdate(s.id, { role: e.target.value }); }} onClick={e => e.stopPropagation()} style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, width: "auto" }}>
                    <option value="ADMIN">Admin</option>
                    <option value="GP">GP</option>
                  </select>
                  <Button variant="outline" onClick={e => { e.stopPropagation(); handleResetPassword(s); }} title="Reset password" style={{ padding: "3px 8px", fontSize: 10 }}>Reset PW</Button>
                  {s.status === "ACTIVE" ? (
                    <Button variant="outline" onClick={e => { e.stopPropagation(); handleDeactivate(s); }} title="Deactivate" style={{ padding: "3px 8px", fontSize: 10, color: colors.red, borderColor: colors.red }}>Deactivate</Button>
                  ) : (
                    <Button variant="outline" onClick={e => { e.stopPropagation(); handleReactivate(s); }} title="Reactivate" style={{ padding: "3px 8px", fontSize: 10, color: colors.green, borderColor: colors.green }}>Reactivate</Button>
                  )}
                  <StatusBadge status={s.status} size="sm" />
                </div>
              </div>
            </div>
          ))}
          {staff.length === 0 && <div style={{ padding: 24, color: colors.mutedText, textAlign: "center" }}>No staff members</div>}
        </Card>

        {/* Permissions panel */}
        {selectedStaff && (
          <div style={{ background: colors.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8E5DE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Permissions: {selectedStaff.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Role: {selectedStaff.role}</div>
              </div>
              <Button variant="outline" onClick={() => setSelectedStaff(null)} style={{ padding: "4px 12px", fontSize: 11 }}>Close</Button>
            </div>

            {/* Quick presets */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}`, background: colors.cardBg }}>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Quick Presets</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(PRESETS).map(p => (
                  <Button variant="outline" key={p} onClick={() => applyPreset(p)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.red; e.currentTarget.style.color = colors.red; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#DDD"; e.currentTarget.style.color = colors.darkText; }} style={{ padding: "5px 12px", fontSize: 11, borderRadius: 16,
                    background: colors.white, borderColor: "#DDD" }}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {loadingFlags ? <Spinner /> : (
              <div style={{ maxHeight: 480, overflowY: "auto" }}>
                {Object.entries(PERMISSION_GROUPS).map(([groupName, group]) => (
                  <div key={groupName} style={{ padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{groupName}</div>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>{group.description}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {group.flags.map(f => (
                        <Toggle key={f.key} label={f.label} checked={staffFlags?.[f.key] !== false} onChange={v => toggleFlag(f.key, v)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credential dialog */}
      <Modal open={!!credentialDialog} onClose={() => setCredentialDialog(null)} title={credentialDialog?.action === "created" ? "Staff Member Created" : "Password Reset"} maxWidth={440}>
        {credentialDialog && (
          <>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>
              {credentialDialog.action === "created"
                ? `${credentialDialog.name} has been added and a welcome email has been sent.`
                : `Password has been reset for ${credentialDialog.name} and an email has been sent.`}
            </p>
            <div style={{ background: colors.cardBg, border: "1px solid #ECEAE5", borderRadius: 8, padding: "16px 20px", marginBottom: 16, fontFamily: "monospace", fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>Email: <strong>{credentialDialog.email}</strong></div>
              <div>Password: <strong>{credentialDialog.tempPassword}</strong></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(credentialDialog.tempPassword); toast("Password copied"); }}>Copy Password</Button>
              <Button onClick={() => setCredentialDialog(null)}>Done</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
