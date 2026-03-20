import { useState } from "react";
import { colors, inputStyle } from "../styles/theme.js";
import Modal from "../components/Modal.jsx";
import Button from "../components/Button.jsx";

export default function KPIEditModal({ investor, onSave, onClose }) {
  const [values, setValues] = useState(() => {
    const init = {};
    (investor.projects || []).forEach(p => {
      init[p.projectId] = {
        committed: p.committed ?? "",
        called: p.called ?? "",
        currentValue: p.currentValue ?? "",
        irr: p.irr ?? "",
        moic: p.moic ?? "",
      };
    });
    return init;
  });
  const [saving, setSaving] = useState(false);

  function updateField(projectId, field, val) {
    setValues(prev => ({ ...prev, [projectId]: { ...prev[projectId], [field]: val } }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const p of investor.projects) {
        const v = values[p.projectId];
        const changed = {};
        if (String(v.committed) !== String(p.committed ?? "")) changed.committed = parseFloat(v.committed) || 0;
        if (String(v.called) !== String(p.called ?? "")) changed.called = parseFloat(v.called) || 0;
        if (String(v.currentValue) !== String(p.currentValue ?? "")) changed.currentValue = parseFloat(v.currentValue) || 0;
        if (String(v.irr) !== String(p.irr ?? "")) changed.irr = parseFloat(v.irr) || 0;
        if (String(v.moic) !== String(p.moic ?? "")) changed.moic = parseFloat(v.moic) || 0;
        if (Object.keys(changed).length > 0) await onSave(investor.id, p.projectId, changed);
      }
      onClose();
    } catch (e) { /* error handled by parent */ }
    finally { setSaving(false); }
  }

  const fieldLabel = { fontSize: 12, fontWeight: 500, color: colors.mutedText, marginBottom: 4, display: "block" };

  return (
    <Modal open={true} onClose={onClose} title={`Edit KPIs — ${investor.name}`} maxWidth={560}>
      {investor.projects.length === 0 ? (
        <p style={{ fontSize: 13, color: colors.mutedText, fontStyle: "italic" }}>No project assignments for this investor.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {investor.projects.map(p => (
            <div key={p.projectId} style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: colors.darkText }}>{p.projectName}</div>
              <div className="admin-form-row" style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Committed ($)</label>
                  <input value={values[p.projectId]?.committed ?? ""} onChange={e => updateField(p.projectId, "committed", e.target.value)} style={inputStyle} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Called ($)</label>
                  <input value={values[p.projectId]?.called ?? ""} onChange={e => updateField(p.projectId, "called", e.target.value)} style={inputStyle} placeholder="0" />
                </div>
              </div>
              <div className="admin-form-row" style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Current Value ($)</label>
                  <input value={values[p.projectId]?.currentValue ?? ""} onChange={e => updateField(p.projectId, "currentValue", e.target.value)} style={inputStyle} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>IRR (%)</label>
                  <input value={values[p.projectId]?.irr ?? ""} onChange={e => updateField(p.projectId, "irr", e.target.value)} style={inputStyle} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>MOIC (x)</label>
                  <input value={values[p.projectId]?.moic ?? ""} onChange={e => updateField(p.projectId, "moic", e.target.value)} style={inputStyle} placeholder="0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || investor.projects.length === 0} style={{ opacity: saving ? 0.5 : 1 }}>
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </Modal>
  );
}
