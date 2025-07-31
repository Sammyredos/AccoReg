-- CreateTable
CREATE TABLE "platoon_allocations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "leaderPhone" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platoon_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platoon_participants" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "platoonId" TEXT NOT NULL,
    "allocatedBy" TEXT,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platoon_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platoon_allocations_name_key" ON "platoon_allocations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platoon_allocations_label_key" ON "platoon_allocations"("label");

-- CreateIndex
CREATE INDEX "platoon_allocations_name_idx" ON "platoon_allocations"("name");

-- CreateIndex
CREATE INDEX "platoon_allocations_label_idx" ON "platoon_allocations"("label");

-- CreateIndex
CREATE INDEX "platoon_allocations_createdAt_idx" ON "platoon_allocations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platoon_participants_registrationId_key" ON "platoon_participants"("registrationId");

-- CreateIndex
CREATE INDEX "platoon_participants_registrationId_idx" ON "platoon_participants"("registrationId");

-- CreateIndex
CREATE INDEX "platoon_participants_platoonId_idx" ON "platoon_participants"("platoonId");

-- CreateIndex
CREATE INDEX "platoon_participants_allocatedAt_idx" ON "platoon_participants"("allocatedAt");

-- AddForeignKey
ALTER TABLE "platoon_participants" ADD CONSTRAINT "platoon_participants_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platoon_participants" ADD CONSTRAINT "platoon_participants_platoonId_fkey" FOREIGN KEY ("platoonId") REFERENCES "platoon_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
