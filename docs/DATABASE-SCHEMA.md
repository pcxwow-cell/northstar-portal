# Northstar Investor Portal — Database Schema

> Last updated: 2026-03-17

## Overview

This is a **separate database** from the Homeowner Portal. The Homeowner Portal manages strata/condo operations (units, parking, maintenance, etc.). This database manages **real estate investment** operations — investors, projects, capital, documents, and communications.

---

## Entity Relationship Diagram

```
users ←──────── investor_profiles
  │                    │
  │                    ├──── investor_projects ────→ projects
  │                    │                               │
  │                    ├──── capital_accounts           ├──── cap_table_entries
  │                    │                               ├──── waterfall_configs
  │                    ├──── document_access            ├──── project_updates
  │                    │         │                      ├──── project_documents
  │                    │         ↓                      │
  │                    │     documents ←────────────────┘
  │                    │
  │                    ├──── distributions
  │                    │
  │                    ├──── notification_preferences
  │                    │
  │                    └──── investor_group_members ────→ investor_groups
  │                                                         │
  │                                                         ├──── group_projects
  │                                                         └──── group_documents
  │
  ├──── messages
  ├──── notification_log
  └──── audit_log
```

---

## Core Tables

### users

Authentication and identity for all portal users (investors, admins, GP staff).

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  role            VARCHAR(50) NOT NULL,        -- INVESTOR | ADMIN | GP | STAFF
  status          VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | PENDING
  last_login_at   TIMESTAMPTZ,
  login_count     INTEGER DEFAULT 0,
  mfa_enabled     BOOLEAN DEFAULT FALSE,
  mfa_secret      VARCHAR(255),                -- TOTP secret (encrypted)
  reset_token     VARCHAR(255),
  reset_token_exp TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### investor_profiles

Extended profile for users with role = INVESTOR. Contains personal, entity, tax, and banking info.

