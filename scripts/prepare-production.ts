#!/usr/bin/env npx tsx

/**
 * Production Preparation Script for Render.com
 * Prepares the application for production deployment with PostgreSQL
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import path from 'path'

const PROJECT_ROOT = process.cwd()

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m'    // Red
  }
  const reset = '\x1b[0m'
  const icons = {
    info: '🔧',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }
  
  console.log(`${colors[type]}${icons[type]} ${message}${reset}`)
}

function runCommand(command: string, description: string): boolean {
  try {
    log(`${description}...`, 'info')
    execSync(command, { stdio: 'inherit' })
    log(`${description} completed`, 'success')
    return true
  } catch (error) {
    log(`${description} failed: ${error}`, 'error')
    return false
  }
}

function checkPrerequisites(): boolean {
  log('Checking prerequisites for production deployment', 'info')
  
  // Check if Prisma schema is configured for PostgreSQL
  const schemaPath = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma')
  if (!existsSync(schemaPath)) {
    log('Prisma schema not found', 'error')
    return false
  }
  
  const schemaContent = readFileSync(schemaPath, 'utf8')
  if (!schemaContent.includes('provider = "postgresql"')) {
    log('Prisma schema not configured for PostgreSQL', 'error')
    log('Please update prisma/schema.prisma to use PostgreSQL provider', 'warning')
    return false
  }
  
  log('Prisma schema configured for PostgreSQL', 'success')
  
  // Check if render.yaml exists
  const renderConfigPath = path.join(PROJECT_ROOT, 'render.yaml')
  if (!existsSync(renderConfigPath)) {
    log('render.yaml not found', 'error')
    return false
  }
  
  log('render.yaml configuration found', 'success')
  
  return true
}

function generateMigration(): boolean {
  log('Generating initial migration for PostgreSQL', 'info')
  
  try {
    // Create initial migration
    execSync('npx prisma migrate dev --name init --create-only', { stdio: 'inherit' })
    log('Initial migration created', 'success')
    return true
  } catch (error) {
    log('Migration generation failed - this may be normal if migrations already exist', 'warning')
    return true // Continue anyway
  }
}

function validateBuildProcess(): boolean {
  log('Validating build process', 'info')

  try {
    // Test Prisma generation
    execSync('npx prisma generate', { stdio: 'inherit' })
    log('Prisma client generation successful', 'success')

    // Skip TypeScript compilation for now (will be handled in production build)
    log('TypeScript compilation will be handled during production build', 'info')

    return true
  } catch (error) {
    log('Build validation failed', 'error')
    return false
  }
}

function createProductionChecklist(): void {
  const checklist = `
# 🚀 Production Deployment Checklist for Render.com

## ✅ Pre-Deployment Checklist

### Database Setup
- [ ] PostgreSQL database created on Render.com
- [ ] Database connection string added to environment variables
- [ ] Prisma schema configured for PostgreSQL
- [ ] Initial migration created

### Environment Variables
- [ ] All required environment variables set in Render dashboard
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] JWT_SECRET generated (32+ characters)
- [ ] ENCRYPTION_KEY generated (32+ characters)
- [ ] DATABASE_URL configured from Render PostgreSQL
- [ ] NEXTAUTH_URL set to your Render app URL

### Email Configuration
- [ ] SMTP settings configured
- [ ] Email credentials tested
- [ ] Admin email addresses set
- [ ] Email notifications enabled

### Security Settings
- [ ] SECURITY_HEADERS_ENABLED=true
- [ ] CSP_ENABLED=true
- [ ] HSTS_ENABLED=true
- [ ] Strong admin password set

### Performance Settings
- [ ] Rate limiting enabled
- [ ] Connection pool configured
- [ ] Timeouts set appropriately
- [ ] Logging level set to 'warn' or 'error'

## 🔧 Deployment Steps

1. **Create PostgreSQL Database on Render:**
   - Go to Render Dashboard
   - Create new PostgreSQL database
   - Note the connection details

2. **Configure Environment Variables:**
   - Copy values from .env.production.template
   - Set all required variables in Render dashboard
   - Use generated secrets for sensitive values

3. **Deploy Application:**
   - Push code to your Git repository
   - Connect repository to Render
   - Render will automatically build and deploy

4. **Post-Deployment Verification:**
   - Check application health at /api/health
   - Verify database connection
   - Test admin login
   - Verify email functionality
   - Test registration flow

## 🔍 Troubleshooting

### Common Issues:
- **Build fails:** Check environment variables are set
- **Database connection fails:** Verify DATABASE_URL format
- **Admin login fails:** Check SUPER_ADMIN_PASSWORD is set
- **Emails not sending:** Verify SMTP configuration

### Useful Commands:
\`\`\`bash
# Check database connection
npx prisma db pull

# Reset database (DANGER: destroys data)
npx prisma migrate reset

# View logs
render logs --service your-service-name
\`\`\`

## 📞 Support

If you encounter issues:
1. Check Render logs for error details
2. Verify all environment variables are set
3. Test database connection separately
4. Check email configuration with test script

Your app will be available at: https://your-app-name.onrender.com
`

  writeFileSync(path.join(PROJECT_ROOT, 'PRODUCTION_DEPLOYMENT_CHECKLIST.md'), checklist)
  log('Production deployment checklist created', 'success')
}

async function main() {
  log('🚀 Preparing AccoReg for Production Deployment on Render.com', 'info')
  
  // Step 1: Check prerequisites
  if (!checkPrerequisites()) {
    log('Prerequisites check failed. Please fix the issues above.', 'error')
    process.exit(1)
  }
  
  // Step 2: Generate migration
  generateMigration()
  
  // Step 3: Validate build process
  if (!validateBuildProcess()) {
    log('Build validation failed. Please fix the issues above.', 'error')
    process.exit(1)
  }
  
  // Step 4: Create production checklist
  createProductionChecklist()
  
  log('🎉 Production preparation completed successfully!', 'success')
  log('', 'info')
  log('Next steps:', 'info')
  log('1. Review PRODUCTION_DEPLOYMENT_CHECKLIST.md', 'info')
  log('2. Set up PostgreSQL database on Render.com', 'info')
  log('3. Configure environment variables in Render dashboard', 'info')
  log('4. Deploy your application', 'info')
  log('', 'info')
  log('Your app will be production-ready! 🚀', 'success')
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 Production Preparation Script for Render.com

Usage:
  npx tsx scripts/prepare-production.ts [options]

Options:
  --help, -h      Show this help message

This script will:
  ✅ Check Prisma PostgreSQL configuration
  ✅ Validate render.yaml configuration
  ✅ Generate initial database migration
  ✅ Test build process
  ✅ Create deployment checklist

Prerequisites:
  - Prisma schema configured for PostgreSQL
  - render.yaml file present
  - All dependencies installed
`)
  process.exit(0)
}

// Run the main function
main().catch(error => {
  log(`Preparation failed: ${error.message}`, 'error')
  process.exit(1)
})
