#!/usr/bin/env node

/**
 * Test Production Build
 * Validates that the application can build successfully for production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`🔧 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${exists ? 'Found' : 'Missing'}`);
  return exists;
}

function testProductionBuild() {
  console.log('🚀 PRODUCTION BUILD TEST');
  console.log('========================\n');

  // Check required files
  console.log('📁 Checking required files...');
  const requiredFiles = [
    { path: 'package.json', desc: 'Package configuration' },
    { path: 'next.config.js', desc: 'Next.js configuration' },
    { path: 'prisma/schema.prisma', desc: 'Database schema' },
    { path: '.env.production', desc: 'Production environment' },
    { path: 'render.yaml', desc: 'Render deployment config' }
  ];

  let allFilesExist = true;
  requiredFiles.forEach(({ path: filePath, desc }) => {
    if (!checkFile(filePath, desc)) {
      allFilesExist = false;
    }
  });

  if (!allFilesExist) {
    console.log('\n❌ Missing required files. Please ensure all files are present.');
    process.exit(1);
  }

  console.log('\n🔧 Running production build test...\n');

  // Test steps
  const steps = [
    {
      command: 'npm ci',
      description: 'Installing dependencies'
    },
    {
      command: 'npx prisma generate',
      description: 'Generating Prisma client'
    },
    {
      command: 'npm run type-check',
      description: 'Type checking'
    },
    {
      command: 'npm run lint',
      description: 'Linting code'
    },
    {
      command: 'NODE_ENV=production npm run build',
      description: 'Building for production'
    }
  ];

  let allStepsSucceeded = true;
  for (const step of steps) {
    if (!runCommand(step.command, step.description)) {
      allStepsSucceeded = false;
      break;
    }
  }

  // Check build output
  console.log('📦 Checking build output...');
  const buildChecks = [
    { path: '.next', desc: 'Next.js build directory' },
    { path: '.next/static', desc: 'Static assets' },
    { path: 'node_modules/.prisma/client', desc: 'Prisma client' }
  ];

  buildChecks.forEach(({ path: filePath, desc }) => {
    checkFile(filePath, desc);
  });

  if (allStepsSucceeded) {
    console.log('\n🎉 PRODUCTION BUILD TEST PASSED!');
    console.log('✅ Your application is ready for production deployment');
    console.log('\n📋 Next steps:');
    console.log('1. Commit your changes: git add . && git commit -m "Production ready"');
    console.log('2. Push to repository: git push origin main');
    console.log('3. Deploy to your hosting platform');
    console.log('4. Configure environment variables');
    console.log('5. Add PostgreSQL database');
    console.log('\n🚀 Happy deploying!');
  } else {
    console.log('\n❌ PRODUCTION BUILD TEST FAILED');
    console.log('Please fix the issues above before deploying to production.');
    process.exit(1);
  }
}

if (require.main === module) {
  testProductionBuild();
}

module.exports = { testProductionBuild };
