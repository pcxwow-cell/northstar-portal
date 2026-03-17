# Northstar Investor Portal — Messaging & Notification Flows

> Last updated: 2026-03-17

## Overview

The portal has two messaging layers:

1. **Portal Inbox** — Internal messages between GP/Admin and investors, stored in the database, viewed in the portal's Messages page
2. **Email Notifications** — Automated alerts sent via transactional email (SendGrid/Resend) when events occur, linking investors back to the portal

These are complementary: the portal inbox is the primary communication channel; email notifications drive investors to check the portal.

---

## 1. Portal Inbox

### Data Model

```
messages
├── id              UUID
├── thread_id       UUID (nullable — groups replies together)
├── project_id      FK → projects (nullable — some messages are general)
├── sender_id       FK → users
├── sender_role     ENUM: "admin", "gp", "investor"
├── recipient_id    FK → users (null for broadcasts)
├── recipient_type  ENUM: "individual", "project_lps", "all_investors"
├── subject         VARCHAR(255)
├── body            TEXT
├── is_read         BOOLEAN (default false)
├── read_at         TIMESTAMP (nullable)
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
```

### Message Types

| Type | Sender | Recipient | Example |
|------|--------|-----------|---------|
| **Direct message** | Admin/GP | Single investor | "James, your K-1 is ready for review" |
| **Project broadcast** | Admin/GP | All LPs in a project | "Porthaven construction update: framing complete" |
| **All-investor broadcast** | Admin/GP | Every investor | "Annual investor meeting invite" |
| **Reply** | Investor | Admin/GP (threaded) | "Thanks, I've signed the document" |

### Flows

#### Admin → Investor (Direct Message)

```
Admin Panel                    Database                   Investor Portal
───────────                    ────────                   ───────────────
1. Admin opens
   Message Composer
   ↓
2. Selects recipient:
   "James Chen"
   Selects project:
   "Porthaven" (optional)
   ↓
3. Writes subject + body
   Clicks "Send"
   ↓
4. POST /api/messages ──────→ 5. Insert message row
                               sender_id = admin
                               recipient_id = james
                               recipient_type = individual
                               is_read = false
                                      │
                                      ↓
                              6. Trigger email
                                 notification ──────────→ (see Email Flow below)

                                                    7. Investor logs in
                                                       or is already logged in
                                                       ↓
                                                    8. GET /api/messages
                                                       returns unread messages
                                                       ↓
                                                    9. Message appears in
                                                       inbox with unread badge
                                                       ↓
                                                   10. Investor clicks message
                                                       ↓
                                                   11. PATCH /api/messages/:id
                                                       { is_read: true,
                                                         read_at: now() }
```

#### Admin → Project Broadcast

```
1. Admin selects recipient type: "All Porthaven LPs"
2. POST /api/messages with recipient_type = "project_lps", project_id = porthaven
3. Server resolves all investors in project's cap table
4. Creates one message row per investor (or one row with broadcast flag)
5. Triggers email notification to each investor
6. Each investor sees the message in their own inbox
```

#### Investor → Reply

```
1. Investor opens a received message
2. Clicks "Reply"
3. Writes reply body
4. POST /api/messages
   - thread_id = original message's thread_id (or id if first in thread)
   - sender_id = investor
   - recipient_id = original sender (admin/GP)
   - sender_role = "investor"
5. Server saves reply, links to thread
6. Admin sees reply in their message center with thread context
7. Email notification sent to admin
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/messages` | Investor | List messages for authenticated investor (paginated) |
| GET | `/api/messages/:id` | Investor | Get single message + mark as read |
| GET | `/api/messages/unread-count` | Investor | Badge count for nav |
| POST | `/api/messages` | Admin/GP | Send a new message or reply |
| POST | `/api/messages/broadcast` | Admin/GP | Send to all LPs in a project or all investors |
| GET | `/api/admin/messages` | Admin | List all messages (sent + received), filterable |
| GET | `/api/admin/messages/thread/:threadId` | Admin | Full thread view |

### Inbox UI Behavior

