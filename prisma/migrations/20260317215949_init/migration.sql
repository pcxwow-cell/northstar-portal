-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "initials" TEXT,
    "role" TEXT NOT NULL DEFAULT 'INVESTOR',
    "joined" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "sqft" TEXT,
    "units" INTEGER,
    "completion_pct" INTEGER NOT NULL DEFAULT 0,
    "total_raise" REAL NOT NULL DEFAULT 0,
    "pref_return_pct" REAL NOT NULL DEFAULT 8.0,
    "gp_catchup_pct" REAL NOT NULL DEFAULT 100,
    "carry_pct" REAL NOT NULL DEFAULT 20,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "investor_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "committed" REAL NOT NULL DEFAULT 0,
    "called" REAL NOT NULL DEFAULT 0,
    "current_value" REAL NOT NULL DEFAULT 0,
    "irr" REAL,
    "moic" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "investor_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "investor_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cap_table_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "holder_name" TEXT NOT NULL,
    "holder_type" TEXT NOT NULL,
    "committed" REAL NOT NULL DEFAULT 0,
    "called" REAL NOT NULL DEFAULT 0,
    "ownership_pct" REAL NOT NULL,
    "unfunded" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cap_table_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "waterfall_tiers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "tier_order" INTEGER NOT NULL,
    "tier_name" TEXT NOT NULL,
    "lp_share" TEXT NOT NULL,
    "gp_share" TEXT NOT NULL,
    "threshold" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waterfall_tiers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "distributions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "quarter" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "distributions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "file" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_updates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "performance_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "benchmark" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sender_id" INTEGER NOT NULL,
    "from_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview" TEXT NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "investor_projects_user_id_project_id_key" ON "investor_projects"("user_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "waterfall_tiers_project_id_tier_order_key" ON "waterfall_tiers"("project_id", "tier_order");
