/**
 * IDOR tests for threaded messaging — access control enforcement.
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

describe("Thread access control", () => {
  it("Investor A CAN read a thread targeted to ALL", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${seed.threadAll.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.subject).toBe("Announcement to all");
  });

  it("Investor A CAN read a thread where they are a recipient (INDIVIDUAL)", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${seed.threadPrivate.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.subject).toBe("Private to Investor A");
  });

  it("Investor A CANNOT read a thread targeted INDIVIDUALLY to Investor B", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${seed.threadPrivateB.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(403);
  });

  it("Investor A CANNOT reply to a thread they do not have access to", async () => {
    const res = await request(app)
      .post(`/api/v1/threads/${seed.threadPrivateB.id}/reply`)
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({ body: "Trying to snoop" });

    expect(res.status).toBe(403);
  });

  it("Admin CAN read any thread", async () => {
    // Admin reads private thread for Investor A
    const res1 = await request(app)
      .get(`/api/v1/threads/${seed.threadPrivate.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);
    expect(res1.status).toBe(200);

    // Admin reads private thread for Investor B
    const res2 = await request(app)
      .get(`/api/v1/threads/${seed.threadPrivateB.id}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);
    expect(res2.status).toBe(200);
  });

  it("Admin CAN reply to any thread", async () => {
    const res = await request(app)
      .post(`/api/v1/threads/${seed.threadPrivateB.id}/reply`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({ body: "Admin reply" });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe("Admin reply");
  });

  it("Investor A CAN read a thread targeted to their PROJECT", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${seed.threadProject.id}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.subject).toBe("Project 1 investors only");
  });

  it("Investor B CANNOT read a thread targeted to a PROJECT they are not in", async () => {
    // threadProject is targeted to project1, investor B is only in project2
    const res = await request(app)
      .get(`/api/v1/threads/${seed.threadProject.id}`)
      .set("Authorization", `Bearer ${seed.tokenB}`);

    expect(res.status).toBe(403);
  });
});

describe("Thread listing respects access control", () => {
  it("Investor A thread list includes ALL and their INDIVIDUAL threads but not B's private thread", async () => {
    const res = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    const subjects = res.body.map((t) => t.subject);
    expect(subjects).toContain("Announcement to all");
    expect(subjects).toContain("Private to Investor A");
    expect(subjects).toContain("Project 1 investors only");
    expect(subjects).not.toContain("Private to Investor B");
  });

  it("Investor B thread list includes ALL and their INDIVIDUAL threads but not A's private thread", async () => {
    const res = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenB}`);

    expect(res.status).toBe(200);
    const subjects = res.body.map((t) => t.subject);
    expect(subjects).toContain("Announcement to all");
    expect(subjects).toContain("Private to Investor B");
    expect(subjects).not.toContain("Private to Investor A");
    // B is not in project 1
    expect(subjects).not.toContain("Project 1 investors only");
  });
});
