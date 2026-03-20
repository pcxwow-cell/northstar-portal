import { useState, useEffect } from "react";
import { fetchNotifications, markNotificationRead } from "../api.js";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import Card from "../components/Card.jsx";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const serif = fonts.serif;
const red = colors.red;
const green = colors.green;

const typeConfig = {
  document_uploaded: { icon: "\uD83D\uDCC4", label: "Document", color: "#5B8DEF", nav: "documents" },
  distribution: { icon: "\uD83D\uDCB0", label: "Distribution", color: green, nav: "distributions" },
  capital_call: { icon: "\uD83D\uDCCA", label: "Capital Call", color: "#D4A574", nav: "portfolio" },
  message: { icon: "\uD83D\uDCAC", label: "Message", color: "#8B7128", nav: "messages" },
  signature_request: { icon: "\u270D\uFE0F", label: "Signature", color: red, nav: "documents" },
  project_update: { icon: "\uD83C\uDFD7\uFE0F", label: "Update", color: "#767168", nav: "portfolio" },
};

function relativeTime(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "Just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  if (d < 7 * 86400000) return `${Math.floor(d / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(items) {
  const groups = {};
  for (const n of items) {
    const d = new Date(n.createdAt || Date.now());
    const now = new Date();
    const diff = now - d;
    let label;
    if (diff < 86400000 && d.getDate() === now.getDate()) label = "Today";
    else if (diff < 2 * 86400000) label = "Yesterday";
    else if (diff < 7 * 86400000) label = "This Week";
    else label = "Earlier";
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function ActivityPage({ toast, onNavigate }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications()
      .then(n => setNotifications(Array.isArray(n) ? n : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  function handleMarkRead(id) {
    markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function handleMarkAllRead() {
    notifications.filter(n => !n.read).forEach(n => markNotificationRead(n.id).catch(() => {}));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const filters = ["all", "unread", ...new Set(notifications.map(n => n.type))];
  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter !== "all") return n.type === filter;
    return true;
  });
  const grouped = groupByDate(filtered);

  return (
    <>
      <SectionHeader title="Activity" subtitle={`${unreadCount} unread \u00B7 ${notifications.length} events`} size="lg" right={unreadCount > 0 ? <span onClick={handleMarkAllRead} style={{ fontSize: 12, color: red, cursor: "pointer", padding: "8px 16px", border: `1px solid ${red}33`, borderRadius: 4 }}>Mark all read</span> : null} style={{ marginBottom: 32 }} />

      {/* Filters */}
      {!loading && notifications.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: `${line}55`, borderRadius: 8, padding: 2, width: "fit-content", flexWrap: "wrap" }}>
          {filters.map(f => {
            const cfg = typeConfig[f];
            const label = f === "all" ? "All" : f === "unread" ? "Unread" : cfg?.label || f;
            return (
              <span key={f} onClick={() => setFilter(f)} style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                color: filter === f ? t1 : t3,
                background: filter === f ? surface : "transparent",
                boxShadow: filter === f ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                fontWeight: filter === f ? 500 : 400,
                transition: "all .15s",
              }}>{label}</span>
            );
          })}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spinner size={28} /></div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="\uD83D\uDD14" title="No activity yet" subtitle="Events will appear here as they occur across your portfolio." />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: t3, fontSize: 13 }}>No {filter === "unread" ? "unread" : ""} activity matching this filter.</div>
      ) : (
        Object.entries(grouped).map(([label, items]) => (
          <div key={label} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: t3, marginBottom: 12, paddingLeft: 4 }}>{label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(n => {
                const cfg = typeConfig[n.type] || { icon: "\uD83D\uDCCC", label: "Event", color: t3, nav: "overview" };
                return (
                  <Card key={n.id} padding="0" style={{ overflow: "hidden", background: surface, borderLeft: n.read ? "3px solid transparent" : `3px solid ${cfg.color}`, transition: "all .15s", cursor: "pointer" }}
                    onClick={() => { if (!n.read) handleMarkRead(n.id); onNavigate(cfg.nav); }}>
                    <div style={{ display: "flex", gap: 14, padding: "16px 20px" }}
                      onMouseEnter={e => e.currentTarget.style.background = hover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                            {!n.read && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: `${red}15`, color: red, fontWeight: 600 }}>NEW</span>}
                          </div>
                          <span style={{ fontSize: 11, color: t3, flexShrink: 0 }}>{relativeTime(n.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: t1, fontWeight: n.read ? 400 : 500, lineHeight: 1.5, marginBottom: n.preview ? 6 : 0 }}>{n.message || n.title}</div>
                        {n.preview && (
                          <div style={{ fontSize: 12, color: t3, padding: "8px 12px", background: `${line}44`, borderRadius: 6, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.preview}
                          </div>
                        )}
                        {n.project && (
                          <div style={{ fontSize: 11, color: t3, marginTop: 6 }}>{n.project}</div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </>
  );
}
