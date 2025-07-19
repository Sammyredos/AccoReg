#!/usr/bin/env tsx

/**
 * Email Configuration Debug Script
 *
 * This script tests email configuration and provides detailed debugging information.
 */

import nodemailer from 'nodemailer'

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n')

  // Get environment variables
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    secure: process.env.SMTP_SECURE === 'true',
    fromName: process.env.EMAIL_FROM_NAME || 'MopgomYouth',
  }

  console.log('📋 Configuration:')
  console.log(`Host: ${config.host}`)
  console.log(`Port: ${config.port}`)
  console.log(`User: ${config.user}`)
  console.log(`Password: ${config.pass ? '***' + config.pass.slice(-4) : 'NOT SET'}`)
  console.log(`Secure: ${config.secure}`)
  console.log(`From Name: ${config.fromName}`)
  console.log('')

  // Check required fields
  if (!config.user || !config.pass) {
    console.log('❌ Missing required email configuration:')
    if (!config.user) console.log('   - SMTP_USER not set')
    if (!config.pass) console.log('   - SMTP_PASS not set')
    console.log('\n💡 Set these in your .env.local file or environment variables')
    return
  }

  try {
    // Create transporter
    console.log('🔧 Creating email transporter...')
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      debug: true, // Enable debug output
      logger: true, // Log to console
    })

    // Verify connection
    console.log('🔍 Verifying SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection verified successfully!')

    // Send test email
    console.log('📧 Sending test email...')
    const testEmail = {
      from: `"${config.fromName}" <${config.user}>`,
      to: config.user, // Send to self for testing
      subject: '✅ Email Configuration Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">🎉 Email Configuration Working!</h2>
          <p>Congratulations! Your email configuration is working correctly.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>SMTP Host:</strong> ${config.host}</li>
              <li><strong>Port:</strong> ${config.port}</li>
              <li><strong>User:</strong> ${config.user}</li>
              <li><strong>From Name:</strong> ${config.fromName}</li>
              <li><strong>Secure:</strong> ${config.secure}</li>
            </ul>
          </div>
          
          <p>Your MopgomYouth application can now send emails successfully!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated test email from your Youth Registration System.
          </p>
        </div>
      `,
    }

    const result = await transporter.sendMail(testEmail)
    console.log('✅ Test email sent successfully!')
    console.log(`📬 Message ID: ${result.messageId}`)
    console.log(`📧 Sent to: ${testEmail.to}`)
    
    console.log('\n🎉 Email configuration is working correctly!')
    console.log('💡 You can now use email features in your application.')

  } catch (error) {
    console.log('❌ Email configuration test failed!')
    console.log('\n🔍 Error details:')
    
    if (error instanceof Error) {
      console.log(`Error: ${error.message}`)
      
      // Provide specific help based on error type
      if (error.message.includes('535')) {
        console.log('\n💡 Gmail Authentication Error (535):')
        console.log('1. Make sure 2-Factor Authentication is enabled on your Gmail account')
        console.log('2. Generate a new App Password:')
        console.log('   - Go to https://myaccount.google.com/security')
        console.log('   - Click "2-Step Verification"')
        console.log('   - Scroll to "App passwords"')
        console.log('   - Generate password for "Mail"')
        console.log('3. Use the 16-character app password (format: xxxx xxxx xxxx xxxx)')
        console.log('4. Update SMTP_PASS in your environment variables')
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Connection Refused Error:')
        console.log('1. Check your internet connection')
        console.log('2. Verify SMTP host and port are correct')
        console.log('3. Check if firewall is blocking the connection')
      } else if (error.message.includes('timeout')) {
        console.log('\n💡 Timeout Error:')
        console.log('1. Check your internet connection')
        console.log('2. Try using port 465 with secure: true')
        console.log('3. Check if your network blocks SMTP ports')
      }
    } else {
      console.log(error)
    }
    
    console.log('\n🔧 Troubleshooting steps:')
    console.log('1. Verify your Gmail credentials')
    console.log('2. Check environment variables are set correctly')
    console.log('3. Test with a different email provider if issues persist')
    console.log('4. Check the application logs for more details')
  }
}

// Run the test
testEmailConfiguration()
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })
