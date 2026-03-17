# Northstar Investor Portal — Document Management & Distribution Flows

> Last updated: 2026-03-17

## Overview

Documents are central to the investor portal. Investors expect to find all their legal, financial, and project documents in one place with secure access. The system handles:

1. **Document storage** — Secure file storage with per-investor access control
2. **Document distribution** — Getting the right documents to the right investors
3. **E-signature workflows** — Legally binding signatures on subscription agreements, amendments, etc.
4. **Tax document delivery** — K-1s and related tax forms with electronic consent
5. **Generated documents** — Capital call notices, distribution statements, quarterly reports

---

## 1. Data Model

```
documents
├── id                UUID
├── project_id        FK → projects (nullable — some docs are general)
├── title             VARCHAR(255)  "Q2 2025 Quarterly Report"
├── category          ENUM: see categories below
├── type              ENUM: "general", "investor_specific", "signature_required"
├── status            ENUM: "draft", "published", "requires_signature", "signed", "archived"
├── file_key          VARCHAR — S3 object key (e.g., "projects/porthaven/reports/q2-2025.pdf")
├── file_size         INTEGER — bytes
├── mime_type         VARCHAR — "application/pdf"
├── uploaded_by       FK → users (admin who uploaded)
├── created_at        TIMESTAMP
├── updated_at        TIMESTAMP
└── metadata          JSONB (extra fields: fiscal_year, quarter, etc.)

document_access
├── id                UUID
├── document_id       FK → documents
├── investor_id       FK → users
├── can_view          BOOLEAN (default true)
├── requires_signature BOOLEAN (default false)
├── signature_status  ENUM: "not_required", "pending", "sent", "signed", "declined"
├── signed_at         TIMESTAMP (nullable)
├── signed_file_key   VARCHAR (nullable — S3 key for signed copy)
├── docusign_envelope VARCHAR (nullable — DocuSign envelope ID)
├── first_viewed_at   TIMESTAMP (nullable)
├── download_count    INTEGER (default 0)
├── created_at        TIMESTAMP
└── updated_at        TIMESTAMP
```

### Document Categories

| Category | Examples | Typical Type |
|----------|----------|-------------|
| `legal` | PPM, Operating Agreement, Subscription Agreement | signature_required |
| `report` | Quarterly Reports, Annual Letters | general |
| `financial` | Distribution Statements, Capital Account Summary | investor_specific |
| `tax` | K-1 Tax Package, W-9, W-8BEN | investor_specific |
| `notice` | Capital Call Notices, Distribution Notices | investor_specific |
| `construction` | Construction Photos, Progress Reports | general |
| `compliance` | Accreditation Verification, KYC Confirmation | investor_specific |

---

## 2. Document Upload Flow (Admin)

```
Admin Panel                      API Server                    S3 Storage
───────────                      ──────────                    ──────────

1. Admin opens
   Document Upload form
   ↓
2. Selects:
   - PDF file
   - Project (or "General")
   - Category
   - Distribution type:
     ○ All project LPs
     ○ Specific investors
     ○ Requires signature
   ↓
3. Clicks "Upload"
   ↓
4. POST /api/admin/documents
   (multipart form data)  ─────→ 5. Validate file
                                    (PDF only, max 50MB)
                                    ↓
                                 6. Generate S3 key:
                                    projects/{project_id}/
                                    {category}/{filename}
                                    ↓
                                 7. Upload to S3 ──────────→ 8. File stored
                                    (server-side upload)        encrypted at rest
                                    ↓                           (AES-256)
                                 9. Insert document row
                                    in database
                                    ↓
                                10. Create document_access
                                    rows for each recipient
                                    investor
                                    ↓
                                11. Trigger email
                                    notifications to
                                    all recipients
                                    ↓
                                12. Return success
                                    with document ID
```

### Investor-Specific Document Upload

For documents like K-1s where each investor gets a unique file:

