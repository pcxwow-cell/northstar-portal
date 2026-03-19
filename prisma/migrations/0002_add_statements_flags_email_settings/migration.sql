-- CreateTable: statements (capital account statements with approval workflow)
CREATE TABLE IF NOT EXISTS "statements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "data" TEXT,
    "html" TEXT,
    "period" TEXT,
    "created_by" INTEGER,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: feature_flag_overrides (persisted per-user flag overrides)
CREATE TABLE IF NOT EXISTS "feature_flag_overrides" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "flag_key" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable: email_settings (singleton admin email configuration)
CREATE TABLE IF NOT EXISTS "email_settings" (
    "id" SERIAL NOT NULL,
    "enable_documents" BOOLEAN NOT NULL DEFAULT true,
    "enable_signatures" BOOLEAN NOT NULL DEFAULT true,
    "enable_distributions" BOOLEAN NOT NULL DEFAULT true,
    "enable_messages" BOOLEAN NOT NULL DEFAULT true,
    "enable_capital_calls" BOOLEAN NOT NULL DEFAULT true,
    "enable_welcome" BOOLEAN NOT NULL DEFAULT true,
    "enable_password_reset" BOOLEAN NOT NULL DEFAULT true,
    "from_name" TEXT,
    "from_address" TEXT,
    "reply_to_address" TEXT,
    "brand_color" TEXT,
    "company_name" TEXT,
    "company_address" TEXT,
    "logo_url" TEXT,
    "portal_url" TEXT,
    "subject_welcome" TEXT,
    "subject_document" TEXT,
    "subject_signature" TEXT,
    "subject_distribution" TEXT,
    "subject_message" TEXT,
    "subject_capital_call" TEXT,
    "subject_password_reset" TEXT,
    "footer_text" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

-- AddColumn: photo_url to project_updates
ALTER TABLE "project_updates" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;

-- AddColumn: permissions to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" TEXT;

-- CreateIndex: statements
CREATE INDEX IF NOT EXISTS "statements_user_id_idx" ON "statements"("user_id");
CREATE INDEX IF NOT EXISTS "statements_project_id_idx" ON "statements"("project_id");
CREATE INDEX IF NOT EXISTS "statements_status_idx" ON "statements"("status");

-- CreateIndex: feature_flag_overrides
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flag_overrides_user_id_flag_key_key" ON "feature_flag_overrides"("user_id", "flag_key");
CREATE INDEX IF NOT EXISTS "feature_flag_overrides_user_id_idx" ON "feature_flag_overrides"("user_id");

-- AddForeignKey: statements
ALTER TABLE "statements" ADD CONSTRAINT "statements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "statements" ADD CONSTRAINT "statements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "statements" ADD CONSTRAINT "statements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "statements" ADD CONSTRAINT "statements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "statements" ADD CONSTRAINT "statements_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: feature_flag_overrides
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
