#!/usr/bin/env tsx

/**
 * Environment Setup Script
 * Configures the application for both development and production environments
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_ROOT = process.cwd()

interface EnvironmentConfig {
  name: string
  envFile: string
  databaseUrl: string
  prismaSchema: string
  setupSteps: string[]
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    name: 'Development',
    envFile: '.env.local',
    databaseUrl: 'file:./dev.db',
    prismaSchema: 'prisma/schema.dev.prisma',
    setupSteps: [
      'Generate Prisma client for development',
      'Push database schema',
      'Create super admin user',
      'Verify development setup'
    ]
  },
  production: {
    name: 'Production',
    envFile: '.env.production',
    databaseUrl: process.env.DATABASE_URL || '',
    prismaSchema: 'prisma/schema.prisma',
    setupSteps: [
      'Generate Prisma client for production',
      'Run database migrations',
      'Verify production setup',
      'Build application'
    ]
  }
}

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m'     // Yellow
  }
  const reset = '\x1b[0m'
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
  console.log(`${colors[type]}[${timestamp}] ${message}${reset}`)
}

function runCommand(command: string, description: string): boolean {
  try {
    log(`Running: ${description}`)
    log(`Command: ${command}`, 'info')
    execSync(command, { stdio: 'inherit', cwd: PROJECT_ROOT })
    log(`✅ ${description} completed successfully`, 'success')
    return true
  } catch (error) {
    log(`❌ ${description} failed: ${error}`, 'error')
    return false
  }
}

function checkEnvironmentFile(envFile: string): boolean {
  const envPath = join(PROJECT_ROOT, envFile)
  if (!existsSync(envPath)) {
    log(`Environment file ${envFile} not found`, 'warn')
    return false
  }
  
  const envContent = readFileSync(envPath, 'utf-8')
  const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'JWT_SECRET']
  
  for (const varName of requiredVars) {
    if (!envContent.includes(`${varName}=`)) {
      log(`Missing required environment variable: ${varName}`, 'error')
      return false
    }
  }
  
  log(`✅ Environment file ${envFile} is valid`, 'success')
  return true
}

function setupDevelopment(): boolean {
  log('🚀 Setting up Development Environment', 'info')
  
  const config = ENVIRONMENTS.development
  
  // Check if environment file exists
  if (!checkEnvironmentFile(config.envFile)) {
    log('Development environment file is already created', 'info')
  }
  
  // Generate Prisma client for development
  if (!runCommand(
    `npx prisma generate --schema=${config.prismaSchema}`,
    'Generate Prisma client for development'
  )) return false
  
  // Push database schema for development
  if (!runCommand(
    `npx prisma db push --schema=${config.prismaSchema}`,
    'Push database schema for development'
  )) return false
  
  // Create super admin user
  if (!runCommand(
    'npm run setup:admin',
    'Create super admin user'
  )) {
    log('Super admin creation failed, but continuing...', 'warn')
  }
  
  log('🎉 Development environment setup completed!', 'success')
  log('You can now run: npm run dev', 'info')
  return true
}

function setupProduction(): boolean {
  log('🚀 Setting up Production Environment', 'info')
  
  const config = ENVIRONMENTS.production
  
  // Check if production environment file exists
  if (!checkEnvironmentFile(config.envFile)) {
    log('Please create .env.production file with your production settings', 'error')
    log('Use .env.production.example as a template', 'info')
    return false
  }
  
  // Generate Prisma client for production
  if (!runCommand(
    `npx prisma generate --schema=${config.prismaSchema}`,
    'Generate Prisma client for production'
  )) return false
  
  // Run database migrations
  if (!runCommand(
    'npx prisma migrate deploy',
    'Run database migrations'
  )) return false
  
  // Build application
  if (!runCommand(
    'npm run build:production',
    'Build application for production'
  )) return false
  
  log('🎉 Production environment setup completed!', 'success')
  log('You can now run: npm run start:production', 'info')
  return true
}

function checkDependencies(): boolean {
  log('🔍 Checking dependencies...', 'info')
  
  const requiredPackages = [
    'next',
    'react',
    'prisma',
    '@prisma/client',
    'lucide-react',
    'jsqr'
  ]
  
  try {
    const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'))
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    for (const pkg of requiredPackages) {
      if (!allDeps[pkg]) {
        log(`Missing required package: ${pkg}`, 'error')
        return false
      }
    }
    
    log('✅ All required dependencies are installed', 'success')
    return true
  } catch (error) {
    log(`Error checking dependencies: ${error}`, 'error')
    return false
  }
}

function main() {
  const environment = process.argv[2] || 'development'
  
  log(`🔧 AccoReg Environment Setup`, 'info')
  log(`Environment: ${environment}`, 'info')
  log(`Project Root: ${PROJECT_ROOT}`, 'info')
  
  // Check dependencies first
  if (!checkDependencies()) {
    log('Please install missing dependencies with: npm install', 'error')
    process.exit(1)
  }
  
  let success = false
  
  switch (environment.toLowerCase()) {
    case 'development':
    case 'dev':
      success = setupDevelopment()
      break
      
    case 'production':
    case 'prod':
      success = setupProduction()
      break
      
    default:
      log(`Unknown environment: ${environment}`, 'error')
      log('Usage: npm run setup:env [development|production]', 'info')
      process.exit(1)
  }
  
  if (success) {
    log('🎉 Environment setup completed successfully!', 'success')
    process.exit(0)
  } else {
    log('❌ Environment setup failed', 'error')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