```
1. Admin selects "Investor-specific upload"
2. Admin uploads multiple files, mapping each to an investor:
   - james-chen-k1-2025.pdf → James Chen
   - pacific-pension-k1-2025.pdf → Pacific Pension Fund
3. Server creates separate document rows for each
4. Each investor can only see and download their own file
```

---

## 3. Document Access Flow (Investor)

```
Investor Portal                  API Server                    S3 Storage
───────────────                  ──────────                    ──────────

1. Investor opens
   Documents page
   ↓
2. GET /api/documents
   ?project={id}
   &category={cat}  ──────────→ 3. Query document_access
                                   WHERE investor_id = auth_user
                                   JOIN documents
                                   ↓
                                4. Return document list
                                   (metadata only, no files)
   ↓
5. Documents page renders
   list with filters:
   - By project (Porthaven | Livy)
   - By category (All | Legal | Reports | Tax...)
   - By status (All | Requires Signature | Signed)
   ↓
6. Investor clicks
   "Download" on a document
   ↓
7. GET /api/documents/:id/
   download  ─────────────────→ 8. Verify investor has
                                   access (document_access row)
                                   ↓
                                9. Generate signed S3 URL
                                   (expires in 5 minutes)  ──→ 10. S3 generates
                                   ↓                              pre-signed URL
                               11. Log download event:
                                   - Increment download_count
                                   - Set first_viewed_at
                                     (if first time)
                                   ↓
                               12. Return signed URL
   ↓
13. Browser downloads file
    directly from S3
    (never passes through
     our server)
```

### Security Controls

- **Signed URLs** expire after 5 minutes — cannot be bookmarked or shared
- **Access check** on every download request — revoked access = immediate cutoff
- **Download logging** — every download is recorded for compliance audit
- **No direct S3 access** — bucket is private, only accessible via signed URLs from our API
- **Optional watermarking** — inject investor name/email into PDF before generating signed URL (Phase 4.8)

---

## 4. E-Signature Flow

For documents that require legally binding signatures (subscription agreements, amendments, capital call acknowledgments):

```
Admin Panel          API Server          DocuSign API           Investor
───────────          ──────────          ────────────           ────────

1. Admin uploads doc
   marked as
   "Requires Signature"
   ↓
2. POST /api/admin/
   documents
   { type:
   "signature_required",
   signers: [investor_ids] }
        ↓
3. Server stores doc ────→ S3
        ↓
4. For each signer:
   ↓
5. Create DocuSign
   envelope ──────────────────→ 6. DocuSign receives
   - PDF document                  document + signer info
   - Signer name + email           ↓
   - Signature fields            7. DocuSign sends email
     (coordinates on PDF)           to investor:
   - Return URL (portal)           "Please sign {doc name}"
        ↓                                    ↓
8. Save envelope_id                       8. Investor receives
   to document_access                        DocuSign email
   row                                       ↓
                                          9. Investor clicks
                                             "Review Document"
                                             ↓
                                         10. Opens DocuSign
                                             signing ceremony
                                             ↓
                                         11. Reviews document
                                             Places signature
                                             Clicks "Finish"
                                             ↓
                              ←──────── 12. DocuSign sends
                              webhook       webhook to our API:
                                            "envelope completed"
        ↓
13. Webhook handler:
    - Download signed PDF
      from DocuSign API
    - Upload to S3 as
      signed copy ──────→ S3
    - Update document_access:
      signature_status = "signed"
      signed_at = now()
      signed_file_key = new key
    - Trigger notification:
      "Document signed successfully"
        ↓
14. Admin sees updated                  15. Investor sees
    status in admin panel                   status change in
    "James Chen — Signed ✓"                 Documents page:
                                            "Signed ✓"
                                            Can download
                                            signed copy
```

### Alternative: Embedded Signing (In-Portal)

Instead of redirecting to DocuSign's site, use embedded signing so the investor never leaves the portal:

