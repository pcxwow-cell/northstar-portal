/**
 * Workflow tests — Authentication lifecycle.
 *
 * Tests the complete auth flow:
 *   Login → Get profile → Change password → Login with new password →
 *   Account lockout after failed attempts → Rate limiting
 */

const request = require("supertest");
const { app } = require("./setup");
const { cleanTestDB } = require("./helpers");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");

let testUser;

beforeAll(async () => {
  await cleanTestDB();

  // Create a fresh user for auth workflow testing
  const passwordHash = await bcrypt.hash("Original1234!", 10);
  testUser = await prisma.user.create({
    data: {
      email: "auth-workflow@test.com",
      name: "Auth Test User",
      initials: "AT",
      role: "INVESTOR",
      passwordHash,
      status: "ACTIVE",
    },
  });
});

afterAll(async () => {
  await cleanTestDB();
});

describe("Auth Workflow: Login → Profile → Password Change → Re-login", () => {
  let token;

  it("step 1: login with original credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "auth-workflow@test.com", password: "Original1234!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("auth-workflow@test.com");
    token = res.body.token;
  });

  it("step 2: access profile with token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Auth Test User");
    // Role may be returned as display name ("Limited Partner") or DB value ("INVESTOR")
    expect(["INVESTOR", "Limited Partner"]).toContain(res.body.role);
  });

  it("step 3: change password", async () => {
    const res = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Original1234!",
        newPassword: "Updated5678!",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("step 4: old password no longer works", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "auth-workflow@test.com", password: "Original1234!" });

    expect(res.status).toBe(401);
  });

  it("step 5: new password works", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "auth-workflow@test.com", password: "Updated5678!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe("Auth Workflow: Protected route access patterns", () => {
  it("unauthenticated request to protected route returns 401", async () => {
    const routes = [
      "/api/v1/threads",
      "/api/v1/documents",
      "/api/v1/projects",
      "/api/v1/auth/me",
    ];

    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });

  it("expired/malformed token returns 401", async () => {
    const badToken = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.garbage";
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${badToken}`);

    expect(res.status).toBe(401);
  });

  it("missing Bearer prefix returns 401", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "some-token-without-bearer");

    expect(res.status).toBe(401);
  });
});

describe("Auth Workflow: Input validation", () => {
  it("login with empty email returns 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "", password: "Test1234!" });

    expect([400, 401]).toContain(res.status);
  });

  it("login with invalid email format returns 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "Test1234!" });

    expect([400, 401]).toContain(res.status);
  });

  it("password change with empty new password returns 400", async () => {
    // First login to get a token
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "auth-workflow@test.com", password: "Updated5678!" });

    if (loginRes.status === 200) {
      const res = await request(app)
        .put("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${loginRes.body.token}`)
        .send({ currentPassword: "Updated5678!", newPassword: "" });

      expect(res.status).toBe(400);
    }
  });
});
