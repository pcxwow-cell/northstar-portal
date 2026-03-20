import { useState, useEffect } from "react";
import { fetchAdminProjects, updateProject, postUpdate, createProject, deleteProject, uploadProjectImage, exportProjectsCSV, fmtCurrency } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";

export default function ProjectManager({ toast, onViewProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [cpForm, setCpForm] = useState({ name: "", location: "", type: "Residential", status: "Pre-Development", description: "", sqft: "", units: "", totalRaise: "", estimatedCompletion: "", unitsSold: "", revenue: "", prefReturnPct: "8", gpCatchupPct: "100", carryPct: "20" });

  function reload() { setLoading(true); fetchAdminProjects().then(setProjects).finally(() => setLoading(false)); }
  useEffect(() => { reload(); }, []);

  const filteredProjects = projects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.name || "").toLowerCase().includes(q) || (p.location || "").toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleSave(id, field, value) {
    try { await updateProject(id, { [field]: value }); setProjects(p => p.map(x => x.id === id ? { ...x, [field === "completionPct" ? "completion" : field]: value } : x)); toast("Updated"); } catch (e) { toast(e.message, "error"); }
  }
  async function handlePostUpdate(pid) {
    if (!updateText.trim()) return;
    try { await postUpdate(pid, updateText); toast("Update posted"); setUpdateText(""); } catch (e) { toast(e.message, "error"); }
  }
  async function handleCreateProject(e) {
    e.preventDefault();
    if (!cpForm.name.trim()) { toast("Project name is required", "error"); return; }
    try {
      const data = { ...cpForm };
      if (data.units) data.units = parseInt(data.units);
      if (data.totalRaise) data.totalRaise = parseFloat(data.totalRaise);
      if (data.unitsSold) data.unitsSold = parseInt(data.unitsSold);
      if (data.revenue) data.revenue = parseFloat(data.revenue);
      if (data.prefReturnPct) data.prefReturnPct = parseFloat(data.prefReturnPct);
      if (data.gpCatchupPct) data.gpCatchupPct = parseFloat(data.gpCatchupPct);
      if (data.carryPct) data.carryPct = parseFloat(data.carryPct);
      await createProject(data);
      toast("Project created");
      setShowCreate(false);
      setCpForm({ name: "", location: "", type: "Residential", status: "Pre-Development", description: "", sqft: "", units: "", totalRaise: "", estimatedCompletion: "", unitsSold: "", revenue: "", prefReturnPct: "8", gpCatchupPct: "100", carryPct: "20" });
      reload();
    } catch (err) { toast(err.message, "error"); }
  }
  function handleDeleteProject(id, name) {
    setConfirmAction({
      title: "Delete Project",
      message: `Delete project "${name}"? This will permanently remove all related data (investors, documents, distributions, etc). This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setConfirmAction(null);
        try { await deleteProject(id); toast(`Project "${name}" deleted`); reload(); } catch (e) { toast(e.message, "error"); }
      },
    });
  }

  if (loading && projects.length === 0) return <Spinner />;

  return (
    <>
      {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
      <SectionHeader title="Projects" size="lg" right={<div style={{ display: "flex", gap: 8 }}><Button variant="outline" onClick={() => exportProjectsCSV().catch(e => toast?.(e.message, "error"))} style={{ fontSize: 12 }}>Export CSV</Button><Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create Project"}</Button></div>} style={{ marginBottom: 16 }} />

      {/* Search & Filter */}
      <SearchFilterBar search={search} onSearchChange={setSearch} placeholder="Search by name or location..." filters={[
        { value: statusFilter, onChange: setStatusFilter, label: "Status filter", options: [{ value: "", label: "All Statuses" }, { value: "Pre-Development", label: "Pre-Development" }, { value: "Under Construction", label: "Under Construction" }, { value: "Completed", label: "Completed" }] },
      ]} style={{ marginBottom: 24 }} />

      {/* Create Project Form */}
      {showCreate && (
        <form onSubmit={handleCreateProject} style={{ background: colors.white, borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)", marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>New Project</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Name *</label>
              <input value={cpForm.name} onChange={e => setCpForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} placeholder="Project name" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Location</label>
              <input value={cpForm.location} onChange={e => setCpForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="City, Province" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Type</label>
              <select value={cpForm.type} onChange={e => setCpForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                <option>Residential</option><option>Mixed-Use</option><option>Commercial</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Status</label>
              <select value={cpForm.status} onChange={e => setCpForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                <option>Pre-Development</option><option>Under Construction</option><option>Completed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Square Footage</label>
              <input value={cpForm.sqft} onChange={e => setCpForm(f => ({ ...f, sqft: e.target.value }))} style={inputStyle} placeholder="e.g. 96,000" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Units</label>
              <input type="number" value={cpForm.units} onChange={e => setCpForm(f => ({ ...f, units: e.target.value }))} style={inputStyle} placeholder="e.g. 108" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Total Raise ($)</label>
              <input type="number" value={cpForm.totalRaise} onChange={e => setCpForm(f => ({ ...f, totalRaise: e.target.value }))} style={inputStyle} placeholder="e.g. 6000000" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Est. Completion Date</label>
              <input type="date" value={cpForm.estimatedCompletion} onChange={e => setCpForm(f => ({ ...f, estimatedCompletion: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Units Sold</label>
              <input type="number" value={cpForm.unitsSold} onChange={e => setCpForm(f => ({ ...f, unitsSold: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Revenue ($)</label>
              <input type="number" value={cpForm.revenue} onChange={e => setCpForm(f => ({ ...f, revenue: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Pref Return %</label>
              <input type="number" step="0.1" value={cpForm.prefReturnPct} onChange={e => setCpForm(f => ({ ...f, prefReturnPct: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Carry %</label>
              <input type="number" value={cpForm.carryPct} onChange={e => setCpForm(f => ({ ...f, carryPct: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Description</label>
            <textarea value={cpForm.description} onChange={e => setCpForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Project description..." />
          </div>
          <Button type="submit">Create Project</Button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredProjects.length === 0 && !loading && (
          <EmptyState title="No projects found" subtitle={search || statusFilter ? "Try adjusting your search or filter." : "Create your first project to get started."} />
        )}
        {filteredProjects.map(p => {
          // Use uploaded imageUrl, then fall back to hardcoded Northstar images, then placeholder
          const fallbackThumbs = {
            "Porthaven": "https://northstardevelopment.ca/public/images/porthaven-1.jpg",
            "Livy": "https://northstardevelopment.ca/public/images/livy-2.jpeg",
            "Estrella": "https://northstardevelopment.ca/public/images/estrella-1.jpg",
            "Panorama B6": "https://northstardevelopment.ca/public/images/panorama-1.jpg",
          };
          const thumb = p.imageUrl || fallbackThumbs[p.name] || null;

          async function handleImageUpload(e) {
            e.stopPropagation();
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const result = await uploadProjectImage(p.id, file);
              setProjects(prev => prev.map(x => x.id === p.id ? { ...x, imageUrl: result.imageUrl } : x));
              toast("Image uploaded");
            } catch (err) { toast(err.message, "error"); }
          }

          return (
          <Card key={p.id} padding="0" style={{ overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s, transform .15s" }}
            onClick={() => onViewProject?.(p.id)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ display: "flex" }}>
              {/* Thumbnail with upload overlay */}
              {thumb ? (
                <div style={{ width: 120, minHeight: 100, flexShrink: 0, backgroundImage: `url(${thumb})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
                  <label onClick={e => e.stopPropagation()} style={{ position: "absolute", inset: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0)", transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.4)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0)"}>
                    <span style={{ color: "#fff", fontSize: 10, opacity: 0, transition: "opacity .15s" }} className="img-upload-label">Change</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageUpload} style={{ display: "none" }} />
                  </label>
                </div>
              ) : (
                <label onClick={e => e.stopPropagation()} style={{ width: 120, minHeight: 100, flexShrink: 0, background: `linear-gradient(135deg, ${colors.red}15, ${colors.red}05)`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 300, color: `${colors.red}40` }}>{p.name?.[0] || "P"}</span>
                  <span style={{ fontSize: 9, color: `${colors.red}60` }}>Upload</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageUpload} style={{ display: "none" }} />
                </label>
              )}
              <div style={{ flex: 1, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: colors.mutedText, marginTop: 2 }}>{p.location}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <StatusBadge status={p.status} />
                    <Button onClick={(e) => { e.stopPropagation(); setEditing(editing === p.id ? null : p.id); }} variant="outline" style={{ padding: "4px 12px", fontSize: 11 }}>{editing === p.id ? "Close" : "Quick Edit"}</Button>
                    <Button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id, p.name); }} variant="outline" style={{ padding: "4px 12px", fontSize: 11, color: colors.red, borderColor: colors.red }}>Delete</Button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                  <span>{p.investorCount} investors</span>
                  <span>{p.docCount} documents</span>
                  <span>Completion: <strong style={{ color: colors.darkText }}>{p.completion}%</strong></span>
                  <span>Raise: <strong style={{ color: colors.darkText }}>{fmtCurrency(p.totalRaise)}</strong></span>
                </div>
              </div>
            </div>
            {editing === p.id && (
              <div style={{ padding: "16px 20px", borderTop: `1px solid ${colors.lightBorder}` }} onClick={e => e.stopPropagation()}>
                <div className="admin-form-row" style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <select value={p.status} onChange={e => handleSave(p.id, "status", e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                    <option>Pre-Development</option><option>Under Construction</option><option>Completed</option>
                  </select>
                  <input type="number" min="0" max="100" value={p.completion} onChange={e => handleSave(p.id, "completionPct", parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: 80 }} placeholder="%" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Post a construction update..." style={{ ...inputStyle, flex: 1 }} />
                  <Button onClick={() => handlePostUpdate(p.id)}>Post</Button>
                </div>
              </div>
            )}
          </Card>
        );
        })}
      </div>
    </>
  );
}
