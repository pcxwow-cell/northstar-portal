/**
 * IDOR tests for document access control.
 */

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

describe("Document listing access control", () => {
  it("Investor A CAN see documents for their project (project 1)", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    const names = res.body.map((d) => d.name);
    expect(names).toContain("Project 1 Report");
  });

  it("Investor A CANNOT see documents for project 2 (not assigned)", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    const names = res.body.map((d) => d.name);
    expect(names).not.toContain("Project 2 Report");
  });

  it("Investor A CAN see general documents (projectId = null)", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    const names = res.body.map((d) => d.name);
    expect(names).toContain("General Doc");
  });

  it("Investor A query param investorId is forced to own ID (IDOR prevention)", async () => {
    // Try to pass investorB's ID as query param
    const res = await request(app)
      .get(`/api/v1/documents?investorId=${seed.investorB.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    // Should still only see investor A's docs, not investor B's
    const names = res.body.map((d) => d.name);
    expect(names).toContain("Project 1 Report");
    expect(names).not.toContain("Project 2 Report");
  });

  it("Admin CAN see all documents", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    const names = res.body.map((d) => d.name);
    expect(names).toContain("Project 1 Report");
    expect(names).toContain("Project 2 Report");
    expect(names).toContain("General Doc");
  });
});

describe("Document download access control", () => {
  it("Investor A CAN download a document from their project", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${seed.doc1.id}/download`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    // 404 is expected since the file doesn't actually exist on disk,
    // but it should NOT be 403 — access is allowed
    expect(res.status).not.toBe(403);
  });

  it("Investor A CANNOT download a document from project 2 — returns 403", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${seed.doc2.id}/download`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("Investor A CAN download a general document", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${seed.docGeneral.id}/download`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    // Not 403 — access is allowed (file may not exist on disk)
    expect(res.status).not.toBe(403);
  });

  it("Admin CAN download any document", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${seed.doc2.id}/download`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    // Should not be 403
    expect(res.status).not.toBe(403);
  });
});
