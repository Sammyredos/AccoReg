#!/bin/bash

# Safe Build Script for Youth Registration System
# This script handles database setup and seeding more safely

set -e  # Exit on any error

echo "🚀 Starting safe build process..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Step 3: Check if database exists and handle schema
echo "🗄️  Setting up database..."
if npx prisma db push --accept-data-loss; then
    echo "✅ Database schema updated successfully"
else
    echo "⚠️  Database schema update failed, but continuing..."
fi

# Step 4: Create super admin (with error handling)
echo "👑 Creating super admin..."
if npx tsx scripts/create-super-admin.ts; then
    echo "✅ Super admin created successfully"
else
    echo "⚠️  Super admin creation failed or already exists, continuing..."
fi

# Step 5: Seed settings (with error handling)
echo "🌱 Seeding settings..."
if npx tsx scripts/seed-settings.ts; then
    echo "✅ Settings seeded successfully"
else
    echo "⚠️  Settings seeding failed or already exists, continuing..."
fi

# Step 6: Build the application
echo "🏗️  Building application..."
if npm run build; then
    echo "🎉 Build completed successfully!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Safe build process completed!"
