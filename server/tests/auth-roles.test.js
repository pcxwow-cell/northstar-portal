/**
 * Role-based access control tests — INVESTOR vs ADMIN permissions.
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

describe("INVESTOR cannot access admin routes", () => {
  it("INVESTOR cannot access admin dashboard — returns 403", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("INVESTOR cannot invite investors — returns 403", async () => {
    const res = await request(app)
      .post("/api/v1/admin/investors/invite")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({
        name: "Hacker Attempt",
        email: "hacker@test.com",
      });

    expect(res.status).toBe(403);
  });

  it("INVESTOR cannot upload documents — returns 403", async () => {
    const res = await request(app)
      .post("/api/v1/documents/upload")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .field("name", "Malicious Doc")
      .field("category", "Reporting");

    expect(res.status).toBe(403);
  });

  it("INVESTOR cannot create signature requests — returns 403", async () => {
    const res = await request(app)
      .post("/api/v1/signatures/request")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({
        documentId: seed.doc1.id,
        signerIds: [seed.investorB.id],
      });

    expect(res.status).toBe(403);
  });

  it("INVESTOR cannot list admin investors — returns 403", async () => {
    const res = await request(app)
      .get("/api/v1/admin/investors")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("INVESTOR cannot access admin projects — returns 403", async () => {
    const res = await request(app)
      .get("/api/v1/admin/projects")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("INVESTOR cannot access audit log — returns 403", async () => {
    const res = await request(app)
      .get("/api/v1/admin/audit-log")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });
});

describe("ADMIN can access admin routes", () => {
  it("ADMIN can access admin dashboard", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.projectCount).toBeDefined();
    expect(res.body.investorCount).toBeDefined();
  });

  it("ADMIN can invite investors", async () => {
    const res = await request(app)
      .post("/api/v1/admin/investors/invite")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        name: "New Investor",
        email: "new-investor@test.com",
      });

    expect(res.status).toBe(201);
    expect(res.body.tempPassword).toBeDefined();
  });

  it("ADMIN can upload documents", async () => {
    const res = await request(app)
      .post("/api/v1/documents/upload")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .field("name", "Test Upload")
      .field("category", "Reporting")
      .attach("file", Buffer.from("fake pdf content"), "test.pdf");

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Upload");
  });

  it("ADMIN can list admin investors", async () => {
    const res = await request(app)
      .get("/api/v1/admin/investors")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("ADMIN can access audit log", async () => {
    const res = await request(app)
      .get("/api/v1/admin/audit-log")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
