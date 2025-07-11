# Settings Configuration Guide

## 🎯 **Overview**

AccoReg now includes comprehensive settings management with dedicated sections for Email and SMS configuration. This guide explains how to configure and manage all system settings.

## 📋 **Settings Categories**

### **1. User Management**
- **Default User Role**: Role assigned to new users
- **Allow Self Registration**: Enable/disable user self-registration
- **Maximum Users**: System user limit
- **Session Timeout**: User session duration

### **2. Security**
- **Password Requirements**: Minimum length, complexity rules
- **Two-Factor Authentication**: Enable/disable 2FA
- **Login Attempts**: Maximum failed login attempts
- **Account Lockout**: Lockout duration after failed attempts

### **3. Email Configuration** ✨ **NEW**
- **SMTP Host**: Email server hostname
- **SMTP Port**: Email server port (587 for TLS, 465 for SSL)
- **SMTP Username**: Authentication username
- **Use SSL/TLS**: Enable encryption
- **From Name**: Display name for outgoing emails
- **Reply-To Email**: Email address for replies
- **Admin Email Addresses**: Comma-separated admin emails

### **4. SMS Configuration** ✨ **NEW**
- **Enable SMS**: Turn SMS functionality on/off
- **SMS Provider**: Choose provider (Mock, Twilio, AWS SNS, Local Gateway)
- **SMS API Key**: Provider API key/Account SID
- **SMS From Number**: Sender phone number
- **SMS Region**: AWS region (for SNS)
- **SMS Gateway URL**: Local gateway endpoint

### **5. Notifications**
- **Email Notifications**: Enable system email notifications
- **SMS Notifications**: Enable SMS notifications
- **Admin Notifications**: Send notifications to admins
- **Registration Notifications**: Notify on new registrations
- **Notification Retention**: How long to keep notifications

### **6. System**
- **System Name**: Application display name
- **Timezone**: Default system timezone
- **Date Format**: System date format
- **Maintenance Mode**: Enable maintenance mode
- **Debug Mode**: Enable debug logging

## 🔧 **How to Configure Settings**

### **Step 1: Access Settings Page**
1. Log in as **Super Admin** (only Super Admins can edit settings)
2. Navigate to **Admin Dashboard** → **Settings**
3. You'll see all settings categories with beautiful icons

### **Step 2: Edit Settings**
1. Click **"Edit"** button on any category card
2. Modify the settings values:
   - **Toggle switches** for enable/disable options
   - **Text fields** for names, URLs, emails
   - **Dropdown menus** for predefined options
   - **Number fields** for numeric values
3. Click **"Save"** to apply changes
4. Settings are applied **immediately** across the system

### **Step 3: Verify Changes**
- Settings take effect immediately
- Check the relevant functionality to confirm changes
- Monitor system logs for any configuration errors

## 📧 **Email Configuration Setup**

### **Gmail SMTP Setup**
```bash
# In your .env file or Settings page:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Not your regular password!
SMTP_SECURE=false
EMAIL_FROM_NAME=AccoReg
EMAIL_REPLY_TO=noreply@yourdomain.com
ADMIN_EMAILS=admin@yourdomain.com,manager@yourdomain.com
```

