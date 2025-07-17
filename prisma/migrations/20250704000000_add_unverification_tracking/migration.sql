-- Add unverification tracking fields to registrations table
ALTER TABLE "registrations" ADD COLUMN "unverifiedAt" DATETIME;
ALTER TABLE "registrations" ADD COLUMN "unverifiedBy" TEXT;
