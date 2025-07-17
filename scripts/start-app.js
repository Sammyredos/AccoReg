#!/usr/bin/env node

/**
 * Universal App Starter
 * Automatically configures and starts the app for both localhost and production
 */

const { execSync, spawn } = require('child_process')
const { existsSync, writeFileSync, readFileSync } = require('fs')
const path = require('path')

const PROJECT_ROOT = process.cwd()
const ENV_LOCAL = path.join(PROJECT_ROOT, '.env.local')
const ENV_PRODUCTION = path.join(PROJECT_ROOT, '.env.production')

// Detect environment
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production')
const isDevelopment = !isProduction

console.log(`🚀 Starting AccoReg in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`)

// Environment-specific configurations
const configs = {
  development: {
    envFile: ENV_LOCAL,
    databaseUrl: process.env.USE_POSTGRESQL === 'true'
      ? 'postgresql://accoreg_user:password@localhost:5432/accoreg'
      : 'file:./dev.db',
    port: 3000,
    nextAuthUrl: 'http://localhost:3000',
    nodeEnv: 'development',
    commands: {
      setup: 'npm run db:push && npm run db:generate',
      start: 'npm run dev'
    }
  },
  production: {
    envFile: ENV_PRODUCTION,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/accoreg',
    port: process.env.PORT || 3000,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'https://yourdomain.com',
    nodeEnv: 'production',
    commands: {
      setup: 'npm run db:push && npm run db:generate',
      start: 'npm run build && npm run start'
    }
  }
}

const config = isProduction ? configs.production : configs.development

// Generate secure secrets
function generateSecret() {
  return require('crypto').randomBytes(32).toString('hex')
}

// Create environment file if it doesn't exist
function createEnvFile() {
  if (!existsSync(config.envFile)) {
    console.log(`📝 Creating ${config.envFile}...`)
    
    const envContent = `# AccoReg Environment Configuration
# Auto-generated for ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} environment

# =============================================================================
# APPLICATION SETTINGS
# =============================================================================
NODE_ENV=${config.nodeEnv}
PORT=${config.port}
NEXTAUTH_URL=${config.nextAuthUrl}
NEXTAUTH_SECRET=${generateSecret()}

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL="${config.databaseUrl}"

# =============================================================================
# AUTHENTICATION & SECURITY
# =============================================================================
JWT_SECRET=${generateSecret()}
SECURITY_HEADERS_ENABLED=${isProduction}
CSP_ENABLED=false
HSTS_ENABLED=${isProduction}

# =============================================================================
# EMAIL CONFIGURATION (Optional)
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
EMAIL_FROM_NAME=AccoReg
EMAIL_REPLY_TO=noreply@yourdomain.com

# =============================================================================
# OPTIONAL FEATURES
# =============================================================================
SMS_ENABLED=false
RATE_LIMIT_ENABLED=${isProduction}
GDPR_ENABLED=true
HEALTH_CHECK_ENABLED=true
LOG_LEVEL=${isProduction ? 'info' : 'debug'}

# =============================================================================
# DEVELOPMENT HELPERS
# =============================================================================
SKIP_TYPE_CHECK=${isDevelopment}
`

    writeFileSync(config.envFile, envContent)
    console.log(`✅ Created ${config.envFile}`)
  } else {
    console.log(`✅ Found existing ${config.envFile}`)
  }
}

// Check and install dependencies
function checkDependencies() {
  console.log('📦 Checking dependencies...')
  try {
    execSync('npm list --depth=0', { stdio: 'ignore' })
    console.log('✅ Dependencies are installed')
  } catch (error) {
    console.log('📦 Installing dependencies...')
    execSync('npm install', { stdio: 'inherit' })
    console.log('✅ Dependencies installed')
  }
}

// Setup database
function setupDatabase() {
  console.log('🗄️ Setting up database...')
  try {
    execSync(config.commands.setup, { stdio: 'inherit' })
    console.log('✅ Database setup complete')
  } catch (error) {
    console.log('⚠️ Database setup failed, but continuing...')
    console.log('You may need to configure your database manually')
  }
}

// Start the application
function startApp() {
  console.log(`🚀 Starting application in ${config.nodeEnv} mode...`)
  console.log(`🌐 App will be available at: ${config.nextAuthUrl}`)
  
  if (isDevelopment) {
    // Development mode - use npm run dev
    spawn('npm', ['run', 'dev'], { stdio: 'inherit' })
  } else {
    // Production mode - build and start
    try {
      console.log('🔨 Building application...')
      execSync('npm run build', { stdio: 'inherit' })
      console.log('✅ Build complete')
      
      console.log('🚀 Starting production server...')
      spawn('npm', ['run', 'start'], { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Build failed:', error.message)
      process.exit(1)
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('🔧 Setting up AccoReg...')
    
    // Step 1: Create environment file
    createEnvFile()
    
    // Step 2: Check dependencies
    checkDependencies()
    
    // Step 3: Setup database
    setupDatabase()
    
    // Step 4: Start the app
    startApp()
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.log('\n📚 For help, check:')
    console.log('- README.md')
    console.log('- docs/TROUBLESHOOTING.md')
    console.log('- .env.example for configuration options')
    process.exit(1)
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 AccoReg Universal Starter

Usage:
  node scripts/start-app.js [options]

Options:
  --production    Start in production mode
  --help, -h      Show this help message

Examples:
  node scripts/start-app.js              # Start in development mode
  node scripts/start-app.js --production # Start in production mode
  NODE_ENV=production node scripts/start-app.js # Alternative production start

Environment Files:
  Development: .env.local
  Production:  .env.production

The script will automatically:
  ✅ Create environment files if missing
  ✅ Install dependencies
  ✅ Setup database
  ✅ Start the application
`)
  process.exit(0)
}

// Run the main function
main()
