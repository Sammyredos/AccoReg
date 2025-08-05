#!/usr/bin/env tsx

/**
 * Email Delivery Checker Script
 * Checks which participants may not have received emails and provides solutions
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

async function checkEmailDelivery() {
  console.log('📧 Checking email delivery status...')

  try {
    // Generate Prisma client first
    console.log('🔧 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated!')

    // Check for registrations with potentially problematic emails
    console.log('🔍 Checking for problematic email addresses...')
    const checkEmailsSqlFile = join(process.cwd(), 'check-emails.sql')
    writeFileSync(checkEmailsSqlFile, `
      -- Check for invalid email patterns
      SELECT 
        id,
        "fullName",
        "emailAddress",
        "createdAt",
        CASE 
          WHEN "emailAddress" NOT LIKE '%@%.%' THEN 'Invalid format'
          WHEN "emailAddress" LIKE '%@gmail.com' AND LENGTH("emailAddress") < 10 THEN 'Too short'
          WHEN "emailAddress" LIKE '%..%' THEN 'Double dots'
          WHEN "emailAddress" LIKE '%.@%' OR "emailAddress" LIKE '%@.%' THEN 'Dot before/after @'
          WHEN "emailAddress" LIKE '%@%@%' THEN 'Multiple @'
          ELSE 'Looks valid'
        END as email_status
      FROM registrations 
      WHERE "emailAddress" IS NOT NULL
      ORDER BY 
        CASE 
          WHEN "emailAddress" NOT LIKE '%@%.%' THEN 1
          WHEN "emailAddress" LIKE '%@gmail.com' AND LENGTH("emailAddress") < 10 THEN 2
          WHEN "emailAddress" LIKE '%..%' THEN 3
          WHEN "emailAddress" LIKE '%.@%' OR "emailAddress" LIKE '%@.%' THEN 4
          WHEN "emailAddress" LIKE '%@%@%' THEN 5
          ELSE 6
        END,
        "createdAt" DESC;
    `)
    
    try {
      execSync(`npx prisma db execute --file ${checkEmailsSqlFile}`, { stdio: 'inherit' })
      console.log('✅ Email validation check completed')
    } catch (error) {
      console.log('⚠️ Email validation check failed:', error)
    }
    unlinkSync(checkEmailsSqlFile)

    // Check email domain distribution
    console.log('📊 Checking email domain distribution...')
    const domainCheckSqlFile = join(process.cwd(), 'check-domains.sql')
    writeFileSync(domainCheckSqlFile, `
      SELECT 
        SUBSTRING("emailAddress" FROM '@(.*)$') as domain,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM registrations), 2) as percentage
      FROM registrations 
      WHERE "emailAddress" IS NOT NULL
      GROUP BY SUBSTRING("emailAddress" FROM '@(.*)$')
      ORDER BY count DESC
      LIMIT 20;
    `)
    
    try {
      execSync(`npx prisma db execute --file ${domainCheckSqlFile}`, { stdio: 'inherit' })
      console.log('✅ Domain distribution check completed')
    } catch (error) {
      console.log('⚠️ Domain distribution check failed:', error)
    }
    unlinkSync(domainCheckSqlFile)

    // Check recent registrations without QR codes (may indicate email issues)
    console.log('🔍 Checking registrations without QR codes...')
    const qrCheckSqlFile = join(process.cwd(), 'check-qr-codes.sql')
    writeFileSync(qrCheckSqlFile, `
      SELECT 
        id,
        "fullName",
        "emailAddress",
        "createdAt",
        CASE 
          WHEN "qrCode" IS NULL THEN 'Missing QR Code'
          WHEN LENGTH("qrCode") < 50 THEN 'Invalid QR Code'
          ELSE 'Has QR Code'
        END as qr_status
      FROM registrations 
      WHERE "qrCode" IS NULL OR LENGTH("qrCode") < 50
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `)
    
    try {
      execSync(`npx prisma db execute --file ${qrCheckSqlFile}`, { stdio: 'inherit' })
      console.log('✅ QR code check completed')
    } catch (error) {
      console.log('⚠️ QR code check failed:', error)
    }
    unlinkSync(qrCheckSqlFile)

    // Summary statistics
    console.log('📈 Getting summary statistics...')
    const statsSqlFile = join(process.cwd(), 'email-stats.sql')
    writeFileSync(statsSqlFile, `
      SELECT 
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN "emailAddress" IS NOT NULL THEN 1 END) as with_email,
        COUNT(CASE WHEN "qrCode" IS NOT NULL THEN 1 END) as with_qr_code,
        COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified,
        COUNT(CASE WHEN "emailAddress" LIKE '%@gmail.com' THEN 1 END) as gmail_users,
        COUNT(CASE WHEN "emailAddress" LIKE '%@yahoo.com' THEN 1 END) as yahoo_users,
        COUNT(CASE WHEN "emailAddress" LIKE '%@hotmail.com' OR "emailAddress" LIKE '%@outlook.com' THEN 1 END) as microsoft_users
      FROM registrations;
    `)
    
    try {
      execSync(`npx prisma db execute --file ${statsSqlFile}`, { stdio: 'inherit' })
      console.log('✅ Summary statistics completed')
    } catch (error) {
      console.log('⚠️ Summary statistics failed:', error)
    }
    unlinkSync(statsSqlFile)

    console.log('\n🎯 Email Delivery Recommendations:')
    console.log('1. Check the invalid email addresses above and contact those users')
    console.log('2. Gmail rate limit: 500 emails/day - consider upgrading to Gmail Workspace')
    console.log('3. Use smaller batches (5 emails) with longer delays (2-3 seconds)')
    console.log('4. Consider using a dedicated email service like SendGrid or Mailgun')
    console.log('5. Set up SPF and DKIM records for better deliverability')
    console.log('6. Check spam folders - bulk emails often get filtered')

    console.log('\n📧 Next Steps:')
    console.log('- Run: npx tsx scripts/resend-failed-emails.ts')
    console.log('- Check Gmail sent folder for actual delivery count')
    console.log('- Ask participants to check spam/junk folders')
    console.log('- Consider phone/SMS notifications for critical updates')

    return true

  } catch (error) {
    console.error('❌ Email delivery check failed:', error)
    return false
  }
}

if (require.main === module) {
  checkEmailDelivery()
    .then((success) => {
      if (success) {
        console.log('✅ Email delivery check completed!')
        process.exit(0)
      } else {
        console.error('❌ Email delivery check failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Email delivery check error:', error)
      process.exit(1)
    })
}

export { checkEmailDelivery }
