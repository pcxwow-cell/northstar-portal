import { useState, useEffect } from "react";
import { useAdminData } from "../context/AdminDataContext.jsx";
import { fetchGroups, createGroup, updateGroup, deleteGroup, fetchGroupDetail, addGroupMembers, removeGroupMember } from "../api.js";
import { colors, inputStyle } from "../styles/theme.js";
import SectionHeader from "../components/SectionHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function GroupManager({ toast, hideHeader }) {
  const { investors } = useAdminData();
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(colors.red);
  const [newParentId, setNewParentId] = useState("");
  const [newTier, setNewTier] = useState("primary");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [addSearch, setAddSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null); // { name, tier }

  useEffect(() => { loadGroups(); }, []);
  function loadGroups() { fetchGroups().then(setGroups); }

  // Build tree structure
  const rootGroups = groups.filter(g => !g.parentId);
  const childGroupsOf = (parentId) => groups.filter(g => g.parentId === parentId);
  const totalMembers = (g) => {
    const children = childGroupsOf(g.id);
    return g.memberCount + children.reduce((s, c) => s + (c.memberCount || 0), 0);
  };

  const tierLabels = { primary: "Primary LP", "sub-lp": "Sub-LP", "fund-of-funds": "Fund of Funds" };
  const tierColors = { primary: colors.green, "sub-lp": "#8B7128", "fund-of-funds": "#4466AA" };

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try { await createGroup({ name: newName, color: newColor, parentId: newParentId ? parseInt(newParentId) : null, tier: newTier }); toast("Group created"); setNewName(""); setNewParentId(""); loadGroups(); } catch (e) { toast(e.message, "error"); }
  }

  function handleDelete(id) {
    const group = groups.find(g => g.id === id);
    const memberCount = group?.memberCount || 0;
    setConfirmAction({
      title: "Delete Group",
      message: `Delete group "${group?.name}"?${memberCount > 0 ? ` This group has ${memberCount} member${memberCount > 1 ? "s" : ""} who will be removed.` : ""} This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await deleteGroup(id, memberCount > 0);
          toast("Group deleted");
          if (selectedGroup === id) { setSelectedGroup(null); setGroupDetail(null); }
          loadGroups();
        } catch (e) { toast(e.message, "error"); }
      },
    });
  }

  async function openGroup(id) {
    setSelectedGroup(id);
    const detail = await fetchGroupDetail(id);
    setGroupDetail(detail);
  }

  async function handleAddMember(userId) {
    try { await addGroupMembers(selectedGroup, [userId]); toast("Member added"); openGroup(selectedGroup); } catch (e) { toast(e.message, "error"); }
  }

  async function handleRemoveMember(userId) {
    try { await removeGroupMember(selectedGroup, userId); toast("Member removed"); openGroup(selectedGroup); } catch (e) { toast(e.message, "error"); }
  }

  const addResults = addSearch.length >= 1 && groupDetail
    ? investors.filter(inv => !groupDetail.members.some(m => m.id === inv.id) && (inv.name.toLowerCase().includes(addSearch.toLowerCase()) || inv.email.toLowerCase().includes(addSearch.toLowerCase())))
    : [];

  async function handleSaveEdit() {
    if (!editingGroup || !selectedGroup) return;
    try {
      await updateGroup(selectedGroup, { name: editingGroup.name, tier: editingGroup.tier });
      toast("Group updated");
      setEditingGroup(null);
      loadGroups();
      openGroup(selectedGroup);
    } catch (e) { toast(e.message, "error"); }
  }

  return (
    <>
      {confirmAction && <ConfirmDialog {...confirmAction} open={true} onCancel={() => setConfirmAction(null)} />}
      {!hideHeader && <SectionHeader title="Investor Groups" size="lg" style={{ marginBottom: 24 }} />}

      {/* Create group */}
      <form onSubmit={handleCreate} className="admin-form-row" style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "#888" }}>Group Name</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Class A LPs" style={inputStyle} required />
        </div>
        <div style={{ width: 140 }}>
          <label style={{ fontSize: 11, color: "#888" }}>Parent Group</label>
          <select value={newParentId} onChange={e => setNewParentId(e.target.value)} style={inputStyle}>
            <option value="">None (top-level)</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div style={{ width: 130 }}>
          <label style={{ fontSize: 11, color: "#888" }}>Tier</label>
          <select value={newTier} onChange={e => setNewTier(e.target.value)} style={inputStyle}>
            <option value="primary">Primary LP</option>
            <option value="sub-lp">Sub-LP</option>
            <option value="fund-of-funds">Fund of Funds</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888" }}>Color</label>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 42, height: 38, border: "1px solid #DDD", borderRadius: 4, cursor: "pointer" }} />
        </div>
        <Button type="submit">Create Group</Button>
      </form>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Group list */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <Card padding="0" style={{ overflow: "hidden" }}>
            {groups.length === 0 ? <div style={{ padding: 20, color: colors.mutedText, textAlign: "center", fontSize: 13 }}>No groups yet</div> : (() => {
              const renderGroup = (g, indent = 0) => {
                const children = childGroupsOf(g.id);
                return [
                  <div key={g.id} onClick={() => openGroup(g.id)} style={{
                    padding: "12px 16px", paddingLeft: 16 + indent * 20, borderBottom: `1px solid ${colors.lightBorder}`,
                    cursor: "pointer", background: selectedGroup === g.id ? "#F8F7F4" : colors.white,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {indent > 0 && <span style={{ color: "#CCC", fontSize: 10 }}>&#x2514;</span>}
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color || "#CCC" }} />
                      <span style={{ fontSize: 13, fontWeight: selectedGroup === g.id ? 500 : 400 }}>{g.name}</span>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${tierColors[g.tier] || "#999"}15`, color: tierColors[g.tier] || "#999" }}>{tierLabels[g.tier] || g.tier}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: colors.mutedText }}>{totalMembers(g)}</span>
                      <span onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }} style={{ fontSize: 14, color: "#CCC", cursor: "pointer" }}>&times;</span>
                    </div>
                  </div>,
                  ...children.flatMap(c => renderGroup(c, indent + 1)),
                ];
              };
              return rootGroups.flatMap(g => renderGroup(g));
            })()}
          </Card>
        </div>

        {/* Group detail */}
        <div style={{ flex: 1 }}>
          {groupDetail ? (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: groupDetail.color || "#CCC" }} />
                {editingGroup ? (
                  <>
                    <input value={editingGroup.name} onChange={e => setEditingGroup(g => ({ ...g, name: e.target.value }))} style={{ ...inputStyle, fontSize: 16, fontWeight: 500, width: 180 }} />
                    <select value={editingGroup.tier} onChange={e => setEditingGroup(g => ({ ...g, tier: e.target.value }))} style={{ ...inputStyle, width: 130 }}>
                      <option value="primary">Primary LP</option>
                      <option value="sub-lp">Sub-LP</option>
                      <option value="fund-of-funds">Fund of Funds</option>
                    </select>
                    <Button onClick={handleSaveEdit} style={{ padding: "4px 12px", fontSize: 11 }}>Save</Button>
                    <span onClick={() => setEditingGroup(null)} style={{ fontSize: 12, color: colors.mutedText, cursor: "pointer" }}>Cancel</span>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontSize: 18, fontWeight: 500 }}>{groupDetail.name}</h2>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: `${tierColors[groupDetail.tier] || "#999"}15`, color: tierColors[groupDetail.tier] || "#999" }}>{tierLabels[groupDetail.tier] || groupDetail.tier}</span>
                    <span style={{ fontSize: 12, color: colors.mutedText }}>{groupDetail.members.length} members</span>
                    <span onClick={() => setEditingGroup({ name: groupDetail.name, tier: groupDetail.tier })} style={{ fontSize: 11, color: colors.red, cursor: "pointer", marginLeft: 4 }}>Edit</span>
                  </>
                )}
              </div>
              {groupDetail.parent && (
                <div style={{ fontSize: 12, color: colors.mutedText, marginBottom: 12 }}>Parent: <strong onClick={() => openGroup(groupDetail.parent.id)} style={{ cursor: "pointer", color: colors.red }}>{groupDetail.parent.name}</strong></div>
              )}
              {groupDetail.children && groupDetail.children.length > 0 && (
                <div style={{ fontSize: 12, color: colors.mutedText, marginBottom: 16 }}>
                  Sub-groups: {groupDetail.children.map((c, i) => (
                    <span key={c.id}><strong onClick={() => openGroup(c.id)} style={{ cursor: "pointer", color: colors.red }}>{c.name}</strong> ({c.memberCount}){i < groupDetail.children.length - 1 ? ", " : ""}</span>
                  ))}
                </div>
              )}

              {/* Add member search */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search investors to add..." style={inputStyle} />
                {addResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: colors.white, border: "1px solid #E8E5DE", borderTop: "none", borderRadius: "0 0 4px 4px", zIndex: 10, maxHeight: 180, overflow: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
                    {addResults.slice(0, 6).map(inv => (
                      <div key={inv.id} onClick={() => { handleAddMember(inv.id); setAddSearch(""); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${colors.lightBorder}` }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8F7F4"}
                        onMouseLeave={e => e.currentTarget.style.background = colors.white}>
                        <span style={{ fontWeight: 500 }}>{inv.name}</span>
                        <span style={{ color: colors.mutedText, marginLeft: 8, fontSize: 12 }}>{inv.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member list */}
              {groupDetail.members.map((m, i) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < groupDetail.members.length - 1 ? "1px solid #F5F3F0" : "none" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: colors.mutedText, marginLeft: 10 }}>{m.email}</span>
                  </div>
                  <span onClick={() => handleRemoveMember(m.id)} style={{ fontSize: 12, color: colors.red, cursor: "pointer" }}>Remove</span>
                </div>
              ))}
              {groupDetail.members.length === 0 && <div style={{ color: "#BBB", fontSize: 13, fontStyle: "italic" }}>No members — search above to add investors</div>}
            </Card>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: colors.mutedText }}>Select a group to manage members</div>
          )}
        </div>
      </div>
    </>
  );
}
