// ─── MOCK DATA STORE ─────────────────────────────────────
// Replace with Supabase / API calls in production

export const investor = {
  name: "James Chen",
  initials: "JC",
  email: "j.chen@pacificventures.ca",
  role: "Limited Partner — Class A",
  joined: "March 2023",
};

export const fund = {
  name: "Northstar Real Estate Fund I",
  gp: "Northstar Pacific Development Group",
  vintage: 2023,
  strategy: "Value-Add Multifamily & Mixed-Use — Western Canada",
  targetSize: 25000000,
  committed: 25000000,
  called: 20250000,
  distributed: 553000,
  nav: 15200000,
  irr: 17.9,
  moic: 1.22,
  dpi: 0.07,
  inceptionDate: "March 15, 2023",
};

export const properties = [
  {
    id: 1, name: "Porthaven", location: "Downtown Port Coquitlam",
    type: "108 Residences & Curated Retail", status: "Under Construction",
    invested: 2400000, currentValue: 2880000, irr: 18.4, moic: 1.20,
    completion: 68, sqft: "96,000", units: 108,
    description: "Redefining Downtown Port Coquitlam. Mixed-use development with 108 residences and curated ground-floor retail adjacent to Leigh Square.",
    updates: [
      { date: "Jun 28, 2025", text: "Structural concrete complete on floors 1-4. Exterior cladding installation has begun on the south facade." },
      { date: "May 15, 2025", text: "Mechanical rough-in progressing on schedule. Underground parking substantially complete." },
      { date: "Apr 2, 2025", text: "Project reached 65% completion milestone. Retail pre-leasing conversations underway with three prospective tenants." },
    ],
  },
  {
    id: 2, name: "Livy", location: "Port Coquitlam",
    type: "Studio to 2 Bed+Den Residential", status: "Pre-Development",
    invested: 1800000, currentValue: 1980000, irr: 22.1, moic: 1.10,
    completion: 15, sqft: "52,000", units: 64,
    description: "Launching Spring 2025. Studio to 2 bedroom and den residences in the heart of Poco. Transit-oriented with walkable amenities.",
    updates: [
      { date: "Jun 10, 2025", text: "Capital Call #4 issued. Development permit application submitted to City of Port Coquitlam." },
      { date: "Apr 22, 2025", text: "Architectural design finalized with RHA Architecture. Unit mix optimized based on market absorption study." },
    ],
  },
  {
    id: 3, name: "Estrella", location: "British Columbia",
    type: "40 Unit Purpose Built Rental", status: "Under Construction",
    invested: 950000, currentValue: 1140000, irr: 16.8, moic: 1.20,
    completion: 45, sqft: "38,000", units: 40,
    description: "40 unit purpose-built rental with 20% affordable housing allocation. Construction underway with anticipated completion Q2 2026.",
    updates: [
      { date: "Jun 5, 2025", text: "Wood-frame construction progressing. Second floor framing complete." },
      { date: "May 1, 2025", text: "CMHC MLI Select financing secured with favorable terms due to affordable housing component." },
    ],
  },
  {
    id: 4, name: "Panorama Building 6", location: "Surrey, BC",
    type: "55,000sf Federal Office Building", status: "Completed",
    invested: 3200000, currentValue: 4160000, irr: 14.2, moic: 1.30,
    completion: 100, sqft: "55,000", units: null,
    description: "Purpose-built 55,000sf office building for the Federal Government. Completed Fall 2024. Fully leased on a long-term net lease.",
    updates: [
      { date: "Oct 15, 2024", text: "Building completed and handed over to tenant. All deficiencies addressed." },
      { date: "Sep 1, 2024", text: "Certificate of occupancy received. Tenant fit-out substantially complete." },
    ],
  },
];

export const capTable = [
  { id: 1, holder: "Northstar GP LLC", type: "GP Interest", committed: 1250000, called: 1250000, ownership: 5.0, unfunded: 0 },
  { id: 2, holder: "Pacific Pension Fund", type: "LP — Class A", committed: 6000000, called: 4800000, ownership: 24.0, unfunded: 1200000 },
  { id: 3, holder: "Coastal Family Office", type: "LP — Class A", committed: 4000000, called: 3200000, ownership: 16.0, unfunded: 800000 },
  { id: 4, holder: "James Chen", type: "LP — Class B", committed: 4500000, called: 3600000, ownership: 18.0, unfunded: 900000 },
  { id: 5, holder: "Westridge Capital Inc.", type: "LP — Class B", committed: 3200000, called: 2560000, ownership: 12.8, unfunded: 640000 },
  { id: 6, holder: "Individual LPs (8)", type: "LP — Class C", committed: 6050000, called: 4840000, ownership: 24.2, unfunded: 1210000 },
];

