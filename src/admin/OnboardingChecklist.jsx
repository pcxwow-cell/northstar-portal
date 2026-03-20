import { colors } from "../styles/theme.js";
import Card from "../components/Card.jsx";

const sectionTitle = { fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 };

function getChecklistItems(profile) {
  const items = [];

  // 1. Account Created — always true if they have a profile
  items.push({ label: "Account Created", done: true, detail: profile.joined ? `Joined ${profile.joined}` : null });

  // 2. Email Verified / Active status
  const isActive = profile.status === "ACTIVE";
  items.push({ label: "Email Verified", done: isActive, detail: isActive ? "Account active" : `Status: ${profile.status}` });

  // 3. Accreditation Submitted
  const accredSubmitted = profile.accreditationStatus && profile.accreditationStatus !== "not_verified";
  items.push({ label: "Accreditation Submitted", done: accredSubmitted, detail: accredSubmitted ? `Status: ${profile.accreditationStatus}` : null });

  // 4. Subscription Agreement Signed — check if any signature requests exist (inferred from documents)
  const hasDocs = profile.documents && (profile.documents.assigned.length > 0 || profile.documents.projectDocs.length > 0);
  items.push({ label: "Subscription Agreement Signed", done: hasDocs, detail: hasDocs ? "Documents on file" : null });

  // 5. First Investment Made — check if any projects assigned
  const hasInvestment = profile.projects && profile.projects.length > 0;
  items.push({ label: "First Investment Made", done: hasInvestment, detail: hasInvestment ? `${profile.projects.length} project(s)` : null });

  // 6. Wire Received — check if any project has called > 0
  const hasWire = profile.projects && profile.projects.some(p => p.called > 0);
  items.push({ label: "Wire Received", done: hasWire, detail: hasWire ? "Capital called" : null });

  return items;
}

export default function OnboardingChecklist({ profile }) {
  const items = getChecklistItems(profile);
  const completed = items.filter(i => i.done).length;
  const pct = Math.round((completed / items.length) * 100);

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={sectionTitle}>Onboarding Progress</div>
        <span style={{ fontSize: 12, fontWeight: 500, color: pct === 100 ? colors.green : colors.mutedText }}>{completed}/{items.length} complete</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: colors.lightBorder, borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? colors.green : colors.red, borderRadius: 20, transition: "width .5s ease" }} />
      </div>

      {/* Checklist items */}
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < items.length - 1 ? `1px solid ${colors.lightBorder}` : "none" }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            border: item.done ? "none" : `2px solid ${colors.lightBorder}`,
            background: item.done ? colors.green : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: colors.white, flexShrink: 0,
          }}>
            {item.done && "\u2713"}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: item.done ? 400 : 500, color: item.done ? colors.mutedText : colors.darkText, textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
            {item.detail && <span style={{ fontSize: 11, color: colors.mutedText, marginLeft: 8 }}>{item.detail}</span>}
          </div>
        </div>
      ))}
    </Card>
  );
}
