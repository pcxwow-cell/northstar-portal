-- CreateTable
CREATE TABLE "message_threads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject" TEXT NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "target_type" TEXT NOT NULL DEFAULT 'ALL',
    "target_project_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "message_threads_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "message_threads_target_project_id_fkey" FOREIGN KEY ("target_project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "thread_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "thread_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "thread_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "thread_recipients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "thread_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "thread_recipients_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "thread_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "thread_recipients_thread_id_user_id_key" ON "thread_recipients"("thread_id", "user_id");
