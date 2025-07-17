-- AlterTable - Add branch field to registrations
ALTER TABLE "registrations" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified';

-- AlterTable - Add branch field to children registrations
ALTER TABLE "children_registrations" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified';

-- CreateIndex - Add indexes for performance
CREATE INDEX "registrations_branch_idx" ON "registrations"("branch");
CREATE INDEX "children_registrations_branch_idx" ON "children_registrations"("branch");
