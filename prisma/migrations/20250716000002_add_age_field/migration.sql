-- AlterTable - Add age field to registrations
ALTER TABLE "registrations" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0;

-- AlterTable - Add age field to children registrations  
ALTER TABLE "children_registrations" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0;

-- Update existing records to calculate age from dateOfBirth
-- This is a one-time calculation for existing records
UPDATE "registrations" SET "age" = 
  CASE 
    WHEN strftime('%m-%d', 'now') >= strftime('%m-%d', "dateOfBirth") 
    THEN CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', "dateOfBirth") AS INTEGER)
    ELSE CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', "dateOfBirth") AS INTEGER) - 1
  END
WHERE "age" = 0;

UPDATE "children_registrations" SET "age" = 
  CASE 
    WHEN strftime('%m-%d', 'now') >= strftime('%m-%d', "dateOfBirth") 
    THEN CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', "dateOfBirth") AS INTEGER)
    ELSE CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', "dateOfBirth") AS INTEGER) - 1
  END
WHERE "age" = 0;
