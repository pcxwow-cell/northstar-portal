import { useState, useEffect } from "react";
import { fetchAdminInvestors, fetchAdminProjects, inviteInvestor, approveInvestor, deactivateInvestor, resetInvestorPassword, updateInvestor, updateInvestorKPI, exportInvestorsCSV, bulkInviteInvestors, bulkApproveInvestors, bulkDeactivateInvestors, fmt } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";

function SortableHeader({ columns, sortBy, sortDir, onSort }) {
  return columns.map(col => (
    <span key={col.key} onClick={() => onSort(col.key)} style={{
      fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText,
      cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4,
    }}>
      {col.label}
      {sortBy === col.key && <span style={{ fontSize: 8 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
    </span>
  ));
}

function CredentialDialog({ name, email, tempPassword, onClose }) {
  const [copied, setCopied] = useState(false);
  const copyText = `Email: ${email}\nTemporary Password: ${tempPassword}`;
  function handleCopy() {
    navigator.clipboard.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <Modal open={true} onClose={onClose} title="Investor Created" maxWidth={440}>
      <p style={{ fontSize: 13, color: colors.mutedText, marginBottom: 20 }}>Save these credentials — the password cannot be retrieved later.</p>
      <div style={{ background: colors.cardBg, border: "1px solid #ECEAE5", borderRadius: 8, padding: "16px 20px", marginBottom: 20, fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
        <div><span style={{ color: "#999" }}>Name:</span> <strong>{name}</strong></div>
        <div><span style={{ color: "#999" }}>Email:</span> <strong>{email}</strong></div>
        <div><span style={{ color: "#999" }}>Password:</span> <strong style={{ color: colors.red }}>{tempPassword}</strong></div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleCopy} style={{ flex: 1, padding: "10px", background: copied ? colors.green : colors.red, color: colors.white, border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
          {copied ? "\u2713 Copied!" : "Copy Credentials"}
        </button>
        <button onClick={onClose} style={{ padding: "10px 20px", background: "#F5F3EF", border: "1px solid #ECEAE5", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#666" }}>
          Close
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#AAA", marginTop: 12 }}>A welcome email has been sent to {email}.</p>
    </Modal>
  );
}

function KPIInput({ label, defaultValue, onSave }) {
  const [val, setVal] = useState(defaultValue ?? "");
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 10, color: "#AAA" }}>{label}</label>
      <input value={val} onChange={e => setVal(e.target.value)} onBlur={() => onSave(val)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }} />
    </div>
  );
}

export default function InvestorManager({ toast, onViewProfile, hideHeader }) {
  const [investors, setInvestors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showInvite, setShowInvite] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [editing, setEditing] = useState(null);
  const [editingKPI, setEditingKPI] = useState(null);
  const [invLoading, setInvLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);

  function reload() {
    setInvLoading(true);
    fetchAdminInvestors({ search, status: statusFilter, projectId: projectFilter, sortBy, sortDir }).then(setInvestors).finally(() => setInvLoading(false));
  }
  useEffect(() => { reload(); }, [search, statusFilter, projectFilter, sortBy, sortDir]);
  useEffect(() => { fetchAdminProjects().then(setProjects); }, []);

  const [credentialDialog, setCredentialDialog] = useState(null);

  async function handleInvite(e) {
    e.preventDefault();
    try {
      const result = await inviteInvestor({ name: inviteName, email: inviteEmail });
      setCredentialDialog({ name: result.name, email: inviteEmail, tempPassword: result.tempPassword });
      setShowInvite(false); setInviteName(""); setInviteEmail(""); reload();
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleApprove(id) {
    try { await approveInvestor(id); toast("Investor approved"); reload(); } catch (e) { toast(e.message, "error"); }
  }
  async function handleDeactivate(id) {
    try { await deactivateInvestor(id); toast("Investor deactivated"); reload(); } catch (e) { toast(e.message, "error"); }
  }
  async function handleResetPw(id) {
    try {
      const inv = investors.find(i => i.id === id);
      const r = await resetInvestorPassword(id);
      setCredentialDialog({ name: inv?.name || "Investor", email: inv?.email || "", tempPassword: r.tempPassword });
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleEditSave(id, data) {
    try { await updateInvestor(id, data); toast("Updated"); reload(); setEditing(null); } catch (e) { toast(e.message, "error"); }
  }
  async function handleKPISave(userId, projectId, data) {
    try { await updateInvestorKPI(userId, projectId, data); toast("KPI updated"); reload(); setEditingKPI(null); } catch (e) { toast(e.message, "error"); }
  }

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  function handleBulkFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file); setBulkResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.trim().split("\n").filter(l => l.trim());
      if (lines.length < 2) { setBulkPreview([]); return; }
      setBulkPreview(lines.slice(1, 11).map(l => { const p = l.split(",").map(s => s.trim().replace(/^"|"$/g, "")); return { name: p[0] || "", email: p[1] || "" }; }));
    };
    reader.readAsText(file);
  }
  async function handleBulkInvite() {
    if (!bulkFile) return;
    setBulkLoading(true);
    try { const r = await bulkInviteInvestors(bulkFile); setBulkResult(r); if (r.success > 0) reload(); }
    catch (e) { toast(e.message, "error"); } finally { setBulkLoading(false); }
  }

  function toggleSelect(id) { setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
  function toggleSelectAll() { selectedIds.size === investors.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(investors.map(i => i.id))); }
  async function handleBulkAction(fn, label) {
    try { const r = await fn([...selectedIds]); toast(`${r.success} investor(s) ${label}`); setSelectedIds(new Set()); reload(); } catch (e) { toast(e.message, "error"); }
  }

  if (invLoading && investors.length === 0) return <Spinner />;

  return (
    <>
      {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
      {credentialDialog && <CredentialDialog {...credentialDialog} onClose={() => setCredentialDialog(null)} />}
      {showBulkInvite && (
        <Modal open={true} onClose={() => setShowBulkInvite(false)} title="Bulk Invite Investors" maxWidth={520}>
          <p style={{ fontSize: 13, color: colors.mutedText, marginBottom: 16 }}>Upload a CSV file with <strong>name</strong> and <strong>email</strong> columns.</p>
          <input type="file" accept=".csv" onChange={handleBulkFileChange} style={{ marginBottom: 16, fontSize: 13 }} />
          {bulkPreview.length > 0 && !bulkResult && (
            <div style={{ marginBottom: 16, maxHeight: 200, overflowY: "auto", border: "1px solid #E8E5DE", borderRadius: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "8px 12px", fontSize: 11, color: colors.mutedText, borderBottom: "1px solid #E8E5DE", textTransform: "uppercase" }}><span>Name</span><span>Email</span></div>
              {bulkPreview.map((r, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "6px 12px", fontSize: 12, borderBottom: "1px solid #F5F3F0" }}><span>{r.name}</span><span>{r.email}</span></div>)}
            </div>
          )}
          {bulkResult && (
            <div style={{ padding: 16, borderRadius: 8, background: bulkResult.failed.length ? colors.warningBg : colors.successBg, marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 500 }}>{bulkResult.success} invited successfully{bulkResult.failed.length > 0 && `, ${bulkResult.failed.length} failed`}</div>
              {bulkResult.failed.map((f, i) => <div key={i} style={{ fontSize: 12, color: colors.red, marginTop: 4 }}>Row {f.row}: {f.error}</div>)}
            </div>
          )}
          {!bulkResult && <Button onClick={handleBulkInvite} disabled={!bulkFile || bulkLoading} style={{ opacity: !bulkFile || bulkLoading ? 0.5 : 1 }}>{bulkLoading ? "Importing..." : "Import & Invite"}</Button>}
          {bulkResult && <Button onClick={() => setShowBulkInvite(false)}>Done</Button>}
        </Modal>
      )}
      {!hideHeader && <SectionHeader title="Investors" size="lg" style={{ marginBottom: 24 }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedIds.size > 0 && <>
            <Button onClick={() => handleBulkAction(bulkApproveInvestors, "approved")} style={{ fontSize: 12, background: colors.green }}>Approve Selected ({selectedIds.size})</Button>
            <Button onClick={() => setConfirmAction({ title: "Deactivate Selected", message: `Deactivate ${selectedIds.size} investor(s)?`, danger: true, onConfirm: () => { setConfirmAction(null); handleBulkAction(bulkDeactivateInvestors, "deactivated"); } })} variant="outline" style={{ fontSize: 12, color: colors.red, borderColor: colors.red }}>Deactivate Selected</Button>
          </>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={() => exportInvestorsCSV().catch(e => toast?.(e.message, "error"))} style={{ fontSize: 12 }}>Export CSV</Button>
          <Button variant="outline" onClick={() => { setShowBulkInvite(true); setBulkFile(null); setBulkPreview([]); setBulkResult(null); }} style={{ fontSize: 12 }}>Bulk Invite (CSV)</Button>
          <Button onClick={() => setShowInvite(!showInvite)}>{showInvite ? "Cancel" : "Invite Investor"}</Button>
        </div>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="admin-form-row" style={{ background: colors.white, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Full Name</label>
            <input value={inviteName} onChange={e => setInviteName(e.target.value)} required style={inputStyle} placeholder="James Chen" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required style={inputStyle} placeholder="investor@example.com" />
          </div>
          <Button type="submit">Send Invite</Button>
        </form>
      )}

      {/* Search + Filters */}
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search by name or email..." filters={[
        { value: statusFilter, onChange: setStatusFilter, label: "Status filter", options: [{ value: "", label: "All Statuses" }, { value: "ACTIVE", label: "Active" }, { value: "PENDING", label: "Pending" }, { value: "INACTIVE", label: "Inactive" }] },
        { value: projectFilter, onChange: setProjectFilter, label: "Project filter", options: [{ value: "", label: "All Projects" }, ...projects.map(p => ({ value: p.id, label: p.name }))] },
      ]} />

      {/* Column headers */}
      <Card className="admin-table-scroll" padding="0" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 100px 120px 120px 140px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", alignItems: "center" }}>
          <input type="checkbox" checked={investors.length > 0 && selectedIds.size === investors.length} onChange={toggleSelectAll} style={{ cursor: "pointer" }} />
          <SortableHeader columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "status", label: "Status" },
            { key: "committed", label: "Committed" },
            { key: "value", label: "Value" },
          ]} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: colors.mutedText }}>Actions</span>
        </div>

        {investors.map((inv) => (
          <div key={inv.id}>
            <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 100px 120px 120px 140px", padding: "14px 20px", borderBottom: `1px solid ${colors.lightBorder}`, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)} style={{ cursor: "pointer" }} />
              <span style={{ fontWeight: 500 }}>{inv.name}</span>
              <span style={{ color: "#666" }}>{inv.email}</span>
              <span><StatusBadge status={inv.status} size="sm" /></span>
              <span>${fmt(inv.totalCommitted)}</span>
              <span>${fmt(inv.totalValue)}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button onClick={() => onViewProfile?.(inv.id)} style={{ padding: "4px 10px", fontSize: 11 }}>View</Button>
                <Button onClick={() => setEditing(editing === inv.id ? null : inv.id)} variant="outline" style={{ padding: "4px 10px", fontSize: 11 }}>Edit</Button>
                {inv.status === "PENDING" && <Button onClick={() => handleApprove(inv.id)} style={{ padding: "4px 10px", fontSize: 11, background: colors.green }}>Approve</Button>}
                {inv.status === "PENDING" && <Button onClick={() => setConfirmAction({ title: "Reject Investor", message: `Reject investor "${inv.name}"? This will deactivate their account.`, danger: true, onConfirm: () => { setConfirmAction(null); handleDeactivate(inv.id); } })} variant="outline" style={{ padding: "4px 10px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Reject</Button>}
                {inv.status === "ACTIVE" && <Button onClick={() => setConfirmAction({ title: "Deactivate Investor", message: `Deactivate ${inv.name}? They will no longer be able to log in.`, danger: true, onConfirm: () => { setConfirmAction(null); handleDeactivate(inv.id); } })} variant="outline" style={{ padding: "4px 10px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Deactivate</Button>}
              </div>
            </div>

            {/* Expanded edit panel */}
            {editing === inv.id && (
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.lightBorder}`, background: colors.cardBg }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#888" }}>Name</label>
                    <input defaultValue={inv.name} onBlur={e => e.target.value !== inv.name && handleEditSave(inv.id, { name: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#888" }}>Email</label>
                    <input defaultValue={inv.email} onBlur={e => e.target.value !== inv.email && handleEditSave(inv.id, { email: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#888" }}>Actions</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <Button onClick={() => handleResetPw(inv.id)} variant="outline" style={{ fontSize: 11, padding: "6px 10px" }}>Reset Password</Button>
                    </div>
                  </div>
                </div>

                {/* Project KPIs */}
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#666" }}>Project KPIs / Returns</div>
                {inv.projects.map(p => (
                  <div key={p.projectId} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, padding: "8px 12px", background: colors.white, borderRadius: 4, border: "1px solid #E8E5DE" }}>
                    <span style={{ width: 100, fontWeight: 500, fontSize: 13 }}>{p.projectName}</span>
                    {editingKPI === `${inv.id}-${p.projectId}` ? (
                      <>
                        <KPIInput label="Committed" defaultValue={p.committed} onSave={v => handleKPISave(inv.id, p.projectId, { committed: parseFloat(v) })} />
                        <KPIInput label="Called" defaultValue={p.called} onSave={v => handleKPISave(inv.id, p.projectId, { called: parseFloat(v) })} />
                        <KPIInput label="Value" defaultValue={p.currentValue} onSave={v => handleKPISave(inv.id, p.projectId, { currentValue: parseFloat(v) })} />
                        <KPIInput label="IRR %" defaultValue={p.irr} onSave={v => handleKPISave(inv.id, p.projectId, { irr: parseFloat(v) })} />
                        <KPIInput label="MOIC" defaultValue={p.moic} onSave={v => handleKPISave(inv.id, p.projectId, { moic: parseFloat(v) })} />
                        <Button onClick={() => setEditingKPI(null)} variant="outline" style={{ fontSize: 11, padding: "4px 8px" }}>Done</Button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 12, color: "#666" }}>${fmt(p.committed)} committed · ${fmt(p.currentValue)} value · {p.irr}% IRR · {p.moic}x</span>
                        <Button onClick={() => setEditingKPI(`${inv.id}-${p.projectId}`)} variant="outline" style={{ fontSize: 11, padding: "4px 8px", marginLeft: "auto" }}>Edit KPIs</Button>
                      </>
                    )}
                  </div>
                ))}
                {inv.projects.length === 0 && <div style={{ fontSize: 12, color: colors.mutedText, fontStyle: "italic" }}>No project assignments</div>}
              </div>
            )}
          </div>
        ))}
        {investors.length === 0 && <div style={{ padding: 24, color: colors.mutedText, textAlign: "center" }}>No investors found</div>}
      </Card>
    </>
  );
}
