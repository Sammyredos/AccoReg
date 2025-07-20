#!/usr/bin/env node

/**
 * Generate Production Secrets
 * Generates secure secrets for production deployment
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateSecrets() {
  console.log('🔐 PRODUCTION SECRETS GENERATOR');
  console.log('=====================================\n');
  
  const secrets = {
    NEXTAUTH_SECRET: generateSecret(32),
    JWT_SECRET: generateSecret(32),
    QR_SECRET_KEY: generateSecret(24),
    BACKUP_ENCRYPTION_KEY: generateSecret(32)
  };

  console.log('📋 Copy these secrets to your production environment:\n');
  
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });

  console.log('\n🔒 Security Notes:');
  console.log('- Keep these secrets secure and private');
  console.log('- Never commit secrets to version control');
  console.log('- Use different secrets for each environment');
  console.log('- Store secrets in your hosting platform\'s environment variables');
  
  console.log('\n✅ Secrets generated successfully!');
  console.log('Add these to your production environment variables.');
}

if (require.main === module) {
  generateSecrets();
}

module.exports = { generateSecret, generateSecrets };
