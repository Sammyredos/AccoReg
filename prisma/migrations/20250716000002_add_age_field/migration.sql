-- AlterTable - Add age field to registrations
ALTER TABLE "registrations" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0;

-- AlterTable - Add age field to children registrations  
ALTER TABLE "children_registrations" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0;

-- Update existing records to calculate age from dateOfBirth (PostgreSQL syntax)
-- This is a one-time calculation for existing records
UPDATE "registrations" SET "age" =
  CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) > EXTRACT(MONTH FROM "dateOfBirth")
         OR (EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM "dateOfBirth")
             AND EXTRACT(DAY FROM CURRENT_DATE) >= EXTRACT(DAY FROM "dateOfBirth"))
    THEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth")
    ELSE EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth") - 1
  END
WHERE "age" = 0;

UPDATE "children_registrations" SET "age" =
  CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) > EXTRACT(MONTH FROM "dateOfBirth")
         OR (EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM "dateOfBirth")
             AND EXTRACT(DAY FROM CURRENT_DATE) >= EXTRACT(DAY FROM "dateOfBirth"))
    THEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth")
    ELSE EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth") - 1
  END
WHERE "age" = 0;