```
1. Investor clicks "Sign" on document in portal
2. Frontend calls POST /api/documents/:id/sign-url
3. Server calls DocuSign API → gets embedded signing URL
4. Frontend opens DocuSign signing experience in iframe or modal
5. Investor signs within the portal
6. DocuSign redirects back to portal return URL
7. Webhook still handles completion + signed copy storage
```

---

## 5. Document Generation Flow

Some documents are generated by the system rather than uploaded by admin:

### Capital Call Notice

```
1. Admin creates capital call in admin panel:
   - Project: Porthaven
   - Total call amount: $500,000
   - Due date: 2025-04-15
   - Purpose: "Phase 2 construction funding"
   ↓
2. Server calculates per-investor amounts
   based on cap table ownership %:
   - James Chen (8.3%): $41,500
   - Pacific Pension (33.3%): $166,500
   - ...
   ↓
3. For each investor:
   ↓
4. Generate PDF from template:
   ┌──────────────────────────────────┐
   │  ★ NORTHSTAR                     │
   │  CAPITAL CALL NOTICE             │
   │                                  │
   │  To: James Chen                  │
   │  Project: Porthaven              │
   │  Date: March 17, 2026            │
   │                                  │
   │  Capital Call Amount: $41,500.00 │
   │  Due Date: April 15, 2026        │
   │                                  │
   │  Purpose: Phase 2 construction   │
   │  funding                         │
   │                                  │
   │  Wiring Instructions:            │
   │  Bank: [...]                     │
   │  Account: [...]                  │
   │  Reference: PORTH-CC-004-CHEN    │
   │                                  │
   │  Unfunded Commitment: $100,000   │
   │  After This Call: $58,500        │
   └──────────────────────────────────┘
   ↓
5. Upload PDF to S3
6. Create document + document_access rows
7. Send email notification: "Capital call notice — $41,500 due by April 15"
8. Optionally route through DocuSign for acknowledgment signature
```

### Distribution Statement

```
1. Admin records distribution payment:
   - Project: Porthaven
   - Type: Quarterly income
   - Total: $120,000
   ↓
2. Server calculates per-investor amounts via waterfall:
   - Preferred return first (8%)
   - Then GP catch-up
   - Then carry split (80/20)
   ↓
3. Generate per-investor PDF statement:
   - Gross distribution amount
   - Withholding (if applicable)
   - Net amount
   - Payment method (ACH/wire)
   - YTD distributions
   ↓
4. Upload to S3 → create document rows → notify investors
```

### Quarterly Report

```
1. Admin writes narrative update in admin panel:
   - Project highlights
   - Construction progress
   - Financial summary
   - Photos
   ↓
2. System generates PDF combining:
   - Northstar branded header
   - Narrative content
   - Financial tables (from database)
   - Project photos
   - Per-investor capital account summary
   ↓
3. Upload to S3 → distribute to project LPs → notify
```

---

## 6. Tax Document Delivery (K-1)

K-1 delivery has special requirements — investors must consent to electronic delivery per IRS rules.

```
First Time (Consent):
1. Investor logs into portal
2. System prompts: "Consent to receive tax documents electronically?"
3. Investor accepts → consent recorded with timestamp
4. If declined → Northstar must mail physical K-1

Annual K-1 Flow:
1. CPA prepares K-1s (outside the portal)
2. Admin uploads each investor's K-1 PDF
3. System creates document rows with category = "tax"
4. Email notification: "Your 2025 K-1 is now available"
5. Investor downloads from portal
6. System logs download (proof of delivery for IRS)
```

---

## 7. Document Page UI Behavior

### Filters
- **Project**: Porthaven | Livy | All Projects
- **Category**: All | Legal | Reports | Financial | Tax | Notices | Construction
- **Status**: All | Requires Action | Signed | Downloaded

### Document Card/Row

