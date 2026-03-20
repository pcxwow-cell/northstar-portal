import { useState, useEffect } from "react";
import { useAdminData } from "../context/AdminDataContext.jsx";
import { fetchAdminDocuments, fetchAdminDocumentDetail, fetchAdminInvestors, uploadDocument, bulkUploadK1, deleteDocument, assignDocument, createSignatureRequest, downloadSignedDocument, sendSignatureReminder, fetchGroups, getDocumentPreviewUrl, DOCUMENT_CATEGORIES } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DataTable from "../components/DataTable.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import useSortable from "../hooks/useSortable.js";

export default function DocumentManager({ toast, hideHeader, initialAction, onActionConsumed }) {
  const { projects } = useAdminData();
  const [docs, setDocs] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docDetail, setDocDetail] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showBulkK1, setShowBulkK1] = useState(false);
  const [bulkK1Files, setBulkK1Files] = useState(null);
  const [bulkK1Project, setBulkK1Project] = useState("");
  const [bulkK1Year, setBulkK1Year] = useState(new Date().getFullYear().toString());
  const [bulkK1Results, setBulkK1Results] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkK1Assigns, setBulkK1Assigns] = useState({});
  const [bulkK1Investors, setBulkK1Investors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSignModal, setShowSignModal] = useState(false);
  const [sigInvestors, setSigInvestors] = useState([]);
  const [sigSelectedIds, setSigSelectedIds] = useState([]);
  const [sigSubject, setSigSubject] = useState("");
  const [sigSending, setSigSending] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Assign investors state
  const [showAssignInvestors, setShowAssignInvestors] = useState(false);
  const [assignInvestors, setAssignInvestorsList] = useState([]);
  const [assignSelectedIds, setAssignSelectedIds] = useState([]);
  const [assignGroups, setAssignGroups] = useState([]);
  const [assignSelectedGroupIds, setAssignSelectedGroupIds] = useState([]);
  const [assignSaving, setAssignSaving] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState(null);

  // Upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Reporting");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Auto-open upload form when navigated with action hint
  useEffect(() => {
    if (initialAction === "upload") {
      setShowUpload(true);
      onActionConsumed?.();
    }
  }, [initialAction]);

  useEffect(() => { loadDocs(); }, []);
  useEffect(() => { loadDocs(); }, [projectFilter, categoryFilter, search]);

  async function loadDocs() {
    try {
      const params = {};
      if (projectFilter) params.projectId = projectFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (search) params.search = search;
      const d = await fetchAdminDocuments(params);
      setDocs(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function openDoc(doc) {
    setSelectedDoc(doc);
    try { const detail = await fetchAdminDocumentDetail(doc.id); setDocDetail(detail); } catch (e) { toast("Failed to load document", "error"); }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !uploadName) return toast("Name and file required", "error");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", uploadName);
      formData.append("category", uploadCategory);
      if (uploadProjectId) formData.append("projectId", uploadProjectId);
      formData.append("file", uploadFile);
      await uploadDocument(formData);
      toast("Document uploaded");
      setShowUpload(false); setUploadName(""); setUploadFile(null); setUploadProjectId("");
      loadDocs();
    } catch (err) { toast(err.message, "error"); }
    finally { setUploading(false); }
  }

  const categories = DOCUMENT_CATEGORIES;
  const docSort = useSortable("name");

  async function openSignModal() {
    setShowSignModal(true);
    setSigSubject(`Please sign: ${docDetail.name}`);
    setSigSelectedIds([]);
    try {
      const investors = await fetchAdminInvestors();
      setSigInvestors(investors);
    } catch (e) { console.error(e); }
  }

  async function handleSendSignature() {
    if (!sigSelectedIds.length) return toast("Select at least one signer", "error");
    setSigSending(true);
    try {
      await createSignatureRequest({
        documentId: docDetail.id,
        signerIds: sigSelectedIds,
        subject: sigSubject,
      });
      toast("Signature request sent");
      setShowSignModal(false);
      // Refresh detail
      const detail = await fetchAdminDocumentDetail(docDetail.id);
      setDocDetail(detail);
    } catch (e) { toast(e.message, "error"); }
    finally { setSigSending(false); }
  }

  // Document detail view
  if (docDetail) {
    return (
      <>
        {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
        <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedDoc(null); setDocDetail(null); }}>← Back to documents</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 6 }}>{docDetail.name}</h2>
            <div style={{ fontSize: 12, color: colors.mutedText }}>
              {docDetail.project?.name || "General"} · {docDetail.category} · {docDetail.date} · {docDetail.size}
              <StatusBadge status={docDetail.status} style={{ marginLeft: 8 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={() => { const url = getDocumentPreviewUrl(docDetail.id) || docDetail.file; if (url) setPreviewUrl(url); else toast("Preview not available", "error"); }} style={{ fontSize: 12 }}>Preview PDF</Button>
            <Button onClick={openSignModal} style={{ fontSize: 12 }}>Request Signature</Button>
            <Button variant="outline" onClick={() => setConfirmAction({ title: "Delete Document", message: `Delete "${docDetail.name}"? This cannot be undone.`, danger: true, onConfirm: async () => { setConfirmAction(null); try { await deleteDocument(docDetail.id); toast("Document deleted"); setSelectedDoc(null); setDocDetail(null); loadDocs(); } catch (e) { toast(e.message, "error"); } } })} style={{ fontSize: 12, color: colors.red, borderColor: colors.red }}>Delete</Button>
          </div>
        </div>

        {/* Signature Request Modal */}
        <Modal open={showSignModal} onClose={() => setShowSignModal(false)} title="Request Signature" maxWidth={480}>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Select investors to sign <strong>{docDetail.name}</strong></p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Subject</label>
            <input value={sigSubject} onChange={e => setSigSubject(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Signers</label>
            <div style={{ border: "1px solid #DDD", borderRadius: 4, maxHeight: 200, overflow: "auto" }}>
              {sigInvestors.map(inv => (
                <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={sigSelectedIds.includes(inv.id)}
                    onChange={e => setSigSelectedIds(prev => e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id))} />
                  <span style={{ fontWeight: 500 }}>{inv.name}</span>
                  <span style={{ color: colors.mutedText }}>{inv.email}</span>
                </label>
              ))}
              {sigInvestors.length === 0 && <div style={{ padding: 14, color: colors.mutedText, fontSize: 12 }}>Loading investors...</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setShowSignModal(false)}>Cancel</Button>
            <Button onClick={handleSendSignature} disabled={sigSending} style={{ opacity: sigSending ? 0.5 : 1 }}>
              {sigSending ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </Modal>

        {/* PDF Preview Modal */}
        <Modal open={!!previewUrl} onClose={() => setPreviewUrl(null)} title={docDetail?.name || "Document Preview"} maxWidth={900}>
          {previewUrl && <iframe src={previewUrl} style={{ width: "100%", height: 600, border: "none", borderRadius: 4 }} title="Document Preview" />}
        </Modal>

        {/* Access audit table */}
        <Card className="admin-table-scroll" padding="0" style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "10px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 11, color: colors.mutedText, textTransform: "uppercase", letterSpacing: ".06em" }}>
            <span>Investor</span><span>Email</span><span>Viewed</span><span>Downloaded</span><span>Acknowledged</span>
          </div>
          {docDetail.accessList.length > 0 ? docDetail.accessList.map((a, i) => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 120px", padding: "12px 20px", borderBottom: i < docDetail.accessList.length - 1 ? `1px solid ${colors.lightBorder}` : "none", fontSize: 13, alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>
                {a.name}
                {a.directAssignment && <span style={{ fontSize: 10, color: colors.red, marginLeft: 6 }}>Direct</span>}
              </span>
              <span style={{ color: "#666" }}>{a.email}</span>
              <span style={{ color: a.viewedAt ? colors.green : "#CCC" }}>{a.viewedAt ? new Date(a.viewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
              <span style={{ color: a.downloadedAt ? colors.green : "#CCC" }}>{a.downloadedAt ? new Date(a.downloadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
              <span style={{ color: a.acknowledgedAt ? colors.green : "#CCC" }}>{a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
            </div>
          )) : (
            <div style={{ padding: 20, color: colors.mutedText, textAlign: "center", fontSize: 13 }}>No investor access records</div>
          )}
        </Card>

        {/* Signer Status Section (B.5 + B.7) */}
        {docDetail.signatureRequests && docDetail.signatureRequests.length > 0 && (
          <Card padding="0" style={{ overflow: "hidden", marginTop: 20 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E8E5DE", fontSize: 13, fontWeight: 600, color: "#666" }}>Signature Status</div>
            {docDetail.signatureRequests.map(req => (
              <div key={req.id}>
                <div style={{ padding: "10px 20px", fontSize: 12, color: colors.mutedText, background: colors.cardBg, borderBottom: `1px solid ${colors.lightBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Request: {req.subject || "Signature Request"} — {req.status || "active"}</span>
                  {req.status === "signed" && (
                    <Button variant="outline" onClick={() => downloadSignedDocument(req.id).catch(e => toast(e.message || "Download failed", "error"))} style={{ padding: "3px 10px", fontSize: 10 }}>Download Signed Copy</Button>
                  )}
                </div>
                {(req.signers || []).map(signer => (
                  <div key={signer.id || signer.userId} style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 120px", padding: "10px 20px", borderBottom: `1px solid ${colors.lightBorder}`, fontSize: 13, alignItems: "center" }}>
                    <span style={{ fontWeight: 500 }}>{signer.name || signer.investorName || "Unknown"}</span>
                    <span><StatusBadge status={signer.status || "pending"} size="sm" /></span>
                    <span style={{ fontSize: 12, color: colors.mutedText }}>{signer.signedAt ? new Date(signer.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "\u2014"}</span>
                    {(signer.status === "pending" || !signer.status) && (
                      <Button variant="outline" onClick={async () => {
                        try {
                          await sendSignatureReminder(signer.userId);
                          toast("Reminder sent");
                        } catch (e) { toast("Failed to send reminder", "error"); }
                      }} style={{ padding: "3px 8px", fontSize: 10 }}>Send Reminder</Button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </Card>
        )}

        {/* Assign Investors */}
        <div style={{ marginTop: 20 }}>
          {!showAssignInvestors ? (
            <Button variant="outline" onClick={async () => {
              const [investors, groups] = await Promise.all([fetchAdminInvestors(), fetchGroups()]);
              setAssignInvestorsList(Array.isArray(investors) ? investors : investors.investors || []);
              setAssignGroups(Array.isArray(groups) ? groups : []);
              setAssignSelectedIds(docDetail.accessList.filter(a => a.directAssignment).map(a => a.userId || a.id));
              setAssignSelectedGroupIds([]);
              setShowAssignInvestors(true);
            }}>Assign to Investors</Button>
          ) : (
            <Card>
              <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 16 }}>Assign Investors</h3>
              {/* Group assignment */}
              {assignGroups.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Assign by Group</label>
                  <div style={{ border: "1px solid #DDD", borderRadius: 4, maxHeight: 140, overflow: "auto", marginBottom: 8 }}>
                    {assignGroups.map(g => (
                      <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={assignSelectedGroupIds.includes(g.id)}
                          onChange={e => setAssignSelectedGroupIds(prev => e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id))} />
                        <span style={{ fontWeight: 500 }}>{g.name}</span>
                        {g.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.color, display: "inline-block" }} />}
                        <span style={{ color: colors.mutedText, fontSize: 11 }}>{g.memberCount} member{g.memberCount !== 1 ? "s" : ""}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {/* Individual investor assignment */}
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Individual Investors</label>
              <div style={{ border: "1px solid #DDD", borderRadius: 4, maxHeight: 260, overflow: "auto", marginBottom: 16 }}>
                {assignInvestors.map(inv => (
                  <label key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${colors.lightBorder}`, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={assignSelectedIds.includes(inv.id)}
                      onChange={e => setAssignSelectedIds(prev => e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id))} />
                    <span style={{ fontWeight: 500 }}>{inv.name}</span>
                    <span style={{ color: colors.mutedText }}>{inv.email}</span>
                  </label>
                ))}
                {assignInvestors.length === 0 && <div style={{ padding: 14, color: colors.mutedText, fontSize: 12 }}>No investors found</div>}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="outline" onClick={() => setShowAssignInvestors(false)}>Cancel</Button>
                <Button disabled={assignSaving} onClick={async () => {
                  setAssignSaving(true);
                  try {
                    await assignDocument(docDetail.id, assignSelectedIds, assignSelectedGroupIds);
                    toast("Investor assignments updated");
                    const detail = await fetchAdminDocumentDetail(docDetail.id);
                    setDocDetail(detail);
                    setShowAssignInvestors(false);
                  } catch (e) { toast(e.message, "error"); }
                  finally { setAssignSaving(false); }
                }} style={{ opacity: assignSaving ? 0.5 : 1 }}>
                  {assignSaving ? "Saving..." : "Save Assignments"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </>
    );
  }

  // Upload form
  if (showUpload) {
    return (
      <>
        <p style={{ fontSize: 12, color: colors.red, cursor: "pointer", marginBottom: 24 }} onClick={() => setShowUpload(false)}>← Back to documents</p>
        <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>Upload Document</h2>
        <form onSubmit={handleUpload} style={{ background: colors.white, borderRadius: 12, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", maxWidth: 520 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Document Name</label>
            <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Q3 2025 — Porthaven Quarterly Report" style={inputStyle} required />
          </div>
          <div className="admin-form-row" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Category</label>
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} style={inputStyle}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Project</label>
              <select value={uploadProjectId} onChange={e => setUploadProjectId(e.target.value)} style={inputStyle}>
                <option value="">General (all investors)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>File</label>
            <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv" onChange={e => setUploadFile(e.target.files[0])} style={{ fontSize: 13 }} required />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" type="button" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading} style={{ padding: "10px 24px", opacity: uploading ? 0.5 : 1 }}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </>
    );
  }

  // Document list dashboard
  return (
    <>
      {!hideHeader && <SectionHeader title="Documents" subtitle={`${docs.length} documents`} size="lg" style={{ marginBottom: 24 }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: colors.mutedText }}>{hideHeader ? `${docs.length} documents` : ""}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={() => { setShowBulkK1(!showBulkK1); setShowUpload(false); }}>{showBulkK1 ? "Cancel" : "Bulk K-1 Upload"}</Button>
          <Button onClick={() => { setShowUpload(true); setShowBulkK1(false); }}>Upload Document</Button>
        </div>
      </div>

      {/* Bulk K-1 Upload */}
      {showBulkK1 && (
        <Card padding="24px" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Bulk K-1 Upload</div>
          <p style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>Upload multiple K-1 documents at once. Files are auto-matched to investors by name in the filename (e.g., "K1_JamesChen_2025.pdf").</p>
          <div className="admin-form-row" style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Select K-1 Files</label>
              <input type="file" multiple accept=".pdf" onChange={e => setBulkK1Files(e.target.files)} style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Tax Year</label>
              <input value={bulkK1Year} onChange={e => setBulkK1Year(e.target.value)} style={{ ...inputStyle, width: 80 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Project (optional)</label>
              <select value={bulkK1Project} onChange={e => setBulkK1Project(e.target.value)} style={{ ...inputStyle, width: 160 }}>
                <option value="">General</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <Button disabled={!bulkK1Files || bulkUploading} onClick={async () => {
              setBulkUploading(true);
              try {
                const fd = new FormData();
                for (const f of bulkK1Files) fd.append("files", f);
                if (bulkK1Project) fd.append("projectId", bulkK1Project);
                fd.append("taxYear", bulkK1Year);
                const result = await bulkUploadK1(fd);
                setBulkK1Results(result);
                setBulkK1Assigns({});
                if (result.unmatched > 0) { fetchAdminInvestors().then(inv => setBulkK1Investors(Array.isArray(inv) ? inv : inv.investors || [])); }
                toast(`Uploaded ${result.total} K-1s: ${result.matched} matched, ${result.unmatched} unmatched`);
                loadDocs();
              } catch (err) { toast(err.message, "error"); }
              setBulkUploading(false);
            }}>{bulkUploading ? "Uploading..." : "Upload All"}</Button>
          </div>
          {bulkK1Results && (
            <div style={{ borderTop: `1px solid ${colors.lightBorder}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Results: {bulkK1Results.matched} matched, {bulkK1Results.unmatched} unmatched</div>
              {bulkK1Results.results.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F8F7F4", fontSize: 12, gap: 8 }}>
                  <span>{r.filename}</span>
                  {r.status === "matched" ? (
                    <span style={{ color: colors.green, fontWeight: 500 }}>Matched &rarr; {r.matched.name}</span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <select value={bulkK1Assigns[r.documentId || i] || ""} onChange={e => setBulkK1Assigns(prev => ({ ...prev, [r.documentId || i]: e.target.value }))} style={{ ...inputStyle, width: 180, padding: "4px 8px", fontSize: 11 }}>
                        <option value="">Select investor...</option>
                        {bulkK1Investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                      </select>
                      <Button disabled={!bulkK1Assigns[r.documentId || i]} onClick={async () => {
                        const userId = parseInt(bulkK1Assigns[r.documentId || i]);
                        if (!r.documentId) { toast("No document ID available", "error"); return; }
                        try {
                          await assignDocument(r.documentId, [userId]);
                          toast("Document assigned");
                          setBulkK1Results(prev => ({ ...prev, results: prev.results.map((x, j) => j === i ? { ...x, status: "matched", matched: { name: bulkK1Investors.find(inv => inv.id === userId)?.name || "Assigned" } } : x), matched: prev.matched + 1, unmatched: prev.unmatched - 1 }));
                        } catch (e) { toast(e.message, "error"); }
                      }} style={{ padding: "3px 8px", fontSize: 10, opacity: bulkK1Assigns[r.documentId || i] ? 1 : 0.5 }}>Assign</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search documents..." filters={[
        { value: projectFilter, onChange: setProjectFilter, label: "Project filter", options: [{ value: "", label: "All Projects" }, ...projects.map(p => ({ value: p.id, label: p.name }))] },
        { value: categoryFilter, onChange: setCategoryFilter, label: "Category filter", options: [{ value: "", label: "All Categories" }, ...categories.map(c => ({ value: c, label: c }))] },
      ]} />

      {/* Document table */}
      {loading ? <Spinner /> : (
        <DataTable
          columns={[
            { key: "name", label: "Document", render: (d) => (
              <div>
                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{d.name}{d.date && (Date.now() - new Date(d.date).getTime()) < 7 * 86400000 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: `${colors.red}18`, color: colors.red, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>NEW</span>}</div>
                <div style={{ fontSize: 11, color: "#BBB" }}>{d.date} · {d.size}</div>
              </div>
            ) },
            { key: "project", label: "Project", muted: true },
            { key: "category", label: "Category", render: (d) => <span style={{ fontSize: 11, padding: "2px 8px", background: colors.lightBorder, borderRadius: 3 }}>{d.category}</span> },
            { key: "totalInvestors", label: "Investors" },
            { key: "viewed", label: "Viewed", render: (d) => <span style={{ color: d.viewed > 0 ? colors.green : "#CCC" }}>{d.viewed}</span> },
            { key: "downloaded", label: "Downloaded", render: (d) => <span style={{ color: d.downloaded > 0 ? colors.green : "#CCC" }}>{d.downloaded}</span> },
          ]}
          data={docSort.sortData(docs)}
          sortBy={docSort.sortBy}
          sortDir={docSort.sortDir}
          onSort={docSort.onSort}
          onRowClick={openDoc}
          emptyMessage="No documents found"
        />
      )}
    </>
  );
}
