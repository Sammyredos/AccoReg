-- Add platoon leader email field to PlatoonAllocation table
ALTER TABLE "PlatoonAllocation" ADD COLUMN "leaderEmail" TEXT;

-- Update existing platoons to have a placeholder email (can be updated later)
UPDATE "PlatoonAllocation" SET "leaderEmail" = 'leader@example.com' WHERE "leaderEmail" IS NULL;

-- Make the field required after setting default values
ALTER TABLE "PlatoonAllocation" ALTER COLUMN "leaderEmail" SET NOT NULL;