```
┌────────────────────────────────────────────────────────┐
│ 📄 Q2 2025 Quarterly Report              Porthaven    │
│    Published Jul 15, 2025                 Report       │
│                                                        │
│    [Download]  [View]                     ✓ Viewed     │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 📝 Subscription Agreement — Fund II       Livy        │
│    Sent for signature Mar 10, 2026        Legal       │
│                                                        │
│    [Sign Now]                        ⏳ Awaiting Sign  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 📄 K-1 Tax Package — FY 2025             General     │
│    Published Mar 1, 2026                  Tax          │
│                                                        │
│    [Download]                        ● New             │
└────────────────────────────────────────────────────────┘
```

### Actions by Document Status

| Status | Available Actions |
|--------|------------------|
| `published` | Download, View (iframe preview for PDFs) |
| `requires_signature` | Sign Now (opens DocuSign), View unsigned copy |
| `signed` | Download signed copy, Download original |
| `archived` | Download (grayed out in list) |

---

## 8. Storage Structure (S3)

```
northstar-documents/
├── projects/
│   ├── porthaven/
│   │   ├── legal/
│   │   │   ├── ppm-fund-i-overview.pdf
│   │   │   └── operating-agreement-v2.pdf
│   │   ├── reports/
│   │   │   ├── q1-2025-quarterly-report.pdf
│   │   │   └── q2-2025-quarterly-report.pdf
│   │   ├── construction/
│   │   │   └── construction-photos-mar-2026.pdf
│   │   ├── notices/
│   │   │   └── capital-call-004.pdf
│   │   └── investor-specific/
│   │       ├── james-chen/
│   │       │   ├── capital-call-004-notice.pdf
│   │       │   ├── distribution-q1-2025.pdf
│   │       │   └── subscription-agreement-signed.pdf
│   │       └── pacific-pension/
│   │           └── ...
│   └── livy/
│       └── ... (same structure)
├── general/
│   ├── annual-investor-letter-2024.pdf
│   └── tax/
│       ├── james-chen-k1-fy2025.pdf
│       └── pacific-pension-k1-fy2025.pdf
└── templates/
    ├── capital-call-template.html
    ├── distribution-statement-template.html
    └── quarterly-report-template.html
```

---

## 9. Audit Trail

Every document interaction is logged:

```
document_audit_log
├── id              UUID
├── document_id     FK → documents
├── user_id         FK → users
├── action          ENUM: "uploaded", "viewed", "downloaded",
│                         "signed", "signature_sent",
│                         "signature_declined", "archived",
│                         "access_granted", "access_revoked"
├── ip_address      VARCHAR
├── user_agent      VARCHAR
├── created_at      TIMESTAMP
└── metadata        JSONB (e.g., { "download_format": "pdf" })
```

This log satisfies:
- **SEC compliance** — proof that documents were delivered and accessed
- **IRS requirements** — proof of K-1 electronic delivery
- **Legal** — proof that subscription agreements were signed by the correct party
- **Internal** — admin can see which investors haven't viewed important documents

---

## 10. API Endpoints

### Investor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List documents accessible to authenticated investor |
| GET | `/api/documents/:id` | Get document metadata |
| GET | `/api/documents/:id/download` | Get signed S3 download URL |
| POST | `/api/documents/:id/sign-url` | Get embedded DocuSign signing URL |
| GET | `/api/documents/categories` | List available categories for filtering |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/documents` | Upload new document |
| POST | `/api/admin/documents/bulk` | Upload investor-specific documents |
| PUT | `/api/admin/documents/:id` | Update document metadata |
| DELETE | `/api/admin/documents/:id` | Archive document (soft delete) |
| POST | `/api/admin/documents/:id/distribute` | Assign document to investors |
| POST | `/api/admin/documents/:id/send-signature` | Send for e-signature via DocuSign |
| GET | `/api/admin/documents/:id/audit` | Get audit trail for a document |
| GET | `/api/admin/documents/pending-signatures` | List all unsigned documents |
| POST | `/api/admin/documents/generate/capital-call` | Generate capital call notices |
| POST | `/api/admin/documents/generate/distribution` | Generate distribution statements |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/docusign` | DocuSign envelope status callback |
