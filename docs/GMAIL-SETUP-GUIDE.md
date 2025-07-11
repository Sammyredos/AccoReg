# 📧 Gmail Setup Guide for Mopgomyouth Messaging System

This guide will help you set up Gmail to work with the Mopgomyouth messaging system for sending emails and notifications.

## 🎯 **Production Gmail Setup Steps**

### **Step 1: Enable 2-Factor Authentication on Gmail**

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Click "Security"** in the left sidebar
3. **Under "Signing in to Google"**, click **"2-Step Verification"**
4. **Follow the setup process** to enable 2FA (required for app passwords)
5. **⚠️ Important**: 2FA is mandatory for app passwords

### **Step 2: Generate App Password**

1. **Go back to Security settings**: https://myaccount.google.com/security
2. **Under "Signing in to Google"**, click **"App passwords"**
3. **Select app**: Choose **"Mail"**
4. **Select device**: Choose **"Other (Custom name)"**
5. **Enter name**: Type **"Mopgomyouth System"**
6. **Click "Generate"**
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### **Step 3: Configure Settings in Mopgomyouth**

#### **Option A: Through Admin Settings Page**
1. **Login as Super Admin**: `admin@mopgomglobal.com` / `SuperAdmin123!`
2. **Go to Settings** → **Communications Tab**
3. **Click "Edit" on Email Configuration**
4. **Enter these settings**:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP Username: your-email@gmail.com
   SMTP Password: [16-character app password from Step 2]
   SMTP Secure: false
   From Name: Mopgomyouth
   Reply To: your-email@gmail.com
   Admin Emails: admin@mopgomglobal.com
   ```
5. **Click "Save Settings"**
6. **Test the configuration** by clicking "Send Test Email"

#### **Option B: Through Environment Variables (Render) - RECOMMENDED**
1. **Go to your Render Dashboard**
2. **Select your Mopgomyouth service**
3. **Go to "Environment"**
4. **Add these variables**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcdefghijklmnop
   SMTP_SECURE=false
   EMAIL_FROM_NAME=Mopgomyouth
   EMAIL_REPLY_TO=your-email@gmail.com
   ADMIN_EMAILS=admin@mopgomglobal.com
   ```
5. **Click "Save Changes"**
6. **Redeploy your service**
7. **✅ Environment variables are more secure than database storage**

## 🔧 **Configuration Details**

### **Gmail SMTP Settings**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

### **Authentication**
```bash
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-16-character-app-password
```

### **Email Branding**
```bash
EMAIL_FROM_NAME=Mopgomyouth
EMAIL_REPLY_TO=your-gmail-address@gmail.com
ADMIN_EMAILS=admin@mopgomglobal.com,manager@mopgomglobal.com
```

## ✅ **Testing Your Setup**

### **Test 1: Settings Page Test**
1. **Go to Settings** → **Communications**
2. **Enter a test email address**
3. **Click "Send Test Email"**
4. **Check your inbox** for the test message

### **Test 2: Registration Email Test**
1. **Create a test registration**
2. **Check if confirmation email** is sent
3. **Verify QR code** is included

### **Test 3: Messaging System Test**
1. **Go to Inbox** in admin panel
2. **Send a test message** to a registrant
3. **Check if email notification** is sent

## 🚨 **Troubleshooting**

### **"Authentication Failed" Error**
- ✅ **Check**: App password is correct (16 characters, no spaces)
- ✅ **Check**: 2-Factor Authentication is enabled
- ✅ **Check**: Username is your full Gmail address

### **"Connection Refused" Error**
- ✅ **Check**: SMTP_HOST is `smtp.gmail.com`
- ✅ **Check**: SMTP_PORT is `587`
- ✅ **Check**: SMTP_SECURE is `false`

### **"Emails Not Sending" Error**
- ✅ **Check**: Gmail account is not suspended
- ✅ **Check**: Daily sending limits not exceeded
- ✅ **Check**: Recipient email addresses are valid

### **"App Password Not Working" Error**
1. **Delete the old app password**
2. **Generate a new one**
3. **Update your settings**
4. **Test again**

## 📊 **Gmail Sending Limits**

- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2,000 emails per day
- **Rate Limit**: 100 emails per hour

## 🔒 **Security Best Practices**

1. **Use App Passwords**: Never use your regular Gmail password
2. **Limit Access**: Only give app password to trusted systems
3. **Monitor Usage**: Check Gmail sent folder regularly
4. **Rotate Passwords**: Change app passwords periodically
5. **Use Dedicated Email**: Consider using a dedicated Gmail account for the system

## 🎉 **Success Indicators**

When everything is working correctly, you should see:

- ✅ **Registration confirmations** sent automatically
- ✅ **QR codes included** in registration emails
- ✅ **Message notifications** sent from inbox
- ✅ **Admin alerts** for new registrations
- ✅ **Test emails** working from settings page

## 📞 **Need Help?**

If you're still having issues:

1. **Check the logs** in your Render dashboard
2. **Verify all settings** are exactly as shown above
3. **Try a different Gmail account** to test
4. **Contact support** with error messages

---

**🎯 Quick Reference:**
- **SMTP Host**: `smtp.gmail.com`
- **SMTP Port**: `587`
- **Security**: App Password (not regular password)
- **2FA**: Required for app passwords
- **Test**: Use "Send Test Email" button in settings
