/**
 * Workflow tests — Threaded messaging end-to-end flows.
 *
 * Tests the complete lifecycle:
 *   Admin creates thread → Investor sees it → Investor replies →
 *   Admin sees reply → Mark as read → Verify isolation between investors
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

describe("Messaging Workflow: Admin → Investor thread lifecycle", () => {
  let newThreadId;

  it("admin creates a thread targeted to investor A", async () => {
    const res = await request(app)
      .post("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        subject: "Q1 Distribution Update",
        body: "Your Q1 distribution has been processed.",
        targetType: "INDIVIDUAL",
        recipientIds: [seed.investorA.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.subject).toBe("Q1 Distribution Update");
    newThreadId = res.body.id;
  });

  it("investor A can see the new thread in their inbox", async () => {
    const res = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    const thread = res.body.find((t) => t.id === newThreadId);
    expect(thread).toBeDefined();
    expect(thread.subject).toBe("Q1 Distribution Update");
    expect(thread.unread).toBe(true);
  });

  it("investor B CANNOT see investor A's private thread", async () => {
    const res = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenB}`);

    expect(res.status).toBe(200);
    const thread = res.body.find((t) => t.id === newThreadId);
    expect(thread).toBeUndefined();
  });

  it("investor A can view thread detail", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${newThreadId}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].body).toBe(
      "Your Q1 distribution has been processed."
    );
  });

  it("investor B CANNOT view investor A's thread detail (IDOR protection)", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${newThreadId}`)
      .set("Authorization", `Bearer ${seed.tokenB}`);

    expect(res.status).toBe(403);
  });

  it("investor A replies to the thread", async () => {
    const res = await request(app)
      .post(`/api/v1/threads/${newThreadId}/reply`)
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({ body: "Thank you! When will this hit my account?" });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe(
      "Thank you! When will this hit my account?"
    );
    expect(res.body.sender.name).toBe("Investor A");
  });

  it("investor B CANNOT reply to investor A's thread (IDOR protection)", async () => {
    const res = await request(app)
      .post(`/api/v1/threads/${newThreadId}/reply`)
      .set("Authorization", `Bearer ${seed.tokenB}`)
      .send({ body: "Hacking attempt" });

    expect(res.status).toBe(403);
  });

  it("admin sees the reply in thread detail", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${newThreadId}`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[1].body).toBe(
      "Thank you! When will this hit my account?"
    );
    expect(res.body.messages[1].sender.role).toBe("INVESTOR");
  });

  it("admin replies back to investor", async () => {
    const res = await request(app)
      .post(`/api/v1/threads/${newThreadId}/reply`)
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({ body: "Funds will be deposited within 5 business days." });

    expect(res.status).toBe(201);
  });

  it("thread now has 3 messages in correct order", async () => {
    const res = await request(app)
      .get(`/api/v1/threads/${newThreadId}`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.messages[0].sender.role).toBe("ADMIN");
    expect(res.body.messages[1].sender.role).toBe("INVESTOR");
    expect(res.body.messages[2].sender.role).toBe("ADMIN");
  });

  it("mark as read works for investor A", async () => {
    const res = await request(app)
      .post(`/api/v1/threads/${newThreadId}/read`)
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);

    // Verify unread is now false
    const list = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    const thread = list.body.find((t) => t.id === newThreadId);
    expect(thread.unread).toBe(false);
  });
});

describe("Messaging Workflow: Project-scoped thread", () => {
  let projectThreadId;

  it("admin creates a thread targeted to project 1 investors", async () => {
    const res = await request(app)
      .post("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        subject: "Construction milestone reached",
        body: "Phase 2 framing is complete.",
        targetType: "PROJECT",
        targetProjectId: seed.project1.id,
      });

    expect(res.status).toBe(201);
    projectThreadId = res.body.id;
  });

  it("investor A (in project 1) can see the project thread", async () => {
    const res = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenA}`);

    expect(res.status).toBe(200);
    const thread = res.body.find((t) => t.id === projectThreadId);
    expect(thread).toBeDefined();
  });

  it("investor B (NOT in project 1) cannot see the project thread", async () => {
    const res = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenB}`);

    expect(res.status).toBe(200);
    const thread = res.body.find((t) => t.id === projectThreadId);
    expect(thread).toBeUndefined();
  });
});

describe("Messaging Workflow: Broadcast thread", () => {
  let broadcastId;

  it("admin creates a thread targeted to ALL", async () => {
    const res = await request(app)
      .post("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenAdmin}`)
      .send({
        subject: "Platform maintenance notice",
        body: "Portal will be down Saturday 2-4am PST.",
        targetType: "ALL",
      });

    expect(res.status).toBe(201);
    broadcastId = res.body.id;
  });

  it("both investors can see the broadcast", async () => {
    const resA = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenA}`);
    const resB = await request(app)
      .get("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenB}`);

    expect(resA.body.find((t) => t.id === broadcastId)).toBeDefined();
    expect(resB.body.find((t) => t.id === broadcastId)).toBeDefined();
  });
});

describe("Messaging Workflow: Investor thread creation is restricted", () => {
  it("investor can create a thread but it is force-targeted to STAFF only", async () => {
    const res = await request(app)
      .post("/api/v1/threads")
      .set("Authorization", `Bearer ${seed.tokenA}`)
      .send({
        subject: "Question for staff",
        body: "Can I increase my commitment?",
        targetType: "ALL", // investor tries ALL but gets forced to STAFF
      });

    // Should succeed (201) but be targeted to STAFF, not ALL
    expect(res.status).toBe(201);
    expect(res.body.targetType).toBe("STAFF");
  });
});
