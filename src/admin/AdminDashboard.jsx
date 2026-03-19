import { useState, useEffect } from "react";
import { fetchDashboard, fetchAdminInvestors, fetchSignatureRequests, fetchAuditLog, approveInvestor, deactivateInvestor } from "../api.js";
import { colors, fonts } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";

function AdminError({ message, onRetry }) {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p style={{ color: colors.red, marginBottom: 12 }}>{message}</p>
      {onRetry && <Button onClick={onRetry} variant="outline">Retry</Button>}
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [pendingInvestors, setPendingInvestors] = useState([]);
  const [signatureRequests, setSignatureRequests] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  useEffect(() => {
    fetchDashboard().then(setData).catch(e => setError(e.message));
    // Fetch pending actions data in parallel
    Promise.allSettled([
      fetchAdminInvestors({ status: "PENDING" }),
      fetchSignatureRequests(),
      fetchAuditLog(),
    ]).then(([invResult, sigResult, auditResult]) => {
      if (invResult.status === "fulfilled") {
        const inv = invResult.value;
        setPendingInvestors(Array.isArray(inv) ? inv : inv.investors || []);
      }
      if (sigResult.status === "fulfilled") {
        const sigs = Array.isArray(sigResult.value) ? sigResult.value : sigResult.value?.requests || [];
        setSignatureRequests(sigs);
      }
      if (auditResult.status === "fulfilled") {
        const logs = Array.isArray(auditResult.value) ? auditResult.value : auditResult.value?.entries || [];
        setAuditLog(logs.slice(0, 10));
      }
      setPendingLoading(false);
    });
  }, []);

  async function handleQuickApprove(id) {
    try {
      await approveInvestor(id);
      setPendingInvestors(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  }
  async function handleQuickReject(id) {
    try {
      await deactivateInvestor(id);
      setPendingInvestors(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  }

  if (error) return <AdminError message={error} onRetry={() => { setError(null); fetchDashboard().then(setData).catch(e => setError(e.message)); }} />;
  if (!data) return <Spinner />;

  const statCards = [
    { label: "Projects", value: data.projectCount, accent: colors.red, nav: "projects" },
    { label: "Investors", value: data.investorCount, accent: colors.green, nav: "investors" },
    { label: "Documents", value: data.docCount, accent: "#D4A574", nav: "documents" },
    { label: "Unread Messages", value: data.unreadMessages, accent: "#5B8DEF", nav: "inbox" },
  ];

  const pendingSigs = signatureRequests.filter(s => s.status === "pending" || s.status === "sent");

  return (
    <>
      <SectionHeader title="Admin Dashboard" size="lg" style={{ marginBottom: 32 }} />

      {/* Stat Cards */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {statCards.map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} accent={s.accent} onClick={() => onNavigate(s.nav)} />
        ))}
      </div>

      {/* Pending Actions */}
      <Card padding="24px 28px" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          Pending Actions
          {!pendingLoading && (pendingInvestors.length + pendingSigs.length) > 0 && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${colors.red}15`, color: colors.red, fontWeight: 600 }}>
              {pendingInvestors.length + pendingSigs.length}
            </span>
          )}
        </h2>
        {pendingLoading ? (
          <div style={{ padding: "12px 0", fontSize: 13, color: colors.mutedText }}>Checking for pending items...</div>
        ) : (pendingInvestors.length === 0 && pendingSigs.length === 0) ? (
          <div style={{ padding: "12px 0", fontSize: 13, color: colors.mutedText }}>No pending actions. You are all caught up.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Pending Investors */}
            {pendingInvestors.length > 0 && (
              <div style={{ border: `1px solid ${colors.lightBorder}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: colors.cardBg, fontSize: 12, fontWeight: 500, color: colors.mutedText, borderBottom: `1px solid ${colors.lightBorder}` }}>
                  Investors Awaiting Approval ({pendingInvestors.length})
                </div>
                {pendingInvestors.map(inv => (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #F8F7F4", fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{inv.name}</span>
                      <span style={{ color: colors.mutedText, marginLeft: 8 }}>{inv.email}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button onClick={() => handleQuickApprove(inv.id)} style={{ padding: "4px 12px", fontSize: 11, background: colors.green }}>Approve</Button>
                      <Button onClick={() => handleQuickReject(inv.id)} variant="outline" style={{ padding: "4px 12px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Pending Signatures */}
            {pendingSigs.length > 0 && (
              <div style={{ border: `1px solid ${colors.lightBorder}`, borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{pendingSigs.length}</span> document{pendingSigs.length !== 1 ? "s" : ""} awaiting signature
                </div>
                <Button onClick={() => onNavigate("documents")} variant="outline" style={{ padding: "4px 12px", fontSize: 11 }}>Review</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Invite Investor", icon: "+", nav: "investors", accent: colors.green },
          { label: "Upload Document", icon: "\u2191", nav: "documents", accent: "#D4A574" },
          { label: "Post Update", icon: "\u270E", nav: "projects", accent: colors.red },
          { label: "Record Distribution", icon: "$", nav: "projects", accent: "#5B8DEF" },
        ].map((a, i) => (
          <Button key={i} onClick={() => onNavigate(a.nav)} style={{
            background: colors.white, border: "1px solid #ECEAE5", borderRadius: 10, padding: "16px 20px",
            fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, color: colors.darkText,
            display: "flex", alignItems: "center", gap: 10, transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = a.accent; e.currentTarget.style.background = colors.cardBg; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECEAE5"; e.currentTarget.style.background = colors.white; }}>
            <span style={{ width: 28, height: 28, borderRadius: 6, background: `${a.accent}15`, color: a.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600 }}>{a.icon}</span>
            {a.label}
          </Button>
        ))}
      </div>

      {/* Recent Activity Timeline */}
      <Card padding="24px 28px" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Recent Activity</h2>
        {auditLog.length === 0 ? (
          <div style={{ fontSize: 13, color: colors.mutedText, padding: "8px 0" }}>No recent activity recorded.</div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 24 }}>
            {/* Timeline line */}
            <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: "#ECEAE5" }} />
            {auditLog.map((entry, i) => (
              <div key={entry.id || i} style={{ position: "relative", paddingBottom: i < auditLog.length - 1 ? 16 : 0, fontSize: 13 }}>
                {/* Timeline dot */}
                <div style={{ position: "absolute", left: -20, top: 5, width: 10, height: 10, borderRadius: "50%", background: colors.white, border: `2px solid ${colors.red}`, zIndex: 1 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{entry.action || entry.type}</span>
                    {entry.userName && <span style={{ color: colors.mutedText }}> by {entry.userName}</span>}
                    {entry.resource && <span style={{ color: colors.mutedText }}> on {entry.resource}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: "#AAA", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : entry.date || ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Documents */}
      <Card padding="24px 28px">
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Recent Documents</h2>
        {data.recentDocs.length === 0 ? (
          <div style={{ fontSize: 13, color: colors.mutedText }}>No recent documents.</div>
        ) : (
          data.recentDocs.map((d, i) => (
            <div key={d.id} style={{ padding: "10px 0", borderBottom: i < data.recentDocs.length - 1 ? `1px solid ${colors.lightBorder}` : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{d.name}</span>
              <span style={{ color: colors.mutedText }}>{d.project?.name || "General"} · {d.date}</span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
