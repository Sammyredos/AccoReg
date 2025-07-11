# 📧 Email Configuration Guide

This guide will help you set up email functionality for your youth registration system.

## 🚀 Quick Setup (Gmail)

### Step 1: Create Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Go to Google Account Settings** → Security → 2-Step Verification
3. **Generate App Password**:
   - Go to "App passwords" 
   - Select "Mail" and "Other (custom name)"
   - Enter "Youth Registration System"
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 2: Configure Environment Variables in Render

1. **Go to Render Dashboard** → Your Web Service → Environment
2. **Add these variables:**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_SECURE=false
EMAIL_FROM_NAME=MOPGOM Global
EMAIL_REPLY_TO=noreply@mopgomglobal.com
ADMIN_EMAILS=admin@mopgomglobal.com
```

### Step 3: Deploy and Test

1. **Save environment variables** in Render
2. **Redeploy your service**
3. **Test registration** - you should receive emails!

## 🔧 Alternative Email Providers

### SendGrid (Recommended for Production)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
```

### AWS SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-access-key
SMTP_PASS=your-ses-secret-key
SMTP_SECURE=false
```

## 🧪 Testing Email Configuration

### Test via Admin Panel

1. **Login to admin panel**
2. **Go to Settings** → Email Configuration
3. **Enter your SMTP details**
4. **Click "Test Configuration"**
5. **Check if test email is received**

### Test via Registration

1. **Fill out registration form**
2. **Submit registration**
3. **Check email for confirmation**

## 🚨 Troubleshooting

### Common Issues

**1. "Authentication failed"**
- ✅ Check username/password are correct
- ✅ For Gmail, use App Password (not regular password)
- ✅ Enable 2FA on Gmail account

**2. "Connection timeout"**
- ✅ Check SMTP_HOST and SMTP_PORT
- ✅ Verify firewall isn't blocking port 587
- ✅ Try port 465 with SMTP_SECURE=true

**3. "Emails not received"**
- ✅ Check spam/junk folder
- ✅ Verify recipient email address
- ✅ Check email provider limits

**4. "Rate limiting"**
- ✅ Gmail: 500 emails/day for free accounts
- ✅ Use professional email service for high volume

### Debug Steps

1. **Check Render logs** for email errors
2. **Test SMTP connection** in admin panel
3. **Verify environment variables** are set correctly
4. **Check email provider settings**

## 📋 Email Features

### Automatic Emails

- ✅ **Registration confirmation** with QR code
- ✅ **Admin notifications** for new registrations
- ✅ **Manual emails** from admin panel

### Email Templates

- ✅ **Professional HTML templates**
- ✅ **QR code generation**
- ✅ **Registration details**
- ✅ **Branding customization**

## 🔒 Security Best Practices

1. **Use App Passwords** (never regular passwords)
2. **Enable 2FA** on email accounts
3. **Use environment variables** (never hardcode credentials)
4. **Monitor email logs** for suspicious activity
5. **Set rate limits** to prevent abuse

## 📞 Support

If you need help setting up emails:
1. Check the troubleshooting section above
2. Review Render logs for specific error messages
3. Test with a simple Gmail setup first
4. Consider using a professional email service for production

---

**Next Steps:** After setting up email, test the registration process to ensure confirmation emails are working properly!