```sql
CREATE TABLE investor_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES users(id),

  -- Personal info
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  phone             VARCHAR(50),
  address_line1     VARCHAR(255),
  address_line2     VARCHAR(255),
  city              VARCHAR(100),
  province_state    VARCHAR(100),
  postal_code       VARCHAR(20),
  country           VARCHAR(100) DEFAULT 'Canada',

  -- Entity info (investors may invest through entities)
  entity_type       VARCHAR(50) NOT NULL,      -- INDIVIDUAL | LLC | CORPORATION | TRUST | IRA | PARTNERSHIP
  entity_name       VARCHAR(255),              -- null for INDIVIDUAL
  entity_jurisdiction VARCHAR(100),            -- province/state of entity registration

  -- Accreditation
  accreditation_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING | VERIFIED | EXPIRED | NOT_REQUIRED
  accreditation_method VARCHAR(100),           -- INCOME | NET_WORTH | PROFESSIONAL | ENTITY
  accreditation_verified_at TIMESTAMPTZ,
  accreditation_expires_at  TIMESTAMPTZ,
  accreditation_provider    VARCHAR(100),       -- "Parallel Markets", "Verify Investor", "Self-Certified"

  -- Tax info
  tax_id_type       VARCHAR(20),               -- SIN | SSN | EIN | BN
  tax_id_last4      VARCHAR(4),                -- last 4 digits only (full stored encrypted elsewhere)
  tax_id_encrypted  VARCHAR(500),              -- AES-256 encrypted full tax ID
  tax_residency     VARCHAR(100) DEFAULT 'Canada',
  w9_on_file        BOOLEAN DEFAULT FALSE,
  w8ben_on_file     BOOLEAN DEFAULT FALSE,
  electronic_tax_consent BOOLEAN DEFAULT FALSE, -- consent to receive K-1 electronically
  tax_consent_date  TIMESTAMPTZ,

  -- Banking (for distribution payments)
  bank_name         VARCHAR(255),
  bank_transit       VARCHAR(10),              -- Canadian transit number
  bank_institution   VARCHAR(5),               -- Canadian institution number
  bank_account_last4 VARCHAR(4),               -- last 4 digits
  bank_account_encrypted VARCHAR(500),         -- AES-256 encrypted full account number
  payment_method    VARCHAR(50),               -- ACH | WIRE | CHEQUE | EFT
  stripe_customer_id VARCHAR(255),             -- Stripe customer ID for payment processing

  -- KYC / AML
  kyc_status        VARCHAR(50) DEFAULT 'NOT_STARTED', -- NOT_STARTED | IN_PROGRESS | VERIFIED | FAILED | EXPIRED
  kyc_provider      VARCHAR(100),              -- "Persona", "Sumsub"
  kyc_verified_at   TIMESTAMPTZ,
  kyc_reference_id  VARCHAR(255),              -- provider's reference ID
  aml_status        VARCHAR(50) DEFAULT 'NOT_STARTED', -- NOT_STARTED | CLEAR | FLAGGED | BLOCKED
  aml_checked_at    TIMESTAMPTZ,

  -- Portal preferences
  preferred_contact VARCHAR(50) DEFAULT 'EMAIL', -- EMAIL | PHONE | PORTAL
  timezone          VARCHAR(50) DEFAULT 'America/Vancouver',

  -- Relationships
  advisor_name      VARCHAR(255),              -- CPA / financial advisor
  advisor_email     VARCHAR(255),
  advisor_access    BOOLEAN DEFAULT FALSE,     -- whether advisor has read-only portal access

  -- Internal notes (visible to admin only)
  internal_notes    TEXT,
  tags              JSONB,                     -- ["high-net-worth", "repeat-investor", "co-investor"]

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### investor_contacts

Additional contacts associated with an investor (signatories, authorized representatives, CPA).

```sql
CREATE TABLE investor_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id       UUID NOT NULL REFERENCES investor_profiles(id),
  contact_type      VARCHAR(50) NOT NULL,       -- SIGNATORY | AUTHORIZED_REP | CPA | ATTORNEY | BENEFICIARY
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(50),
  title             VARCHAR(100),               -- "Managing Member", "Trustee", "Tax Advisor"
  can_sign          BOOLEAN DEFAULT FALSE,      -- authorized to sign legal docs
  portal_access     BOOLEAN DEFAULT FALSE,      -- has read-only portal access
  portal_user_id    UUID REFERENCES users(id),  -- if they have a portal account
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Project Tables

### projects

Each real estate development project.

