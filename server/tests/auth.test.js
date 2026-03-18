/**
 * Authentication tests — login, token validation, password change.
 *
 * Note: The auth route has a rate limiter (10 req/min per IP).
 * Tests are ordered carefully to stay within this limit since
 * supertest uses the same IP for all requests.
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

describe("POST /api/v1/auth/login", () => {
  it("returns JWT token with valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "investor-a@test.com", password: "Test1234!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("investor-a@test.com");
  });

  it("returns 401 with wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "investor-a@test.com", password: "WrongPassword1!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 401 with non-existent email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@test.com", password: "Test1234!" });

    expect(res.status).toBe(401);
  });

  it("returns 400 with missing fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "investor-a@test.com" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns user profile with valid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("investor-a@test.com");
    expect(res.body.id).toBe(seed.investorA.id);
  });

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid or expired token", async () => {
    // Malformed JWT with wrong secret
    const fakeToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwicm9sZSI6IklOVkVTVE9SIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid";
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/v1/auth/change-password", () => {
  it("fails with wrong current password", async () => {
    const res = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({ currentPassword: "WrongPass1!", newPassword: "NewPass1234!" });

    expect(res.status).toBe(401);
  });

  it("fails with weak new password", async () => {
    const res = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${seed.tokenB}`)
      .send({ currentPassword: "Test1234!", newPassword: "weak" });

    expect(res.status).toBe(400);
  });

  it("succeeds with correct current password", async () => {
    const res = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${seed.tokenB}`)
      .send({ currentPassword: "Test1234!", newPassword: "NewPass1234!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
