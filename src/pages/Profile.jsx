import { useState, useEffect } from "react";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { updateProfile, fetchNotificationPreferences, updateNotificationPreferences, fetchEntities, createEntity, updateEntity, deleteEntity } from "../api.js";
import Button from "../components/Button.jsx";
import FormInput from "../components/FormInput.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const green = colors.green;

export default function ProfilePage({ investor, toast, onUpdate }) {
  const { bg, surface, line, t1, t2, t3 } = useTheme();
  const [name, setName] = useState(investor.name);
  const [email, setEmail] = useState(investor.email);
  const [initials, setInitials] = useState(investor.initials || "");
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [entities, setEntities] = useState([]);
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityForm, setEntityForm] = useState({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });

  useEffect(() => {
    fetchNotificationPreferences().then(p => setNotifPrefs(p)).catch(() => {});
    if (investor.id) loadEntities();
  }, [investor.id]);

  function loadEntities() { fetchEntities(investor.id).then(setEntities).catch(() => setEntities([])); }

  async function handleCreateEntity(e) {
    e.preventDefault();
    try {
      if (editingEntity) {
        await updateEntity(editingEntity.id, entityForm);
        toast("Entity updated", "success");
        setEditingEntity(null);
      } else {
        await createEntity(investor.id, entityForm);
        toast("Entity created", "success");
      }
      setShowEntityForm(false);
      setEntityForm({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });
      loadEntities();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDeleteEntity(entityId) {
    try { await deleteEntity(entityId); toast("Entity deleted", "success"); loadEntities(); } catch (err) { toast(err.message, "error"); }
  }

  async function handlePrefToggle(key) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences({ [key]: updated[key] });
    } catch (err) {
      toast("Failed to update preferences", "error");
      setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    } finally { setSavingPrefs(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({ name, email, initials });
      onUpdate(updated);
      toast("Profile updated", "success");
    } catch (err) {
      toast(err.message || "Failed to update", "error");
    } finally { setSaving(false); }
  }

  const localInputStyle = { width: "100%", padding: "12px 14px", background: "transparent", border: `1px solid ${line}`, borderRadius: 8, color: t1, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box", transition: "border-color .15s" };

  return (
    <>
      <SectionHeader title="Profile" subtitle="Manage your account information" size="lg" style={{ marginBottom: 40 }} />

      <div className="profile-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        {/* Profile form */}
        <form onSubmit={handleSave}>
          <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${red}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, color: red }}>
                {initials || name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, color: t1 }}>{name}</div>
                <div style={{ fontSize: 12, color: t3 }}>{investor.role} {"\u00B7"} Joined {investor.joined}</div>
              </div>
            </div>
            <FormInput label="Full Name" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 16 }} />
            <FormInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 16 }} />
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: t3, fontWeight: 500, marginBottom: 6 }}>Initials</label>
              <input value={initials} onChange={e => setInitials(e.target.value)} maxLength={3} style={{ ...localInputStyle, width: 80 }} />
            </div>
            <Button type="submit" disabled={saving} style={{
              padding: "10px 24px", background: saving ? `${red}88` : red, color: colors.white,
              border: "none", borderRadius: 4, fontSize: 13, fontFamily: sans, cursor: saving ? "default" : "pointer",
            }}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        {/* Account info */}
        <div>
          <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>Investment Summary</div>
            {(investor.projectIds || []).length > 0 ? (
              <div style={{ fontSize: 13, color: t2 }}>
                <div style={{ marginBottom: 8 }}>Active Projects: <strong>{investor.projectIds.length}</strong></div>
                <div>Account Status: <StatusBadge status="active" size="sm" /></div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: t3, fontStyle: "italic" }}>No active investments</div>
            )}
          </div>
        </div>
      </div>

      {/* Investment Entities */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 300 }}>Investment Entities</h2>
          <span onClick={() => { setShowEntityForm(!showEntityForm); if (showEntityForm) { setEditingEntity(null); setEntityForm({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false }); } }} style={{ fontSize: 12, padding: "6px 14px", border: `1px solid ${line}`, borderRadius: 4, cursor: "pointer", color: t3 }}>{showEntityForm ? "Cancel" : "Add Entity"}</span>
        </div>
        {showEntityForm && (
          <form onSubmit={handleCreateEntity} style={{ borderRadius: 12, padding: "20px 24px", background: surface, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <div className="entity-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <FormInput label="Entity Name" value={entityForm.name} onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Chen Family Trust" />
              <div>
                <label style={{ fontSize: 11, color: t3, display: "block", marginBottom: 4 }}>Type</label>
                <select value={entityForm.type} onChange={e => setEntityForm(f => ({ ...f, type: e.target.value }))} style={localInputStyle}>
                  <option>Individual</option><option>LLC</option><option>Trust</option><option>IRA</option><option>Corporation</option><option>Partnership</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <FormInput label="Tax ID" value={entityForm.taxId} onChange={e => setEntityForm(f => ({ ...f, taxId: e.target.value }))} placeholder="EIN or SSN" />
              <FormInput label="Address" value={entityForm.address} onChange={e => setEntityForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Vancouver BC" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <FormInput label="State/Province" value={entityForm.state} onChange={e => setEntityForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. BC" />
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                <label style={{ fontSize: 12, color: t2, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={entityForm.isDefault} onChange={e => setEntityForm(f => ({ ...f, isDefault: e.target.checked }))} /> Default
                </label>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Button type="submit" style={{ padding: "8px 16px", background: red, color: colors.white, border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans }}>{editingEntity ? "Save" : "Create"}</Button>
              </div>
            </div>
          </form>
        )}
        <div style={{ borderRadius: 12, overflow: "hidden", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          {entities.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No investment entities. Add one to manage your investments.</div>
          ) : entities.map((ent, i) => (
            <div key={ent.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < entities.length - 1 ? `1px solid ${line}` : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: t1 }}>{ent.name}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>
                  {ent.type}{ent.state ? ` \u00B7 ${ent.state}` : ""}{ent.taxId ? ` \u00B7 ${ent.taxId}` : ""}{ent.address ? ` \u00B7 ${ent.address}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {ent.isDefault && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: `${green}20`, color: green }}>Default</span>}
                {ent.investmentCount > 0 && <span style={{ fontSize: 11, color: t3 }}>{ent.investmentCount} investment{ent.investmentCount > 1 ? "s" : ""}</span>}
                <span onClick={() => { setEditingEntity(ent); setEntityForm({ name: ent.name, type: ent.type, taxId: ent.taxId || "", address: ent.address || "", state: ent.state || "", isDefault: ent.isDefault }); setShowEntityForm(true); }} style={{ fontSize: 12, color: t2, cursor: "pointer" }}>Edit</span>
                {ent.investmentCount === 0 && <span onClick={() => handleDeleteEntity(ent.id)} style={{ fontSize: 12, color: red, cursor: "pointer" }}>Remove</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      {notifPrefs && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 300, marginBottom: 20 }}>Notification Preferences</h2>
          <div style={{ borderRadius: 12, padding: "28px 24px", background: surface, maxWidth: 520, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
            <p style={{ fontSize: 13, color: t3, marginBottom: 20 }}>Choose which email notifications you receive.</p>
            {[
              { key: "emailDocuments", label: "New Documents", desc: "When a new document is uploaded to your portal" },
              { key: "emailSignatures", label: "Signature Requests", desc: "When your signature is required on a document" },
              { key: "emailDistributions", label: "Distributions", desc: "When a distribution payment is processed" },
              { key: "emailMessages", label: "Messages", desc: "When you receive a new message from Northstar" },
              { key: "emailCapitalCalls", label: "Capital Calls", desc: "When a capital call notice is issued" },
            ].map(item => (
              <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${line}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: t1 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{item.desc}</div>
                </div>
                <div onClick={() => handlePrefToggle(item.key)} style={{
                  width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                  background: notifPrefs[item.key] ? red : `${t3}44`,
                  position: "relative", transition: "background .2s",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: colors.white,
                    position: "absolute", top: 2,
                    left: notifPrefs[item.key] ? 22 : 2,
                    transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
