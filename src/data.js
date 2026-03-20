// ─── MOCK DATA STORE ─────────────────────────────────────
// Project-level investing — each project has its own cap table,
// waterfall, distributions, and documents. Replace with API calls in production.

export const investor = {
  name: "James Chen",
  initials: "JC",
  email: "j.chen@pacificventures.ca",
  role: "Limited Partner",
  joined: "March 2023",
  projectIds: [1, 2], // Invested in Porthaven & Livy
};

export const projects = [
  {
    id: 1, name: "Porthaven", location: "Downtown Port Coquitlam",
    type: "108 Residences & Curated Retail", status: "Under Construction",
    sqft: "96,000", units: 108, completion: 68,
    totalRaise: 6000000,
    imageUrl: "https://northstardevelopment.ca/public/images/porthaven-1.jpg",
    description: "Redefining Downtown Port Coquitlam. Mixed-use development with 108 residences and curated ground-floor retail adjacent to Leigh Square.",
    investorCommitted: 500000, investorCalled: 400000,
    currentValue: 480000, irr: 18.4, moic: 1.20,
    capTable: [
      { id: 1, holder: "Northstar GP", type: "GP Interest", committed: 300000, called: 300000, ownership: 5.0, unfunded: 0 },
      { id: 2, holder: "Pacific Pension Fund", type: "LP — Class A", committed: 2000000, called: 1600000, ownership: 33.3, unfunded: 400000 },
      { id: 3, holder: "James Chen", type: "LP — Class A", committed: 500000, called: 400000, ownership: 8.3, unfunded: 100000 },
      { id: 4, holder: "Coastal Family Office", type: "LP — Class A", committed: 1500000, called: 1200000, ownership: 25.0, unfunded: 300000 },
      { id: 5, holder: "Westridge Capital Inc.", type: "LP — Class B", committed: 1000000, called: 800000, ownership: 16.7, unfunded: 200000 },
      { id: 6, holder: "Individual LPs (3)", type: "LP — Class C", committed: 700000, called: 560000, ownership: 11.7, unfunded: 140000 },
    ],
    waterfall: {
      tiers: [
        { name: "Return of Capital", lpShare: "100%", gpShare: "0%", threshold: "1.0x", status: "complete" },
        { name: "Preferred Return (8%)", lpShare: "100%", gpShare: "0%", threshold: "8% IRR", status: "accruing" },
        { name: "GP Catch-Up", lpShare: "0%", gpShare: "100%", threshold: "Until 20/80", status: "pending" },
        { name: "Carried Interest", lpShare: "80%", gpShare: "20%", threshold: "Above pref", status: "pending" },
      ],
      prefReturn: 8.0, catchUp: 100, carry: 20,
    },
    distributions: [
      { quarter: "Q3 2024", date: "Oct 8, 2024", amount: 6200, type: "Income" },
      { quarter: "Q4 2024", date: "Jan 14, 2025", amount: 7100, type: "Income" },
      { quarter: "Q1 2025", date: "Apr 9, 2025", amount: 6800, type: "Income" },
      { quarter: "Q2 2025", date: "Jul 11, 2025", amount: 7500, type: "Income" },
    ],
    documents: [
      { id: 1, name: "Q2 2025 — Porthaven Quarterly Report", category: "Reporting", date: "Jul 15, 2025", size: "2.4 MB", status: "published", file: "/docs/q2-2025-quarterly-report.pdf" },
      { id: 3, name: "Porthaven — Construction Progress Photos", category: "Property Update", date: "Jun 28, 2025", size: "5.1 MB", status: "published", file: "/docs/porthaven-construction-photos.pdf" },
      { id: 7, name: "PPM — Porthaven", category: "Offering", date: "Feb 12, 2025", size: "3.8 MB", status: "published", file: "/docs/ppm-fund-i-overview.pdf" },
    ],
    updates: [
      { date: "Jun 28, 2025", text: "Structural concrete complete on floors 1-4. Exterior cladding installation has begun on the south facade." },
      { date: "May 15, 2025", text: "Mechanical rough-in progressing on schedule. Underground parking substantially complete." },
      { date: "Apr 2, 2025", text: "Project reached 65% completion milestone. Retail pre-leasing conversations underway with three prospective tenants." },
    ],
    performanceHistory: [
      { month: "Jan", value: 410, benchmark: 400 },
      { month: "Feb", value: 415, benchmark: 403 },
      { month: "Mar", value: 420, benchmark: 405 },
      { month: "Apr", value: 430, benchmark: 408 },
      { month: "May", value: 440, benchmark: 410 },
      { month: "Jun", value: 445, benchmark: 412 },
      { month: "Jul", value: 450, benchmark: 415 },
      { month: "Aug", value: 458, benchmark: 418 },
      { month: "Sep", value: 462, benchmark: 420 },
      { month: "Oct", value: 468, benchmark: 422 },
      { month: "Nov", value: 474, benchmark: 425 },
      { month: "Dec", value: 480, benchmark: 428 },
    ],
  },
  {
    id: 2, name: "Livy", location: "Port Coquitlam",
    type: "Studio to 2 Bed+Den Residential", status: "Pre-Development",
    sqft: "52,000", units: 64, completion: 15,
    totalRaise: 4500000,
    imageUrl: "https://northstardevelopment.ca/public/images/livy-2.jpeg",
    description: "Launching Spring 2025. Studio to 2 bedroom and den residences in the heart of Poco. Transit-oriented with walkable amenities.",
    investorCommitted: 350000, investorCalled: 175000,
    currentValue: 192500, irr: 22.1, moic: 1.10,
    capTable: [
      { id: 1, holder: "Northstar GP", type: "GP Interest", committed: 225000, called: 112500, ownership: 5.0, unfunded: 112500 },
      { id: 2, holder: "James Chen", type: "LP — Class A", committed: 350000, called: 175000, ownership: 7.8, unfunded: 175000 },
      { id: 3, holder: "Pacific Pension Fund", type: "LP — Class A", committed: 1500000, called: 750000, ownership: 33.3, unfunded: 750000 },
      { id: 4, holder: "Coastal Family Office", type: "LP — Class B", committed: 1200000, called: 600000, ownership: 26.7, unfunded: 600000 },
      { id: 5, holder: "Individual LPs (5)", type: "LP — Class C", committed: 1225000, called: 612500, ownership: 27.2, unfunded: 612500 },
    ],
    waterfall: {
      tiers: [
        { name: "Return of Capital", lpShare: "100%", gpShare: "0%", threshold: "1.0x", status: "pending" },
        { name: "Preferred Return (8%)", lpShare: "100%", gpShare: "0%", threshold: "8% IRR", status: "pending" },
        { name: "GP Catch-Up", lpShare: "0%", gpShare: "100%", threshold: "Until 20/80", status: "pending" },
        { name: "Carried Interest", lpShare: "80%", gpShare: "20%", threshold: "Above pref", status: "pending" },
      ],
      prefReturn: 8.0, catchUp: 100, carry: 20,
    },
    distributions: [],
    documents: [
      { id: 4, name: "Capital Call Notice #4 — Livy", category: "Capital Call", date: "Jun 10, 2025", size: "320 KB", status: "action_required", file: "/docs/capital-call-notice-4.pdf" },
      { id: 5, name: "Subscription Agreement — Livy", category: "Legal", date: "Jun 10, 2025", size: "1.2 MB", status: "pending_signature", file: "/docs/subscription-agreement-fund-ii.pdf" },
    ],
    updates: [
      { date: "Jun 10, 2025", text: "Capital Call #4 issued. Development permit application submitted to City of Port Coquitlam." },
      { date: "Apr 22, 2025", text: "Architectural design finalized with RHA Architecture. Unit mix optimized based on market absorption study." },
    ],
    performanceHistory: [
      { month: "Jan", value: 175, benchmark: 175 },
      { month: "Feb", value: 176, benchmark: 175 },
      { month: "Mar", value: 178, benchmark: 176 },
      { month: "Apr", value: 180, benchmark: 177 },
      { month: "May", value: 183, benchmark: 178 },
      { month: "Jun", value: 185, benchmark: 178 },
      { month: "Jul", value: 187, benchmark: 179 },
      { month: "Aug", value: 188, benchmark: 180 },
      { month: "Sep", value: 189, benchmark: 180 },
      { month: "Oct", value: 190, benchmark: 181 },
      { month: "Nov", value: 191, benchmark: 182 },
      { month: "Dec", value: 192.5, benchmark: 183 },
    ],
  },
  {
    id: 3, name: "Estrella", location: "British Columbia",
    type: "40 Unit Purpose Built Rental", status: "Under Construction",
    sqft: "38,000", units: 40, completion: 45,
    totalRaise: 3800000,
    imageUrl: "https://northstardevelopment.ca/public/images/estrella-1.jpg",
    description: "40 unit purpose-built rental with 20% affordable housing allocation. Construction underway with anticipated completion Q2 2026.",
    investorCommitted: 0, investorCalled: 0,
    currentValue: 0, irr: 16.8, moic: 1.20,
    capTable: [], waterfall: { tiers: [], prefReturn: 8.0, catchUp: 100, carry: 20 },
    distributions: [], documents: [],
    updates: [
      { date: "Jun 5, 2025", text: "Wood-frame construction progressing. Second floor framing complete." },
      { date: "May 1, 2025", text: "CMHC MLI Select financing secured with favorable terms due to affordable housing component." },
    ],
    performanceHistory: [],
  },
  {
    id: 4, name: "Panorama Building 6", location: "Surrey, BC",
    type: "55,000sf Federal Office Building", status: "Completed",
    sqft: "55,000", units: null, completion: 100,
    totalRaise: 8000000,
    imageUrl: "https://northstardevelopment.ca/public/images/panorama-1.jpg",
    description: "Purpose-built 55,000sf office building for the Federal Government. Completed Fall 2024. Fully leased on a long-term net lease.",
    investorCommitted: 0, investorCalled: 0,
    currentValue: 0, irr: 14.2, moic: 1.30,
    capTable: [], waterfall: { tiers: [], prefReturn: 8.0, catchUp: 100, carry: 20 },
    distributions: [], documents: [],
    updates: [
      { date: "Oct 15, 2024", text: "Building completed and handed over to tenant. All deficiencies addressed." },
      { date: "Sep 1, 2024", text: "Certificate of occupancy received. Tenant fit-out substantially complete." },
    ],
    performanceHistory: [],
  },
];

