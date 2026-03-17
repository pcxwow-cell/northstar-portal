# Document Management Flow — Northstar Investor Portal

> Based on Agora, InvestNext, Juniper Square patterns
> Last updated: 2026-03-17

---

## Admin/GP Flow (Upload → Distribute)

### 1. Upload
```
Admin navigates to Documents section
  → clicks "Upload Document"
  → selects file(s) (drag-and-drop or file picker)
  → fills metadata:
      - Document Name (auto-suggested from filename)
      - Category: Reporting | Tax | Legal | Capital Call | Distribution | Offering | Property Update
      - Project: [dropdown] or "General" (cross-project)
      - Status: Published | Action Required | Pending Signature
  → clicks "Upload"
```

### 2. Distribution (who sees it)
Three distribution modes:
```
a) Project-level: All investors in the selected project automatically see it
b) Individual: Admin selects specific investors via search/picker
c) General: All active investors see it (no project scope)
```

### 3. K-1 / Tax Season Bulk Upload
```
Admin navigates to Documents → "Bulk Upload K-1s"
  → uploads a ZIP or multiple PDFs
  → system auto-matches filenames to investors (e.g., "K1-James-Chen-2024.pdf")
  → admin reviews matches, fixes any mismatches
  → clicks "Distribute"
  → each K-1 appears only in its matched investor's portal
```

### 4. Admin Document Dashboard
```
Documents tab shows:
  ┌─────────────────────────────────────────────────────────────┐
  │ All Documents                              [Upload] [Bulk]  │
  ├─────────────────────────────────────────────────────────────┤
  │ Filter: [All Projects ▼] [All Categories ▼] [All Status ▼] │
  │ Search: [________________________]                          │
  ├─────────────────────────────────────────────────────────────┤
  │ Name                  │ Project   │ Category │ Investors    │
  │ Q2 2025 Report        │ Porthaven │ Reporting│ 6 (3 viewed) │
  │ K-1 — James Chen      │ General   │ Tax      │ 1 (1 viewed) │
  │ Capital Call #4        │ Livy      │ Cap Call │ 5 (2 viewed) │
  └─────────────────────────────────────────────────────────────┘
```
- Click document → detail view showing:
  - File preview (PDF thumbnail)
  - Metadata (name, category, project, upload date, size)
  - **Access list**: which investors can see it
  - **View tracking**: who downloaded/viewed it and when
  - Edit metadata, reassign, delete

### 5. Document Access Audit
Per-document view:
```
  ┌─────────────────────────────────────────────────┐
  │ Q2 2025 — Porthaven Quarterly Report            │
  │ Uploaded: Jul 15, 2025 · 2.4 MB · Reporting     │
  ├─────────────────────────────────────────────────┤
  │ Investor          │ Access │ Viewed   │ Downloaded│
  │ James Chen        │ ✓      │ Jul 16   │ Jul 16    │
  │ Pacific Pension   │ ✓      │ Jul 18   │ —         │
  │ Coastal Family    │ ✓      │ —        │ —         │
  └─────────────────────────────────────────────────┘
```

---

## Investor/LP Flow (View → Download)

### 1. Document Center (Main Tab)
```
Documents page shows:
  ┌─────────────────────────────────────────────────────────────┐
  │ Documents                                                   │
  │ 8 documents · 2 requiring action                           │
  ├─────────────────────────────────────────────────────────────┤
  │ Tabs: [All] [General] [Porthaven] [Livy]                  │
  │ Category: All | Reporting | Tax | Legal | Capital Call ... │
  ├─────────────────────────────────────────────────────────────┤
  │ ● Q2 2025 — Porthaven Quarterly Report                    │
  │   Porthaven · Reporting · Jul 15, 2025 · 2.4 MB [Download]│
  │                                                             │
  │ ● Capital Call Notice #4 — Livy   [ACTION REQUIRED]        │
  │   Livy · Capital Call · Jun 10, 2025 · 320 KB    [Review] │
  │                                                             │
  │ ● Subscription Agreement — Livy   [PENDING SIGNATURE]      │
  │   Livy · Legal · Jun 10, 2025 · 1.2 MB           [Sign]   │
  └─────────────────────────────────────────────────────────────┘
```