```sql
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,       -- "Porthaven"
  location        VARCHAR(255),                -- "Downtown Port Coquitlam"
  address         VARCHAR(500),
  type            VARCHAR(255),                -- "108 Residences & Curated Retail"
  asset_class     VARCHAR(100),                -- MULTIFAMILY | OFFICE | RETAIL | MIXED_USE | INDUSTRIAL
  status          VARCHAR(50) NOT NULL,        -- PRE_DEVELOPMENT | UNDER_CONSTRUCTION | COMPLETED | OPERATING | SOLD
  description     TEXT,

  -- Physical
  sqft            INTEGER,
  units           INTEGER,
  floors          INTEGER,
  parking_stalls  INTEGER,
  completion_pct  DECIMAL(5,2) DEFAULT 0,      -- 0.00 to 100.00

  -- Financial targets
  total_raise     DECIMAL(15,2),               -- total capital raise target
  total_committed DECIMAL(15,2) DEFAULT 0,     -- total committed by all LPs
  total_called    DECIMAL(15,2) DEFAULT 0,     -- total capital called
  total_distributed DECIMAL(15,2) DEFAULT 0,   -- total distributed to all LPs
  current_nav     DECIMAL(15,2),               -- current net asset value
  target_irr      DECIMAL(5,2),                -- projected IRR
  target_moic     DECIMAL(5,2),                -- projected MOIC
  hold_period_years INTEGER,                   -- expected hold period

  -- Dates
  acquisition_date   DATE,
  construction_start DATE,
  estimated_completion DATE,
  actual_completion  DATE,

  -- Waterfall terms (project-level defaults)
  pref_return_pct DECIMAL(5,2) DEFAULT 8.00,   -- preferred return %
  gp_catchup_pct  DECIMAL(5,2) DEFAULT 100,    -- GP catch-up %
  carry_pct       DECIMAL(5,2) DEFAULT 20,     -- carried interest %

  -- Media
  hero_image_url  VARCHAR(500),                -- main project photo
  images          JSONB,                       -- array of image URLs
  map_url         VARCHAR(500),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### investor_projects

Junction table linking investors to their projects with their specific investment terms.

```sql
CREATE TABLE investor_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id     UUID NOT NULL REFERENCES investor_profiles(id),
  project_id      UUID NOT NULL REFERENCES projects(id),

  -- Investment details
  lp_class        VARCHAR(50),                 -- "Class A", "Class B", "Class C"
  committed       DECIMAL(15,2) NOT NULL,      -- total committed capital
  called          DECIMAL(15,2) DEFAULT 0,     -- total capital called to date
  unfunded        DECIMAL(15,2) GENERATED ALWAYS AS (committed - called) STORED,
  ownership_pct   DECIMAL(8,4),                -- ownership percentage
  current_value   DECIMAL(15,2) DEFAULT 0,     -- current estimated value of position

  -- Calculated metrics (updated periodically)
  irr             DECIMAL(8,2),                -- investor's IRR for this project
  moic            DECIMAL(8,4),                -- investor's MOIC for this project
  total_distributed DECIMAL(15,2) DEFAULT 0,   -- total distributions received

  -- Status
  status          VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE | FULLY_RETURNED | TRANSFERRED | REDEEMED
  subscription_date DATE,                      -- date of subscription agreement
  first_call_date DATE,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(investor_id, project_id)
);
```

### cap_table_entries

Full cap table for each project (includes non-portal investors, GP, entities).

```sql
CREATE TABLE cap_table_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  investor_id     UUID REFERENCES investor_profiles(id),  -- null for entities without portal accounts
  holder_name     VARCHAR(255) NOT NULL,       -- display name (may differ from investor name for entities)
  holder_type     VARCHAR(50) NOT NULL,        -- GP | LP_CLASS_A | LP_CLASS_B | LP_CLASS_C
  committed       DECIMAL(15,2) NOT NULL,
  called          DECIMAL(15,2) DEFAULT 0,
  ownership_pct   DECIMAL(8,4) NOT NULL,
  unfunded        DECIMAL(15,2) GENERATED ALWAYS AS (committed - called) STORED,
  status          VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE | TRANSFERRED | REDEEMED
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Financial Tables

### capital_accounts

Tracks each investor's capital account per project over time.

```sql
CREATE TABLE capital_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id     UUID NOT NULL REFERENCES investor_profiles(id),
  project_id      UUID NOT NULL REFERENCES projects(id),
  period          VARCHAR(10) NOT NULL,        -- "2025-Q1"
  beginning_balance DECIMAL(15,2),
  contributions   DECIMAL(15,2) DEFAULT 0,     -- capital calls funded
  distributions   DECIMAL(15,2) DEFAULT 0,     -- distributions received (negative)
  income_allocation DECIMAL(15,2) DEFAULT 0,   -- allocated income
  unrealized_gain DECIMAL(15,2) DEFAULT 0,
  ending_balance  DECIMAL(15,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(investor_id, project_id, period)
);
```

### distributions

Individual distribution payments to investors.

