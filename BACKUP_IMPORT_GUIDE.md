# 🔄 AccoReg Complete Backup & Import System

## 📋 Overview

AccoReg now includes a comprehensive backup and import system that allows you to:

- **📥 Download complete database backups** including all users, registrations, accommodations, and settings
- **📤 Import backups gracefully** with conflict resolution and error handling
- **🔄 Migrate between environments** (localhost ↔ production)
- **🛡️ Secure data transfer** with admin-only access controls

## 🎯 What Gets Backed Up

### ✅ Complete Data Export Includes:

1. **👥 User Management**
   - Admin accounts (passwords redacted for security)
   - User roles and permissions

2. **📝 Registration Data**
   - Main youth registrations
   - Children registrations
   - Teens registrations
   - QR codes and verification status

3. **🏠 Accommodation Data**
   - Rooms and room configurations
   - Room allocations and assignments

4. **⚙️ System Configuration**
   - Application settings
   - System branding and customization

5. **📊 Audit & Logs**
   - Audit logs
   - Email logs
   - SMS logs

## 🚀 How to Use

### 📥 Creating a Backup

1. **Navigate to Settings**
   ```
   Admin Dashboard → Settings → Data Management
   ```

2. **Download Complete Backup**
   - Click "Download Complete Backup"
   - File will be saved as: `accoreg-complete-backup-YYYY-MM-DD.json`
   - Contains all database data in JSON format

### 📤 Importing a Backup

1. **Navigate to Settings**
   ```
   Admin Dashboard → Settings → Data Management
   ```

2. **Import Complete Database**
   - Click "Import Complete Database"
   - Select your backup JSON file
   - System will process and import all data

### 🔄 Migration Process

**From Localhost to Production:**
```bash
# 1. Create backup on localhost
# Go to Settings → Data Management → Download Complete Backup

# 2. Transfer file to production server
# Upload the JSON file to your production environment

# 3. Import on production
# Go to Settings → Data Management → Import Complete Database
```

**From Production to Localhost:**
```bash
# Same process in reverse
# Download from production → Import to localhost
```

## 🛡️ Security & Permissions

### 🔐 Access Control

- **Backup Download**: Super Admin & Admin roles only
- **Import**: Super Admin role only (highest security)
- **Data Protection**: Passwords are redacted in backups

### 🔒 Security Features

- ✅ **Authentication required** for all operations
- ✅ **Role-based access control** 
- ✅ **Password redaction** in exported data
- ✅ **File type validation** (JSON only)
- ✅ **File size limits** (10MB max)

## 🔧 Technical Details

### 📊 Backup Format

```json
{
  "metadata": {
    "exportDate": "2024-01-15T10:30:00.000Z",
    "exportedBy": "admin-user-id",
    "exportedByName": "Admin Name",
    "version": "1.0",
    "totalRecords": {
      "admins": 5,
      "registrations": 150,
      "rooms": 20,
      // ... other counts
    }
  },
  "data": {
    "admins": [...],
    "registrations": [...],
    "rooms": [...],
    // ... all table data
  }
}
```

### 🔄 Import Process

1. **Validation**: File format and structure validation
2. **Transaction**: All imports happen in a database transaction
3. **Conflict Resolution**: Existing records are updated, new ones created
4. **Error Handling**: Detailed error reporting and rollback on failure
5. **Statistics**: Complete import statistics provided

### 📈 Import Statistics

After import, you'll see:
```
Imported: 150 records
Skipped: 25 duplicates  
Errors: 0
```

## 🚨 Important Notes

### ⚠️ Before Importing

1. **Backup Current Data**: Always backup your current database before importing
2. **Test Environment**: Test imports in a development environment first
3. **Admin Access**: Ensure you have Super Admin access for imports
4. **File Validation**: Only use backup files from trusted sources

### 🔄 Conflict Resolution

- **Existing Records**: Updated with new data
- **New Records**: Created normally
- **Duplicate IDs**: Existing records are preserved, new data updates them
- **Missing Dependencies**: Handled gracefully with error logging

### 📝 Best Practices

1. **Regular Backups**: Create backups before major changes
2. **Version Control**: Keep backup files with date stamps
3. **Test Imports**: Always test in development first
4. **Monitor Logs**: Check import statistics for any issues

## 🛠️ API Endpoints

### Backup Download
```
GET /api/admin/backup?action=download
```

### Import Upload
```
POST /api/admin/backup/import
Content-Type: multipart/form-data
Body: file (JSON backup)
```

## 🔍 Troubleshooting

### Common Issues

**❌ "Unauthorized" Error**
- Ensure you're logged in as Super Admin or Admin
- Check your session hasn't expired

**❌ "Invalid JSON Format"**
- Verify the backup file isn't corrupted
- Ensure it's a valid AccoReg backup file

**❌ "File Too Large"**
- Backup files must be under 10MB
- Contact support for larger databases

**❌ Import Errors**
- Check the import statistics for specific errors
- Review the console logs for detailed error messages

### 🆘 Recovery Steps

If import fails:
1. **Check Error Messages**: Review detailed error logs
2. **Verify File Integrity**: Ensure backup file is valid
3. **Database State**: Database remains unchanged on failure
4. **Retry**: Fix issues and retry import
5. **Support**: Contact support with error details

## 📚 Additional Resources

- **Admin Guide**: Full admin documentation
- **API Documentation**: Complete API reference
- **Security Guide**: Security best practices
- **Migration Guide**: Environment migration steps

---

## 🎉 Success!

Your AccoReg backup and import system is now ready to use. You can safely backup your entire database and restore it on any AccoReg instance with complete data integrity.

**Need Help?** Check the troubleshooting section or contact support with your backup/import logs.
