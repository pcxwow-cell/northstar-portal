import { useState, useEffect } from "react";
import { fetchAuditLog, exportAuditLogCSV } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import Button from "../components/Button.jsx";
import useSortable from "../hooks/useSortable.js";

function AdminError({ message, onRetry }) {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p style={{ color: colors.red, marginBottom: 12 }}>{message}</p>
      {onRetry && <Button onClick={onRetry} variant="outline">Retry</Button>}
    </div>
  );
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const auditSort = useSortable("createdAt", "desc");

  const actionTypes = ["all", "login", "logout", "document_download", "document_upload", "signature_request", "signature_sign", "profile_update", "investor_invite", "project_update", "cash_flow_record", "prospect_submit"];

  function loadLogs(p = page) {
    setLoading(true); setError(null);
    const params = { page: p, limit };
    if (actionFilter !== "all") params.action = actionFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    fetchAuditLog(params).then(data => {
      // Handle both old format (array) and new format ({ entries, total })
      if (Array.isArray(data)) { setLogs(data); setTotal(data.length); }
      else { setLogs(data.entries || []); setTotal(data.total || 0); setPage(data.page || 1); }
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => { setPage(1); loadLogs(1); }, [actionFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filteredLogs = auditSort.sortData(logs.filter(log => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (log.user || "").toLowerCase().includes(q) || (log.action || "").toLowerCase().includes(q) || (log.resource || "").toLowerCase().includes(q) || (log.ipAddress || "").toLowerCase().includes(q);
  }));

  return (
    <>
      <SectionHeader title="Audit Log" size="lg" right={<Button onClick={() => exportAuditLogCSV({ startDate, endDate, action: actionFilter !== "all" ? actionFilter : undefined }).catch(() => {})} variant="outline" style={{ fontSize: 12 }}>Export CSV</Button>} style={{ marginBottom: 24 }} />
      <p style={{ fontSize: 13, color: colors.mutedText, marginBottom: 24 }}>
        Compliance log of key system actions. {total > 0 && <strong>{total.toLocaleString()} total entries</strong>}
      </p>

      {/* Search + Date filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchFilterBar search={auditSearch} onSearchChange={setAuditSearch} placeholder="Search audit log..." />
        </div>
        <div>
          <label style={{ fontSize: 11, color: colors.mutedText, display: "block", marginBottom: 4 }}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, width: 150, padding: "8px 10px" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: colors.mutedText, display: "block", marginBottom: 4 }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, width: 150, padding: "8px 10px" }} />
        </div>
        {(startDate || endDate) && (
          <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); }} style={{ fontSize: 11, padding: "8px 12px" }}>Clear Dates</Button>
        )}
      </div>

      {/* Filter by action */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {actionTypes.map(a => (
          <span key={a} onClick={() => setActionFilter(a)} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 3, cursor: "pointer",
            border: `1px solid ${actionFilter === a ? colors.red + "55" : "#DDD"}`,
            color: actionFilter === a ? colors.red : "#999",
            background: actionFilter === a ? `${colors.red}08` : colors.white,
          }}>{a.replace(/_/g, " ")}</span>
        ))}
      </div>

      {error && <AdminError message={error} onRetry={() => loadLogs(page)} />}
      {loading ? <Spinner /> : filteredLogs.length === 0 ? (
        <EmptyState title="No audit log entries" subtitle={auditSearch ? "No entries match your search." : "Actions will appear here as users interact with the system."} />
      ) : (
        <>
          <DataTable
            columns={[
              { key: "createdAt", label: "Timestamp", muted: true, render: (log) => new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) },
              { key: "user", label: "User", bold: true },
              { key: "action", label: "Action", render: (log) => (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 3,
                  background: log.action === "login" ? `${colors.green}15` : log.action.includes("download") ? "#EEF" : `${colors.red}08`,
                  color: log.action === "login" ? colors.green : log.action.includes("download") ? "#44A" : "#666",
                  textTransform: "uppercase", letterSpacing: ".04em",
                }}>{log.action.replace(/_/g, " ")}</span>
              ) },
              { key: "resource", label: "Resource", muted: true, render: (log) => log.resource || "\u2014" },
              { key: "ipAddress", label: "IP", muted: true, render: (log) => <span style={{ fontSize: 11 }}>{log.ipAddress || "\u2014"}</span> },
            ]}
            data={filteredLogs}
            sortBy={auditSort.sortBy}
            sortDir={auditSort.sortDir}
            onSort={auditSort.onSort}
            emptyMessage="No audit log entries"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 }}>
              <Button variant="outline" onClick={() => { setPage(p => p - 1); loadLogs(page - 1); }} disabled={page <= 1} style={{ fontSize: 12, padding: "6px 14px", opacity: page <= 1 ? 0.4 : 1 }}>Previous</Button>
              <span style={{ fontSize: 13, color: colors.mutedText }}>Page {page} of {totalPages}</span>
              <Button variant="outline" onClick={() => { setPage(p => p + 1); loadLogs(page + 1); }} disabled={page >= totalPages} style={{ fontSize: 12, padding: "6px 14px", opacity: page >= totalPages ? 0.4 : 1 }}>Next</Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
