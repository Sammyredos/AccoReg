-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "platoon_email_history" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platoon_email_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'platoon_email_history_platoonId_idx') THEN
        CREATE INDEX "platoon_email_history_platoonId_idx" ON "platoon_email_history"("platoonId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'platoon_email_history_createdAt_idx') THEN
        CREATE INDEX "platoon_email_history_createdAt_idx" ON "platoon_email_history"("createdAt");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'platoon_email_history_sentBy_idx') THEN
        CREATE INDEX "platoon_email_history_sentBy_idx" ON "platoon_email_history"("sentBy");
    END IF;
END $$;

-- AddForeignKey (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'platoon_email_history_platoonId_fkey'
    ) THEN
        ALTER TABLE "platoon_email_history"
        ADD CONSTRAINT "platoon_email_history_platoonId_fkey"
        FOREIGN KEY ("platoonId") REFERENCES "platoon_allocations"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
