-- CreateTable
CREATE TABLE "platoon_email_history" (
    "id" TEXT NOT NULL,
    "platoonId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "emailTarget" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "sentBy" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platoon_email_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platoon_email_history_platoonId_idx" ON "platoon_email_history"("platoonId");

-- CreateIndex
CREATE INDEX "platoon_email_history_createdAt_idx" ON "platoon_email_history"("createdAt");

-- CreateIndex
CREATE INDEX "platoon_email_history_sentBy_idx" ON "platoon_email_history"("sentBy");

-- AddForeignKey
ALTER TABLE "platoon_email_history" ADD CONSTRAINT "platoon_email_history_platoonId_fkey" FOREIGN KEY ("platoonId") REFERENCES "platoon_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
