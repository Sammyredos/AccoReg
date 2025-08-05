#!/usr/bin/env tsx

/**
 * Resend Failed Emails Script
 * Identifies and resends emails to participants who may not have received them
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

async function resendFailedEmails() {
  console.log('📧 Starting failed email resend process...')

  try {
    // Generate Prisma client first
    console.log('🔧 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated!')

    // Get list of registrations that might need email resend
    console.log('🔍 Identifying participants who may need email resend...')
    const identifyFailedSqlFile = join(process.cwd(), 'identify-failed-emails.sql')
    writeFileSync(identifyFailedSqlFile, `
      -- Find registrations that might have email delivery issues
      SELECT 
        id,
        "fullName",
        "emailAddress",
        "createdAt",
        "qrCode",
        CASE 
          WHEN "emailAddress" NOT LIKE '%@%.%' THEN 'Invalid email format'
          WHEN "qrCode" IS NULL THEN 'Missing QR code (possible email failure)'
          WHEN LENGTH("qrCode") < 50 THEN 'Invalid QR code'
          WHEN "createdAt" > NOW() - INTERVAL '24 hours' THEN 'Recent registration'
          ELSE 'Likely delivered'
        END as delivery_status
      FROM registrations 
      WHERE 
        "emailAddress" IS NOT NULL 
        AND (
          "qrCode" IS NULL 
          OR LENGTH("qrCode") < 50 
          OR "emailAddress" NOT LIKE '%@%.%'
          OR "createdAt" > NOW() - INTERVAL '24 hours'
        )
      ORDER BY "createdAt" DESC
      LIMIT 100;
    `)
    
    try {
      execSync(`npx prisma db execute --file ${identifyFailedSqlFile}`, { stdio: 'inherit' })
      console.log('✅ Failed email identification completed')
    } catch (error) {
      console.log('⚠️ Failed email identification failed:', error)
    }
    unlinkSync(identifyFailedSqlFile)

    console.log('\n📋 Resend Options:')
    console.log('1. Manual resend via admin panel:')
    console.log('   - Go to Communications page')
    console.log('   - Select specific email addresses')
    console.log('   - Send smaller batches (10-20 emails at a time)')
    
    console.log('\n2. Fix invalid email addresses:')
    console.log('   - Contact participants with invalid emails')
    console.log('   - Update their email addresses in the system')
    console.log('   - Resend confirmation emails')
    
    console.log('\n3. Check Gmail sending limits:')
    console.log('   - Gmail free: 500 emails/day')
    console.log('   - Gmail Workspace: 2000 emails/day')
    console.log('   - Consider upgrading or using dedicated email service')
    
    console.log('\n4. Alternative communication methods:')
    console.log('   - SMS notifications (if phone numbers available)')
    console.log('   - WhatsApp broadcast')
    console.log('   - Social media announcements')
    
    console.log('\n📧 Email Delivery Best Practices:')
    console.log('- Send in smaller batches (5-10 emails)')
    console.log('- Wait 2-3 seconds between batches')
    console.log('- Avoid peak hours (9-11 AM, 2-4 PM)')
    console.log('- Use clear, non-spammy subject lines')
    console.log('- Ask participants to check spam folders')
    
    console.log('\n🔧 Technical Improvements:')
    console.log('- Set up SPF record: v=spf1 include:_spf.google.com ~all')
    console.log('- Set up DKIM signing in Gmail')
    console.log('- Consider using SendGrid, Mailgun, or AWS SES')
    console.log('- Implement email bounce handling')
    
    return true

  } catch (error) {
    console.error('❌ Failed email resend process failed:', error)
    return false
  }
}

if (require.main === module) {
  resendFailedEmails()
    .then((success) => {
      if (success) {
        console.log('✅ Failed email resend process completed!')
        process.exit(0)
      } else {
        console.error('❌ Failed email resend process failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Failed email resend process error:', error)
      process.exit(1)
    })
}

export { resendFailedEmails }