// Investor's projects
export const myProjects = projects.filter(p => investor.projectIds.includes(p.id));

// General documents (not project-specific)
export const generalDocuments = [
  { id: 2, name: "K-1 Tax Package — FY 2024", category: "Tax", date: "Mar 1, 2025", size: "840 KB", status: "published", file: "/docs/k1-tax-package-fy2024.pdf" },
  { id: 6, name: "Distribution Statement — Q1 2025", category: "Distribution", date: "Apr 5, 2025", size: "180 KB", status: "published", file: "/docs/distribution-statement-q1-2025.pdf" },
  { id: 8, name: "Annual Investor Letter 2024", category: "Reporting", date: "Jan 20, 2025", size: "1.1 MB", status: "published", file: "/docs/annual-investor-letter-2024.pdf" },
];

// All documents for the investor (project + general)
export const allDocuments = [
  ...myProjects.flatMap(p => p.documents.map(d => ({ ...d, project: p.name }))),
  ...generalDocuments.map(d => ({ ...d, project: "General" })),
].sort((a, b) => new Date(b.date) - new Date(a.date));

// All distributions for the investor
export const allDistributions = myProjects.flatMap(p =>
  p.distributions.map(d => ({ ...d, project: p.name }))
).sort((a, b) => new Date(b.date) - new Date(a.date));

