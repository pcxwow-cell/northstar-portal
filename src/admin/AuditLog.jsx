import { useState, useEffect } from "react";
import { fetchAuditLog } from "../api.js";
import { colors } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import DataTable from "../components/DataTable.jsx";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");
  const auditSort = useSortable("createdAt", "desc");

  const actionTypes = ["all", "login", "logout", "document_download", "document_upload", "signature_request", "signature_sign", "profile_update", "investor_invite", "project_update", "cash_flow_record", "prospect_submit"];

  function loadLogs() {
    setLoading(true); setError(null);
    const params = {};
    if (actionFilter !== "all") params.action = actionFilter;
    fetchAuditLog(params).then(setLogs).catch(e => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => { loadLogs(); }, [actionFilter]);

  const filteredLogs = auditSort.sortData(logs.filter(log => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (log.user || "").toLowerCase().includes(q) || (log.action || "").toLowerCase().includes(q) || (log.resource || "").toLowerCase().includes(q) || (log.ipAddress || "").toLowerCase().includes(q);
  }));

  return (
    <>
      <SectionHeader title="Audit Log" size="lg" style={{ marginBottom: 24 }} />
      <p style={{ fontSize: 13, color: colors.mutedText, marginBottom: 24 }}>Compliance log of key system actions. Last 100 entries shown.</p>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <SearchFilterBar search={auditSearch} onSearchChange={setAuditSearch} placeholder="Search audit log..." />
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

      {error && <AdminError message={error} onRetry={loadLogs} />}
      {loading ? <Spinner /> : filteredLogs.length === 0 ? (
        <EmptyState title="No audit log entries" subtitle={auditSearch ? "No entries match your search." : "Actions will appear here as users interact with the system."} />
      ) : (
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
      )}
    </>
  );
}
