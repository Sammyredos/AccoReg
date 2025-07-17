#!/usr/bin/env node

/**
 * PostgreSQL Setup Script for AccoReg
 * Automatically configures PostgreSQL for local development
 */

const { execSync, spawn } = require('child_process')
const { existsSync, writeFileSync, readFileSync } = require('fs')
const path = require('path')
const readline = require('readline')

const PROJECT_ROOT = process.cwd()
const ENV_LOCAL = path.join(PROJECT_ROOT, '.env.local')

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

// Check if PostgreSQL is installed
function checkPostgreSQLInstalled() {
  try {
    execSync('psql --version', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

// Check if PostgreSQL service is running
function checkPostgreSQLRunning() {
  try {
    execSync('pg_isready', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

// Generate a secure random password
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Create database and user
async function createDatabaseAndUser(dbName, username, password) {
  try {
    console.log('🔧 Creating database and user...')
    
    // Create database
    const createDbCommand = `psql -U postgres -c "CREATE DATABASE ${dbName};"`
    execSync(createDbCommand, { stdio: 'inherit' })
    
    // Create user
    const createUserCommand = `psql -U postgres -c "CREATE USER ${username} WITH ENCRYPTED PASSWORD '${password}';"`
    execSync(createUserCommand, { stdio: 'inherit' })
    
    // Grant privileges
    const grantCommand = `psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${username};"`
    execSync(grantCommand, { stdio: 'inherit' })
    
    console.log('✅ Database and user created successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to create database and user:', error.message)
    return false
  }
}

// Update environment file
function updateEnvironmentFile(databaseUrl) {
  let envContent = ''
  
  if (existsSync(ENV_LOCAL)) {
    envContent = readFileSync(ENV_LOCAL, 'utf8')
  }
  
  // Remove existing DATABASE_URL if present
  const lines = envContent.split('\n').filter(line => !line.startsWith('DATABASE_URL'))
  
  // Add new DATABASE_URL
  lines.push(`DATABASE_URL="${databaseUrl}"`)
  
  // Write back to file
  writeFileSync(ENV_LOCAL, lines.join('\n'))
  console.log('✅ Environment file updated')
}

// Run Prisma migrations
function runPrismaMigrations() {
  try {
    console.log('🔄 Running Prisma migrations...')
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Push database schema
    execSync('npx prisma db push', { stdio: 'inherit' })
    
    console.log('✅ Prisma migrations completed')
    return true
  } catch (error) {
    console.error('❌ Prisma migrations failed:', error.message)
    return false
  }
}

// Main setup function
async function main() {
  console.log('🐘 PostgreSQL Setup for AccoReg\n')
  
  // Check if PostgreSQL is installed
  if (!checkPostgreSQLInstalled()) {
    console.log('❌ PostgreSQL is not installed.')
    console.log('\n📥 Please install PostgreSQL first:')
    console.log('Windows: https://www.postgresql.org/download/windows/')
    console.log('macOS: brew install postgresql@15')
    console.log('Linux: sudo apt install postgresql postgresql-contrib')
    process.exit(1)
  }
  
  console.log('✅ PostgreSQL is installed')
  
  // Check if PostgreSQL is running
  if (!checkPostgreSQLRunning()) {
    console.log('❌ PostgreSQL service is not running.')
    console.log('\n🚀 Please start PostgreSQL:')
    console.log('Windows: Start PostgreSQL service from Services')
    console.log('macOS: brew services start postgresql@15')
    console.log('Linux: sudo systemctl start postgresql')
    process.exit(1)
  }
  
  console.log('✅ PostgreSQL is running')
  
  // Get configuration from user
  console.log('\n🔧 Configuration Setup:')
  
  const dbName = await question('Database name (default: accoreg): ') || 'accoreg'
  const username = await question('Database username (default: accoreg_user): ') || 'accoreg_user'
  
  let password = await question('Database password (leave empty to generate): ')
  if (!password) {
    password = generatePassword()
    console.log(`🔑 Generated password: ${password}`)
  }
  
  const host = await question('Database host (default: localhost): ') || 'localhost'
  const port = await question('Database port (default: 5432): ') || '5432'
  
  // Construct database URL
  const databaseUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}`
  
  console.log('\n📋 Configuration Summary:')
  console.log(`Database: ${dbName}`)
  console.log(`Username: ${username}`)
  console.log(`Host: ${host}`)
  console.log(`Port: ${port}`)
  console.log(`URL: postgresql://${username}:***@${host}:${port}/${dbName}`)
  
  const confirm = await question('\nProceed with setup? (y/N): ')
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('Setup cancelled.')
    rl.close()
    process.exit(0)
  }
  
  // Create database and user
  const dbCreated = await createDatabaseAndUser(dbName, username, password)
  if (!dbCreated) {
    console.log('\n❌ Database setup failed. Please check your PostgreSQL installation and try again.')
    rl.close()
    process.exit(1)
  }
  
  // Update environment file
  updateEnvironmentFile(databaseUrl)
  
  // Run Prisma migrations
  const migrationsSuccess = runPrismaMigrations()
  if (!migrationsSuccess) {
    console.log('\n⚠️ Prisma migrations failed, but database is set up.')
    console.log('You can run migrations manually with: npx prisma db push')
  }
  
  console.log('\n🎉 PostgreSQL setup completed successfully!')
  console.log('\n📝 Next steps:')
  console.log('1. Your .env.local file has been updated')
  console.log('2. Database and user have been created')
  console.log('3. Prisma schema has been applied')
  console.log('4. You can now run: npm run dev')
  
  console.log('\n🔧 Useful commands:')
  console.log(`psql -U ${username} -d ${dbName}  # Connect to database`)
  console.log('npx prisma studio                # Open Prisma Studio')
  console.log('npx prisma db push               # Apply schema changes')
  
  rl.close()
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🐘 PostgreSQL Setup for AccoReg

Usage:
  node scripts/setup-postgresql.js [options]

Options:
  --help, -h      Show this help message

This script will:
  ✅ Check PostgreSQL installation
  ✅ Create database and user
  ✅ Update environment configuration
  ✅ Run Prisma migrations
  ✅ Prepare your app for PostgreSQL

Prerequisites:
  - PostgreSQL must be installed
  - PostgreSQL service must be running
  - You need postgres user access
`)
  process.exit(0)
}

// Run the main function
main().catch(error => {
  console.error('❌ Setup failed:', error.message)
  rl.close()
  process.exit(1)
})