export const messages = [
  { id: 1, from: "Gord Wylie", role: "President", date: "Jul 18, 2025", subject: "Porthaven Q2 Update", preview: "Construction remains on schedule. We've reached 68% completion and the exterior cladding is progressing well on the south facade...", unread: true },
  { id: 2, from: "Jeff Brown", role: "EVP", date: "Jun 28, 2025", subject: "Livy — Development Permit Filed", preview: "Pleased to confirm the development permit application for Livy has been formally submitted to the City of Port Coquitlam...", unread: true },
  { id: 3, from: "Northstar IR", role: "Investor Relations", date: "Jun 10, 2025", subject: "Capital Call #4 — Action Required", preview: "Please find attached the capital call notice for the Livy development. The call amount of $175,000 is due by June 30, 2025...", unread: false },
  { id: 4, from: "Gord Wylie", role: "President", date: "Apr 5, 2025", subject: "Q1 2025 Distribution Notice", preview: "I'm pleased to confirm the Q1 2025 distribution of $6,800 from Porthaven has been processed and will be deposited to your account on file...", unread: false },
  { id: 5, from: "Northstar IR", role: "Investor Relations", date: "Mar 1, 2025", subject: "2024 K-1 Tax Documents Available", preview: "Your K-1 tax documents for fiscal year 2024 are now available in the Documents section of your portal...", unread: false },
];

// Utility
export const fmt = (n) => {
  if (typeof n !== 'number') return n;
  return n.toLocaleString('en-US');
};

export const fmtCurrency = (n) => {
  if (typeof n !== 'number') return n;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
};