```sql
CREATE TABLE distributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  investor_id     UUID NOT NULL REFERENCES investor_profiles(id),
  quarter         VARCHAR(10) NOT NULL,        -- "Q1 2025"
  distribution_date DATE NOT NULL,
  type            VARCHAR(50) NOT NULL,        -- INCOME | RETURN_OF_CAPITAL | GAIN | PREFERRED_RETURN
  gross_amount    DECIMAL(15,2) NOT NULL,
  withholding     DECIMAL(15,2) DEFAULT 0,     -- tax withholding
  net_amount      DECIMAL(15,2) NOT NULL,      -- gross - withholding
  payment_method  VARCHAR(50),                 -- ACH | WIRE | CHEQUE | EFT
  payment_status  VARCHAR(50) DEFAULT 'PENDING', -- PENDING | PROCESSING | PAID | FAILED
  payment_reference VARCHAR(255),              -- bank reference number
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### capital_calls

Capital call events and per-investor tracking.

```sql
CREATE TABLE capital_calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  call_number     INTEGER NOT NULL,            -- sequential per project
  total_amount    DECIMAL(15,2) NOT NULL,
  purpose         TEXT,
  due_date        DATE NOT NULL,
  status          VARCHAR(50) DEFAULT 'ISSUED', -- ISSUED | PARTIALLY_FUNDED | FULLY_FUNDED | OVERDUE
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE capital_call_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_call_id UUID NOT NULL REFERENCES capital_calls(id),
  investor_id     UUID NOT NULL REFERENCES investor_profiles(id),
  amount          DECIMAL(15,2) NOT NULL,      -- this investor's share
  status          VARCHAR(50) DEFAULT 'PENDING', -- PENDING | FUNDED | OVERDUE | WAIVED
  funded_at       TIMESTAMPTZ,
  funded_amount   DECIMAL(15,2),
  payment_reference VARCHAR(255),
  notice_document_id UUID,                     -- link to generated PDF notice
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(capital_call_id, investor_id)
);
```

---

## Document Tables

### documents

```sql
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id), -- null for general docs
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(50) NOT NULL,        -- LEGAL | REPORT | FINANCIAL | TAX | NOTICE | CONSTRUCTION | COMPLIANCE
  type            VARCHAR(50) NOT NULL,        -- GENERAL | INVESTOR_SPECIFIC | SIGNATURE_REQUIRED
  status          VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT | PUBLISHED | ARCHIVED
  file_key        VARCHAR(500) NOT NULL,       -- S3 object key
  file_size       INTEGER,                     -- bytes
  mime_type       VARCHAR(100) DEFAULT 'application/pdf',
  uploaded_by     UUID REFERENCES users(id),
  fiscal_year     INTEGER,                     -- for tax docs
  quarter         VARCHAR(10),                 -- for quarterly docs
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### document_access

```sql
CREATE TABLE document_access (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES documents(id),
  investor_id       UUID NOT NULL REFERENCES investor_profiles(id),
  can_view          BOOLEAN DEFAULT TRUE,
  requires_signature BOOLEAN DEFAULT FALSE,
  signature_status  VARCHAR(50) DEFAULT 'NOT_REQUIRED', -- NOT_REQUIRED | PENDING | SENT | SIGNED | DECLINED
  signed_at         TIMESTAMPTZ,
  signed_file_key   VARCHAR(500),              -- S3 key for signed copy
  docusign_envelope VARCHAR(255),              -- DocuSign envelope ID
  first_viewed_at   TIMESTAMPTZ,
  download_count    INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, investor_id)
);
```

---

## Messaging Tables

### messages

```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID,                        -- groups replies together
  project_id      UUID REFERENCES projects(id), -- null for general messages
  sender_id       UUID NOT NULL REFERENCES users(id),
  sender_role     VARCHAR(50) NOT NULL,        -- ADMIN | GP | INVESTOR
  recipient_id    UUID REFERENCES users(id),   -- null for broadcasts
  recipient_type  VARCHAR(50) NOT NULL,        -- INDIVIDUAL | PROJECT_LPS | ALL_INVESTORS
  subject         VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read);
CREATE INDEX idx_messages_thread ON messages(thread_id);
```

### notification_preferences

```sql
CREATE TABLE notification_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id         UUID UNIQUE NOT NULL REFERENCES investor_profiles(id),
  new_messages        BOOLEAN DEFAULT TRUE,
  new_documents       BOOLEAN DEFAULT TRUE,
  signature_requests  BOOLEAN DEFAULT TRUE,     -- cannot be disabled (regulatory)
  distributions       BOOLEAN DEFAULT TRUE,     -- cannot be disabled (fiduciary)
  capital_calls       BOOLEAN DEFAULT TRUE,     -- cannot be disabled (fiduciary)
  tax_documents       BOOLEAN DEFAULT TRUE,
  construction_updates BOOLEAN DEFAULT TRUE,
  marketing_updates   BOOLEAN DEFAULT FALSE,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### notification_log

```sql
CREATE TABLE notification_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  channel         VARCHAR(50) NOT NULL,        -- EMAIL | PORTAL | SMS
  event           VARCHAR(100) NOT NULL,       -- new_document, distribution_paid, etc.
  subject         VARCHAR(255),
  email_status    VARCHAR(50),                 -- SENT | DELIVERED | BOUNCED | FAILED
  email_provider_id VARCHAR(255),              -- SendGrid message ID
  portal_read     BOOLEAN DEFAULT FALSE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Project Content Tables

