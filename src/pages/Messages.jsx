import { useState, useEffect } from "react";
import { colors, fonts } from "../styles/theme.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { fetchThreads, fetchThread, createThread, replyToThread } from "../api.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const serif = fonts.serif;
const sans = fonts.sans;
const red = colors.red;

function SkeletonBlock({ width = "100%", height = 16, style = {} }) {
  const th = useTheme();
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: `linear-gradient(90deg, ${th.line}00 0%, ${th.line} 50%, ${th.line}00 100%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );
}

function MessagesSkeleton() {
  const th = useTheme();
  return (
    <div aria-busy="true">
      <div style={{ marginBottom: 40 }}>
        <SkeletonBlock width={180} height={36} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={200} height={14} />
      </div>
      <Card padding="0" style={{ overflow: "hidden", background: th.surface }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "18px 20px", borderBottom: i < 3 ? `1px solid ${th.line}` : "none" }}>
            <SkeletonBlock width={7} height={7} style={{ borderRadius: "50%", marginTop: 7, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock width={220} height={14} style={{ marginBottom: 8 }} />
              <SkeletonBlock width={160} height={12} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="80%" height={12} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function MessagesPage({ toast, investor, initialThreadId }) {
  const { bg, surface, line, t1, t2, t3, hover } = useTheme();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadDetail, setThreadDetail] = useState(null);
  const [reply, setReply] = useState("");
  const [composing, setComposing] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("newest");

  useEffect(() => { loadThreads(); }, []);

  async function loadThreads() {
    try {
      const t = await fetchThreads();
      setThreads(t);
      if (initialThreadId && !threadDetail) {
        const target = t.find(th => th.id === initialThreadId);
        if (target) openThread(target);
      }
    } catch (e) { if (!e.message?.includes("unreachable")) console.error(e); }
    finally { setLoading(false); }
  }

  const [threadLoading, setThreadLoading] = useState(false);

  async function openThread(thread) {
    setSelectedThread(thread);
    setThreadLoading(true);
    try {
      const detail = await fetchThread(thread.id);
      setThreadDetail(detail);
      // Update unread status in list
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: false } : t));
    } catch (e) { toast("Failed to load thread", "error"); }
    finally { setThreadLoading(false); }
  }

  async function handleReply() {
    if (!reply.trim() || !threadDetail) return;
    setSending(true);
    try {
      const msg = await replyToThread(threadDetail.id, reply);
      setThreadDetail(prev => ({ ...prev, messages: [...prev.messages, msg] }));
      setReply("");
      toast("Reply sent", "success");
    } catch (e) { toast(e.message, "error"); }
    finally { setSending(false); }
  }

  async function handleCompose(e) {
    e.preventDefault();
    if (!composeSubject.trim() || !composeBody.trim()) return;
    setSending(true);
    try {
      await createThread({ subject: composeSubject, body: composeBody });
      toast("Message sent to Northstar", "success");
      setComposing(false); setComposeSubject(""); setComposeBody("");
      loadThreads();
    } catch (e) { toast(e.message, "error"); }
    finally { setSending(false); }
  }

  // Thread detail view
  if (selectedThread && threadLoading) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedThread(null); setThreadDetail(null); setReply(""); }}>{"\u2190"} Back to messages</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
          <Spinner size={28} />
        </div>
      </>
    );
  }
  if (threadDetail) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => { setSelectedThread(null); setThreadDetail(null); setReply(""); }}>{"\u2190"} Back to messages</p>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginBottom: 8 }}>{threadDetail.subject}</h1>
          <div style={{ fontSize: 12, color: t3 }}>
            {threadDetail.messages.length} message{threadDetail.messages.length > 1 ? "s" : ""} {"\u00B7"} Started by {threadDetail.creator.name}
            {threadDetail.project && <span> {"\u00B7"} {threadDetail.project}</span>}
          </div>
        </div>

        {/* Message thread */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {threadDetail.messages.map((m) => {
            const isMe = m.sender.role === "INVESTOR";
            return (
              <div key={m.id} style={{
                border: `1px solid ${line}`, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.03)",
                background: isMe ? hover : surface,
                marginLeft: isMe ? 48 : 0, marginRight: isMe ? 0 : 48,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isMe ? `${red}22` : `${line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: isMe ? red : t2 }}>
                      {m.sender.initials || m.sender.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{m.sender.name}</span>
                    {!isMe && <span style={{ fontSize: 11, color: t3 }}>{"\u00B7"} {m.sender.role === "ADMIN" ? "Northstar" : m.sender.role}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: t3 }}>{new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div style={{ fontSize: 14, color: t2, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{m.body}</div>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        <Card padding="16px 20px" style={{ background: surface }}>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..."
            rows={3} style={{ width: "100%", background: "transparent", border: "none", color: t1, fontSize: 14, fontFamily: sans, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <span onClick={!sending ? handleReply : undefined} style={{
              fontSize: 13, padding: "8px 20px", borderRadius: 4, cursor: sending ? "default" : "pointer",
              background: reply.trim() && !sending ? red : `${red}44`, color: colors.white, fontWeight: 500,
            }}>{sending ? "Sending..." : "Send Reply"}</span>
          </div>
        </Card>
      </>
    );
  }

  // Compose view
  if (composing) {
    return (
      <>
        <p style={{ fontSize: 12, color: red, cursor: "pointer", marginBottom: 24 }} onClick={() => setComposing(false)}>{"\u2190"} Back to messages</p>
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, marginBottom: 32 }}>New Message</h1>
        <form onSubmit={handleCompose} style={{ borderRadius: 12, padding: "28px 24px", background: surface, boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)" }}>
          <div style={{ fontSize: 12, color: t3, marginBottom: 20, padding: "10px 14px", background: hover, borderRadius: 4 }}>
            To: Northstar Pacific Development Group
          </div>
          <div style={{ marginBottom: 16 }}>
            <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Subject" required
              style={{ width: "100%", padding: "12px 14px", background: "transparent", border: `1px solid ${line}`, borderRadius: 4, color: t1, fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your message..." rows={6} required
              style={{ width: "100%", padding: "12px 14px", background: "transparent", border: `1px solid ${line}`, borderRadius: 4, color: t1, fontSize: 14, fontFamily: sans, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <span onClick={() => setComposing(false)} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 4, cursor: "pointer", border: `1px solid ${line}`, color: t2 }}>Cancel</span>
            <Button type="submit" disabled={sending} style={{ fontSize: 13, padding: "10px 24px", borderRadius: 4, cursor: sending ? "default" : "pointer", background: sending ? `${red}88` : red, color: colors.white, border: "none", fontWeight: 500, fontFamily: sans }}>
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </>
    );
  }

  // Thread list
  const unreadCount = threads.filter(t => t.unread).length;
  return (
    <>
      <SectionHeader title="Messages" subtitle={`${unreadCount} unread \u00B7 ${threads.length} conversations`} size="lg" right={<span onClick={() => setComposing(true)} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 4, cursor: "pointer", background: red, color: colors.white, fontWeight: 500 }}>New Message</span>} style={{ marginBottom: 40 }} />
      {/* Search and sort controls */}
      {!loading && threads.length > 0 && (
        <SearchFilterBar search={searchTerm} onSearchChange={setSearchTerm} placeholder="Search messages..." filters={[
          { value: sortMode, onChange: setSortMode, label: "Sort order", options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "unread", label: "Unread first" }] },
        ]} style={{ marginBottom: 16 }} />
      )}
      {loading ? (
        <MessagesSkeleton />
      ) : threads.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <EmptyState title="No messages yet" subtitle="Start a conversation with Northstar." />
          <span onClick={() => setComposing(true)} style={{ fontSize: 13, color: red, cursor: "pointer", marginTop: 8, display: "inline-block" }}>Send your first message {"\u2192"}</span>
        </div>
      ) : (() => {
        const filteredThreads = threads
          .filter(t => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            if (t.subject.toLowerCase().includes(q)) return true;
            if (t.lastMessage?.body?.toLowerCase().includes(q)) return true;
            if (t.lastMessage?.sender?.name?.toLowerCase().includes(q)) return true;
            if (t.creator?.name?.toLowerCase().includes(q)) return true;
            if (t.project?.toLowerCase().includes(q)) return true;
            return false;
          })
          .sort((a, b) => {
            if (sortMode === "unread") return (b.unread ? 1 : 0) - (a.unread ? 1 : 0) || new Date(b.lastMessage?.date || 0) - new Date(a.lastMessage?.date || 0);
            if (sortMode === "oldest") return new Date(a.lastMessage?.date || 0) - new Date(b.lastMessage?.date || 0);
            return new Date(b.lastMessage?.date || 0) - new Date(a.lastMessage?.date || 0);
          });
        return filteredThreads.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: t3, fontSize: 13 }}>No messages matching "{searchTerm}".</div>
        ) : (
        <Card padding="0" style={{ overflow: "hidden", background: surface }}>
          {filteredThreads.map((t, i) => (
            <div key={t.id} onClick={() => openThread(t)} style={{ display: "flex", gap: 14, padding: "18px 20px", borderBottom: i < filteredThreads.length - 1 ? `1px solid ${line}` : "none", cursor: "pointer", transition: "background .12s", background: t.unread ? `${red}06` : "transparent", borderLeft: t.unread ? `3px solid ${red}` : "3px solid transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = hover}
              onMouseLeave={e => e.currentTarget.style.background = t.unread ? `${red}06` : "transparent"}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.unread ? red : "transparent", marginTop: 7, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: t.unread ? 600 : 400, color: t1 }}>{t.subject}</span>
                  <span style={{ fontSize: 11, color: t3, flexShrink: 0, marginLeft: 12 }}>
                    {t.lastMessage ? new Date(t.lastMessage.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: t3 }}>
                  {t.lastMessage?.sender.name || t.creator.name}
                  {t.messageCount > 1 && <span> {"\u00B7"} {t.messageCount} messages</span>}
                  {t.project && <span> {"\u00B7"} {t.project}</span>}
                  {(t.hasAttachments || t.attachmentCount > 0) && <span style={{ marginLeft: 6, fontSize: 10, color: "#999" }}>{"\uD83D\uDCCE"}</span>}
                </div>
                {t.lastMessage && (
                  <div style={{ fontSize: 12, color: t3, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.lastMessage.body.substring(0, 120)}{t.lastMessage.body.length > 120 ? "..." : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
        );
      })()}
    </>
  );
}