- **Unread badge** on Messages nav item (count from `/api/messages/unread-count`)
- **Bold styling** for unread messages in inbox list
- **Thread grouping** — replies nest under the original message
- **Project tag** — messages show which project they relate to (or "General")
- **Sort** — newest first by default
- **Polling** — frontend polls `/api/messages/unread-count` every 30 seconds for real-time-ish updates (upgrade to WebSockets/Pusher later if needed)

---

## 2. Email Notifications

### When Emails Are Sent

| Event | Recipient | Email Subject Pattern |
|-------|-----------|---------------------|
| New message from GP/Admin | Investor | "New message from Northstar: {subject}" |
| New document uploaded | Investor | "New document available: {document name}" |
| Document requires signature | Investor | "Action required: Please sign {document name}" |
| Distribution payment made | Investor | "Distribution payment: {project name} — {amount}" |
| Capital call notice issued | Investor | "Capital call notice: {project name} — {amount due}" |
| K-1 tax document available | Investor | "Your {year} K-1 tax document is ready" |
| Investor reply received | Admin/GP | "Reply from {investor name}: {subject}" |

### Email Flow

```
Event occurs (e.g., admin sends message)
    ↓
API handler saves data to database
    ↓
Triggers notification service
    ↓
Notification service:
  1. Looks up recipient's email and notification preferences
  2. Checks if this notification type is enabled for the recipient
  3. Renders email template with event data
  4. Calls SendGrid/Resend API to send
  5. Logs email send status to notifications table
    ↓
Investor receives email
    ↓
Email contains:
  - Brief description of what happened (NOT the full content)
  - Call-to-action button: "View in Portal"
  - Link: https://portal.northstardevelopment.ca/messages/{id}
    ↓
Investor clicks link → lands in portal → sees full content
```

### Email Template Structure

```
┌──────────────────────────────────────────┐
│  ★ NORTHSTAR                             │
│  Pacific Development Group               │
│──────────────────────────────────────────│
│                                          │
│  Hi {investor_first_name},               │
│                                          │
│  {brief_description}                     │
│                                          │
│  ┌────────────────────────┐              │
│  │   View in Portal →     │              │
│  └────────────────────────┘              │
│                                          │
│  If you have questions, reply to this    │
│  email or contact us at                  │
│  investors@northstardevelopment.ca        │
│                                          │
│──────────────────────────────────────────│
│  Northstar Pacific Development Group     │
│  You're receiving this because you are   │
│  an investor in {project_names}.         │
│  Manage notification preferences →       │
└──────────────────────────────────────────┘
```

### Notification Preferences (Per Investor)

```
notification_preferences
├── investor_id         FK → users
├── new_messages        BOOLEAN (default true)
├── new_documents       BOOLEAN (default true)
├── signature_requests  BOOLEAN (default true — cannot be disabled)
├── distributions       BOOLEAN (default true — cannot be disabled)
├── capital_calls       BOOLEAN (default true — cannot be disabled)
├── tax_documents       BOOLEAN (default true)
├── marketing_updates   BOOLEAN (default false)
└── updated_at          TIMESTAMP
```

Note: Signature requests, distribution notices, and capital calls are **always sent** (regulatory/fiduciary requirement) — investors cannot opt out of these.

---

## 3. Notification Log

All notifications (portal + email) are logged for audit:

```
notification_log
├── id              UUID
├── user_id         FK → users
├── type            ENUM: "portal_message", "email", "both"
├── event           VARCHAR (e.g., "new_document", "distribution_paid")
├── subject         VARCHAR
├── email_status    ENUM: "sent", "delivered", "bounced", "failed" (nullable)
├── sendgrid_id     VARCHAR (nullable — for tracking delivery)
├── portal_read     BOOLEAN
├── created_at      TIMESTAMP
└── metadata        JSONB (event-specific data)
```

---

## 4. Future Enhancements

| Feature | Phase | Description |
|---------|-------|-------------|
| Real-time inbox | 6 | WebSocket or Pusher for instant message delivery without polling |
| Read receipts for admin | 6 | Admin sees when investor opened a message |
| File attachments | 4 | Attach documents to messages (stored in S3) |
| Message templates | 2 | Pre-built templates for common communications (capital calls, updates) |
| Scheduled sends | 2 | Admin schedules a message to send at a future date/time |
| SMS notifications | 6 | Twilio SMS for urgent notices (capital calls, signature deadlines) |
