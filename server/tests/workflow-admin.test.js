/**
 * Workflow tests — Admin endpoint end-to-end flows.
 *
 * Tests admin-only operations:
 *   List investors → View project details → Upload document →
 *   View audit log → Create/manage investor groups →
 *   Investor role is denied access (403)
 */

const path = require("path");
const request = require("supertest");
const { app } = require("./setup");
const { seedTestUsers, cleanTestDB } = require("./helpers");

let seed;

beforeAll(async () => {
  await cleanTestDB();
  seed = await seedTestUsers();
});

afterAll(async () => {
  await cleanTestDB();
});

// ─── 1. Admin can list all investors ───

describe("Admin Workflow: List investors", () => {
  it("admin can list all investors", async () => {
    const res = await request(app)
      .get("/api/v1/admin/investors")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    const names = res.body.map((i) => i.name);
    expect(names).toContain("Investor A");
    expect(names).toContain("Investor B");
  });

  it("admin can search investors by name", async () => {
    const res = await request(app)
      .get("/api/v1/admin/investors?search=Investor A")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Investor A");
  });

  it("admin can filter investors by project", async () => {
    const res = await request(app)
      .get(`/api/v1/admin/investors?projectId=${seed.project1.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Investor A");
  });

  it("investor list includes project and financial details", async () => {
    const res = await request(app)
      .get("/api/v1/admin/investors")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    const investorA = res.body.find((i) => i.name === "Investor A");
    expect(investorA.email).toBe("investor-a@test.com");
    expect(investorA.totalCommitted).toBe(100000);
    expect(investorA.projects.length).toBeGreaterThanOrEqual(1);
    expect(investorA.projects[0].projectName).toBe("Test Project 1");
  });
});

// ─── 2. Admin can view project details ───

describe("Admin Workflow: View project details", () => {
  it("admin can list all projects", async () => {
    const res = await request(app)
      .get("/api/v1/admin/projects")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("admin can view single project detail with investors and docs", async () => {
    const res = await request(app)
      .get(`/api/v1/admin/projects/${seed.project1.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seed.project1.id);
    expect(res.body.name).toBe("Test Project 1");
    expect(res.body.status).toBe("Under Construction");
    expect(res.body.totalRaise).toBe(1000000);

    // Should include investor list
    expect(Array.isArray(res.body.investors)).toBe(true);
    expect(res.body.investors.length).toBeGreaterThanOrEqual(1);
    expect(res.body.investors[0].name).toBe("Investor A");

    // Should include documents
    expect(Array.isArray(res.body.documents)).toBe(true);

    // Should include waterfall tiers
    expect(res.body.waterfall).toBeDefined();
    expect(Array.isArray(res.body.waterfall.tiers)).toBe(true);
  });

  it("returns 404 for non-existent project", async () => {
    const res = await request(app)
      .get("/api/v1/admin/projects/99999")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(404);
  });
});

// ─── 3. Admin can upload a document (multipart form) ───

describe("Admin Workflow: Upload document", () => {
  it("admin can upload a document with multipart form", async () => {
    const res = await request(app)
      .post("/api/v1/documents/upload")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .field("name", "Quarterly Report Q1")
      .field("category", "Reporting")
      .field("projectId", String(seed.project1.id))
      .attach("file", Buffer.from("fake PDF content"), "q1-report.pdf");

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("Quarterly Report Q1");
    expect(res.body.category).toBe("Reporting");
  });

  it("upload fails without a file attachment", async () => {
    const res = await request(app)
      .post("/api/v1/documents/upload")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .field("name", "Missing File Doc")
      .field("category", "Legal");

    expect(res.status).toBe(400);
  });

  it("admin can upload a general document (no projectId)", async () => {
    const res = await request(app)
      .post("/api/v1/documents/upload")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .field("name", "General Legal Notice")
      .field("category", "Legal")
      .attach("file", Buffer.from("legal content"), "legal-notice.pdf");

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("General Legal Notice");
  });
});

// ─── 4. Admin can view audit log ───

describe("Admin Workflow: Audit log", () => {
  it("admin can retrieve the audit log", async () => {
    // First, trigger an auditable action (invite an investor)
    await request(app)
      .post("/api/v1/admin/investors/invite")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        name: "Audit Test Investor",
        email: "audit-test@example.com",
      });

    const res = await request(app)
      .get("/api/v1/admin/audit-log")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    // Each entry should have the expected shape
    const entry = res.body[0];
    expect(entry.id).toBeDefined();
    expect(entry.action).toBeDefined();
    expect(entry.createdAt).toBeDefined();
  });

  it("admin can filter audit log by action", async () => {
    const res = await request(app)
      .get("/api/v1/admin/audit-log?action=investor_invite")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((entry) => {
      expect(entry.action).toBe("investor_invite");
    });
  });

  it("admin can limit audit log results", async () => {
    const res = await request(app)
      .get("/api/v1/admin/audit-log?limit=1")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });
});

