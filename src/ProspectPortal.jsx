import { useState, useEffect } from "react";
import { NorthstarIcon, NorthstarWordmark, sans, serif, red, darkText, cream, green } from "./App.jsx";
import { submitProspectInterest, fetchProjects, isDemoMode, fmtCurrency } from "./api.js";
import { projects as demoProjectsData } from "./data.js";

// ─── PROJECT IMAGES ─────────────────────────────────────
const projectImages = {
  1: "https://northstardevelopment.ca/public/images/porthaven-1.jpg",
  2: "https://northstardevelopment.ca/public/images/livy-2.jpeg",
  3: "https://northstardevelopment.ca/public/images/estrella-1.jpg",
  4: "https://northstardevelopment.ca/public/images/panorama-1.jpg",
};

const projectImagesByName = {
  Porthaven: projectImages[1],
  Livy: projectImages[2],
  Estrella: projectImages[3],
  "Panorama Building 6": projectImages[4],
};

// ─── PROSPECT PROJECT DATA (enriched for public display) ───
const prospectProjects = [
  {
    id: 1, name: "Porthaven", location: "Downtown Port Coquitlam",
    type: "Mixed-Use Residential & Retail", status: "Under Construction",
    units: 108, sqft: "96,000", completionPct: 68, totalRaise: 6000000,
    minInvestment: 100000, projectedIRR: "16-20%", projectedMOIC: "1.6-1.8x",
    holdPeriod: "3-4 years", propertyType: "Mixed-Use",
    description: "Redefining Downtown Port Coquitlam. A landmark mixed-use development featuring 108 thoughtfully designed residences and curated ground-floor retail, positioned adjacent to Leigh Square in the heart of the city's emerging cultural district.",
    prefReturn: "8% preferred", gpCatchup: "100% GP catch-up", carrySplit: "80/20 LP/GP above preferred return",
    documents: ["Private Placement Memorandum", "Subscription Agreement", "Q2 2025 Quarterly Report", "Construction Progress Photos"],
  },
  {
    id: 2, name: "Livy", location: "Port Coquitlam",
    type: "Residential", status: "Pre-Development",
    units: 64, sqft: "52,000", completionPct: 15, totalRaise: 4500000,
    minInvestment: 75000, projectedIRR: "18-24%", projectedMOIC: "1.7-2.0x",
    holdPeriod: "4-5 years", propertyType: "Residential",
    description: "Launching Spring 2025. Studio to two-bedroom-and-den residences in the heart of Poco. A transit-oriented community with walkable amenities, designed for modern urban living in one of Metro Vancouver's fastest-growing corridors.",
    prefReturn: "8% preferred", gpCatchup: "100% GP catch-up", carrySplit: "80/20 LP/GP above preferred return",
    documents: ["Private Placement Memorandum", "Subscription Agreement", "Market Study", "Architectural Plans"],
  },
  {
    id: 3, name: "Estrella", location: "British Columbia",
    type: "Purpose Built Rental", status: "Under Construction",
    units: 40, sqft: "38,000", completionPct: 45, totalRaise: 3800000,
    minInvestment: 75000, projectedIRR: "14-18%", projectedMOIC: "1.5-1.7x",
    holdPeriod: "5-7 years", propertyType: "Purpose-Built Rental",
    description: "A 40-unit purpose-built rental development with a 20% affordable housing allocation. CMHC MLI Select financing secured with favorable terms. Construction is well underway with anticipated completion Q2 2026.",
    prefReturn: "8% preferred", gpCatchup: "100% GP catch-up", carrySplit: "80/20 LP/GP above preferred return",
    documents: ["Private Placement Memorandum", "Subscription Agreement", "CMHC Approval Letter", "Construction Timeline"],
  },
  {
    id: 4, name: "Panorama Building 6", location: "Surrey, BC",
    type: "Federal Office Building", status: "Completed",
    units: null, sqft: "55,000", completionPct: 100, totalRaise: 8000000,
    minInvestment: 150000, projectedIRR: "12-15%", projectedMOIC: "1.4-1.5x",
    holdPeriod: "10+ years", propertyType: "Commercial Office",
    description: "Purpose-built 55,000 sf office building for the Federal Government. Completed Fall 2024. Fully leased on a long-term net lease with built-in annual escalations, providing stable and predictable cash flow.",
    prefReturn: "8% preferred", gpCatchup: "100% GP catch-up", carrySplit: "80/20 LP/GP above preferred return",
    documents: ["Private Placement Memorandum", "Lease Summary", "Final Completion Report"],
  },
];

