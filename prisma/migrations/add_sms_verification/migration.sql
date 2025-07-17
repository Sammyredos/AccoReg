-- CreateTable
CREATE TABLE "sms_verifications" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_verifications_pkey" PRIMARY KEY ("id")
);

-- Add phone number fields to users table
ALTER TABLE "users" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "users" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- Create index for SMS verifications lookup
CREATE INDEX "sms_verifications_phoneNumber_idx" ON "sms_verifications"("phoneNumber");
CREATE INDEX "sms_verifications_expiresAt_idx" ON "sms_verifications"("expiresAt");
