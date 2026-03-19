import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { fetchNotifications } from "../api.js";
import { colors } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const red = colors.red;

export default function ActivityPage({ onNavigate }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications()
      .then(n => setNotifications(Array.isArray(n) ? n : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const typeConfig = {
    document_uploaded: { icon: "📄", label: "Document Uploaded", nav: "documents" },
    distribution: { icon: "💰", label: "Distribution Paid", nav: "distributions" },
    capital_call: { icon: "📊", label: "Capital Call", nav: "portfolio" },
    message: { icon: "💬", label: "Message Received", nav: "messages" },
    signature_request: { icon: "✍️", label: "Signature Request", nav: "documents" },
    project_update: { icon: "🏗️", label: "Project Update", nav: "portfolio" },
  };

  return (
    <>
      <SectionHeader title="Activity" subtitle="Recent events across your portfolio" size="lg" style={{ marginBottom: 40 }} />
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spinner size={28} /></div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No activity yet" subtitle="Events will appear here as they occur." />
      ) : (
        <div style={{ position: "relative", paddingLeft: 28 }}>
          <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, width: 1, background: line }} />
          {notifications.map((n, i) => {
            const cfg = typeConfig[n.type] || { icon: "📌", label: n.type || "Event", nav: "overview" };
            return (
              <div key={n.id || i} style={{ display: "flex", gap: 16, marginBottom: 16, position: "relative" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: surface, border: `1px solid ${line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, position: "absolute", left: -16, zIndex: 1 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, marginLeft: 20, background: surface, borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.03)", border: `1px solid ${n.read ? "transparent" : `${red}22`}`, transition: "border-color .15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: t3, fontWeight: 500 }}>{cfg.label}</span>
                      {!n.read && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: `${red}18`, color: red, fontWeight: 600, marginLeft: 8 }}>NEW</span>}
                    </div>
                    <span style={{ fontSize: 11, color: t3 }}>{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</span>
                  </div>
                  <div style={{ fontSize: 13, color: t1, lineHeight: 1.5, marginBottom: 8 }}>{n.message || n.title || "Activity event"}</div>
                  <span onClick={() => onNavigate(cfg.nav)} style={{ fontSize: 11, color: red, cursor: "pointer" }}>View →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
