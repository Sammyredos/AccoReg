-- Add unverification tracking fields to registrations table
ALTER TABLE "registrations" ADD COLUMN "unverifiedAt" TIMESTAMP;
ALTER TABLE "registrations" ADD COLUMN "unverifiedBy" TEXT;