// ─── INTEREST FORM MODAL ─────────────────────────────────
function InterestFormModal({ open, onClose, projectId, projectName }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", entityType: "", accreditationStatus: "",
    investmentRange: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email) { setError("Name and email are required."); return; }
    setError("");
    setSubmitting(true);
    try {
      await submitProspectInterest({
        ...form,
        interestedProjectId: projectId || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm({ name: "", email: "", phone: "", entityType: "", accreditationStatus: "", investmentRange: "", message: "" });
    setSubmitted(false);
    setError("");
    onClose();
  }

  if (!open) return null;

  const inputStyle = {
    width: "100%", padding: "12px 14px", border: "1px solid #E0DDD8", borderRadius: 4,
    fontSize: 14, fontFamily: sans, outline: "none", boxSizing: "border-box",
    transition: "border-color .15s", background: "#FAFAFA",
  };
  const labelStyle = { display: "block", fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

  return (
    <div onClick={handleClose} style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", animation: "fadeIn .15s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 8, padding: 0, maxWidth: 520, width: "90%",
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.15)",
      }}>
        {submitted ? (
          <div style={{ padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${green}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <span style={{ fontSize: 24, color: green }}>&#10003;</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 400, color: darkText, marginBottom: 12, fontFamily: sans }}>Thank You for Your Interest</h3>
            <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, maxWidth: 360, margin: "0 auto 32px" }}>
              A member of our team will be in touch within 48 hours to discuss your investment interest
              {projectName ? ` in ${projectName}` : ""}.
            </p>
            <button onClick={handleClose} style={{
              padding: "12px 32px", background: red, color: "#fff", border: "none",
              borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: sans, fontWeight: 500,
            }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ padding: "28px 32px 0" }}>
              <h3 style={{ fontSize: 20, fontWeight: 400, color: darkText, marginBottom: 4, fontFamily: sans }}>
                {projectName ? `Request Access: ${projectName}` : "Express Your Interest"}
              </h3>
              <p style={{ fontSize: 13, color: "#999", marginBottom: 0 }}>Complete the form below and our team will follow up.</p>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: "24px 32px 32px" }}>
              {error && (
                <div style={{ fontSize: 12, color: red, padding: "10px 14px", border: `1px solid ${red}22`, borderRadius: 4, marginBottom: 16, background: `${red}08` }}>{error}</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input value={form.name} onChange={e => handleChange("name", e.target.value)} required style={inputStyle} placeholder="John Smith" />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} required style={inputStyle} placeholder="john@example.com" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={form.phone} onChange={e => handleChange("phone", e.target.value)} style={inputStyle} placeholder="604-555-0000" />
                </div>
                <div>
                  <label style={labelStyle}>Entity Type</label>
                  <select value={form.entityType} onChange={e => handleChange("entityType", e.target.value)} style={selectStyle}>
                    <option value="">Select...</option>
                    <option value="Individual">Individual</option>
                    <option value="LLC">LLC</option>
                    <option value="Trust">Trust</option>
                    <option value="IRA">IRA / Self-Directed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Accreditation Status</label>
                  <select value={form.accreditationStatus} onChange={e => handleChange("accreditationStatus", e.target.value)} style={selectStyle}>
                    <option value="">Select...</option>
                    <option value="Accredited">Accredited Investor</option>
                    <option value="Not Yet">Not Yet Accredited</option>
                    <option value="Unsure">Unsure</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Investment Interest</label>
                  <select value={form.investmentRange} onChange={e => handleChange("investmentRange", e.target.value)} style={selectStyle}>
                    <option value="">Select range...</option>
                    <option value="$50K-$100K">$50K - $100K</option>
                    <option value="$100K-$250K">$100K - $250K</option>
                    <option value="$250K-$500K">$250K - $500K</option>
                    <option value="$500K+">$500K+</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Message / Notes</label>
                <textarea value={form.message} onChange={e => handleChange("message", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Tell us about your investment goals or any questions you have..." />
              </div>
              <button type="submit" disabled={submitting} style={{
                width: "100%", padding: "13px", background: submitting ? `${red}AA` : red, color: "#fff",
                border: "none", borderRadius: 4, fontSize: 14, cursor: submitting ? "default" : "pointer",
                fontFamily: sans, fontWeight: 500, letterSpacing: ".02em",
              }}>
                {submitting ? "Submitting..." : "Submit Interest"}
              </button>
              <p style={{ fontSize: 11, color: "#BBB", textAlign: "center", marginTop: 12 }}>
                Your information is kept confidential and will only be used to contact you regarding investment opportunities.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PROJECT DETAIL PAGE ─────────────────────────────────
function ProjectDetailPage({ project, onBack, onOpenInterest }) {
  const img = projectImages[project.id] || projectImagesByName[project.name];

  return (
    <div style={{ animation: "fadeIn .4s ease" }}>
      {/* Hero */}
      <div style={{
        position: "relative", height: 360, borderRadius: 8, overflow: "hidden", marginBottom: 40,
        backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.65) 0%, rgba(0,0,0,.1) 50%, transparent 100%)" }} />
        <button onClick={onBack} style={{
          position: "absolute", top: 20, left: 20, padding: "8px 16px", background: "rgba(255,255,255,.9)",
          border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: sans, color: darkText,
          backdropFilter: "blur(4px)",
        }}>&#8592; Back to Opportunities</button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 40px" }}>
          <span style={{
            fontSize: 10, padding: "4px 10px", borderRadius: 2, letterSpacing: ".06em", textTransform: "uppercase",
            background: project.status === "Completed" ? green : project.status === "Under Construction" ? "#8B7128" : red,
            color: "#fff", marginBottom: 12, display: "inline-block",
          }}>{project.status}</span>
          <h1 style={{ fontSize: 36, fontWeight: 300, color: "#fff", marginBottom: 4, fontFamily: sans }}>{project.name}</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)" }}>{project.location} &middot; {project.type}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40, alignItems: "start" }}>
        {/* Left column */}
        <div>
          {/* Key Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
            {[
              { label: "Target Raise", value: fmtCurrency(project.totalRaise) },
              { label: "Min. Investment", value: fmtCurrency(project.minInvestment) },
              { label: "Projected IRR", value: project.projectedIRR },
              { label: "Projected MOIC", value: project.projectedMOIC },
              { label: "Hold Period", value: project.holdPeriod },
              { label: "Property Type", value: project.propertyType },
            ].map((m, i) => (
              <div key={i} style={{ padding: "20px", background: "#FAFAF8", borderRadius: 6, border: "1px solid #ECEAE5" }}>
                <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 400, color: darkText }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* About */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>About This Project</h3>
            <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8 }}>{project.description}</p>
          </div>

          {/* Location */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Location</h3>
            <div style={{ padding: "32px", background: "#F5F3EF", borderRadius: 6, border: "1px solid #ECEAE5", textAlign: "center" }}>
              <span style={{ fontSize: 24, color: "#CCC", display: "block", marginBottom: 8 }}>&#9906;</span>
              <p style={{ fontSize: 14, color: "#777" }}>{project.location}</p>
              <p style={{ fontSize: 12, color: "#AAA" }}>Interactive map coming soon</p>
            </div>
          </div>

          {/* Investment Structure */}
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Investment Structure</h3>
            <div style={{ border: "1px solid #ECEAE5", borderRadius: 6, overflow: "hidden" }}>
              {[
                { label: "Preferred Return", value: project.prefReturn },
                { label: "GP Catch-Up", value: project.gpCatchup },
                { label: "Profit Split", value: project.carrySplit },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 20px", borderBottom: i < 2 ? "1px solid #ECEAE5" : "none",
                }}>
                  <span style={{ fontSize: 13, color: "#777" }}>{item.label}</span>
                  <span style={{ fontSize: 14, color: darkText, fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Construction Progress */}
          {project.status === "Under Construction" && (
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Construction Progress</h3>
              <div style={{ background: "#F0EDEA", borderRadius: 4, height: 8, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ width: `${project.completionPct}%`, height: "100%", background: green, borderRadius: 4, transition: "width .6s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#999" }}>
                <span>Progress</span>
                <span style={{ color: darkText, fontWeight: 500 }}>{project.completionPct}% Complete</span>
              </div>
            </div>
          )}
        </div>

        {/* Right column — CTA */}
        <div style={{ position: "sticky", top: 100 }}>
          <div style={{ padding: "32px", background: "#fff", border: "1px solid #ECEAE5", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,.04)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, color: darkText, marginBottom: 16, fontFamily: sans }}>Interested in {project.name}?</h3>
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7, marginBottom: 24 }}>
              Request access to the full data room including financial projections, legal documents, and detailed project timelines.
            </p>
            <button onClick={() => onOpenInterest(project.id, project.name)} style={{
              width: "100%", padding: "14px", background: red, color: "#fff", border: "none",
              borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: sans, fontWeight: 500,
              letterSpacing: ".02em", marginBottom: 16,
            }}>Request Access to Data Room</button>
            <div style={{ fontSize: 12, color: "#BBB", textAlign: "center" }}>Accredited investors only</div>
          </div>

          {/* Document teasers */}
          <div style={{ marginTop: 24, padding: "24px", background: "#FAFAF8", border: "1px solid #ECEAE5", borderRadius: 8 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: darkText, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".06em" }}>Available Documents</h4>
            {project.documents.map((doc, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                borderBottom: i < project.documents.length - 1 ? "1px solid #ECEAE5" : "none",
              }}>
                <span style={{ fontSize: 16, color: "#CCC" }}>&#128196;</span>
                <div>
                  <div style={{ fontSize: 13, color: "#666" }}>{doc}</div>
                  <div style={{ fontSize: 10, color: "#BBB" }}>Account required to download</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PROSPECT PORTAL ────────────────────────────────
export default function ProspectPortal({ onNavigateLogin }) {
  const [page, setPage] = useState("home"); // home | opportunities | about | project
  const [selectedProject, setSelectedProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [interestModal, setInterestModal] = useState({ open: false, projectId: null, projectName: null });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function openProject(project) {
    setSelectedProject(project);
    setPage("project");
    window.scrollTo(0, 0);
  }

  function openInterest(projectId, projectName) {
    setInterestModal({ open: true, projectId, projectName });
  }

  const filteredProjects = statusFilter === "All"
    ? prospectProjects
    : prospectProjects.filter(p => p.status === statusFilter);

  // ─── Navigation ───
  const nav = (
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0 48px", height: 64, background: "#fff", borderBottom: "1px solid #ECEAE5",
      position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(8px)",
      backgroundColor: "rgba(255,255,255,.95)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => { setPage("home"); setSelectedProject(null); }}>
        <NorthstarIcon size={26} color={red} />
        <NorthstarWordmark height={14} color={darkText} />
      </div>
      {/* Desktop nav */}
      <nav className="prospect-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {[
          { id: "opportunities", label: "Opportunities" },
          { id: "about", label: "About" },
        ].map(item => (
          <span key={item.id} onClick={() => { setPage(item.id); setSelectedProject(null); }} style={{
            fontSize: 13, color: page === item.id ? darkText : "#999", cursor: "pointer",
            fontWeight: page === item.id ? 500 : 400, fontFamily: sans,
            transition: "color .15s",
          }}>{item.label}</span>
        ))}
        <span onClick={() => openInterest(null, null)} style={{
          fontSize: 13, color: "#999", cursor: "pointer", fontFamily: sans,
        }}>Contact</span>
        <button onClick={onNavigateLogin} style={{
          padding: "8px 20px", background: "transparent", border: `1px solid ${red}`,
          borderRadius: 4, fontSize: 13, color: red, cursor: "pointer", fontFamily: sans,
          fontWeight: 500, transition: "all .15s",
        }}>Login</button>
      </nav>
      {/* Mobile menu toggle */}
      <button className="prospect-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
        display: "none", background: "none", border: "none", fontSize: 24, cursor: "pointer", color: darkText,
      }}>&#9776;</button>
    </header>
  );

  const mobileMenu = mobileMenuOpen ? (
    <div style={{
      position: "fixed", top: 64, left: 0, right: 0, bottom: 0, background: "#fff", zIndex: 99,
      padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24,
    }}>
      {["home", "opportunities", "about"].map(item => (
        <span key={item} onClick={() => { setPage(item); setMobileMenuOpen(false); setSelectedProject(null); }} style={{
          fontSize: 16, color: darkText, cursor: "pointer", fontFamily: sans,
          fontWeight: page === item ? 600 : 400, padding: "8px 0", borderBottom: "1px solid #ECEAE5",
        }}>{item === "home" ? "Home" : item.charAt(0).toUpperCase() + item.slice(1)}</span>
      ))}
      <span onClick={() => { openInterest(null, null); setMobileMenuOpen(false); }} style={{
        fontSize: 16, color: darkText, cursor: "pointer", fontFamily: sans, padding: "8px 0", borderBottom: "1px solid #ECEAE5",
      }}>Contact</span>
      <button onClick={() => { onNavigateLogin(); setMobileMenuOpen(false); }} style={{
        padding: "12px", background: red, color: "#fff", border: "none", borderRadius: 4,
        fontSize: 14, cursor: "pointer", fontFamily: sans, fontWeight: 500,
      }}>Login</button>
    </div>
  ) : null;

  // ─── HOME PAGE ───
  const homePage = (
    <div style={{ animation: "fadeIn .5s ease" }}>
      {/* Hero Section */}
      <section style={{
        padding: "100px 48px 80px", textAlign: "center",
        background: "linear-gradient(180deg, #fff 0%, #FAFAF8 100%)",
      }}>
        <NorthstarIcon size={48} color={red} />
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: red, fontWeight: 500, marginTop: 24, marginBottom: 20 }}>Investment Opportunities</p>
        <h1 style={{ fontSize: 44, fontWeight: 300, lineHeight: 1.2, color: darkText, marginBottom: 20, fontFamily: sans, maxWidth: 600, margin: "0 auto 20px" }}>
          Enlivening Communities Through Mindful Development
        </h1>
        <p style={{ fontSize: 16, color: "#777", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 48px" }}>
          Northstar Pacific Development Group creates thoughtful, community-enriching real estate projects in British Columbia. Invest directly at the project level alongside our team.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setPage("opportunities")} style={{
            padding: "14px 32px", background: red, color: "#fff", border: "none",
            borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: sans, fontWeight: 500,
          }}>View Opportunities</button>
          <button onClick={() => openInterest(null, null)} style={{
            padding: "14px 32px", background: "transparent", color: darkText, border: "1px solid #DDD",
            borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: sans, fontWeight: 500,
          }}>Get in Touch</button>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{
        display: "flex", justifyContent: "center", gap: 80, padding: "48px", borderTop: "1px solid #ECEAE5",
        borderBottom: "1px solid #ECEAE5", background: "#fff", flexWrap: "wrap",
      }}>
        {[
          { value: "$22.3M", label: "Total Development" },
          { value: "4", label: "Active Projects" },
          { value: "212+", label: "Residential Units" },
          { value: "2019", label: "Year Founded" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: 32, fontWeight: 300, color: darkText, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#AAA" }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Investment Approach */}
      <section style={{ padding: "80px 48px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: red, fontWeight: 500, marginBottom: 16 }}>Our Approach</p>
          <h2 style={{ fontSize: 30, fontWeight: 300, color: darkText, marginBottom: 16, fontFamily: sans }}>Project-Level Investing</h2>
          <p style={{ fontSize: 15, color: "#777", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Unlike pooled funds, we offer direct investment into individual projects. Each development has its own capital structure, waterfall, and returns profile, giving investors transparency and control.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { icon: "&#9670;", title: "Direct Ownership", desc: "Invest in specific projects you believe in, not a commingled fund. Know exactly where your capital is deployed." },
            { icon: "&#9670;", title: "Transparent Structure", desc: "Each project has its own cap table, waterfall, and reporting. Real-time visibility through your investor portal." },
            { icon: "&#9670;", title: "Aligned Incentives", desc: "GP co-invests alongside LPs with preferred return hurdles ensuring alignment of interests on every project." },
          ].map((item, i) => (
            <div key={i} style={{ padding: "32px 24px", border: "1px solid #ECEAE5", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 20, color: red, marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: item.icon }} />
              <h4 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 10 }}>{item.title}</h4>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      <section style={{ padding: "60px 48px 80px", background: "#FAFAF8", borderTop: "1px solid #ECEAE5" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: red, fontWeight: 500, marginBottom: 16 }}>Current Portfolio</p>
            <h2 style={{ fontSize: 30, fontWeight: 300, color: darkText, fontFamily: sans }}>Active Opportunities</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {prospectProjects.filter(p => p.status !== "Completed").map(p => (
              <div key={p.id} onClick={() => openProject(p)} style={{
                borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "#fff",
                border: "1px solid #ECEAE5", transition: "box-shadow .2s",
              }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.08)"}
                 onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{
                  height: 200, backgroundImage: `url(${projectImages[p.id]})`,
                  backgroundSize: "cover", backgroundPosition: "center", position: "relative",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.5) 0%, transparent 60%)" }} />
                  <span style={{
                    position: "absolute", top: 12, right: 12, fontSize: 9, padding: "4px 10px",
                    borderRadius: 2, background: p.status === "Under Construction" ? "rgba(139,113,40,.9)" : `${red}DD`,
                    color: "#fff", letterSpacing: ".04em", textTransform: "uppercase",
                  }}>{p.status}</span>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 500, color: darkText, marginBottom: 4 }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>{p.location} &middot; {p.type}</p>
                  <div style={{ display: "flex", gap: 32, fontSize: 12, color: "#777" }}>
                    <div><span style={{ color: "#BBB" }}>Target:</span> {fmtCurrency(p.totalRaise)}</div>
                    <div><span style={{ color: "#BBB" }}>Min:</span> {fmtCurrency(p.minInvestment)}</div>
                    {p.units && <div><span style={{ color: "#BBB" }}>Units:</span> {p.units}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button onClick={() => setPage("opportunities")} style={{
              padding: "12px 28px", background: "transparent", border: `1px solid ${red}`, borderRadius: 4,
              fontSize: 13, color: red, cursor: "pointer", fontFamily: sans, fontWeight: 500,
            }}>View All Projects &#8594;</button>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section style={{ padding: "80px 48px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: red, fontWeight: 500, marginBottom: 16 }}>Leadership</p>
          <h2 style={{ fontSize: 30, fontWeight: 300, color: darkText, fontFamily: sans }}>Our Team</h2>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 60, flexWrap: "wrap" }}>
          {[
            { name: "Gord Wylie", title: "Principal", initials: "GW" },
            { name: "Jeff Brown", title: "Principal", initials: "JB" },
          ].map((person, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                width: 100, height: 100, borderRadius: "50%", background: "#ECEAE5",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 28, color: "#999", fontWeight: 300, fontFamily: sans,
              }}>{person.initials}</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: darkText, marginBottom: 2 }}>{person.name}</div>
              <div style={{ fontSize: 13, color: "#999" }}>{person.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section style={{
        padding: "40px 48px", borderTop: "1px solid #ECEAE5", borderBottom: "1px solid #ECEAE5",
        background: "#FAFAF8",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "#BBB", marginBottom: 20 }}>Partners & Affiliates</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
            {["Farris LLP", "Smythe CPA", "RHA Architecture", "Magnum Projects"].map((partner, i) => (
              <span key={i} style={{ fontSize: 14, color: "#AAA", fontWeight: 400, letterSpacing: ".02em" }}>{partner}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 48px", textAlign: "center", background: "#fff" }}>
        <h2 style={{ fontSize: 28, fontWeight: 300, color: darkText, marginBottom: 16, fontFamily: sans }}>Ready to Invest?</h2>
        <p style={{ fontSize: 15, color: "#777", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
          Join our community of investors and gain access to thoughtfully developed real estate opportunities in British Columbia.
        </p>
        <button onClick={() => openInterest(null, null)} style={{
          padding: "14px 36px", background: red, color: "#fff", border: "none",
          borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: sans, fontWeight: 500,
        }}>Express Your Interest</button>
      </section>
    </div>
  );

  // ─── OPPORTUNITIES PAGE ───
  const opportunitiesPage = (
    <div style={{ padding: "48px", maxWidth: 1000, margin: "0 auto", animation: "fadeIn .4s ease" }}>
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: red, fontWeight: 500, marginBottom: 12 }}>Current Portfolio</p>
        <h2 style={{ fontSize: 32, fontWeight: 300, color: darkText, marginBottom: 12, fontFamily: sans }}>Investment Opportunities</h2>
        <p style={{ fontSize: 14, color: "#888", maxWidth: 520 }}>
          Browse our current and completed projects. Each investment is structured independently with its own returns profile.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {["All", "Under Construction", "Pre-Development", "Completed"].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} style={{
            padding: "8px 16px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: sans,
            background: statusFilter === f ? darkText : "transparent",
            color: statusFilter === f ? "#fff" : "#888",
            border: statusFilter === f ? "none" : "1px solid #DDD",
            fontWeight: statusFilter === f ? 500 : 400,
          }}>{f}</button>
        ))}
      </div>

      {/* Project Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {filteredProjects.map(p => (
          <div key={p.id} onClick={() => openProject(p)} style={{
            borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "#fff",
            border: "1px solid #ECEAE5", transition: "box-shadow .2s",
          }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.08)"}
             onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{
              height: 200, backgroundImage: `url(${projectImages[p.id]})`,
              backgroundSize: "cover", backgroundPosition: "center", position: "relative",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.5) 0%, transparent 60%)" }} />
              <span style={{
                position: "absolute", top: 12, right: 12, fontSize: 9, padding: "4px 10px",
                borderRadius: 2,
                background: p.status === "Completed" ? `${green}DD` : p.status === "Under Construction" ? "rgba(139,113,40,.9)" : `${red}DD`,
                color: "#fff", letterSpacing: ".04em", textTransform: "uppercase",
              }}>{p.status}</span>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <h3 style={{ fontSize: 18, fontWeight: 500, color: darkText, marginBottom: 4 }}>{p.name}</h3>
              <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>{p.location} &middot; {p.type}</p>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
                <div><span style={{ color: "#BBB" }}>Target Raise:</span> <span style={{ color: "#555" }}>{fmtCurrency(p.totalRaise)}</span></div>
                <div><span style={{ color: "#BBB" }}>Min Investment:</span> <span style={{ color: "#555" }}>{fmtCurrency(p.minInvestment)}</span></div>
              </div>
              {p.status === "Under Construction" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", marginBottom: 4 }}>
                    <span>Construction</span><span>{p.completionPct}%</span>
                  </div>
                  <div style={{ background: "#F0EDEA", borderRadius: 3, height: 4, overflow: "hidden" }}>
                    <div style={{ width: `${p.completionPct}%`, height: "100%", background: green, borderRadius: 3 }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── ABOUT PAGE ───
  const aboutPage = (
    <div style={{ animation: "fadeIn .4s ease" }}>
      {/* About Hero */}
      <section style={{ padding: "80px 48px", textAlign: "center", background: "#fff" }}>
        <NorthstarIcon size={44} color={red} />
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: red, fontWeight: 500, marginTop: 24, marginBottom: 20 }}>About Northstar</p>
        <h1 style={{ fontSize: 38, fontWeight: 300, lineHeight: 1.2, color: darkText, marginBottom: 20, fontFamily: sans, maxWidth: 550, margin: "0 auto 20px" }}>
          Building with Purpose, Investing with Integrity
        </h1>
        <p style={{ fontSize: 16, color: "#777", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          Northstar Pacific Development Group is a Vancouver-based real estate developer focused on creating communities that enrich the neighborhoods they serve. Founded in 2019, we bring institutional-quality development to projects sized for sophisticated private investors.
        </p>
      </section>

      {/* Our Approach Detail */}
      <section style={{ padding: "60px 48px", borderTop: "1px solid #ECEAE5", background: "#FAFAF8" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 24, textTransform: "uppercase", letterSpacing: ".06em" }}>Investment Philosophy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {[
              { title: "Project-Level Structure", desc: "Each investment is structured as an independent project entity with its own capital stack, waterfall, and returns. No commingling of assets." },
              { title: "Co-Investment", desc: "The Northstar team invests its own capital alongside every LP, ensuring full alignment of interests from ground-breaking to exit." },
              { title: "Preferred Returns", desc: "All projects feature preferred return hurdles (typically 8%) before any GP participation, protecting investor downside." },
              { title: "Transparent Reporting", desc: "Real-time access to project progress, financial reporting, and document management through our purpose-built investor portal." },
            ].map((item, i) => (
              <div key={i} style={{ padding: "24px", border: "1px solid #ECEAE5", borderRadius: 6, background: "#fff" }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 8 }}>{item.title}</h4>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: "80px 48px", background: "#fff" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 300, color: darkText, fontFamily: sans }}>Leadership Team</h2>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 80, flexWrap: "wrap" }}>
            {[
              { name: "Gord Wylie", title: "Principal", initials: "GW", bio: "Over 20 years of experience in real estate development and construction management across Western Canada." },
              { name: "Jeff Brown", title: "Principal", initials: "JB", bio: "Extensive background in real estate finance, project structuring, and investor relations in the BC market." },
            ].map((person, i) => (
              <div key={i} style={{ textAlign: "center", maxWidth: 280 }}>
                <div style={{
                  width: 120, height: 120, borderRadius: "50%", background: "#ECEAE5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", fontSize: 32, color: "#999", fontWeight: 300, fontFamily: sans,
                }}>{person.initials}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: darkText, marginBottom: 4 }}>{person.name}</div>
                <div style={{ fontSize: 13, color: red, marginBottom: 12 }}>{person.title}</div>
                <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{person.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section style={{ padding: "60px 48px", borderTop: "1px solid #ECEAE5", background: "#FAFAF8" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: darkText, marginBottom: 32, textTransform: "uppercase", letterSpacing: ".06em" }}>Our Partners & Affiliates</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[
              { name: "Farris LLP", role: "Legal Counsel" },
              { name: "Smythe CPA", role: "Accounting & Tax" },
              { name: "RHA Architecture", role: "Architecture & Design" },
              { name: "Magnum Projects", role: "Project Management" },
            ].map((partner, i) => (
              <div key={i} style={{ padding: "24px 16px", border: "1px solid #ECEAE5", borderRadius: 6, background: "#fff" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: darkText, marginBottom: 4 }}>{partner.name}</div>
                <div style={{ fontSize: 11, color: "#AAA" }}>{partner.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section style={{ padding: "80px 48px", textAlign: "center", background: "#fff" }}>
        <h2 style={{ fontSize: 28, fontWeight: 300, color: darkText, marginBottom: 12, fontFamily: sans }}>Get in Touch</h2>
        <p style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>710 - 1199 W Pender St, Vancouver BC V6E 2R1</p>
        <p style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>ir@northstardevelopment.ca</p>
        <button onClick={() => openInterest(null, null)} style={{
          padding: "14px 36px", background: red, color: "#fff", border: "none",
          borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: sans, fontWeight: 500,
        }}>Express Your Interest</button>
      </section>
    </div>
  );

  // ─── Footer ───
  const footer = (
    <footer style={{
      padding: "28px 48px", display: "flex", justifyContent: "space-between",
      fontSize: 11, color: "#AAA", borderTop: "1px solid #ECEAE5", background: "#fff",
      flexWrap: "wrap", gap: 8,
    }}>
      <span>&copy; 2026 Northstar Pacific Development Group</span>
      <span>710 - 1199 W Pender St, Vancouver BC V6E 2R1</span>
    </footer>
  );

  // ─── Render ───
  let content;
  if (page === "project" && selectedProject) {
    content = (
      <div style={{ padding: "32px 48px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <ProjectDetailPage project={selectedProject} onBack={() => { setPage("opportunities"); setSelectedProject(null); }} onOpenInterest={openInterest} />
      </div>
    );
  } else if (page === "opportunities") {
    content = opportunitiesPage;
  } else if (page === "about") {
    content = aboutPage;
  } else {
    content = homePage;
  }

  return (
    <div style={{ fontFamily: sans, color: darkText, minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .prospect-desktop-nav { display: none !important; }
          .prospect-mobile-toggle { display: block !important; }
        }
        @media (min-width: 769px) {
          .prospect-mobile-toggle { display: none !important; }
        }
        @media (max-width: 600px) {
          section { padding-left: 24px !important; padding-right: 24px !important; }
        }
      `}</style>
      {nav}
      {mobileMenu}
      <div style={{ flex: 1 }}>
        {content}
      </div>
      {footer}
      <InterestFormModal
        open={interestModal.open}
        onClose={() => setInterestModal({ open: false, projectId: null, projectName: null })}
        projectId={interestModal.projectId}
        projectName={interestModal.projectName}
      />
    </div>
  );
}
