/*
  Warnings:

  - You are about to alter the column `createdAt` on the `sms_verifications` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `expiresAt` on the `sms_verifications` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `sms_verifications` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `phoneVerifiedAt` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
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
    "parentalPermissionDate" DATETIME,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "verifiedBy" TEXT,
    "qrCode" TEXT,
    "attendanceMarked" BOOLEAN NOT NULL DEFAULT false,
    "attendanceTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_registrations" ("address", "allergies", "createdAt", "dateOfBirth", "dietaryRestrictions", "emailAddress", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship", "fullName", "gender", "id", "medications", "parentGuardianEmail", "parentGuardianName", "parentGuardianPhone", "parentalPermissionDate", "parentalPermissionGranted", "phoneNumber", "roommateRequestConfirmationNumber", "specialNeeds", "updatedAt") SELECT "address", "allergies", "createdAt", "dateOfBirth", "dietaryRestrictions", "emailAddress", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship", "fullName", "gender", "id", "medications", "parentGuardianEmail", "parentGuardianName", "parentGuardianPhone", "parentalPermissionDate", "parentalPermissionGranted", "phoneNumber", "roommateRequestConfirmationNumber", "specialNeeds", "updatedAt" FROM "registrations";
DROP TABLE "registrations";
ALTER TABLE "new_registrations" RENAME TO "registrations";
CREATE TABLE "new_sms_verifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_sms_verifications" ("attempts", "code", "createdAt", "expiresAt", "id", "phoneNumber", "updatedAt", "verified") SELECT "attempts", "code", "createdAt", "expiresAt", "id", "phoneNumber", "updatedAt", "verified" FROM "sms_verifications";
DROP TABLE "sms_verifications";
ALTER TABLE "new_sms_verifications" RENAME TO "sms_verifications";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifiedAt" DATETIME,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_users" ("createdAt", "createdBy", "email", "id", "isActive", "lastLogin", "name", "password", "phoneNumber", "phoneVerified", "phoneVerifiedAt", "roleId", "updatedAt") SELECT "createdAt", "createdBy", "email", "id", "isActive", "lastLogin", "name", "password", "phoneNumber", "phoneVerified", "phoneVerifiedAt", "roleId", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