### **Outlook/Office 365 SMTP Setup**
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_SECURE=false
```

### **Custom SMTP Setup**
```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_SECURE=true  # if using port 465
```

## 📱 **SMS Configuration Setup**

### **Mock Provider (Development)**
```bash
SMS_ENABLED=true
SMS_PROVIDER=mock
# No other configuration needed - perfect for testing!
```

### **Twilio Setup**
```bash
SMS_ENABLED=true
SMS_PROVIDER=twilio
SMS_API_KEY=your-twilio-account-sid
SMS_API_SECRET=your-twilio-auth-token
SMS_FROM_NUMBER=+1234567890
```

### **AWS SNS Setup**
```bash
SMS_ENABLED=true
SMS_PROVIDER=aws-sns
SMS_API_KEY=your-aws-access-key-id
SMS_API_SECRET=your-aws-secret-access-key
SMS_REGION=us-east-1
```

### **Local Gateway Setup**
```bash
SMS_ENABLED=true
SMS_PROVIDER=local-gateway
SMS_GATEWAY_URL=http://your-gateway:8080/send-sms
SMS_API_KEY=your-gateway-api-key
```

## 🔗 **Environment Variables vs Settings Page**

### **Priority Order**
1. **Settings Page** (highest priority)
2. **Environment Variables** (fallback)
3. **Default Values** (last resort)

### **How It Works**
- Settings page values **override** environment variables
- If a setting is not configured in the settings page, the system uses the environment variable
- If neither is set, default values are used

### **Best Practices**
- Use **environment variables** for initial setup and deployment
- Use **settings page** for runtime configuration changes
- Keep sensitive values (passwords, API keys) in environment variables when possible

## 🛡️ **Security Considerations**

### **Sensitive Information**
- **SMTP passwords** and **SMS API secrets** should be stored securely
- Consider using environment variables for production secrets
- Settings page shows masked values for sensitive fields

### **Access Control**
- Only **Super Admin** users can modify settings
- **Admin** users can view settings (read-only)
- **Regular users** cannot access settings page

### **Audit Trail**
- All settings changes are logged
- Logs include user ID, timestamp, and changed values
- Monitor logs for unauthorized changes

## 🔄 **Settings Synchronization**

### **Multi-Instance Deployments**
- Settings are stored in the database
- Changes apply to **all application instances** immediately
- No restart required for most settings

### **Backup and Restore**
- Settings are included in database backups
- Export settings for migration between environments
- Import settings from backup files

## 🚨 **Troubleshooting**

### **Email Not Working**
1. Check SMTP settings in Settings page
2. Verify SMTP credentials are correct
3. Test with a simple email client
4. Check firewall/network restrictions
5. Review application logs for SMTP errors

### **SMS Not Working**
1. Verify SMS provider settings
2. Check API credentials and permissions
3. Ensure SMS provider account has sufficient balance
4. Test with provider's testing tools
5. Review SMS service logs

### **Settings Not Saving**
1. Ensure you're logged in as Super Admin
2. Check for validation errors in the form
3. Verify database connectivity
4. Review application logs for errors

### **Settings Not Taking Effect**
1. Refresh the page to see updated values
2. Check if the setting requires application restart
3. Verify the setting is being read correctly in logs
4. Clear browser cache if needed

## 📊 **Settings Monitoring**

### **Health Checks**
- Email configuration health check: `/api/health/email`
- SMS configuration health check: `/api/health/sms`
- Overall system health: `/api/health`

### **Configuration Status**
```javascript
// Check email configuration
fetch('/api/admin/email-config')
  .then(res => res.json())
  .then(data => console.log('Email config:', data))

// Check SMS configuration  
fetch('/api/admin/sms-config')
  .then(res => res.json())
  .then(data => console.log('SMS config:', data))
```

## 🎉 **Benefits of Centralized Settings**

### **For Administrators**
- **Easy Configuration**: No need to edit files or restart services
- **Real-time Changes**: Settings apply immediately
- **Visual Interface**: Beautiful, intuitive settings management
- **Validation**: Built-in validation prevents configuration errors

### **For Developers**
- **Environment Agnostic**: Same interface across dev/staging/production
- **Version Control**: Settings changes are tracked and auditable
- **API Access**: Programmatic access to settings via API
- **Type Safety**: Settings are validated and type-checked

### **For Organizations**
- **Centralized Control**: All configuration in one place
- **Role-based Access**: Only authorized users can change settings
- **Audit Trail**: Complete history of configuration changes
- **Backup Integration**: Settings included in system backups

## 🚀 **Next Steps**

1. **Configure Email**: Set up SMTP settings for email functionality
2. **Configure SMS**: Choose and configure your SMS provider
3. **Test Configuration**: Send test emails and SMS messages
4. **Monitor Usage**: Set up monitoring and alerting
5. **Train Staff**: Ensure admins know how to manage settings

Your settings management system is now ready for production use! 🎯