### project_updates

```sql
CREATE TABLE project_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  title           VARCHAR(255),
  body            TEXT NOT NULL,
  update_type     VARCHAR(50) DEFAULT 'CONSTRUCTION', -- CONSTRUCTION | FINANCIAL | MILESTONE | GENERAL
  photos          JSONB,                       -- array of S3 image URLs
  posted_by       UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### waterfall_configs

```sql
CREATE TABLE waterfall_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  tier_order      INTEGER NOT NULL,            -- 1, 2, 3, 4
  tier_name       VARCHAR(100) NOT NULL,       -- "Return of Capital", "Preferred Return (8%)"
  lp_share_pct    DECIMAL(5,2) NOT NULL,       -- 100, 0, 80
  gp_share_pct    DECIMAL(5,2) NOT NULL,       -- 0, 100, 20
  threshold       VARCHAR(100),                -- "1.0x", "8% IRR", "Until 20/80", "Above pref"
  status          VARCHAR(50) DEFAULT 'PENDING', -- PENDING | ACCRUING | COMPLETE
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, tier_order)
);
```

### performance_history

```sql
CREATE TABLE performance_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  period_date     DATE NOT NULL,               -- end of month
  nav_per_unit    DECIMAL(15,2),               -- value per $1K invested
  benchmark       DECIMAL(15,2),               -- benchmark comparison
  total_nav       DECIMAL(15,2),               -- total project NAV
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, period_date)
);
```

---

## Audit & Compliance

### document_audit_log

```sql
CREATE TABLE document_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  action          VARCHAR(50) NOT NULL,        -- UPLOADED | VIEWED | DOWNLOADED | SIGNED | ARCHIVED | ACCESS_GRANTED | ACCESS_REVOKED
  ip_address      VARCHAR(50),
  user_agent      VARCHAR(500),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### audit_log

```sql
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID NOT NULL REFERENCES users(id),
  actor_role      VARCHAR(50) NOT NULL,
  action          VARCHAR(100) NOT NULL,       -- CREATE_INVESTOR | UPDATE_PROJECT | SEND_MESSAGE | etc.
  target_type     VARCHAR(100) NOT NULL,       -- investor | project | document | distribution
  target_id       UUID,
  before_data     JSONB,                       -- state before change
  after_data      JSONB,                       -- state after change
  ip_address      VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Investor Group Tables

Investor groups handle scenarios where multiple investors invest together — family offices, syndicates, co-investment clubs, or multi-member LLCs. Groups allow:

- A single entity on the cap table that maps to multiple underlying individuals
- Shared document access across group members
- Consolidated or per-member reporting
- Group-level communications
- Role-based access within the group (lead, member, viewer)

### investor_groups

```sql
CREATE TABLE investor_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,        -- "Chen Family Office", "Pacific Syndicate I"
  type            VARCHAR(50) NOT NULL,         -- FAMILY_OFFICE | SYNDICATE | CO_INVEST | LLC | TRUST | FUND_OF_FUNDS
  entity_name     VARCHAR(255),                 -- legal entity name if different from display name
  entity_type     VARCHAR(50),                  -- LLC | LP | TRUST | CORPORATION | PARTNERSHIP
  entity_jurisdiction VARCHAR(100),             -- province/state of registration
  tax_id_last4    VARCHAR(4),
  tax_id_encrypted VARCHAR(500),                -- AES-256 encrypted

  -- Group contact
  primary_contact_name  VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(50),

  -- Banking (group-level — distributions go here unless overridden per member)
  bank_name         VARCHAR(255),
  bank_account_last4 VARCHAR(4),
  bank_account_encrypted VARCHAR(500),
  payment_method    VARCHAR(50),                -- ACH | WIRE | CHEQUE | EFT
  stripe_customer_id VARCHAR(255),

  -- Status
  status          VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | DISSOLVED
  internal_notes  TEXT,
  tags            JSONB,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### investor_group_members

