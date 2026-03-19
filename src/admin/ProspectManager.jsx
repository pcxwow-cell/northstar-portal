import { useState, useEffect } from "react";
import { fetchProspects, updateProspectStatus, fetchProspectStats, inviteInvestor } from "../api.js";
import { colors, fonts } from "../styles/theme.js";
import SectionHeader from "../components/SectionHeader.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import Button from "../components/Button.jsx";

function useSortable(defaultSort = "", defaultDir = "asc") {
  const [sortBy, setSortBy] = useState(defaultSort);
  const [sortDir, setSortDir] = useState(defaultDir);
  function onSort(key) {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  }
  function sortData(data) {
    if (!sortBy) return data;
    return [...data].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }
  return { sortBy, sortDir, onSort, sortData };
}

export default function ProspectManager({ toast }) {
  const [prospects, setProspects] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prospectSearch, setProspectSearch] = useState("");
  const prospectSort = useSortable("name");

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

  const statusColors = {
    new: "#2563EB", contacted: "#8B7128", qualified: colors.green, converted: "#7C3AED", declined: "#999",
  };

  if (loading && !prospects.length) return <div style={{ padding: 40, color: colors.mutedText, textAlign: "center" }}>Loading prospects...</div>;

  return (
    <div>
      <SectionHeader title="Prospect Leads" style={{ marginBottom: 24 }} />

      {/* Stats Badges */}
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

      {/* Table */}
      {(() => {
        const filteredProspects = prospectSort.sortData(prospects.filter(p => {
          if (!prospectSearch) return true;
          const q = prospectSearch.toLowerCase();
          return (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q) || (p.investmentRange || "").toLowerCase().includes(q) || (p.interestedProject?.name || "").toLowerCase().includes(q) || (p.status || "").toLowerCase().includes(q);
        }).map(p => ({ ...p, projectName: p.interestedProject?.name || "General" })));
        return (
      <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", background: colors.white }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
              {[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "investmentRange", label: "Interest Range" }, { key: "projectName", label: "Project" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Date" }].map(col => (
                <th key={col.key} onClick={() => prospectSort.onSort(col.key)} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", cursor: "pointer", userSelect: "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {prospectSort.sortBy === col.key && <span style={{ fontSize: 8 }}>{prospectSort.sortDir === "asc" ? "▲" : "▼"}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProspects.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>No prospects found</td></tr>
            )}
            {filteredProspects.map(p => (
              <>
                <tr key={p.id} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={{
                  borderBottom: "1px solid #F0EDEA", cursor: "pointer", transition: "background .1s",
                }} onMouseEnter={e => e.currentTarget.style.background = colors.cardBg}
                   onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: colors.darkText }}>{p.name}</td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>{p.email}</td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>{p.investmentRange || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>{p.interestedProject?.name || "General"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 3,
                      background: `${statusColors[p.status] || "#999"}15`,
                      color: statusColors[p.status] || "#999",
                      fontWeight: 500, textTransform: "capitalize",
                    }}>{p.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: colors.mutedText, fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
                {expandedId === p.id && (
                  <tr key={`${p.id}-detail`}>
                    <td colSpan={6} style={{ padding: "16px 24px", background: colors.cardBg, borderBottom: "1px solid #E8E5DE" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Phone</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.phone || "Not provided"}</span></div>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Entity Type</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.entityType || "Not specified"}</span></div>
                        <div><span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Accreditation</span><span style={{ fontSize: 13, color: colors.darkText }}>{p.accreditationStatus || "Not specified"}</span></div>
                      </div>
                      {p.message && (
                        <div style={{ marginBottom: 16 }}>
                          <span style={{ fontSize: 11, color: "#AAA", display: "block", marginBottom: 4 }}>Message</span>
                          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, background: colors.white, padding: "12px 16px", borderRadius: 4, border: "1px solid #E8E5DE" }}>{p.message}</p>
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
            ))}
          </tbody>
        </table>
      </div>
        );
      })()}
    </div>
  );
}
