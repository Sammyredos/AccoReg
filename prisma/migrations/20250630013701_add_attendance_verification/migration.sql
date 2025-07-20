-- PostgreSQL compatible migration for attendance verification
-- Add new columns to registrations table
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP;
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "attendanceMarked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "attendanceTime" TIMESTAMP;

-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP;

-- Create unique index for phoneNumber if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "users_phoneNumber_key" ON "users"("phoneNumber");
