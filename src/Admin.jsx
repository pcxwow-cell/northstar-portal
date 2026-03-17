import { useState, useEffect } from "react";
import { fetchDashboard, fetchAdminProjects, updateProject, postUpdate, fetchAdminInvestors, sendMessage, uploadDocument, fmt, fmtCurrency } from "./api.js";

const sans = "'DM Sans', -apple-system, sans-serif";
const red = "#EA2028";
const darkText = "#231F20";

// ─── ADMIN PANEL ─────────────────────────────────────────
export default function AdminPanel({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "Projects" },
    { id: "investors", label: "Investors" },
    { id: "documents", label: "Upload Docs" },
    { id: "messages", label: "Send Message" },
  ];

  const pages = {
    dashboard: <Dashboard />,
    projects: <ProjectManager toast={showToast} />,
    investors: <InvestorList />,
    documents: <DocumentUploader toast={showToast} />,
    messages: <MessageComposer user={user} toast={showToast} />,
  };

  return (
    <div style={{ fontFamily: sans, color: darkText, minHeight: "100vh", background: "#F8F7F4" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, background: "#fff", borderBottom: "1px solid #E8E5DE" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 24, background: red, borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".02em" }}>NORTHSTAR</span>
          <span style={{ fontSize: 11, color: "#999", marginLeft: 8, padding: "2px 8px", background: "#FEE", borderRadius: 3, color: red, fontWeight: 500 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#666" }}>{user.name}</span>
          <button onClick={onLogout} style={{ fontSize: 12, color: "#999", cursor: "pointer", padding: "5px 14px", border: "1px solid #DDD", borderRadius: 4, background: "#fff" }}>Sign Out</button>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ display: "flex", gap: 0, background: "#fff", borderBottom: "1px solid #E8E5DE", padding: "0 32px" }}>
        {navItems.map(n => (
          <span key={n.id} onClick={() => setView(n.id)} style={{
            fontSize: 13, padding: "12px 20px", cursor: "pointer",
            color: view === n.id ? darkText : "#999",
            borderBottom: view === n.id ? `2px solid ${red}` : "2px solid transparent",
            fontWeight: view === n.id ? 500 : 400, transition: "color .15s",
          }}>{n.label}</span>
        ))}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 32px 80px" }}>
        {pages[view]}
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 20px", background: toast.type === "error" ? "#FEE" : "#EFE", border: `1px solid ${toast.type === "error" ? red : "#3D7A54"}`, borderRadius: 4, fontSize: 13, color: toast.type === "error" ? red : "#3D7A54", zIndex: 100 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { fetchDashboard().then(setData).catch(console.error); }, []);
  if (!data) return <p style={{ color: "#999" }}>Loading...</p>;

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Admin Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { label: "Projects", value: data.projectCount },
          { label: "Investors", value: data.investorCount },
          { label: "Documents", value: data.docCount },
          { label: "Unread Messages", value: data.unreadMessages },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px" }}>
            <div style={{ fontSize: 28, fontWeight: 300, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Recent Documents</h2>
      <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
        {data.recentDocs.map((d, i) => (
          <div key={d.id} style={{ padding: "12px 20px", borderBottom: i < data.recentDocs.length - 1 ? "1px solid #F0EDE8" : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{d.name}</span>
            <span style={{ color: "#999" }}>{d.project?.name || "General"} · {d.date}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── PROJECT MANAGER ───
function ProjectManager({ toast }) {
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [updateText, setUpdateText] = useState("");

  useEffect(() => { fetchAdminProjects().then(setProjects).catch(console.error); }, []);

  async function handleSave(id, field, value) {
    try {
      await updateProject(id, { [field]: value });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, [field === "completionPct" ? "completion" : field]: value } : p));
      toast("Project updated");
    } catch (err) { toast(err.message, "error"); }
  }

  async function handlePostUpdate(projectId) {
    if (!updateText.trim()) return;
    try {
      await postUpdate(projectId, updateText);
      toast("Construction update posted");
      setUpdateText("");
    } catch (err) { toast(err.message, "error"); }
  }

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Projects</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {projects.map(p => (
          <div key={p.id} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#999" }}>{p.location} · {p.investorCount} investors · {p.docCount} docs</div>
              </div>
              <button onClick={() => setEditing(editing === p.id ? null : p.id)} style={{ fontSize: 12, padding: "5px 14px", border: "1px solid #DDD", borderRadius: 4, background: editing === p.id ? "#F0EDE8" : "#fff", cursor: "pointer" }}>
                {editing === p.id ? "Close" : "Edit"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 32, fontSize: 13, color: "#666" }}>
              <span>Status: <strong>{p.status}</strong></span>
              <span>Completion: <strong>{p.completion}%</strong></span>
              <span>Total Raise: <strong>{fmtCurrency(p.totalRaise)}</strong></span>
            </div>
            {editing === p.id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F0EDE8" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <select value={p.status} onChange={e => handleSave(p.id, "status", e.target.value)} style={{ padding: "8px 12px", border: "1px solid #DDD", borderRadius: 4, fontSize: 13 }}>
                    <option value="Pre-Development">Pre-Development</option>
                    <option value="Under Construction">Under Construction</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <input type="number" min="0" max="100" value={p.completion} onChange={e => handleSave(p.id, "completionPct", parseInt(e.target.value) || 0)}
                    style={{ width: 80, padding: "8px 12px", border: "1px solid #DDD", borderRadius: 4, fontSize: 13 }} placeholder="%" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Post a construction update..."
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #DDD", borderRadius: 4, fontSize: 13 }} />
                  <button onClick={() => handlePostUpdate(p.id)} style={{ padding: "8px 16px", background: red, color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer" }}>Post</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── INVESTOR LIST ───
function InvestorList() {
  const [investors, setInvestors] = useState([]);
  useEffect(() => { fetchAdminInvestors().then(setInvestors).catch(console.error); }, []);

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Investors</h1>
      <div style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, overflow: "hidden" }}>
        {investors.map((inv, i) => (
          <div key={inv.id} style={{ padding: "16px 24px", borderBottom: i < investors.length - 1 ? "1px solid #F0EDE8" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{inv.name}</span>
                <span style={{ fontSize: 12, color: "#999", marginLeft: 12 }}>{inv.email}</span>
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", background: inv.status === "ACTIVE" ? "#EFE" : "#FEE", color: inv.status === "ACTIVE" ? "#3D7A54" : red, borderRadius: 3 }}>{inv.status}</span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#888" }}>
              {inv.projects.map(p => (
                <span key={p.projectId} style={{ padding: "3px 10px", background: "#F8F7F4", borderRadius: 3 }}>
                  {p.projectName} · ${fmt(p.committed)}
                </span>
              ))}
              {inv.projects.length === 0 && <span style={{ fontStyle: "italic" }}>No project assignments</span>}
            </div>
          </div>
        ))}
        {investors.length === 0 && <div style={{ padding: 24, color: "#999", textAlign: "center" }}>No investors found</div>}
      </div>
    </>
  );
}

// ─── DOCUMENT UPLOADER ───
function DocumentUploader({ toast }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Reporting");
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchAdminProjects().then(setProjects).catch(console.error); }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !name) return toast("Name and file are required", "error");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      if (projectId) formData.append("projectId", projectId);
      formData.append("file", file);
      await uploadDocument(formData);
      toast("Document uploaded successfully");
      setName(""); setFile(null); setProjectId("");
    } catch (err) { toast(err.message, "error"); }
    finally { setUploading(false); }
  }

  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #DDD", borderRadius: 4, fontSize: 14, fontFamily: sans, boxSizing: "border-box" };

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Upload Document</h1>
      <form onSubmit={handleUpload} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "32px 28px", maxWidth: 520 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Document Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Q3 2025 — Porthaven Quarterly Report" style={inputStyle} required />
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option>Reporting</option><option>Property Update</option><option>Offering</option>
              <option>Capital Call</option><option>Legal</option><option>Tax</option><option>Distribution</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
              <option value="">General (all investors)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>File (PDF)</label>
          <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv" onChange={e => setFile(e.target.files[0])} style={{ fontSize: 13 }} required />
        </div>
        <button type="submit" disabled={uploading} style={{ padding: "12px 24px", background: uploading ? "#CCC" : red, color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: uploading ? "default" : "pointer" }}>
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>
    </>
  );
}

// ─── MESSAGE COMPOSER ───
function MessageComposer({ user, toast }) {
  const [fromName, setFromName] = useState(user.name || "");
  const [role, setRole] = useState("Northstar Admin");
  const [subject, setSubject] = useState("");
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    if (!subject || !preview) return toast("Subject and message are required", "error");
    setSending(true);
    try {
      await sendMessage({ fromName, role, subject, preview });
      toast("Message sent to investors");
      setSubject(""); setPreview("");
    } catch (err) { toast(err.message, "error"); }
    finally { setSending(false); }
  }

  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #DDD", borderRadius: 4, fontSize: 14, fontFamily: sans, boxSizing: "border-box" };

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Send Message</h1>
      <form onSubmit={handleSend} style={{ background: "#fff", border: "1px solid #E8E5DE", borderRadius: 6, padding: "32px 28px", maxWidth: 560 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>From Name</label>
            <input value={fromName} onChange={e => setFromName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Role / Title</label>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="President" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Q3 2025 Project Update" style={inputStyle} required />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 6 }}>Message</label>
          <textarea value={preview} onChange={e => setPreview(e.target.value)} placeholder="Write your message to investors..." rows={5}
            style={{ ...inputStyle, resize: "vertical" }} required />
        </div>
        <button type="submit" disabled={sending} style={{ padding: "12px 24px", background: sending ? "#CCC" : red, color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: sending ? "default" : "pointer" }}>
          {sending ? "Sending..." : "Send to All Investors"}
        </button>
      </form>
    </>
  );
}
