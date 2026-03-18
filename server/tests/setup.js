/**
 * Test setup — configures environment for test database,
 * pushes schema, and provides shared lifecycle hooks.
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Point to test database before any imports touch Prisma
const testDbPath = path.resolve(__dirname, "../../prisma/test.db");
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.JWT_SECRET = "test-secret-key-for-automated-tests";
process.env.NODE_ENV = "test";

// Push schema to test DB (creates tables without migration history)
execSync("npx prisma db push --skip-generate --accept-data-loss", {
  cwd: path.resolve(__dirname, ".."),
  env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
  stdio: "pipe",
});

// Now require the app (after env is set)
const app = require("../index");

module.exports = { app, testDbPath };