// ─── 5. Admin can create/manage investor groups ───

describe("Admin Workflow: Investor groups CRUD", () => {
  let groupId;

  it("admin can create an investor group", async () => {
    const res = await request(app)
      .post("/api/v1/admin/groups")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        name: "VIP Investors",
        description: "High-value investors",
        color: "#FF5733",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("VIP Investors");
    expect(res.body.description).toBe("High-value investors");
    expect(res.body.color).toBe("#FF5733");
    expect(res.body.memberCount).toBe(0);
    groupId = res.body.id;
  });

  it("admin can list all groups", async () => {
    const res = await request(app)
      .get("/api/v1/admin/groups")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const group = res.body.find((g) => g.id === groupId);
    expect(group).toBeDefined();
    expect(group.name).toBe("VIP Investors");
  });

  it("admin can add members to a group", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({ userIds: [seed.investorA.id, seed.investorB.id] });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.added).toBe(2);
  });

  it("admin can view group detail with members", async () => {
    const res = await request(app)
      .get(`/api/v1/admin/groups/${groupId}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("VIP Investors");
    expect(res.body.members.length).toBe(2);

    const memberNames = res.body.members.map((m) => m.name);
    expect(memberNames).toContain("Investor A");
    expect(memberNames).toContain("Investor B");
  });

  it("admin can update a group", async () => {
    const res = await request(app)
      .put(`/api/v1/admin/groups/${groupId}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({ name: "Premium Investors", description: "Updated description" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Premium Investors");
  });

  it("admin can remove a member from a group", async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/groups/${groupId}/members/${seed.investorB.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify member was removed
    const detail = await request(app)
      .get(`/api/v1/admin/groups/${groupId}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(detail.body.members.length).toBe(1);
    expect(detail.body.members[0].name).toBe("Investor A");
  });

  it("admin can delete a group", async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/groups/${groupId}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify group is gone
    const list = await request(app)
      .get("/api/v1/admin/groups")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    const deleted = list.body.find((g) => g.id === groupId);
    expect(deleted).toBeUndefined();
  });

  it("create group fails without a name", async () => {
    const res = await request(app)
      .post("/api/v1/admin/groups")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({ description: "No name group" });

    expect(res.status).toBe(400);
  });
});

// ─── 6. Investor cannot access admin endpoints (403) ───

describe("Admin Workflow: Investor role denied (403)", () => {
  it("investor cannot list investors", async () => {
    const res = await request(app)
      .get("/api/v1/admin/investors")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("investor cannot view admin project detail", async () => {
    const res = await request(app)
      .get(`/api/v1/admin/projects/${seed.project1.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("investor cannot view audit log", async () => {
    const res = await request(app)
      .get("/api/v1/admin/audit-log")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("investor cannot create investor groups", async () => {
    const res = await request(app)
      .post("/api/v1/admin/groups")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({ name: "Unauthorized Group" });

    expect(res.status).toBe(403);
  });

  it("investor cannot list admin projects", async () => {
    const res = await request(app)
      .get("/api/v1/admin/projects")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("investor cannot access admin dashboard", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("investor cannot upload documents", async () => {
    const res = await request(app)
      .post("/api/v1/documents/upload")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .field("name", "Unauthorized Upload")
      .field("category", "Legal")
      .attach("file", Buffer.from("hacker content"), "hack.pdf");

    expect(res.status).toBe(403);
  });

  it("unauthenticated request is rejected", async () => {
    const res = await request(app).get("/api/v1/admin/investors");

    expect(res.status).toBe(401);
  });
});
