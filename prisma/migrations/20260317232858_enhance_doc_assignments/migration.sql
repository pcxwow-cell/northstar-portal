-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_document_assignments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "document_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "viewed_at" DATETIME,
    "downloaded_at" DATETIME,
    "acknowledged_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_assignments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_document_assignments" ("document_id", "id", "user_id") SELECT "document_id", "id", "user_id" FROM "document_assignments";
DROP TABLE "document_assignments";
ALTER TABLE "new_document_assignments" RENAME TO "document_assignments";
CREATE UNIQUE INDEX "document_assignments_document_id_user_id_key" ON "document_assignments"("document_id", "user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
