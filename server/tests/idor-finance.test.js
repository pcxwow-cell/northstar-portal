/**
 * IDOR tests for finance routes — capital accounts and cash flows.
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

describe("Capital account access control", () => {
  it("Investor A CAN access their own capital account", async () => {
    const res = await request(app)
      .get(
        `/api/v1/finance/capital-account/${seed.investorA.id}/${seed.project1.id}`
      )
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.committed).toBeDefined();
  });

  it("Investor A CANNOT access Investor B capital account — returns 403", async () => {
    const res = await request(app)
      .get(
        `/api/v1/finance/capital-account/${seed.investorB.id}/${seed.project2.id}`
      )
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("Admin CAN access any investor capital account", async () => {
    const res = await request(app)
      .get(
        `/api/v1/finance/capital-account/${seed.investorA.id}/${seed.project1.id}`
      )
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
  });
});

describe("Cash flows access control", () => {
  it("Investor A CAN access their own cash flows", async () => {
    const res = await request(app)
      .get(
        `/api/v1/finance/cashflows/${seed.investorA.id}/${seed.project1.id}`
      )
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("Investor A CANNOT access Investor B cash flows — returns 403", async () => {
    const res = await request(app)
      .get(
        `/api/v1/finance/cashflows/${seed.investorB.id}/${seed.project2.id}`
      )
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("Admin CAN access any investor cash flows", async () => {
    const res = await request(app)
      .get(
        `/api/v1/finance/cashflows/${seed.investorA.id}/${seed.project1.id}`
      )
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
  });
});

describe("Admin-only cash flow operations", () => {
  it("Only ADMIN can record cash flows (POST)", async () => {
    // Investor attempt
    const resInvestor = await request(app)
      .post("/api/v1/finance/record-cashflow")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({
        userId: seed.investorA.id,
        projectId: seed.project1.id,
        date: "2024-06-01",
        amount: -25000,
        type: "capital_call",
      });
    expect(resInvestor.status).toBe(403);

    // Admin attempt
    const resAdmin = await request(app)
      .post("/api/v1/finance/record-cashflow")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        userId: seed.investorA.id,
        projectId: seed.project1.id,
        date: "2024-06-01",
        amount: -25000,
        type: "capital_call",
      });
    expect(resAdmin.status).toBe(200);
  });

  it("Only ADMIN can edit cash flows (PUT)", async () => {
    const resInvestor = await request(app)
      .put(`/api/v1/finance/cashflows/${seed.cashFlow1.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({ amount: -60000 });
    expect(resInvestor.status).toBe(403);

    const resAdmin = await request(app)
      .put(`/api/v1/finance/cashflows/${seed.cashFlow1.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({ amount: -60000 });
    expect(resAdmin.status).toBe(200);
  });

  it("Only ADMIN can delete cash flows (DELETE)", async () => {
    // Create a throwaway cash flow to delete
    const cf = await request(app)
      .post("/api/v1/finance/record-cashflow")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        userId: seed.investorA.id,
        projectId: seed.project1.id,
        date: "2024-07-01",
        amount: 5000,
        type: "distribution",
      });

    // Investor attempt to delete
    const resInvestor = await request(app)
      .delete(`/api/v1/finance/cashflows/${cf.body.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);
    expect(resInvestor.status).toBe(403);

    // Admin attempt to delete
    const resAdmin = await request(app)
      .delete(`/api/v1/finance/cashflows/${cf.body.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);
    expect(resAdmin.status).toBe(200);
  });

  it("Only ADMIN can trigger recalculation", async () => {
    const resInvestor = await request(app)
      .post(`/api/v1/finance/recalculate/${seed.project1.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);
    expect(resInvestor.status).toBe(403);

    const resAdmin = await request(app)
      .post(`/api/v1/finance/recalculate/${seed.project1.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);
    expect(resAdmin.status).toBe(200);
  });
});
