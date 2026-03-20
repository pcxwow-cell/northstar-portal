import { useState, useEffect } from "react";
import { fetchInvestorProfile, fetchAdminProjects, fetchEntities, createEntity, updateEntity, deleteEntity, approveInvestor, deactivateInvestor, unlockInvestor, resetInvestorPassword, assignInvestorProject, updateInvestor, updateInvestorKPI, fetchAuditLog, recordCashFlow, updateCashFlow, deleteCashFlow, fetchProjectCashFlows, updateAccreditation, fmt, fmtCurrency } from "../api.js";
import { colors, fonts, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import FormInput from "../components/FormInput.jsx";

function ActivityTimeline({ userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog({ userId, limit: 20 }).then(setActivities).catch(() => setActivities([])).finally(() => setLoading(false));
  }, [userId]);

  const actionIcon = (a) => {
    if (a === "login") return "🔑";
    if (a.includes("download")) return "📥";
    if (a.includes("upload")) return "📤";
    if (a.includes("signature")) return "✍️";
    if (a.includes("profile")) return "👤";
    if (a.includes("message")) return "💬";
    if (a === "logout") return "🚪";
    return "•";
  };

  const section = { background: colors.white, borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Activity Timeline</div>
      {loading ? <p style={{ fontSize: 12, color: "#BBB" }}>Loading...</p> : activities.length === 0 ? (
        <p style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No recorded activity</p>
      ) : (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 8, top: 4, bottom: 4, width: 1, background: "#E8E5DE" }} />
          {activities.map((a, i) => (
            <div key={a.id} style={{ position: "relative", paddingBottom: i < activities.length - 1 ? 16 : 0, fontSize: 13 }}>
              <div style={{ position: "absolute", left: -20, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#F8F7F4", border: "1px solid #E8E5DE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
                {actionIcon(a.action)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{a.action.replace(/_/g, " ")}</span>
                  {a.resource && <span style={{ color: colors.mutedText, marginLeft: 6 }}>{a.resource}</span>}
                </div>
                <span style={{ fontSize: 11, color: "#BBB", whiteSpace: "nowrap", marginLeft: 12 }}>
                  {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}


function InvestorCashFlowsSection({ investorId, investorName, projects, toast }) {
  const [cashFlows, setCashFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => { loadAll(); }, [investorId]);

  async function loadAll() {
    setLoading(true);
    const allFlows = [];
    for (const p of projects) {
      try {
        const flows = await fetchCashFlows(investorId, p.projectId);
        allFlows.push(...flows.map(f => ({ ...f, projectName: p.projectName })));
      } catch (e) { /* skip */ }
    }
    allFlows.sort((a, b) => new Date(a.date) - new Date(b.date));
    setCashFlows(allFlows);
    setLoading(false);
  }

  function startEdit(cf) {
    setEditingId(cf.id);
    setEditDate(new Date(cf.date).toISOString().split("T")[0]);
    setEditAmount(String(Math.abs(cf.amount)));
    setEditType(cf.type);
    setEditDesc(cf.description || "");
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const amountVal = parseFloat(editAmount);
      const finalAmount = editType === "capital_call" ? -Math.abs(amountVal) : Math.abs(amountVal);
      await updateCashFlow(editingId, { date: editDate, amount: finalAmount, type: editType, description: editDesc || null });
      toast("Cash flow updated");
      setEditingId(null);
      loadAll();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this cash flow record?")) return;
    try { await deleteCashFlow(id); toast("Cash flow deleted"); loadAll(); } catch (err) { toast(err.message, "error"); }
  }

  const totalContributed = cashFlows.filter(cf => cf.amount < 0).reduce((s, cf) => s + Math.abs(cf.amount), 0);
  const totalDistributed = cashFlows.filter(cf => cf.amount > 0).reduce((s, cf) => s + cf.amount, 0);

  const section = { background: colors.white, borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  if (loading) return <Card style={{ marginBottom: 16 }}><div style={sectionTitle}>Cash Flows</div><p style={{ color: "#BBB", fontSize: 13 }}>Loading...</p></Card>;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={sectionTitle}>Cash Flows ({cashFlows.length} records)</div>
      {cashFlows.length > 0 && (
        <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: "10px 14px", background: colors.cardBg, borderRadius: 4, border: "1px solid #E8E5DE" }}>
          <div><div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase" }}>Total Contributed</div><div style={{ fontSize: 15, fontWeight: 500, color: colors.red }}>${fmt(totalContributed)}</div></div>
          <div><div style={{ fontSize: 10, color: colors.mutedText, textTransform: "uppercase" }}>Total Distributed</div><div style={{ fontSize: 15, fontWeight: 500, color: colors.green }}>${fmt(totalDistributed)}</div></div>
        </div>
      )}
      {cashFlows.length > 0 ? (
        <div className="admin-table-scroll">
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
            <span>Date</span><span>Project</span><span>Description</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Type</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {cashFlows.map(cf => (
            editingId === cf.id ? (
              <form key={cf.id} onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", padding: "6px 0", borderBottom: "1px solid #F5F3F0", gap: 4, alignItems: "center" }}>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} />
                <span style={{ fontSize: 12 }}>{cf.projectName}</span>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} />
                <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }} />
                <select value={editType} onChange={e => setEditType(e.target.value)} style={{ ...inputStyle, padding: "4px 4px", fontSize: 9 }}>
                  <option value="capital_call">Capital Call</option><option value="distribution">Distribution</option><option value="return_of_capital">Return of Capital</option><option value="income">Income</option>
                </select>
                <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                  <button type="submit" style={{ fontSize: 9, padding: "3px 5px", background: colors.green, color: colors.white, border: "none", borderRadius: 3, cursor: "pointer" }}>OK</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 9, padding: "3px 5px", background: colors.white, color: colors.mutedText, border: "1px solid #DDD", borderRadius: 3, cursor: "pointer" }}>X</button>
                </div>
              </form>
            ) : (
              <div key={cf.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 100px 90px 70px", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 12 }}>
                <span style={{ color: colors.mutedText, fontSize: 11 }}>{new Date(cf.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                <span style={{ fontWeight: 500 }}>{cf.projectName}</span>
                <span style={{ color: "#666" }}>{cf.description || cf.type}</span>
                <span style={{ textAlign: "right", fontWeight: 500, color: cf.amount < 0 ? colors.red : colors.green }}>{cf.amount < 0 ? `-$${fmt(Math.abs(cf.amount))}` : `+$${fmt(cf.amount)}`}</span>
                <span style={{ textAlign: "right", fontSize: 10, color: colors.mutedText, textTransform: "capitalize" }}>{(cf.type || "").replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <span onClick={() => startEdit(cf)} style={{ fontSize: 11, color: "#666", cursor: "pointer" }}>Edit</span>
                  <span onClick={() => handleDelete(cf.id)} style={{ fontSize: 11, color: colors.red, cursor: "pointer" }}>Del</span>
                </div>
              </div>
            )
          ))}
        </div>
      ) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No cash flows</span>}
    </Card>
  );
}

function AccreditationSection({ investorId, profile, setProfile, toast }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ status: "", type: "", date: "", expiry: "" });

  const status = profile.accreditationStatus || "not_verified";
  const statusColors = { not_verified: { bg: "#F5F5F5", color: "#666" }, pending: { bg: "#FFF8E1", color: "#B8860B" }, verified: { bg: "#EFE", color: colors.green }, expired: { bg: colors.errorBg, color: colors.red } };
  const sc = statusColors[status] || statusColors.not_verified;
  const statusLabel = { not_verified: "Not Verified", pending: "Pending", verified: "Verified", expired: "Expired" };
  const typeLabel = { income: "Income", net_worth: "Net Worth", entity: "Entity", professional: "Professional" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  function startEdit() {
    setForm({
      status: status,
      type: profile.accreditationType || "",
      date: profile.accreditationDate ? new Date(profile.accreditationDate).toISOString().split("T")[0] : "",
      expiry: profile.accreditationExpiry ? new Date(profile.accreditationExpiry).toISOString().split("T")[0] : "",
    });
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAccreditation(investorId, {
        accreditationStatus: form.status,
        accreditationType: form.type || null,
        accreditationDate: form.date || null,
        accreditationExpiry: form.expiry || null,
      });
      setProfile(p => ({ ...p, accreditationStatus: form.status, accreditationType: form.type || null, accreditationDate: form.date || null, accreditationExpiry: form.expiry || null }));
      toast("Accreditation updated");
      setEditing(false);
    } catch (err) { toast(err.message, "error"); }
    finally { setSaving(false); }
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={sectionTitle}>Accreditation</div>
        {!editing && <Button variant="outline" onClick={startEdit} style={{ padding: "4px 10px", fontSize: 11 }}>Update</Button>}
      </div>
      {editing ? (
        <form onSubmit={handleSave} style={{ padding: 12, background: colors.cardBg, borderRadius: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: colors.mutedText }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}>
                <option value="not_verified">Not Verified</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: colors.mutedText }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}>
                <option value="">--</option>
                <option value="income">Income</option>
                <option value="net_worth">Net Worth</option>
                <option value="entity">Entity</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: colors.mutedText }}>Verification Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: colors.mutedText }}>Expiry Date</label>
              <input type="date" value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="outline" type="button" onClick={() => setEditing(false)} style={{ padding: "4px 10px", fontSize: 11 }}>Cancel</Button>
            <Button type="submit" disabled={saving} style={{ padding: "4px 10px", fontSize: 11, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      ) : (
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 16, background: sc.bg, color: sc.color, fontWeight: 500 }}>{statusLabel[status] || status}</span>
          {profile.accreditationType && <div style={{ fontSize: 12, color: "#666" }}><span style={{ color: colors.mutedText }}>Type:</span> {typeLabel[profile.accreditationType] || profile.accreditationType}</div>}
          {profile.accreditationDate && <div style={{ fontSize: 12, color: "#666" }}><span style={{ color: colors.mutedText }}>Verified:</span> {new Date(profile.accreditationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
          {profile.accreditationExpiry && <div style={{ fontSize: 12, color: "#666" }}><span style={{ color: colors.mutedText }}>Expires:</span> {new Date(profile.accreditationExpiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
        </div>
      )}
    </Card>
  );
}

export default function InvestorProfile({ investorId, onBack, toast }) {
  const [profile, setProfile] = useState(null);
  const [entities, setEntities] = useState([]);
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityForm, setEntityForm] = useState({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [assignProjList, setAssignProjList] = useState([]);
  const [assignProjId, setAssignProjId] = useState("");
  const [assignProjCommitted, setAssignProjCommitted] = useState("");
  const [assignProjCalled, setAssignProjCalled] = useState("");
  const [assignProjCurrentValue, setAssignProjCurrentValue] = useState("");
  const [assignProjSaving, setAssignProjSaving] = useState(false);

  useEffect(() => { fetchInvestorProfile(investorId).then(setProfile); loadEntities(); }, [investorId]);
  function loadEntities() { fetchEntities(investorId).then(setEntities).catch(() => setEntities([])); }

  async function handleCreateEntity(e) {
    e.preventDefault();
    try {
      if (editingEntity) {
        await updateEntity(editingEntity.id, entityForm);
        toast("Entity updated");
        setEditingEntity(null);
      } else {
        await createEntity(investorId, entityForm);
        toast("Entity created");
      }
      setShowEntityForm(false);
      setEntityForm({ name: "", type: "Individual", taxId: "", address: "", state: "", isDefault: false });
      loadEntities();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDeleteEntity(entityId) {
    try { await deleteEntity(entityId); toast("Entity deleted"); loadEntities(); } catch (err) { toast(err.message, "error"); }
  }

  if (!profile) return <p style={{ color: colors.mutedText }}>Loading...</p>;

  const section = { background: colors.white, borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" };
  const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

  return (
    <>
      <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={onBack}>← Back to investors</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: colors.lightBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#666" }}>
            {profile.initials || profile.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 400 }}>{profile.name}</h1>
            <div style={{ fontSize: 13, color: colors.mutedText }}>{profile.email} · {profile.role === "INVESTOR" ? "Limited Partner" : profile.role} · Joined {profile.joined}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge status={profile.status} />
          {(profile.status === "LOCKED" || profile.locked) && (
            <Button onClick={async () => {
              try { await unlockInvestor(investorId); toast("Account unlocked"); const updated = await fetchInvestorProfile(investorId); setProfile(updated); } catch (e) { toast(e.message, "error"); }
            }} style={{ padding: "4px 12px", fontSize: 11, background: "#D97706" }}>Unlock Account</Button>
          )}
        </div>
      </div>

      {/* Groups */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Groups</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profile.groups.length > 0 ? profile.groups.map(g => (
            <span key={g.id} style={{ padding: "4px 12px", borderRadius: 16, fontSize: 12, background: g.color ? `${g.color}20` : colors.lightBorder, color: g.color || "#666", border: `1px solid ${g.color ? `${g.color}40` : "#E0DDD8"}` }}>{g.name}</span>
          )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No groups assigned</span>}
        </div>
      </Card>

      {/* Accreditation */}
      <AccreditationSection investorId={investorId} profile={profile} setProfile={setProfile} toast={toast} />

      {/* Investment Entities */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={sectionTitle}>Investment Entities</div>
          <Button variant="outline" onClick={() => setShowEntityForm(!showEntityForm)} style={{ padding: "4px 10px", fontSize: 11 }}>{showEntityForm ? "Cancel" : "Add Entity"}</Button>
        </div>
        {showEntityForm && (
          <form onSubmit={handleCreateEntity} style={{ padding: "12px", background: colors.cardBg, borderRadius: 4, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Name</label>
                <input value={entityForm.name} onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))} required style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="Entity name" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Type</label>
                <select value={entityForm.type} onChange={e => setEntityForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}>
                  <option>Individual</option><option>LLC</option><option>Trust</option><option>IRA</option><option>Corporation</option><option>Partnership</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Tax ID</label>
                <input value={entityForm.taxId} onChange={e => setEntityForm(f => ({ ...f, taxId: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="EIN/SSN" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>Address</label>
                <input value={entityForm.address} onChange={e => setEntityForm(f => ({ ...f, address: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="123 Main St" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: colors.mutedText }}>State/Province</label>
                <input value={entityForm.state} onChange={e => setEntityForm(f => ({ ...f, state: e.target.value }))} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} placeholder="e.g. BC" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 4 }}>
                <input type="checkbox" checked={entityForm.isDefault} onChange={e => setEntityForm(f => ({ ...f, isDefault: e.target.checked }))} />
                <label style={{ fontSize: 11, color: "#666" }}>Default entity</label>
              </div>
              <Button type="submit" style={{ padding: "6px 12px", fontSize: 11 }}>{editingEntity ? "Save" : "Create"}</Button>
            </div>
          </form>
        )}
        <div className="admin-table-scroll">
        {entities.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 60px 70px 40px 40px", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 0", borderBottom: "1px solid #E8E5DE" }}>
            <span>Entity Name</span><span>Type</span><span>Tax ID</span><span>State</span><span>Default</span><span></span><span></span>
          </div>
        ) : null}
        {entities.map(e => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 60px 70px 40px 40px", padding: "10px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13, alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 500 }}>{e.name}</span>
              {e.address && <div style={{ fontSize: 11, color: "#999" }}>{e.address}</div>}
            </div>
            <span style={{ color: "#666" }}>{e.type}</span>
            <span style={{ color: colors.mutedText, fontSize: 11 }}>{e.taxId || "\u2014"}</span>
            <span style={{ color: colors.mutedText }}>{e.state || "\u2014"}</span>
            <span>{e.isDefault ? <span style={{ fontSize: 10, padding: "2px 6px", background: "#EFE", color: colors.green, borderRadius: 3 }}>Default</span> : ""}</span>
            <span onClick={() => { setEditingEntity(e); setEntityForm({ name: e.name, type: e.type, taxId: e.taxId || "", address: e.address || "", state: e.state || "", isDefault: e.isDefault }); setShowEntityForm(true); }} style={{ fontSize: 11, color: colors.red, cursor: "pointer" }}>Edit</span>
            <span onClick={() => handleDeleteEntity(e.id)} style={{ fontSize: 14, color: "#CCC", cursor: "pointer" }}>&times;</span>
          </div>
        ))}
        </div>
        {entities.length === 0 && !showEntityForm && <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No entities</span>}
      </Card>

      {/* Projects + KPIs */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Project Investments</div>
        {profile.projects.length > 0 ? profile.projects.map(p => (
          <div key={p.projectId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${colors.lightBorder}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.projectName}</div>
              <div style={{ fontSize: 11, color: colors.mutedText }}>{p.projectStatus}</div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#666", alignItems: "center" }}>
              <span>${fmt(p.committed)} committed</span>
              <span>${fmt(p.currentValue)} value</span>
              <span>{p.irr}% IRR <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "#EFE", color: colors.green, marginLeft: 2, verticalAlign: "middle" }}>calculated</span></span>
              <span>{p.moic}x MOIC <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "#EFE", color: colors.green, marginLeft: 2, verticalAlign: "middle" }}>calculated</span></span>
            </div>
          </div>
        )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No project assignments</span>}

        {/* Assign to Project */}
        <div style={{ marginTop: 16 }}>
          {!showAssignProject ? (
            <Button variant="outline" onClick={async () => {
              const projects = await fetchAdminProjects();
              setAssignProjList(Array.isArray(projects) ? projects : []);
              setShowAssignProject(true);
            }} style={{ fontSize: 12 }}>Assign to Project</Button>
          ) : (
            <div style={{ background: colors.cardBg, borderRadius: 8, padding: "16px", border: "1px solid #E8E5DE", marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Assign to Project</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Project</label>
                <select value={assignProjId} onChange={e => setAssignProjId(e.target.value)} style={inputStyle}>
                  <option value="">Select project...</option>
                  {assignProjList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Committed ($)</label>
                  <input type="number" value={assignProjCommitted} onChange={e => setAssignProjCommitted(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Called ($)</label>
                  <input type="number" value={assignProjCalled} onChange={e => setAssignProjCalled(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Current Value ($)</label>
                  <input type="number" value={assignProjCurrentValue} onChange={e => setAssignProjCurrentValue(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="outline" onClick={() => setShowAssignProject(false)} style={{ fontSize: 12 }}>Cancel</Button>
                <Button disabled={assignProjSaving || !assignProjId} onClick={async () => {
                  setAssignProjSaving(true);
                  try {
                    await assignInvestorProject(investorId, {
                      projectId: assignProjId,
                      committed: Number(assignProjCommitted) || 0,
                      called: Number(assignProjCalled) || 0,
                      currentValue: Number(assignProjCurrentValue) || 0,
                    });
                    toast("Investor assigned to project");
                    const updated = await fetchInvestorProfile(investorId);
                    setProfile(updated);
                    setShowAssignProject(false);
                    setAssignProjId(""); setAssignProjCommitted(""); setAssignProjCalled(""); setAssignProjCurrentValue("");
                  } catch (e) { toast(e.message, "error"); }
                  finally { setAssignProjSaving(false); }
                }} style={{ fontSize: 12, opacity: assignProjSaving ? 0.5 : 1 }}>
                  {assignProjSaving ? "Saving..." : "Assign"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Cash Flows */}
      {profile.projects.length > 0 && (
        <InvestorCashFlowsSection investorId={investorId} investorName={profile.name} projects={profile.projects} toast={toast} />
      )}

      {/* Documents Access */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Document Access ({(profile.documents.assigned.length + profile.documents.projectDocs.length + profile.documents.generalDocs.length)} documents)</div>
        {[...profile.documents.assigned, ...profile.documents.projectDocs, ...profile.documents.generalDocs].slice(0, 10).map((d, i) => (
          <div key={`${d.id}-${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
            <span>{d.name}</span>
            <span style={{ color: colors.mutedText, fontSize: 12 }}>{d.category} · {d.date}</span>
          </div>
        ))}
      </Card>

      {/* Recent Messages */}
      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>Recent Messages</div>
        {profile.recentThreads.length > 0 ? profile.recentThreads.map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F3F0", fontSize: 13 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {t.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.red }} />}
              <span>{t.subject}</span>
            </div>
            <span style={{ color: colors.mutedText, fontSize: 11 }}>{new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {t.targetType}</span>
          </div>
        )) : <span style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>No messages</span>}
      </Card>

      {/* Activity Timeline */}
      <ActivityTimeline userId={investorId} />
    </>
  );
}

