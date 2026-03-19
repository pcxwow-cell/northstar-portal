import { useState, useEffect } from "react";
import { fetchSignatureRequests, cancelSignatureRequest } from "../api.js";
import { colors } from "../styles/theme.js";
import SectionHeader from "../components/SectionHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
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

export default function SignatureManager({ toast, hideHeader }) {
  const [sigs, setSigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sigSearch, setSigSearch] = useState("");
  const sigSort = useSortable("subject");

  useEffect(() => { loadSigs(); }, []);
  async function loadSigs() {
    setLoading(true);
    try { const data = await fetchSignatureRequests(); setSigs(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCancel(id) {
    try { await cancelSignatureRequest(id); toast("Signature request cancelled"); loadSigs(); }
    catch (e) { toast(e.message, "error"); }
  }

  const filteredSigs = sigs.filter(sig => {
    if (!sigSearch) return true;
    const q = sigSearch.toLowerCase();
    return (sig.document?.name || "").toLowerCase().includes(q) || (sig.subject || "").toLowerCase().includes(q) || (sig.createdBy?.name || "").toLowerCase().includes(q) || (sig.status || "").toLowerCase().includes(q);
  }).map(sig => ({ ...sig, createdByName: sig.createdBy?.name, signerCount: sig.signers?.length || 0 }));

  return (
    <>
      {!hideHeader && <SectionHeader title="Signatures" subtitle={`${sigs.length} signature requests`} size="lg" style={{ marginBottom: 24 }} />}
      <div style={{ marginBottom: 20 }}>
        <SearchFilterBar search={sigSearch} onSearchChange={setSigSearch} placeholder="Search signatures..." />
      </div>
      {loading ? <p style={{ color: colors.mutedText }}>Loading...</p> : filteredSigs.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: 12, padding: 40, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", textAlign: "center", color: colors.mutedText, fontSize: 13 }}>
          {sigSearch ? "No matching signature requests." : "No signature requests yet. Use the Documents section to request signatures."}
        </div>
      ) : (
        <DataTable
          columns={[
            { key: "subject", label: "Document", render: (sig) => (
              <div>
                <div style={{ fontWeight: 500 }}>{sig.document?.name || sig.subject}</div>
                <div style={{ fontSize: 11, color: colors.mutedText, marginTop: 2 }}>{sig.subject}</div>
              </div>
            ) },
            { key: "createdByName", label: "Created By", muted: true },
            { key: "signerCount", label: "Signers", render: (sig) => (
              <div>
                {sig.signers?.map(s => (
                  <div key={s.id} style={{ fontSize: 12, marginBottom: 2 }}>
                    {s.name} <StatusBadge status={s.status} size="sm" />
                  </div>
                ))}
              </div>
            ) },
            { key: "status", label: "Status", render: (sig) => <StatusBadge status={sig.status} /> },
            { key: "actions", label: "Actions", sortable: false, render: (sig) => sig.status === "pending" ? (
              <Button variant="outline" onClick={() => handleCancel(sig.id)} style={{ fontSize: 11, padding: "4px 12px", color: colors.red, borderColor: colors.red }}>Cancel</Button>
            ) : null },
          ]}
          data={sigSort.sortData(filteredSigs)}
          sortBy={sigSort.sortBy}
          sortDir={sigSort.sortDir}
          onSort={sigSort.onSort}
          emptyMessage="No signature requests"
        />
      )}
    </>
  );
}
