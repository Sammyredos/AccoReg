#!/bin/bash

# Production Deployment Script for Youth Registration System
# This script prepares and deploys the application to production

set -e  # Exit on any error

echo "🚀 PRODUCTION DEPLOYMENT SCRIPT"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Environment Check
print_step "ENVIRONMENT CHECK"

if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found"
    print_status "Creating from template..."
    cp .env.production.template .env.production
    print_warning "Please edit .env.production with your production values before continuing"
    exit 1
fi

# Check required environment variables
print_status "Checking required environment variables..."
source .env.production

required_vars=("DATABASE_URL" "JWT_SECRET" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

print_status "All required environment variables are set"

# Step 2: Dependencies
print_step "INSTALLING DEPENDENCIES"
print_status "Installing production dependencies..."
npm ci --only=production

# Step 3: Database Setup
print_step "DATABASE SETUP"
print_status "Generating Prisma client..."
npx prisma generate

print_status "Pushing database schema..."
npx prisma db push --accept-data-loss

# Step 4: Build Application
print_step "BUILDING APPLICATION"
print_status "Running production build..."
NODE_ENV=production npm run build

# Step 5: Security Check
print_step "SECURITY CHECK"
print_status "Checking for security vulnerabilities..."
npm audit --audit-level=high || print_warning "Security vulnerabilities found - review before deploying"

# Step 6: Performance Optimization
print_step "PERFORMANCE OPTIMIZATION"
print_status "Optimizing build output..."

# Remove source maps in production (optional)
if [ "$REMOVE_SOURCE_MAPS" = "true" ]; then
    print_status "Removing source maps..."
    find .next -name "*.map" -delete
fi

# Step 7: Health Check
print_step "HEALTH CHECK"
print_status "Running production health check..."
npm run test:production || print_warning "Health check failed - review before deploying"

# Step 8: Final Checks
print_step "FINAL CHECKS"

# Check build output
if [ ! -d ".next" ]; then
    print_error "Build output not found. Build may have failed."
    exit 1
fi

print_status "Build output verified"

# Check file permissions
print_status "Setting correct file permissions..."
chmod -R 755 .next
chmod -R 755 public

print_step "DEPLOYMENT READY"
print_status "Application is ready for production deployment!"
print_status ""
print_status "Next steps:"
print_status "1. Upload files to your production server"
print_status "2. Set environment variables on your server"
print_status "3. Run: npm start"
print_status "4. Monitor logs for any issues"
print_status ""
print_warning "Remember to:"
print_warning "- Set up SSL/TLS certificates"
print_warning "- Configure reverse proxy (nginx/apache)"
print_warning "- Set up monitoring and logging"
print_warning "- Configure automated backups"
print_warning "- Test all functionality in production"

echo -e "\n${GREEN}✅ Production deployment preparation complete!${NC}"