### 2. Documents Within Investment Detail
When investor clicks into a project (e.g., Porthaven detail page):
```
  Investment Detail: Porthaven
  ├── Overview tab (metrics, description)
  ├── Documents tab ← project-specific docs appear here too
  ├── Updates tab (construction progress)
  └── Distributions tab (payment history)
```

### 3. Document Actions
- **Download**: Click → browser downloads PDF via signed URL
- **Review**: Opens modal with document details + "Acknowledge" button
- **Sign**: Opens e-signature modal (future: DocuSign/HelloSign embed)
- **View**: (future) In-portal PDF viewer with page tracking

### 4. Tax Center (future enhancement)
Dedicated section for tax documents:
```
  Tax Documents
  ├── 2024 K-1 — Porthaven    [Download]  ✓ Received
  ├── 2024 K-1 — Livy         [Download]  ✓ Received
  └── Electronic Consent       [Manage]
```

---

## Messaging Flow (for reference)

### Investor → Staff
```
Investor opens Messages → "New Message"
  → Subject + Body (recipient auto-set to Northstar Staff)
  → Message appears in admin inbox
  → Admin replies → appears in investor's thread
```

### Admin → Investors
```
Admin opens Inbox → "New Message"
  → Selects targeting: All | Project | Specific Investors
  → For "Specific": types investor name in search bar → dropdown results → click to add as chip
  → Or clicks "Browse Investors" → opens full investor table modal → select rows → "Add Selected"
  → Writes subject + body
  → Sends → appears in targeted investors' inboxes
```

---

## Data Model

### Current Schema
```
Document
  - id, name, category, date, size, status, file, storageKey
  - projectId (nullable — null = general)
  - assignments[] → DocumentAssignment (per-investor access)

DocumentAssignment
  - documentId, userId
```

### Needed Additions
```
DocumentAssignment (enhance existing)
  + viewedAt (DateTime?) — when investor first opened/viewed
  + downloadedAt (DateTime?) — when investor downloaded
  + acknowledgedAt (DateTime?) — for "Action Required" docs

DocumentVersion (future)
  - documentId, version, storageKey, uploadedAt, uploadedBy
  - For tracking document revisions
```

---

## Statement Generation Solutions

For generating investor statements (capital account, distribution notices, K-1 summaries):

| Solution | Type | Best For |
|----------|------|----------|
| **jsPDF** (already installed) | Client-side PDF | Simple statements from portal data |
| **Puppeteer + HTML templates** | Server-side PDF | Branded statements, complex layouts |
| **React-PDF (@react-pdf/renderer)** | React → PDF | Statements that match portal design |
| **Docspring** | API service | Template-based PDF filling (subscription docs) |
| **Carbone** (open source) | Template engine | DOCX/PDF from JSON data + template |

**Recommendation**: Use **React-PDF** for generating branded capital account statements and distribution notices — it lets you design statements in JSX that match the portal's look and feel, then export as downloadable PDFs.

---

## Implementation Priority

| Feature | Sprint | Priority |
|---------|--------|----------|
| Admin document dashboard with access list | Sprint 8 | P0 |
| View/download tracking (viewedAt, downloadedAt) | Sprint 8 | P1 |
| Documents within investment detail page | Sprint 10 | P1 |
| Capital account statement PDF generation | Sprint 10 | P1 |
| Bulk K-1 upload with auto-matching | Post-MVP | P1 |
| In-portal PDF viewer | Post-MVP | P2 |
| E-signature integration | Post-MVP | P1 |
| Document versioning | Post-MVP | P2 |
