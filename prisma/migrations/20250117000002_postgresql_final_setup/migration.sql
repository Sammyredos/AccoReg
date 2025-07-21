-- Complete PostgreSQL Schema Migration
-- Creates all tables and indexes for the Youth Registration System

-- Create Admin table
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- Create roles table
CREATE TABLE IF NOT EXISTS "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifiedAt" TIMESTAMP,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS "registrations" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 0,
    "gender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactRelationship" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "parentGuardianName" TEXT,
    "parentGuardianPhone" TEXT,
    "parentGuardianEmail" TEXT,
    "roommateRequestConfirmationNumber" TEXT,
    "medications" TEXT,
    "allergies" TEXT,
    "specialNeeds" TEXT,
    "dietaryRestrictions" TEXT,
    "parentalPermissionGranted" BOOLEAN NOT NULL DEFAULT false,
    "parentalPermissionDate" TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP,
    "verifiedBy" TEXT,
    "unverifiedAt" TIMESTAMP,
    "unverifiedBy" TEXT,
    "qrCode" TEXT,
    "attendanceMarked" BOOLEAN NOT NULL DEFAULT false,
    "attendanceTime" TIMESTAMP,
    "branch" TEXT NOT NULL DEFAULT 'Not Specified',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- Create children_registrations table
CREATE TABLE IF NOT EXISTS "children_registrations" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 0,
    "gender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "parentGuardianName" TEXT NOT NULL,
    "parentGuardianPhone" TEXT NOT NULL,
    "parentGuardianEmail" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactRelationship" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "medications" TEXT,
    "allergies" TEXT,
    "specialNeeds" TEXT,
    "dietaryRestrictions" TEXT,
    "branch" TEXT NOT NULL DEFAULT 'Not Specified',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "children_registrations_pkey" PRIMARY KEY ("id")
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "recipientId" TEXT,
    "metadata" TEXT,
    "authorizedBy" TEXT,
    "authorizedByEmail" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Create settings table
CREATE TABLE IF NOT EXISTS "settings" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "sentAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP,
    "readAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- Create room_allocations table
CREATE TABLE IF NOT EXISTS "room_allocations" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "allocatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedBy" TEXT,
    CONSTRAINT "room_allocations_pkey" PRIMARY KEY ("id")
);

-- Create system_config table
CREATE TABLE IF NOT EXISTS "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- Create sms_verifications table
CREATE TABLE IF NOT EXISTS "sms_verifications" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sms_verifications_pkey" PRIMARY KEY ("id")
);

-- Create permission-role junction table
CREATE TABLE IF NOT EXISTS "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_phoneNumber_key" ON "users"("phoneNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "rooms_name_key" ON "rooms"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "room_allocations_registrationId_key" ON "room_allocations"("registrationId");
CREATE UNIQUE INDEX IF NOT EXISTS "settings_category_key_key" ON "settings"("category", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "system_config_key_key" ON "system_config"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- Create performance indexes
CREATE INDEX IF NOT EXISTS "Admin_isActive_idx" ON "Admin"("isActive");
CREATE INDEX IF NOT EXISTS "Admin_lastLogin_idx" ON "Admin"("lastLogin");
CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive");
CREATE INDEX IF NOT EXISTS "users_lastLogin_idx" ON "users"("lastLogin");
CREATE INDEX IF NOT EXISTS "registrations_branch_idx" ON "registrations"("branch");
CREATE INDEX IF NOT EXISTS "registrations_createdAt_idx" ON "registrations"("createdAt");
CREATE INDEX IF NOT EXISTS "registrations_isVerified_idx" ON "registrations"("isVerified");
CREATE INDEX IF NOT EXISTS "registrations_gender_idx" ON "registrations"("gender");
CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" ON "children_registrations"("branch");
CREATE INDEX IF NOT EXISTS "sms_verifications_phoneNumber_idx" ON "sms_verifications"("phoneNumber");
CREATE INDEX IF NOT EXISTS "sms_verifications_expiresAt_idx" ON "sms_verifications"("expiresAt");
CREATE INDEX IF NOT EXISTS "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- Add foreign key constraints
DO $$
BEGIN
    -- Admin to Role foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Admin_roleId_fkey'
    ) THEN
        ALTER TABLE "Admin" ADD CONSTRAINT "Admin_roleId_fkey"
        FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Users to Role foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_roleId_fkey'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey"
        FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- Room allocations foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'room_allocations_registrationId_fkey'
    ) THEN
        ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_registrationId_fkey"
        FOREIGN KEY ("registrationId") REFERENCES "registrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'room_allocations_roomId_fkey'
    ) THEN
        ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_roomId_fkey"
        FOREIGN KEY ("roomId") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Permission to Role junction table foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = '_PermissionToRole_A_fkey'
    ) THEN
        ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey"
        FOREIGN KEY ("A") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = '_PermissionToRole_B_fkey'
    ) THEN
        ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey"
        FOREIGN KEY ("B") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
