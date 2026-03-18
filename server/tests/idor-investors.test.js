/**
 * IDOR tests for investor data isolation.
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

describe("Investor profile access", () => {
  it("Investor A CAN fetch their own profile", async () => {
    const res = await request(app)
      .get(`/api/v1/investors/${seed.investorA.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("investor-a@test.com");
  });

  it("Investor A CANNOT fetch Investor B profile — returns 403", async () => {
    const res = await request(app)
      .get(`/api/v1/investors/${seed.investorB.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("Admin CAN fetch any investor profile", async () => {
    const resA = await request(app)
      .get(`/api/v1/investors/${seed.investorA.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);
    expect(resA.status).toBe(200);

    const resB = await request(app)
      .get(`/api/v1/investors/${seed.investorB.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);
    expect(resB.status).toBe(200);
  });
});

describe("Investor projects access", () => {
  it("Investor A CAN fetch their own projects", async () => {
    const res = await request(app)
      .get(`/api/v1/investors/${seed.investorA.id}/projects`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Test Project 1");
  });

  it("Investor A CANNOT fetch Investor B projects — returns 403", async () => {
    const res = await request(app)
      .get(`/api/v1/investors/${seed.investorB.id}/projects`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("Admin CAN fetch any investor projects", async () => {
    const res = await request(app)
      .get(`/api/v1/investors/${seed.investorB.id}/projects`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Test Project 2");
  });
});
