-- Add platoon leader email field to platoon_allocations table
ALTER TABLE "platoon_allocations" ADD COLUMN "leaderEmail" TEXT;

-- Update existing platoons to have a placeholder email (can be updated later)
UPDATE "platoon_allocations" SET "leaderEmail" = 'leader@example.com' WHERE "leaderEmail" IS NULL;

-- Make the field required after setting default values
ALTER TABLE "platoon_allocations" ALTER COLUMN "leaderEmail" SET NOT NULL;
