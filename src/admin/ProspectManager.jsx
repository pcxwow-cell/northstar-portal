import { useState, useEffect } from "react";
import { fetchProspects, updateProspectStatus, updateProspect, fetchProspectStats, inviteInvestor } from "../api.js";
import { colors, fonts, inputStyle } from "../styles/theme.js";
import SectionHeader from "../components/SectionHeader.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import useSortable from "../hooks/useSortable.js";

const LEAD_SOURCES = ["Website", "Referral", "Event", "Cold Outreach", "Other"];

export default function ProspectManager({ toast }) {
  const [prospects, setProspects] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prospectSearch, setProspectSearch] = useState("");
  const prospectSort = useSortable("name");

  // Notes modal
  const [notesModal, setNotesModal] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [editLeadSource, setEditLeadSource] = useState("");
  const [editFollowUpDate, setEditFollowUpDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        fetchProspects(filterStatus !== "all" ? { status: filterStatus } : {}),
        fetchProspectStats(),
      ]);
      setProspects(list);
      setStats(s);
    } catch (err) {
      toast("Failed to load prospects: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus]);

  async function handleStatusChange(id, newStatus) {
    try {
      await updateProspectStatus(id, newStatus);
      toast("Prospect status updated", "success");
      load();
    } catch (err) {
      toast("Failed to update: " + err.message, "error");
    }
  }

  function openNotesModal(p) {
    setNotesModal(p);
    setEditNotes(p.notes || "");
    setEditLeadSource(p.leadSource || "");
    setEditFollowUpDate(p.followUpDate ? p.followUpDate.split("T")[0] : "");
  }

  async function saveProspectDetails() {
    if (!notesModal) return;
    try {
      await updateProspect(notesModal.id, {
        notes: editNotes,
        leadSource: editLeadSource,
        followUpDate: editFollowUpDate ? new Date(editFollowUpDate).toISOString() : null,
      });
      toast("Prospect updated", "success");
      setNotesModal(null);
      load();
    } catch (err) {
      toast("Failed to save: " + err.message, "error");
    }
  }

  const statusColors = {
    new: "#2563EB", contacted: "#8B7128", qualified: colors.green, converted: "#7C3AED", declined: "#999",
  };

  const isOverdue = (p) => p.followUpDate && new Date(p.followUpDate) < new Date() && p.status !== "converted" && p.status !== "declined";

  if (loading && !prospects.length) return <div style={{ padding: 40, color: colors.mutedText, textAlign: "center" }}>Loading prospects...</div>;

  return (
    <div>
      <SectionHeader title="Prospect Leads" style={{ marginBottom: 24 }} />

      {/* Pipeline Summary Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All", count: stats.total },
            { key: "new", label: "New", count: stats.new, color: "#2563EB" },
            { key: "contacted", label: "Contacted", count: stats.contacted, color: "#8B7128" },
            { key: "qualified", label: "Qualified", count: stats.qualified, color: colors.green },
            { key: "converted", label: "Converted", count: stats.converted, color: "#7C3AED" },
            { key: "declined", label: "Declined", count: stats.declined, color: colors.mutedText },
          ].map(s => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{
              padding: "6px 14px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: fonts.sans,
              display: "flex", alignItems: "center", gap: 6,
              background: filterStatus === s.key ? (s.color || colors.darkText) : colors.white,
              color: filterStatus === s.key ? colors.white : (s.color || colors.darkText),
              border: `1px solid ${filterStatus === s.key ? "transparent" : "#DDD"}`,
              fontWeight: filterStatus === s.key ? 500 : 400,
            }}>
              {s.label}
              <span style={{
                padding: "1px 6px", borderRadius: 8, fontSize: 10,
                background: filterStatus === s.key ? "rgba(255,255,255,.25)" : `${s.color || colors.darkText}15`,
                color: filterStatus === s.key ? colors.white : (s.color || colors.darkText),
              }}>{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <SearchFilterBar search={prospectSearch} onSearchChange={setProspectSearch} placeholder="Search prospects..." />
      </div>

      {/* Notes/Details Modal */}
      <Modal open={!!notesModal} onClose={() => setNotesModal(null)} title={notesModal ? `${notesModal.name} - Details` : "Prospect Details"} maxWidth={500}>
        {notesModal && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Lead Source</label>
              <select value={editLeadSource} onChange={e => setEditLeadSource(e.target.value)} style={inputStyle}>
                <option value="">Select source...</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Follow-up Date</label>
              <input type="date" value={editFollowUpDate} onChange={e => setEditFollowUpDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Notes</label>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={5} placeholder="Add notes about this prospect..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setNotesModal(null)}>Cancel</Button>
              <Button onClick={saveProspectDetails}>Save</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Table */}
      <ProspectTable
        prospects={prospects}
        prospectSearch={prospectSearch}
        prospectSort={prospectSort}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        statusColors={statusColors}
        isOverdue={isOverdue}
        handleStatusChange={handleStatusChange}
        openNotesModal={openNotesModal}
        toast={toast}
        load={load}
      />
    </div>
  );
}

// Extracted to sub-component to keep main under 300 lines
function ProspectTable({ prospects, prospectSearch, prospectSort, expandedId, setExpandedId, statusColors, isOverdue, handleStatusChange, openNotesModal, toast, load }) {
  const filteredProspects = prospectSort.sortData(prospects.filter(p => {
    if (!prospectSearch) return true;
    const q = prospectSearch.toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q) || (p.investmentRange || "").toLowerCase().includes(q) || (p.interestedProject?.name || "").toLowerCase().includes(q) || (p.status || "").toLowerCase().includes(q) || (p.leadSource || "").toLowerCase().includes(q);
  }).map(p => ({ ...p, projectName: p.interestedProject?.name || "General" })));

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", background: colors.white }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
            {[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "leadSource", label: "Source" }, { key: "investmentRange", label: "Interest Range" }, { key: "projectName", label: "Project" }, { key: "status", label: "Status" }, { key: "followUpDate", label: "Follow-up" }].map(col => (
              <th key={col.key} onClick={() => prospectSort.onSort(col.key)} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", cursor: "pointer", userSelect: "none" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {col.label}
                  {prospectSort.sortBy === col.key && <span style={{ fontSize: 8 }}>{prospectSort.sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredProspects.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>No prospects found</td></tr>
          )}
          {filteredProspects.map(p => (
            <ProspectRow key={p.id} p={p} expandedId={expandedId} setExpandedId={setExpandedId} statusColors={statusColors} isOverdue={isOverdue} handleStatusChange={handleStatusChange} openNotesModal={openNotesModal} toast={toast} load={load} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProspectRow({ p, expandedId, setExpandedId, statusColors, isOverdue, handleStatusChange, openNotesModal, toast, load }) {
  const overdue = isOverdue(p);
  const followUpStr = p.followUpDate ? new Date(p.followUpDate).toLocaleDateString() : "\u2014";

  return (
    <>
      <tr onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={{
        borderBottom: "1px solid #F0EDEA", cursor: "pointer", transition: "background .1s",
        background: overdue ? `${colors.red}06` : "transparent",
      }} onMouseEnter={e => e.currentTarget.style.background = overdue ? `${colors.red}0A` : colors.cardBg}
         onMouseLeave={e => e.currentTarget.style.background = overdue ? `${colors.red}06` : "transparent"}>
        <td style={{ padding: "12px 16px", fontWeight: 500, color: colors.darkText }}>{p.name}</td>
        <td style={{ padding: "12px 16px", color: "#666" }}>{p.email}</td>
        <td style={{ padding: "12px 16px", color: "#666" }}>
          {p.leadSource ? (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: "#F5F3F0", color: "#555" }}>{p.leadSource}</span>
          ) : "\u2014"}
        </td>
        <td style={{ padding: "12px 16px", color: "#666" }}>{p.investmentRange || "\u2014"}</td>
        <td style={{ padding: "12px 16px", color: "#666" }}>{p.interestedProject?.name || "General"}</td>
        <td style={{ padding: "12px 16px" }}>
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 3,
            background: `${statusColors[p.status] || "#999"}15`,
            color: statusColors[p.status] || "#999",
            fontWeight: 500, textTransform: "capitalize",
          }}>{p.status}</span>
        </td>
        <td style={{ padding: "12px 16px", fontSize: 12 }}>
          {overdue ? (
            <span style={{ color: colors.red, fontWeight: 500 }}>{followUpStr} (overdue)</span>
          ) : (
            <span style={{ color: colors.mutedText }}>{followUpStr}</span>
          )}
        </td>
      </tr>
      {expandedId === p.id && (
        <tr key={`${p.id}-detail`}>
          <td colSpan={7} style={{ padding: "16px 24px", background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Phone</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.phone || "Not provided"}</span></div>
              <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Entity Type</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.entityType || "Not specified"}</span></div>
              <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Accreditation</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.accreditationStatus || "Not specified"}</span></div>
              <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Lead Source</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.leadSource || "Not specified"}</span></div>
            </div>
            {p.message && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Message</span>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, background: colors.white, padding: "12px 16px", borderRadius: 4, border: "1px solid #E8E5DE", margin: 0 }}>{p.message}</p>
              </div>
            )}
            {p.notes && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Notes</span>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, background: colors.white, padding: "12px 16px", borderRadius: 4, border: "1px solid #E8E5DE", margin: 0 }}>{p.notes}</p>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "#888" }}>Update status:</span>
              <select value={p.status} onChange={e => handleStatusChange(p.id, e.target.value)} style={{
                padding: "6px 12px", border: "1px solid #DDD", borderRadius: 4, fontSize: 12, fontFamily: fonts.sans,
              }}>
                {["new", "contacted", "qualified", "converted", "declined"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <Button variant="outline" onClick={() => openNotesModal(p)} style={{ padding: "4px 12px", fontSize: 11 }}>Edit Details</Button>
              {p.status !== "converted" && (
                <Button onClick={async () => {
                  if (!confirm(`Convert "${p.name}" to an investor? This will send them an invitation.`)) return;
                  try {
                    await inviteInvestor({ name: p.name, email: p.email });
                    await updateProspectStatus(p.id, "converted");
                    toast(`${p.name} converted to investor`);
                    load();
                  } catch (e) { toast(e.message, "error"); }
                }} style={{ padding: "4px 12px", fontSize: 11, background: "#7C3AED" }}>Convert to Investor</Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
