import { useState, useEffect } from "react";
import { useAdminData } from "../context/AdminDataContext.jsx";
import { colors, fonts, inputStyle } from "../styles/theme.js";
import SectionHeader from "../components/SectionHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import DataTable from "../components/DataTable.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import Tabs from "../components/Tabs.jsx";
import FormInput from "../components/FormInput.jsx";
import Modal from "../components/Modal.jsx";
import Button from "../components/Button.jsx";
import useSortable from "../hooks/useSortable.js";

export default function StatementManager({ toast }) {
  const { projects: stmtProjects } = useAdminData();
  const [statements, setStatements] = useState([]);
  const [filter, setFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [stmtSearch, setStmtSearch] = useState("");
  const stmtSort = useSortable("createdAt", "desc");

  // Detail/preview panel
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("preview"); // preview | data

  // Rejection modal
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Generate form - period inputs
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genPeriod, setGenPeriod] = useState("");
  const [genPeriodStart, setGenPeriodStart] = useState("");
  const [genPeriodEnd, setGenPeriodEnd] = useState("");

  // Capital call form state
  const [showCapCallForm, setShowCapCallForm] = useState(false);
  const [capCallProjectId, setCapCallProjectId] = useState("");
  const [capCallAmount, setCapCallAmount] = useState("");
  const [capCallDueDate, setCapCallDueDate] = useState("");
  const [capCallWireInstructions, setCapCallWireInstructions] = useState("");
  const [capCallGenerating, setCapCallGenerating] = useState(false);

  // Quarterly report form state
  const [showQtrReportForm, setShowQtrReportForm] = useState(false);
  const [qtrReportProjectId, setQtrReportProjectId] = useState("");
  const [qtrReportQuarter, setQtrReportQuarter] = useState("");
  const [qtrReportSummary, setQtrReportSummary] = useState("");
  const [qtrReportGenerating, setQtrReportGenerating] = useState(false);

  // Send email customization modal
  const [sendingStatement, setSendingStatement] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Preview modal
  const [previewStatement, setPreviewStatement] = useState(null);

  const authHeader = { Authorization: `Bearer ${localStorage.getItem("northstar_token")}` };

  useEffect(() => { loadStatements(); }, [filter]);

  async function loadStatements() {
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const data = await (await fetch(`/api/v1/statements${qs}`, { headers: authHeader })).json();
      setStatements(Array.isArray(data) ? data : []);
    } catch { setStatements([]); }
  }

  async function loadDetail(id) {
    setSelectedId(id);
    setDetailLoading(true);
    setDetailTab("preview");
    try {
      const res = await fetch(`/api/v1/statements/${id}`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed to load statement");
      setDetail(await res.json());
    } catch (e) { toast(e.message, "error"); setDetail(null); }
    finally { setDetailLoading(false); }
  }

  function closeDetail() { setSelectedId(null); setDetail(null); }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const body = {};
      if (genPeriod) body.period = genPeriod;
      if (genPeriodStart) body.periodStart = genPeriodStart;
      if (genPeriodEnd) body.periodEnd = genPeriodEnd;
      const res = await fetch("/api/v1/statements/generate", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      toast(`Generated ${data.count} draft statement(s)`);
      setShowGenerateForm(false);
      setGenPeriod(""); setGenPeriodStart(""); setGenPeriodEnd("");
      loadStatements();
    } catch (e) { toast(e.message, "error"); }
    finally { setGenerating(false); }
  }

  async function handleApprove(id) {
    try {
      await fetch(`/api/v1/statements/${id}/approve`, { method: "POST", headers: authHeader });
      toast("Statement approved");
      loadStatements();
      if (selectedId === id) loadDetail(id);
    } catch (e) { toast(e.message, "error"); }
  }

  function openSendModal(stmt) {
    setSendingStatement(stmt);
    setEmailSubject(`Your ${stmt.period || "Capital Account"} Statement - ${stmt.projectName || "Northstar"}`);
    setEmailBody(`Dear ${stmt.investorName || "Investor"},\n\nPlease find your ${stmt.period || "capital account"} statement for ${stmt.projectName || "your investment"} attached.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nNorthstar Pacific Development Group`);
  }

  async function handleSendWithEmail() {
    if (!sendingStatement) return;
    try {
      await fetch(`/api/v1/statements/${sendingStatement.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ emailSubject, emailBody }),
      });
      toast("Statement sent");
      setSendingStatement(null);
      setEmailSubject(""); setEmailBody("");
      loadStatements();
      if (selectedId === sendingStatement.id) loadDetail(sendingStatement.id);
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleSend(id) {
    try {
      await fetch(`/api/v1/statements/${id}/send`, { method: "POST", headers: authHeader });
      toast("Statement sent");
      loadStatements();
      if (selectedId === id) loadDetail(id);
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleReject(id, reason) {
    try {
      await fetch(`/api/v1/statements/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ reason: reason || "Needs revision" }),
      });
      toast("Statement reverted to draft");
      setRejectingId(null);
      setRejectReason("");
      loadStatements();
      if (selectedId === id) loadDetail(id);
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleBulkApprove() {
    const ids = statements.filter(s => s.status === "DRAFT").map(s => s.id);
    if (ids.length === 0) return toast("No drafts to approve", "error");
    try {
      await fetch("/api/v1/statements/bulk-approve", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ ids }),
      });
      toast(`Approved ${ids.length} statement(s)`);
      loadStatements();
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleBulkSend() {
    const ids = statements.filter(s => s.status === "APPROVED").map(s => s.id);
    if (ids.length === 0) return toast("No approved statements to send", "error");
    try {
      await fetch("/api/v1/statements/bulk-send", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ ids }),
      });
      toast(`Sent ${ids.length} statement(s)`);
      loadStatements();
    } catch (e) { toast(e.message, "error"); }
  }

  const statusColors = { DRAFT: { bg: "#FFF8E1", text: "#B8860B" }, APPROVED: { bg: "#E8F5E9", text: colors.green }, SENT: { bg: "#E3F2FD", text: "#1565C0" }, REJECTED: { bg: "#FFEBEE", text: colors.red } };
  const drafts = statements.filter(s => s.status === "DRAFT").length;
  const approved = statements.filter(s => s.status === "APPROVED").length;
  const sent = statements.filter(s => s.status === "SENT").length;
  const cardShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)";
  const labelStyle = { display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 };

  // Filter + search
  const filteredStatements = statements.filter(s => {
    if (!stmtSearch) return true;
    const q = stmtSearch.toLowerCase();
    return (s.investorName || "").toLowerCase().includes(q)
      || (s.projectName || "").toLowerCase().includes(q)
      || (s.period || "").toLowerCase().includes(q)
      || (s.investorEmail || "").toLowerCase().includes(q);
  });

  // Format currency helper
  const fc = (v) => v != null ? "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "--";

  // Build preview content for a statement
  function buildPreviewContent(stmt) {
    const d = stmt.data ? (typeof stmt.data === "string" ? JSON.parse(stmt.data) : stmt.data) : null;
    return { investor: d?.investor || { name: stmt.investorName, email: stmt.investorEmail }, project: d?.project || { name: stmt.projectName }, period: stmt.period, accountSummary: d?.accountSummary || null, transactions: d?.transactions || [] };
  }

  return (
    <>
      <SectionHeader title="Statements" subtitle="Generate, review, and send capital account statements" size="lg" right={<div style={{ display: "flex", alignItems: "center", gap: 12 }}>{drafts > 0 && <span style={{ background: "#FFF8E1", color: "#B8860B", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12 }}>{drafts} awaiting approval</span>}<Button onClick={() => setShowGenerateForm(!showGenerateForm)} disabled={generating}>{generating ? "Generating..." : "Generate All"}</Button></div>} style={{ marginBottom: 24 }} />

      {/* Generate form with period inputs */}
      {showGenerateForm && (
        <div style={{ background: colors.white, borderRadius: 12, padding: 24, boxShadow: cardShadow, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 20 }}>Generate Statements</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <FormInput label="Period Label" value={genPeriod} onChange={e => setGenPeriod(e.target.value)} placeholder="Q1 2026" style={{ flex: 1 }} />
            <FormInput label="Period Start" type="date" value={genPeriodStart} onChange={e => setGenPeriodStart(e.target.value)} style={{ flex: 1 }} />
            <FormInput label="Period End" type="date" value={genPeriodEnd} onChange={e => setGenPeriodEnd(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setShowGenerateForm(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating} style={{ opacity: generating ? 0.5 : 1 }}>
              {generating ? "Generating..." : "Generate Draft Statements"}
            </Button>
          </div>
        </div>
      )}

      {/* Workflow status cards */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Drafts", count: drafts, color: "#B8860B", action: drafts > 0 ? "Approve All" : null, onClick: handleBulkApprove },
          { label: "Approved", count: approved, color: colors.green, action: approved > 0 ? "Send All" : null, onClick: handleBulkSend },
          { label: "Sent", count: sent, color: "#1565C0", action: null },
        ].map((c, i) => (
          <div key={i} style={{ position: "relative" }}>
            <StatCard label={c.label} value={c.count} />
            {c.action && (
              <div style={{ position: "absolute", top: 16, right: 16 }}>
                <Button variant="outline" onClick={c.onClick} style={{ padding: "6px 14px", fontSize: 11, color: c.color, borderColor: c.color }}>{c.action}</Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 0, background: colors.white, borderRadius: 8, overflow: "hidden", border: "1px solid #E8E5DE", flex: 1 }}>
          {["all", "DRAFT", "APPROVED", "SENT"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 20px", fontSize: 12, border: "none", cursor: "pointer", fontFamily: fonts.sans, flex: 1,
              background: filter === f ? colors.red : colors.white, color: filter === f ? colors.white : "#666",
              transition: "background .15s, color .15s",
            }}>{f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <SearchFilterBar search={stmtSearch} onSearchChange={setStmtSearch} placeholder="Search statements..." />
      </div>

      {/* Rejection reason modal */}
      <Modal open={!!rejectingId} onClose={() => { setRejectingId(null); setRejectReason(""); }} title="Reject Statement" maxWidth={420}>
        <label style={labelStyle}>Reason for rejection</label>
        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
          placeholder="Describe what needs to be revised..."
          style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Button>
          <Button onClick={() => handleReject(rejectingId, rejectReason)} style={{ background: colors.red }}>
            Reject Statement
          </Button>
        </div>
      </Modal>

      {/* Send email customization modal */}
      <Modal open={!!sendingStatement} onClose={() => { setSendingStatement(null); setEmailSubject(""); setEmailBody(""); }} title="Send Statement" maxWidth={560}>
        {sendingStatement && (
          <>
            <div style={{ marginBottom: 16, padding: "10px 14px", background: colors.cardBg, borderRadius: 8, fontSize: 12, color: colors.mutedText }}>
              Sending to: <strong style={{ color: colors.darkText }}>{sendingStatement.investorName}</strong> ({sendingStatement.investorEmail})
            </div>
            <FormInput label="Email Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ marginBottom: 16 }} />
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email Body</label>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => { setSendingStatement(null); setEmailSubject(""); setEmailBody(""); }}>Cancel</Button>
              <Button onClick={handleSendWithEmail}>Send Statement</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Preview modal */}
      <Modal open={!!previewStatement} onClose={() => setPreviewStatement(null)} title="Statement Preview" maxWidth={640}>
        {previewStatement && (() => {
          const pv = buildPreviewContent(previewStatement);
          return (
            <div>
              <div style={{ padding: "16px 20px", background: colors.cardBg, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>What the investor will receive</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><span style={{ fontSize: 11, color: colors.mutedText }}>Investor:</span> <span style={{ fontSize: 13, fontWeight: 500 }}>{pv.investor.name}</span></div>
                  <div><span style={{ fontSize: 11, color: colors.mutedText }}>Project:</span> <span style={{ fontSize: 13, fontWeight: 500 }}>{pv.project.name}</span></div>
                  <div><span style={{ fontSize: 11, color: colors.mutedText }}>Period:</span> <span style={{ fontSize: 13, fontWeight: 500 }}>{pv.period || "--"}</span></div>
                  <div><span style={{ fontSize: 11, color: colors.mutedText }}>Status:</span> <span style={{ fontSize: 13, fontWeight: 500 }}>{previewStatement.status}</span></div>
                </div>
              </div>
              {pv.accountSummary && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Account Summary</div>
                  <div style={{ background: colors.white, border: `1px solid ${colors.lightBorder}`, borderRadius: 8, overflow: "hidden" }}>
                    {Object.entries(pv.accountSummary).map(([k, v], i, arr) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${colors.lightBorder}` : "none", fontSize: 13 }}>
                        <span style={{ color: colors.mutedText }}>{k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}</span>
                        <span style={{ fontWeight: 500 }}>{typeof v === "number" ? fc(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pv.transactions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Transactions</div>
                  <div style={{ background: colors.white, border: `1px solid ${colors.lightBorder}`, borderRadius: 8, overflow: "hidden" }}>
                    {pv.transactions.map((tx, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < pv.transactions.length - 1 ? `1px solid ${colors.lightBorder}` : "none", fontSize: 13 }}>
                        <span style={{ color: colors.mutedText }}>{tx.date || tx.type || `#${i + 1}`}</span>
                        <span style={{ fontWeight: 500 }}>{tx.description || ""} {tx.amount != null ? fc(tx.amount) : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {previewStatement.html && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>HTML Preview</div>
                  <div style={{ border: `1px solid ${colors.lightBorder}`, borderRadius: 8, overflow: "hidden", background: colors.white }}>
                    <div dangerouslySetInnerHTML={{ __html: previewStatement.html }} style={{ padding: 20, maxHeight: 300, overflowY: "auto", fontSize: 13, lineHeight: 1.6 }} />
                  </div>
                </div>
              )}
              {!pv.accountSummary && !previewStatement.html && pv.transactions.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: colors.mutedText, fontSize: 13 }}>No detailed preview data available for this statement.</div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Statement detail panel */}
      {selectedId && (
        <div style={{ background: colors.white, borderRadius: 12, boxShadow: cardShadow, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #E8E5DE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button variant="outline" onClick={closeDetail} style={{ padding: "4px 10px", fontSize: 11 }}>Back</Button>
              <span style={{ fontWeight: 500, fontSize: 15 }}>Statement Detail</span>
              {detail && (
                <span style={{
                  padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                  background: statusColors[detail.status]?.bg || "#F5F5F5",
                  color: statusColors[detail.status]?.text || "#666",
                }}>{detail.status}</span>
              )}
            </div>
            {detail && (
              <div style={{ display: "flex", gap: 8 }}>
                {detail.status === "DRAFT" && (
                  <>
                    <Button variant="outline" onClick={() => setPreviewStatement(detail)} style={{ padding: "6px 14px", fontSize: 11 }}>Preview</Button>
                    <Button variant="outline" onClick={() => handleApprove(detail.id)} style={{ padding: "6px 14px", fontSize: 11, color: colors.green, borderColor: colors.green }}>Approve</Button>
                    <Button variant="outline" onClick={() => { setRejectingId(detail.id); }} style={{ padding: "6px 14px", fontSize: 11, color: "#999" }}>Reject</Button>
                  </>
                )}
                {detail.status === "APPROVED" && (
                  <>
                    <Button variant="outline" onClick={() => setPreviewStatement(detail)} style={{ padding: "6px 14px", fontSize: 11 }}>Preview</Button>
                    <Button onClick={() => openSendModal(detail)} style={{ padding: "6px 14px", fontSize: 11 }}>Send</Button>
                    <Button variant="outline" onClick={() => { setRejectingId(detail.id); }} style={{ padding: "6px 14px", fontSize: 11, color: "#999" }}>Reject</Button>
                  </>
                )}
              </div>
            )}
          </div>

          {detailLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>Loading statement...</div>
          ) : detail ? (
            <>
              {/* Detail header info */}
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.lightBorder}`, display: "flex", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Investor</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{detail.investorName}</div>
                  <div style={{ fontSize: 12, color: colors.mutedText }}>{detail.investorEmail}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Project</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{detail.projectName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Period</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{detail.period || "--"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Created</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{new Date(detail.createdAt).toLocaleDateString()} by {detail.createdByName || "System"}</div>
                </div>
                {detail.approvedByName && (
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Approved</div>
                    <div style={{ fontSize: 13, marginTop: 2, color: colors.green }}>{detail.approvedByName} on {new Date(detail.approvedAt).toLocaleDateString()}</div>
                  </div>
                )}
                {detail.sentAt && (
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Sent</div>
                    <div style={{ fontSize: 13, marginTop: 2, color: "#1565C0" }}>{new Date(detail.sentAt).toLocaleDateString()}</div>
                  </div>
                )}
                {detail.rejectReason && (
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: ".05em" }}>Rejection Reason</div>
                    <div style={{ fontSize: 13, marginTop: 2, color: colors.red }}>{detail.rejectReason}</div>
                  </div>
                )}
              </div>

              {/* Tabs: Preview / Data */}
              <Tabs tabs={[{ id: "preview", label: "HTML Preview" }, { id: "data", label: "Statement Data" }]} active={detailTab} onChange={setDetailTab} />

              {/* Tab content */}
              {detailTab === "preview" && (
                <div style={{ padding: 24 }}>
                  {detail.html ? (
                    <div style={{ border: "1px solid #E8E5DE", borderRadius: 8, overflow: "hidden", background: colors.white }}>
                      <div dangerouslySetInnerHTML={{ __html: detail.html }}
                        style={{ padding: 24, maxHeight: 600, overflowY: "auto", fontSize: 13, lineHeight: 1.6 }} />
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: 40, color: colors.mutedText, fontSize: 13 }}>No HTML preview available for this statement.</div>
                  )}
                </div>
              )}

              {detailTab === "data" && (
                <StatementDataTab detail={detail} fc={fc} />
              )}
            </>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>Failed to load statement detail.</div>
          )}
        </div>
      )}

      {/* Statement list table */}
      <DataTable
        columns={[
          { key: "investorName", label: "Investor", render: (s) => (
            <div>
              <div style={{ fontWeight: 500 }}>{s.investorName || "Unknown"}</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{s.investorEmail || ""}</div>
            </div>
          ) },
          { key: "projectName", label: "Project", muted: true, render: (s) => s.projectName || "--" },
          { key: "period", label: "Period", muted: true, render: (s) => s.period || "--" },
          { key: "committed", label: "Committed", muted: true, render: (s) => s.committed != null ? fc(s.committed) : "--" },
          { key: "nav", label: "NAV", muted: true, render: (s) => s.nav != null ? fc(s.nav) : "--" },
          { key: "status", label: "Status", render: (s) => (
            <div>
              <span style={{
                padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                background: statusColors[s.status]?.bg || "#F5F5F5",
                color: statusColors[s.status]?.text || "#666",
              }}>{s.status}</span>
              {s.status === "APPROVED" && s.approvedByName && (
                <div style={{ fontSize: 10, color: colors.green, marginTop: 2 }}>by {s.approvedByName}</div>
              )}
            </div>
          ) },
          { key: "createdAt", label: "Date", sortable: false, muted: true, render: (s) => new Date(s.createdAt).toLocaleDateString() },
          { key: "actions", label: "Actions", sortable: false, render: (s) => (
            <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
              <Button variant="outline" onClick={() => setPreviewStatement(s)} style={{ padding: "4px 10px", fontSize: 10 }}>Preview</Button>
              {s.status === "DRAFT" && (
                <Button variant="outline" onClick={() => handleApprove(s.id)} style={{ padding: "4px 10px", fontSize: 10, color: colors.green, borderColor: colors.green }}>Approve</Button>
              )}
              {s.status === "APPROVED" && (
                <>
                  <Button onClick={() => openSendModal(s)} style={{ padding: "4px 10px", fontSize: 10 }}>Send</Button>
                  <Button variant="outline" onClick={() => { setRejectingId(s.id); }} style={{ padding: "4px 10px", fontSize: 10, color: "#999" }}>Reject</Button>
                </>
              )}
              {s.status === "SENT" && s.sentAt && <span style={{ fontSize: 10, color: "#999" }}>Sent {new Date(s.sentAt).toLocaleDateString()}</span>}
            </div>
          ) },
        ]}
        data={stmtSort.sortData(filteredStatements)}
        sortBy={stmtSort.sortBy}
        sortDir={stmtSort.sortDir}
        onSort={stmtSort.onSort}
        onRowClick={(s) => loadDetail(s.id)}
        emptyMessage={stmtSearch ? "No statements match your search" : "Click 'Generate All' to create draft statements for all investors"}
      />

      {/* Generate Capital Call */}
      <div style={{ marginTop: 32 }}>
        {!showCapCallForm ? (
          <Button variant="outline" onClick={() => setShowCapCallForm(true)}>Generate Capital Call</Button>
        ) : (
          <div style={{ background: colors.white, borderRadius: 12, padding: "24px", boxShadow: cardShadow }}>
            <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 20 }}>Generate Capital Call</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Project</label>
                <select value={capCallProjectId} onChange={e => setCapCallProjectId(e.target.value)} style={inputStyle} required>
                  <option value="">Select project...</option>
                  {stmtProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <FormInput label="Call Amount ($)" type="number" value={capCallAmount} onChange={e => setCapCallAmount(e.target.value)} placeholder="500000" style={{ flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <FormInput label="Due Date" type="date" value={capCallDueDate} onChange={e => setCapCallDueDate(e.target.value)} style={{ flex: 1 }} />
              <FormInput label="Wire Instructions" value={capCallWireInstructions} onChange={e => setCapCallWireInstructions(e.target.value)} placeholder="Bank name, routing, account..." style={{ flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setShowCapCallForm(false)}>Cancel</Button>
              <Button disabled={capCallGenerating || !capCallProjectId || !capCallAmount} onClick={async () => {
                setCapCallGenerating(true);
                try {
                  const res = await fetch("/api/v1/statements/generate-capital-call", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeader },
                    body: JSON.stringify({ projectId: capCallProjectId, callAmount: Number(capCallAmount), dueDate: capCallDueDate, wireInstructions: capCallWireInstructions }),
                  });
                  if (!res.ok) throw new Error("Failed to generate capital call");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "capital-call.pdf"; a.click();
                  URL.revokeObjectURL(url);
                  toast("Capital call generated and downloaded");
                  setShowCapCallForm(false);
                  setCapCallProjectId(""); setCapCallAmount(""); setCapCallDueDate(""); setCapCallWireInstructions("");
                } catch (e) { toast(e.message, "error"); }
                finally { setCapCallGenerating(false); }
              }} style={{ opacity: capCallGenerating ? 0.5 : 1 }}>
                {capCallGenerating ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Quarterly Report */}
      <div style={{ marginTop: 16 }}>
        {!showQtrReportForm ? (
          <Button variant="outline" onClick={() => setShowQtrReportForm(true)}>Generate Quarterly Report</Button>
        ) : (
          <div style={{ background: colors.white, borderRadius: 12, padding: "24px", boxShadow: cardShadow }}>
            <h3 style={{ fontSize: 16, fontWeight: 400, marginBottom: 20 }}>Generate Quarterly Report</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Project</label>
                <select value={qtrReportProjectId} onChange={e => setQtrReportProjectId(e.target.value)} style={inputStyle} required>
                  <option value="">Select project...</option>
                  {stmtProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <FormInput label="Quarter" value={qtrReportQuarter} onChange={e => setQtrReportQuarter(e.target.value)} placeholder="Q1 2026" style={{ flex: 1 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Summary</label>
              <textarea value={qtrReportSummary} onChange={e => setQtrReportSummary(e.target.value)} rows={4} placeholder="Quarterly performance summary..." style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setShowQtrReportForm(false)}>Cancel</Button>
              <Button disabled={qtrReportGenerating || !qtrReportProjectId || !qtrReportQuarter} onClick={async () => {
                setQtrReportGenerating(true);
                try {
                  const res = await fetch("/api/v1/statements/generate-quarterly-report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeader },
                    body: JSON.stringify({ projectId: qtrReportProjectId, quarter: qtrReportQuarter, summary: qtrReportSummary }),
                  });
                  if (!res.ok) throw new Error("Failed to generate quarterly report");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `quarterly-report-${qtrReportQuarter.replace(/\s/g, "-")}.pdf`; a.click();
                  URL.revokeObjectURL(url);
                  toast("Quarterly report generated and downloaded");
                  setShowQtrReportForm(false);
                  setQtrReportProjectId(""); setQtrReportQuarter(""); setQtrReportSummary("");
                } catch (e) { toast(e.message, "error"); }
                finally { setQtrReportGenerating(false); }
              }} style={{ opacity: qtrReportGenerating ? 0.5 : 1 }}>
                {qtrReportGenerating ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Extracted to keep main component under 300 lines
function StatementDataTab({ detail, fc }) {
  if (!detail.data) {
    return <div style={{ padding: 40, textAlign: "center", color: colors.mutedText, fontSize: 13 }}>No parsed data available for this statement.</div>;
  }

  const d = typeof detail.data === "string" ? JSON.parse(detail.data) : detail.data;
  const sectionStyle = { background: colors.cardBg, borderRadius: 8, padding: 16, border: `1px solid ${colors.lightBorder}` };
  const headerStyle = { fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 };
  const rowStyle = { display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, borderBottom: `1px solid ${colors.lightBorder}` };
  const labelColor = colors.mutedText;

  const formatKey = (k) => k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {d.investor && (
          <div style={sectionStyle}>
            <div style={headerStyle}>Investor Info</div>
            {Object.entries(d.investor).map(([k, v]) => (
              <div key={k} style={rowStyle}>
                <span style={{ color: labelColor }}>{formatKey(k)}</span>
                <span style={{ fontWeight: 500 }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}
        {d.project && (
          <div style={sectionStyle}>
            <div style={headerStyle}>Project Info</div>
            {Object.entries(d.project).map(([k, v]) => (
              <div key={k} style={rowStyle}>
                <span style={{ color: labelColor }}>{formatKey(k)}</span>
                <span style={{ fontWeight: 500 }}>{typeof v === "number" ? fc(v) : String(v)}</span>
              </div>
            ))}
          </div>
        )}
        {d.accountSummary && (
          <div style={sectionStyle}>
            <div style={headerStyle}>Account Summary</div>
            {Object.entries(d.accountSummary).map(([k, v]) => (
              <div key={k} style={rowStyle}>
                <span style={{ color: labelColor }}>{formatKey(k)}</span>
                <span style={{ fontWeight: 500 }}>{typeof v === "number" ? fc(v) : String(v)}</span>
              </div>
            ))}
          </div>
        )}
        {d.transactions && Array.isArray(d.transactions) && d.transactions.length > 0 && (
          <div style={sectionStyle}>
            <div style={headerStyle}>Transaction History</div>
            {d.transactions.map((tx, ti) => (
              <div key={ti} style={rowStyle}>
                <span style={{ color: labelColor }}>{tx.date || tx.type || `#${ti + 1}`}</span>
                <span style={{ fontWeight: 500 }}>{tx.description || tx.type || ""} {tx.amount != null ? fc(tx.amount) : ""}</span>
              </div>
            ))}
          </div>
        )}
        {Object.entries(d).filter(([k]) => !["investor", "project", "accountSummary", "transactions"].includes(k)).map(([k, v]) => (
          <div key={k} style={sectionStyle}>
            <div style={headerStyle}>{formatKey(k)}</div>
            {typeof v === "object" && v !== null && !Array.isArray(v) ? (
              Object.entries(v).map(([sk, sv]) => (
                <div key={sk} style={rowStyle}>
                  <span style={{ color: labelColor }}>{formatKey(sk)}</span>
                  <span style={{ fontWeight: 500 }}>{typeof sv === "number" ? fc(sv) : String(sv)}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: "#444" }}>{typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