export const waterfall = {
  tiers: [
    { name: "Return of Capital", lpShare: "100%", gpShare: "0%", threshold: "1.0x", status: "complete" },
    { name: "Preferred Return (8%)", lpShare: "100%", gpShare: "0%", threshold: "8% IRR", status: "accruing" },
    { name: "GP Catch-Up", lpShare: "0%", gpShare: "100%", threshold: "Until 20/80", status: "pending" },
    { name: "Carried Interest", lpShare: "80%", gpShare: "20%", threshold: "Above pref", status: "pending" },
  ],
  prefReturn: 8.0,
  catchUp: 100,
  carry: 20,
};

export const documents = [
  { id: 1, name: "Q2 2025 — Quarterly Report", category: "Reporting", date: "Jul 15, 2025", size: "2.4 MB", status: "published", file: "/docs/q2-2025-quarterly-report.pdf" },
  { id: 2, name: "K-1 Tax Package — FY 2024", category: "Tax", date: "Mar 1, 2025", size: "840 KB", status: "published", file: "/docs/k1-tax-package-fy2024.pdf" },
  { id: 3, name: "Porthaven — Construction Progress Photos", category: "Property Update", date: "Jun 28, 2025", size: "5.1 MB", status: "published", file: "/docs/porthaven-construction-photos.pdf" },
  { id: 4, name: "Capital Call Notice #4 — Livy", category: "Capital Call", date: "Jun 10, 2025", size: "320 KB", status: "action_required", file: "/docs/capital-call-notice-4.pdf" },
  { id: 5, name: "Subscription Agreement — Fund II", category: "Legal", date: "Jun 10, 2025", size: "1.2 MB", status: "pending_signature", file: "/docs/subscription-agreement-fund-ii.pdf" },
  { id: 6, name: "Distribution Statement — Q1 2025", category: "Distribution", date: "Apr 5, 2025", size: "180 KB", status: "published", file: "/docs/distribution-statement-q1-2025.pdf" },
  { id: 7, name: "PPM — Fund I Overview", category: "Offering", date: "Feb 12, 2025", size: "3.8 MB", status: "published", file: "/docs/ppm-fund-i-overview.pdf" },
  { id: 8, name: "Annual Investor Letter 2024", category: "Reporting", date: "Jan 20, 2025", size: "1.1 MB", status: "published", file: "/docs/annual-investor-letter-2024.pdf" },
];

export const distributions = [
  { quarter: "Q1 2024", date: "Apr 10, 2024", amount: 84000, type: "Income" },
  { quarter: "Q2 2024", date: "Jul 12, 2024", amount: 92000, type: "Income" },
  { quarter: "Q3 2024", date: "Oct 8, 2024", amount: 88000, type: "Income" },
  { quarter: "Q4 2024", date: "Jan 14, 2025", amount: 96000, type: "Income + Return" },
  { quarter: "Q1 2025", date: "Apr 9, 2025", amount: 91000, type: "Income" },
  { quarter: "Q2 2025", date: "Jul 11, 2025", amount: 102000, type: "Income" },
];

export const performanceHistory = [
  { month: "Jan", nav: 12.4, benchmark: 11.8 },
  { month: "Feb", nav: 12.7, benchmark: 12.0 },
  { month: "Mar", nav: 12.9, benchmark: 12.1 },
  { month: "Apr", nav: 13.1, benchmark: 12.3 },
  { month: "May", nav: 13.5, benchmark: 12.5 },
  { month: "Jun", nav: 13.2, benchmark: 12.6 },
  { month: "Jul", nav: 13.8, benchmark: 12.8 },
  { month: "Aug", nav: 14.1, benchmark: 12.9 },
  { month: "Sep", nav: 14.4, benchmark: 13.1 },
  { month: "Oct", nav: 14.6, benchmark: 13.2 },
  { month: "Nov", nav: 14.9, benchmark: 13.4 },
  { month: "Dec", nav: 15.2, benchmark: 13.5 },
];

export const messages = [
  { id: 1, from: "Gord Wylie", role: "President", date: "Jul 18, 2025", subject: "Porthaven Q2 Update", preview: "Construction remains on schedule. We've reached 68% completion and the exterior cladding is progressing well on the south facade...", unread: true },
  { id: 2, from: "Jeff Brown", role: "EVP", date: "Jun 28, 2025", subject: "Livy — Development Permit Filed", preview: "Pleased to confirm the development permit application for Livy has been formally submitted to the City of Port Coquitlam...", unread: true },
  { id: 3, from: "Northstar IR", role: "Investor Relations", date: "Jun 10, 2025", subject: "Capital Call #4 — Action Required", preview: "Please find attached the capital call notice for the Livy development. The call amount of $450,000 is due by June 30, 2025...", unread: false },
  { id: 4, from: "Gord Wylie", role: "President", date: "Apr 5, 2025", subject: "Q1 2025 Distribution Notice", preview: "I'm pleased to confirm the Q1 2025 distribution of $91,000 has been processed and will be deposited to your account on file...", unread: false },
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