Links individual investors to groups with role-based permissions.

```sql
CREATE TABLE investor_group_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES investor_groups(id),
  investor_id     UUID NOT NULL REFERENCES investor_profiles(id),
  role            VARCHAR(50) NOT NULL,         -- LEAD | MEMBER | VIEWER | ADMIN
  title           VARCHAR(100),                 -- "Managing Member", "Trustee", "Partner"
  ownership_pct   DECIMAL(8,4),                 -- member's share within the group (e.g., 40%)
  can_sign        BOOLEAN DEFAULT FALSE,        -- authorized signatory for group
  can_view_financials BOOLEAN DEFAULT TRUE,     -- can see group-level financial details
  can_manage_members BOOLEAN DEFAULT FALSE,     -- can add/remove group members
  receives_notifications BOOLEAN DEFAULT TRUE,
  receives_distributions BOOLEAN DEFAULT FALSE, -- receives individual distribution (vs. group-level)

  -- Distribution override (if member gets paid separately)
  distribution_override BOOLEAN DEFAULT FALSE,
  bank_name         VARCHAR(255),
  bank_account_last4 VARCHAR(4),
  bank_account_encrypted VARCHAR(500),

  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  left_at         TIMESTAMPTZ,                  -- null = still active
  status          VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | REMOVED
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, investor_id)
);
```

### group_projects

Links investor groups to projects (the group invests as a single entity on the cap table).

```sql
CREATE TABLE group_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES investor_groups(id),
  project_id      UUID NOT NULL REFERENCES projects(id),
  lp_class        VARCHAR(50),                 -- "Class A", "Class B"
  committed       DECIMAL(15,2) NOT NULL,
  called          DECIMAL(15,2) DEFAULT 0,
  unfunded        DECIMAL(15,2) GENERATED ALWAYS AS (committed - called) STORED,
  ownership_pct   DECIMAL(8,4),
  current_value   DECIMAL(15,2) DEFAULT 0,
  irr             DECIMAL(8,2),
  moic            DECIMAL(8,4),
  total_distributed DECIMAL(15,2) DEFAULT 0,
  status          VARCHAR(50) DEFAULT 'ACTIVE',
  subscription_date DATE,
  cap_table_entry_id UUID REFERENCES cap_table_entries(id), -- links to the cap table row for this group

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, project_id)
);
```

### group_documents

Documents shared at the group level (operating agreements, group K-1s, etc.).

```sql
CREATE TABLE group_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES investor_groups(id),
  document_id     UUID NOT NULL REFERENCES documents(id),
  access_level    VARCHAR(50) DEFAULT 'ALL_MEMBERS', -- ALL_MEMBERS | LEAD_ONLY | SIGNATORIES_ONLY
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, document_id)
);
```

### How Groups Work in Practice

**Example: "Chen Family Office" (LLC with 3 members)**

```
investor_groups:
  name: "Chen Family Office LLC"
  type: LLC
  entity_name: "Chen Family Holdings LLC"

investor_group_members:
  ├── James Chen    | LEAD  | 60% ownership | can_sign: true  | can_manage: true
  ├── Sarah Chen    | MEMBER | 30% ownership | can_sign: true  | can_manage: false
  └── Michael Chen  | VIEWER | 10% ownership | can_sign: false | can_manage: false

group_projects:
  ├── Porthaven: $500K committed, Class A, 8.3% ownership
  └── Livy: $350K committed, Class A, 7.8% ownership

cap_table_entries:
  ├── Porthaven row: holder_name = "Chen Family Office LLC" (not "James Chen")
  └── Livy row: holder_name = "Chen Family Office LLC"
```

