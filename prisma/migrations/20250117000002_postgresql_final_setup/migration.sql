-- PostgreSQL Final Setup Migration
-- Ensures all tables have proper PostgreSQL configuration

-- Ensure branch field exists in registrations table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registrations' AND column_name = 'branch'
    ) THEN
        ALTER TABLE "registrations" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified';
    END IF;
END $$;

-- Ensure branch field exists in children_registrations table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'children_registrations' AND column_name = 'branch'
    ) THEN
        ALTER TABLE "children_registrations" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified';
    END IF;
END $$;

-- Create indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "registrations_branch_idx" ON "registrations"("branch");
CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" ON "children_registrations"("branch");
CREATE INDEX IF NOT EXISTS "registrations_created_at_idx" ON "registrations"("createdAt");
CREATE INDEX IF NOT EXISTS "registrations_is_verified_idx" ON "registrations"("isVerified");
CREATE INDEX IF NOT EXISTS "registrations_gender_idx" ON "registrations"("gender");

-- Update any existing records with null branch values
UPDATE "registrations" SET "branch" = 'Not Specified' WHERE "branch" IS NULL OR "branch" = '';
UPDATE "children_registrations" SET "branch" = 'Not Specified' WHERE "branch" IS NULL OR "branch" = '';

-- Ensure proper constraints
ALTER TABLE "registrations" ALTER COLUMN "branch" SET NOT NULL;
ALTER TABLE "children_registrations" ALTER COLUMN "branch" SET NOT NULL;
