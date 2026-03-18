/**
 * Test helpers — seed data and cleanup utilities.
 */

const bcrypt = require("bcryptjs");

// Import prisma AFTER setup.js has set DATABASE_URL
const prisma = require("../prisma");
const { signToken } = require("../middleware/auth");

/**
 * Seed minimal test data: 2 investors, 1 admin, 2 projects,
 * project assignments, documents, threads, cash flows.
 * Returns all created records plus JWT tokens.
 */
async function seedTestUsers() {
  const passwordHash = await bcrypt.hash("Test1234!", 10);
  const adminHash = await bcrypt.hash("Admin1234!", 10);

  const investorA = await prisma.user.create({
    data: {
      email: "investor-a@test.com",
      name: "Investor A",
      initials: "IA",
      role: "INVESTOR",
      passwordHash,
      status: "ACTIVE",
    },
  });

  const investorB = await prisma.user.create({
    data: {
      email: "investor-b@test.com",
      name: "Investor B",
      initials: "IB",
      role: "INVESTOR",
      passwordHash,
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      name: "Admin User",
      initials: "AD",
      role: "ADMIN",
      passwordHash: adminHash,
      status: "ACTIVE",
    },
  });

  // Projects
  const project1 = await prisma.project.create({
    data: {
      name: "Test Project 1",
      status: "Under Construction",
      totalRaise: 1000000,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Test Project 2",
      status: "Pre-Development",
      totalRaise: 500000,
    },
  });

  // Investor A → project 1 only
  await prisma.investorProject.create({
    data: {
      userId: investorA.id,
      projectId: project1.id,
      committed: 100000,
      called: 50000,
      currentValue: 55000,
    },
  });

  // Investor B → project 2 only
  await prisma.investorProject.create({
    data: {
      userId: investorB.id,
      projectId: project2.id,
      committed: 200000,
      called: 100000,
      currentValue: 110000,
    },
  });

  // Documents
  const doc1 = await prisma.document.create({
    data: {
      name: "Project 1 Report",
      category: "Reporting",
      date: "Jan 1, 2025",
      size: "1 MB",
      file: "/docs/test1.pdf",
      projectId: project1.id,
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      name: "Project 2 Report",
      category: "Reporting",
      date: "Jan 1, 2025",
      size: "1 MB",
      file: "/docs/test2.pdf",
      projectId: project2.id,
    },
  });

  const docGeneral = await prisma.document.create({
    data: {
      name: "General Doc",
      category: "Legal",
      date: "Jan 1, 2025",
      size: "500 KB",
      file: "/docs/general.pdf",
    },
  });

  // Thread: private to investor A (INDIVIDUAL targeting)
  const threadPrivate = await prisma.messageThread.create({
    data: {
      subject: "Private to Investor A",
      creatorId: admin.id,
      targetType: "INDIVIDUAL",
      messages: {
        create: {
          senderId: admin.id,
          body: "Confidential message for A only",
        },
      },
      recipients: {
        create: [{ userId: investorA.id }, { userId: admin.id }],
      },
    },
  });

  // Thread: targeted to ALL
  const threadAll = await prisma.messageThread.create({
    data: {
      subject: "Announcement to all",
      creatorId: admin.id,
      targetType: "ALL",
      messages: {
        create: { senderId: admin.id, body: "Hello everyone" },
      },
      recipients: {
        create: [
          { userId: investorA.id },
          { userId: investorB.id },
          { userId: admin.id },
        ],
      },
    },
  });

  // Thread: targeted to PROJECT 1 only
  const threadProject = await prisma.messageThread.create({
    data: {
      subject: "Project 1 investors only",
      creatorId: admin.id,
      targetType: "PROJECT",
      targetProjectId: project1.id,
      messages: {
        create: { senderId: admin.id, body: "Project 1 update" },
      },
      recipients: {
        create: [{ userId: investorA.id }, { userId: admin.id }],
      },
    },
  });

  // Thread: private to investor B (INDIVIDUAL targeting)
  const threadPrivateB = await prisma.messageThread.create({
    data: {
      subject: "Private to Investor B",
      creatorId: admin.id,
      targetType: "INDIVIDUAL",
      messages: {
        create: {
          senderId: admin.id,
          body: "Confidential message for B only",
        },
      },
      recipients: {
        create: [{ userId: investorB.id }, { userId: admin.id }],
      },
    },
  });

  // Cash flows for investor A on project 1
  const cashFlow1 = await prisma.cashFlow.create({
    data: {
      projectId: project1.id,
      userId: investorA.id,
      date: new Date("2024-01-01"),
      amount: -50000,
      type: "capital_call",
    },
  });

  // Generate JWT tokens
  const tokenA = signToken(investorA);
  const tokenB = signToken(investorB);
  const tokenAdmin = signToken(admin);

  return {
    investorA,
    investorB,
    admin,
    project1,
    project2,
    doc1,
    doc2,
    docGeneral,
    threadPrivate,
    threadAll,
    threadProject,
    threadPrivateB,
    cashFlow1,
    tokenA,
    tokenB,
    tokenAdmin,
  };
}

/**
 * Delete all data from the test database in reverse dependency order.
 */
async function cleanTestDB() {
  const modelNames = [
    "threadRecipient",
    "threadMessage",
    "messageThread",
    "messageRecipient",
    "message",
    "documentAssignment",
    "document",
    "cashFlow",
    "distribution",
    "investorProject",
    "capTableEntry",
    "waterfallTier",
    "projectUpdate",
    "performanceHistory",
    "signatureSigner",
    "signatureRequest",
    "notificationLog",
    "notificationPreference",
    "loginHistory",
    "auditLog",
    "groupMember",
    "investorGroup",
    "investorEntity",
    "prospect",
    "user",
    "project",
  ];

  for (const model of modelNames) {
    try {
      await prisma[model].deleteMany();
    } catch (e) {
      // Model may not exist or have no records — ignore
    }
  }
}

module.exports = { seedTestUsers, cleanTestDB };