**Portal behavior for group members:**
- **LEAD** (James): Sees all group investments, can sign documents, manages membership, receives all communications
- **MEMBER** (Sarah): Sees group investments and her ownership share, can sign if authorized, receives notifications
- **VIEWER** (Michael): Read-only access to group portfolio, cannot sign or manage

**Distribution flow for groups:**
1. Distribution calculated at group level based on group's cap table position
2. If `distribution_override = false` for all members → payment goes to group bank account
3. If `distribution_override = true` for a member → their share (based on `ownership_pct`) goes to their personal bank account
4. Distribution statements generated per-group and per-member (showing their proportional share)

**Example: Syndicate / Co-Investment Club**

```
investor_groups:
  name: "Pacific RE Syndicate I"
  type: SYNDICATE

investor_group_members:
  ├── Fund Manager (LEAD)  | 0% ownership | manages the syndicate
  ├── Investor A (MEMBER)  | 25% | distribution_override: true (paid directly)
  ├── Investor B (MEMBER)  | 25% | distribution_override: true
  ├── Investor C (MEMBER)  | 25% | distribution_override: true
  └── Investor D (MEMBER)  | 25% | distribution_override: true
```

In this structure, the syndicate appears as a single line on the cap table, but each member gets paid directly and has their own portal view of their proportional share.

---

## Prospective Investor Tables (Phase 3)

### prospects

```sql
CREATE TABLE prospects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  phone             VARCHAR(50),
  entity_type       VARCHAR(50),               -- INDIVIDUAL | LLC | TRUST | etc.
  accredited        VARCHAR(50),               -- YES | NO | UNSURE
  investment_range  VARCHAR(100),              -- "$50K-$100K" | "$100K-$250K" | "$250K-$500K" | "$500K+"
  preferred_asset   VARCHAR(100),              -- MULTIFAMILY | OFFICE | MIXED_USE | ANY
  source            VARCHAR(100),              -- WEBSITE | REFERRAL | EVENT | LINKEDIN
  referral_name     VARCHAR(255),
  status            VARCHAR(50) DEFAULT 'NEW', -- NEW | CONTACTED | QUALIFIED | DATA_ROOM_ACCESS | SUBSCRIBED | DECLINED
  notes             TEXT,
  interested_projects JSONB,                   -- array of project IDs they expressed interest in
  data_room_access  BOOLEAN DEFAULT FALSE,
  data_room_granted_at TIMESTAMPTZ,
  assigned_to       UUID REFERENCES users(id), -- GP/admin managing the relationship
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Prisma Schema (for implementation)

The SQL above translates to a Prisma schema. When building, create a new `northstar-portal/prisma/schema.prisma` — do **not** modify the Homeowner Portal's Prisma schema at `server/prisma/schema.prisma`.

---

## Seed Data

The initial seed should mirror what's currently in `data.js`:

| Entity | Records |
|--------|---------|
| users | 2 (James Chen as INVESTOR, admin account) |
| investor_profiles | 1 (James Chen with full profile) |
| projects | 4 (Porthaven, Livy, Estrella, Panorama) |
| investor_projects | 2 (James ↔ Porthaven, James ↔ Livy) |
| cap_table_entries | 11 (6 for Porthaven, 5 for Livy) |
| waterfall_configs | 8 (4 tiers × 2 projects) |
| distributions | 4 (Porthaven Q3-Q4 2024, Q1-Q2 2025) |
| documents | 8 (project docs + general docs) |
| document_access | 8 (one per doc for James) |
| messages | 5 (existing inbox messages) |
| project_updates | 8 (construction updates across projects) |
| performance_history | 24 (12 months × 2 projects) |

---

## Migration Strategy

1. Create `northstar-portal/prisma/schema.prisma` with all models
2. Run `npx prisma migrate dev --name init` to generate initial migration
3. Create `prisma/seed.ts` that transforms `data.js` into database records
4. Run `npx prisma db seed` to populate
5. Build API endpoints that query these tables
6. Replace `data.js` imports in React with API fetch hooks
