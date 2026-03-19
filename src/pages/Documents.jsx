import { useState, useEffect } from "react";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { fetchSignatureRequests, signDocument, downloadDocument, fmt } from "../api.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;
const green = colors.green;

function exportCSV(headers, rows, filename) {
  const escape = (v) => {
    const s = String(v == null ? "" : v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function DocumentsPage({ toast, allDocuments, myProjects, investor }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [filter, setFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [signModal, setSignModal] = useState(null);
  const [reviewDoc, setReviewDoc] = useState(null);
  const [signedDocs, setSignedDocs] = useState({});
  const [pendingSigs, setPendingSigs] = useState([]);
  const [signingId, setSigningId] = useState(null);

  useEffect(() => {
    fetchSignatureRequests().then(sigs => {
      const pending = sigs.filter(s => s.status === "pending" && s.signers?.some(sg => sg.userId === investor.id && sg.status === "pending"));
      setPendingSigs(pending);
    }).catch(() => {});
  }, [investor.id]);

  async function handleSignNow(sig) {
    const mySigner = sig.signers.find(s => s.userId === investor.id);
    if (!mySigner) return;
    setSigningId(mySigner.id);
    try {
      await signDocument(mySigner.id);
      toast(`Signature submitted for ${sig.document?.name || sig.subject}`, "success");
      setPendingSigs(prev => prev.filter(s => s.id !== sig.id));
    } catch (err) {
      toast(err.message || "Signing failed", "error");
    } finally { setSigningId(null); }
  }
  const categories = ["All", ...new Set(allDocuments.map(d => d.category))];
  const projectNames = ["All", ...new Set(allDocuments.map(d => d.project))];
  const filtered = allDocuments.filter(d =>
    (filter === "All" || d.category === filter) &&
    (projectFilter === "All" || d.project === projectFilter)
  );

  function handleAction(d, e) {
    e.stopPropagation();
    if (d.status === "pending_signature" && !signedDocs[d.id]) {
      setSignModal(d);
    } else if (d.status === "action_required") {
      setReviewDoc(d);
    } else {
      downloadDocument(d.id).then(() => {
        toast(`Downloaded ${d.name}`, "success");
      }).catch((err) => {
        toast(err.message || "Download failed", "error");
      });
    }
  }

  async function handleSign() {
    // Find the matching pending signature request to get the signer ID
    const sig = pendingSigs.find(s => s.documentId === signModal.id || s.document?.id === signModal.id);
    const mySigner = sig?.signers?.find(s => s.userId === investor.id);
    if (!mySigner) {
      toast("Unable to find your signature record", "error");
      return;
    }
    try {
      await signDocument(mySigner.id);
      setSignedDocs(prev => ({ ...prev, [signModal.id]: true }));
      toast(`Signature submitted for ${signModal.name}`, "success");
      if (sig) setPendingSigs(prev => prev.filter(s => s.id !== sig.id));
      setSignModal(null);
    } catch (err) {
      toast(err.message || "Signing failed", "error");
    }
  }

  function getActionLabel(d) {
    if (d.status === "pending_signature" && signedDocs[d.id]) return "Signed \u2713";
    if (d.status === "pending_signature") return "Sign";
    if (d.status === "action_required") return "Review";
    return "Download";
  }

  return (
    <>
      <SectionHeader title="Documents" subtitle={`${allDocuments.length} documents \u00B7 ${allDocuments.filter(d => d.status !== "published" && !signedDocs[d.id]).length} requiring action`} size="lg" style={{ marginBottom: 40 }} />

      {/* Pending Signatures */}
      {pendingSigs.length > 0 && (
        <div style={{ marginBottom: 28, border: `1px solid ${red}33`, borderRadius: 12, background: `${red}08`, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: red, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>Pending Signatures</div>
          {pendingSigs.map(sig => (
            <div key={sig.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${line}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: t1 }}>{sig.document?.name || sig.subject}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{sig.subject}</div>
              </div>
              <Button onClick={() => handleSignNow(sig)} disabled={signingId !== null} style={{
                padding: "8px 20px", border: "none", borderRadius: 4,
                fontSize: 13, fontFamily: sans, cursor: signingId ? "default" : "pointer", opacity: signingId === sig.id ? 0.5 : 1,
              }}>
                {signingId === sig.id ? "Signing..." : "Sign Now"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Project filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, background: `${line}55`, borderRadius: 8, padding: 2, width: "fit-content" }}>
        {projectNames.map(p => (
          <span key={p} onClick={() => setProjectFilter(p)} style={{
            fontSize: 12, padding: "6px 14px", borderRadius: 6, cursor: "pointer",
            color: projectFilter === p ? t1 : t3,
            background: projectFilter === p ? surface : "transparent",
            boxShadow: projectFilter === p ? "0 1px 3px rgba(0,0,0,.08)" : "none",
            fontWeight: projectFilter === p ? 500 : 400,
            transition: "all .15s",
          }}>{p}</span>
        ))}
      </div>
      {/* Category filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {categories.map(c => (
          <span key={c} onClick={() => setFilter(c)} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 2, cursor: "pointer",
            border: `1px solid ${filter === c ? line : "transparent"}`,
            color: filter === c ? t2 : t3,
            transition: "all .15s",
          }}>{c}</span>
        ))}
      </div>

      {/* Export CSV */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <span onClick={() => exportCSV(
          ["Name", "Project", "Category", "Date", "Size", "Status"],
          filtered.map(d => [d.name, d.project, d.category, d.date, d.size, d.status]),
          "northstar-documents.csv"
        )} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Export CSV</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="\uD83D\uDCC4" title="No documents available" subtitle="Documents will appear here when they are uploaded to your projects." />
      ) : (
      <Card padding="0" style={{ overflow: "hidden", background: surface }}>
        {filtered.map((d, i) => (
          <div key={`${d.id}-${d.project}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={e => e.currentTarget.style.background = hover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            onClick={() => { downloadDocument(d.id).catch(err => toast(err.message || "Download failed", "error")); }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                {d.name}
                {d.date && (Date.now() - new Date(d.date).getTime()) < 7 * 86400000 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: `${red}18`, color: red, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>NEW</span>}
                {d.status === "action_required" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `${red}22`, color: red, textTransform: "uppercase", letterSpacing: ".06em" }}>Action Required</span>}
                {d.status === "pending_signature" && !signedDocs[d.id] && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `#8B712822`, color: "#8B7128", textTransform: "uppercase", letterSpacing: ".06em" }}>Pending Signature</span>}
                {signedDocs[d.id] && <StatusBadge status="signed" size="sm" />}
              </div>
              <div style={{ fontSize: 11, color: t3, marginTop: 3 }}>{d.project} \u00B7 {d.category} \u00B7 {d.date} \u00B7 {d.size}</div>
            </div>
            <span onClick={(e) => handleAction(d, e)} style={{
              fontSize: 11, padding: "5px 12px", borderRadius: 2, transition: "all .15s",
              border: `1px solid ${d.status === "pending_signature" && !signedDocs[d.id] ? red + "55" : signedDocs[d.id] ? green + "55" : line}`,
              color: d.status === "pending_signature" && !signedDocs[d.id] ? red : signedDocs[d.id] ? green : t3,
            }}>
              {getActionLabel(d)}
            </span>
          </div>
        ))}
      </Card>
      )}

      {/* Sign Modal */}
      <Modal open={!!signModal} onClose={() => setSignModal(null)} title="Sign document">
        {signModal && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `#8B712822`, color: "#8B7128", textTransform: "uppercase", letterSpacing: ".06em" }}>Signature Required</span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>{signModal.name}</h2>
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, marginBottom: 24 }}>
              Please review and sign this document. By clicking "Sign Document" below, you confirm that you have read and agree to the terms outlined in this agreement.
            </p>
            <div style={{ border: `1px solid #E8E5DE`, borderRadius: 8, padding: 16, marginBottom: 16, background: surface, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{"\uD83D\uDCC4"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{signModal.name}</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Review before signing</div>
                </div>
              </div>
              <span onClick={() => downloadDocument(signModal.id).catch(err => toast(err.message || "Failed to open document", "error"))} style={{ fontSize: 12, color: red, cursor: "pointer", padding: "6px 14px", border: `1px solid ${red}33`, borderRadius: 4 }}>View Document</span>
            </div>
            <div style={{ border: `1px solid ${line}`, borderRadius: 2, padding: 20, marginBottom: 24, background: surface }}>
              <p style={{ fontSize: 12, color: t3, marginBottom: 12 }}>Electronic Signature</p>
              <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: t1, borderBottom: `1px solid ${t3}`, paddingBottom: 8 }}>
                {investor.name}
              </div>
              <p style={{ fontSize: 11, color: t3, marginTop: 8 }}>
                Signed electronically \u00B7 {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <span onClick={() => setSignModal(null)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Cancel</span>
              <span onClick={handleSign} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, background: red, color: colors.white, cursor: "pointer" }}>Sign Document</span>
            </div>
          </>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal open={!!reviewDoc} onClose={() => setReviewDoc(null)} title="Review document">
        {reviewDoc && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 2, background: `${red}22`, color: red, textTransform: "uppercase", letterSpacing: ".06em" }}>Action Required</span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>{reviewDoc.name}</h2>
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, marginBottom: 20 }}>
              This document requires your review and acknowledgment.
            </p>
            <div style={{ border: `1px solid ${line}`, borderRadius: 2, padding: 20, marginBottom: 24, background: surface }}>
              <iframe src={reviewDoc.file} style={{ width: "100%", height: 300, border: "none", borderRadius: 2 }} title={reviewDoc.name} />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <span onClick={() => setReviewDoc(null)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, border: `1px solid ${line}`, color: t3, cursor: "pointer" }}>Close</span>
              <span onClick={() => { downloadDocument(reviewDoc.id).then(() => { toast(`Opened ${reviewDoc.name}`, "success"); setReviewDoc(null); }).catch(err => toast(err.message || "Download failed", "error")); }} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 2, background: red, color: colors.white, cursor: "pointer" }}>Open Full Document</span>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
