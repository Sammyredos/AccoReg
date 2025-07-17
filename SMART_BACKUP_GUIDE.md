# Smart Backup System Guide

## 🎯 **Why Smart Backup is Better**

The **Smart Backup (JSON format)** is the recommended backup method for AccoReg because it:

### ✅ **Preserves Your Data**
- **Never deletes** existing records
- **Keeps all recent changes** made after backup creation
- **Protects against data loss** during restore operations

### ✅ **Intelligent Merging**
- **Adds new records** from backup without conflicts
- **Updates changed records** with smart conflict resolution
- **Detects conflicts** and lets you choose how to handle them

### ✅ **Safe & Flexible**
- **Preview changes** before applying them
- **Multiple conflict resolution strategies** (backup wins, current wins, merge fields, manual)
- **Transaction-based operations** (all-or-nothing)
- **Detailed logging** and audit trail

## 📁 **File Format: JSON**

Smart backups are saved in **JSON format** with this structure:

```json
{
  "tables": [
    {
      "tableName": "User",
      "primaryKey": "id",
      "records": [
        {
          "id": "user123",
          "email": "john@example.com",
          "name": "John Doe",
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        }
      ]
    },
    {
      "tableName": "Registration",
      "primaryKey": "id", 
      "records": [...]
    }
  ],
  "metadata": {
    "exportedAt": "2024-01-15T12:00:00.000Z",
    "version": "1.0",
    "recordCounts": {
      "User": 150,
      "Registration": 300,
      "Message": 75,
      "Room": 50
    }
  }
}
```

## 🚀 **How to Use Smart Backup**

### **Creating a Smart Backup:**

1. **Navigate to Backup Page**: Go to `/admin/backup`
2. **Click "Create Smart Backup"**: The green button (recommended option)
3. **Download Automatically**: JSON file downloads when ready
4. **File Name**: `incremental-backup-YYYY-MM-DDTHH-mm-ss.json`

### **Restoring/Merging a Smart Backup:**

1. **Upload File**: Select your `.json` backup file
2. **Smart Mode**: Ensure "Smart Mode" is enabled (default)
3. **Analyze**: Click "Analyze for Merge" to preview changes
4. **Review Results**: See new records, updates, and conflicts
5. **Choose Strategy**: Select conflict resolution method
6. **Execute**: Click "Perform Incremental Merge"

## ⚙️ **Conflict Resolution Strategies**

### **1. Backup Wins (Default)**
- Uses backup data for all conflicts
- **Best for**: Restoring from authoritative source

### **2. Current Wins**
- Keeps current data, skips conflicting updates
- **Best for**: Preserving recent local changes

### **3. Merge Fields**
- Combines non-conflicting fields intelligently
- **Best for**: Getting best of both datasets

### **4. Manual Resolution**
- Review each conflict individually
- **Best for**: Critical data requiring careful review

## 📊 **What Gets Backed Up**

Smart backups include **all your data**:

- ✅ **Users & Admins** (accounts, roles, permissions)
- ✅ **Registrations** (participant data, status, verification)
- ✅ **Messages** (communications, delivery status)
- ✅ **Rooms & Allocations** (accommodation assignments)
- ✅ **System Configuration** (settings, preferences)
- ✅ **SMS Verification** (phone verification records)

## 🔒 **Security & Safety**

### **Access Control**
- **Admin Only**: Requires Super Admin or Admin role
- **Secure Authentication**: Token-based verification
- **Audit Logging**: All operations tracked with user ID

### **Data Protection**
- **File Validation**: Type, size, and format checking
- **Path Security**: Protection against directory traversal
- **Transaction Safety**: All-or-nothing operations
- **Error Recovery**: Automatic cleanup on failure

### **Backup Storage**
- **Secure Directory**: Stored in protected backup folder
- **Automatic Cleanup**: Old backups removed automatically
- **Compression Support**: Optional gzip compression
- **Encryption Ready**: AES-256-CBC encryption available

## 🎯 **Common Use Cases**

### **1. Environment Sync**
```
Development → Production
- Create smart backup on production
- Merge into development safely
- Preserves dev-specific data
```

### **2. Data Recovery**
```
Accidental Deletion Recovery
- Use recent smart backup
- Restore only deleted records
- Keep all current data intact
```

### **3. Partial Restore**
```
Selective Data Import
- Choose specific tables to merge
- Skip sensitive data tables
- Merge only what you need
```

### **4. Conflict Resolution**
```
Multi-Source Data Merge
- Combine data from multiple sources
- Resolve conflicts intelligently
- Maintain data integrity
```

## 🛠️ **API Endpoints**

### **Create & Download Smart Backup**
```bash
GET /api/admin/backup/download?action=create-and-download&type=incremental
```

### **Analyze Backup for Merge**
```bash
POST /api/admin/backup/merge
{
  "action": "analyze",
  "filename": "backup.json",
  "options": {
    "conflictResolution": "backup_wins",
    "preserveNewer": true
  }
}
```

### **Perform Smart Merge**
```bash
POST /api/admin/backup/merge
{
  "action": "merge", 
  "filename": "backup.json",
  "options": {
    "conflictResolution": "backup_wins",
    "preserveNewer": true,
    "dryRun": false
  }
}
```

## 💡 **Best Practices**

### **Regular Backups**
- Create smart backups **daily** or before major changes
- Keep **multiple backup versions** for different restore points
- Test restore procedures in **development environment** first

### **Conflict Management**
- Use **"Preserve Newer"** option to keep recent changes
- Choose **"Manual Resolution"** for critical data conflicts
- Always **preview changes** with dry run before applying

### **File Management**
- Use **descriptive filenames** with dates/purposes
- Store backups in **secure, accessible location**
- Keep backups **separate from main system** for disaster recovery

## 🆚 **Smart Backup vs Full Backup**

| Feature | Smart Backup (JSON) | Full Backup (SQL) |
|---------|-------------------|------------------|
| **Data Safety** | ✅ Preserves current data | ❌ Overwrites everything |
| **Conflict Handling** | ✅ Intelligent resolution | ❌ No conflict detection |
| **Selective Restore** | ✅ Choose tables/records | ❌ All-or-nothing |
| **Preview Changes** | ✅ Dry run available | ❌ No preview |
| **File Format** | JSON (readable) | SQL (technical) |
| **Use Case** | Daily operations | Disaster recovery |

## 🎉 **Conclusion**

Smart Backup is the **safest and most flexible** way to backup and restore your AccoReg data. It gives you:

- **Peace of mind** knowing your current data is safe
- **Flexibility** to merge data from different sources
- **Control** over how conflicts are resolved
- **Transparency** with detailed preview and logging

**Recommendation**: Use Smart Backup for all regular backup operations and reserve Full Backup only for complete system restoration scenarios.
