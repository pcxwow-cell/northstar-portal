-- Add missing columns to users table (accreditation tracking)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accreditation_status" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accreditation_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accreditation_expiry" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accreditation_type" TEXT;

-- Add missing column to projects table (hero image)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "image_url" TEXT;

-- Add missing columns to prospects table (CRM fields)
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "lead_source" TEXT;
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "follow_up_date" TIMESTAMP(3);
