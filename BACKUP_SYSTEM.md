# Backup & Restore System

This document describes the comprehensive backup and restore system implemented for the AccoReg application.

## Features

### ✅ Complete Database Backup
- **Full Data Export**: Backs up all tables including users, participants, registrations, messages, rooms, and system configuration
- **Multi-Database Support**: Works with both SQLite (development) and PostgreSQL (production)
- **Compression**: Optional gzip compression to reduce file size
- **Encryption**: Optional AES-256-CBC encryption for sensitive data

### ✅ Easy Download System
- **Direct Download**: Create and download backups instantly via web interface
- **Existing Backup Download**: Download previously created backup files
- **Progress Indicators**: Real-time feedback during backup creation
- **File Information**: Shows file size, creation date, and other metadata

### ✅ Graceful Import & Restore
- **File Upload**: Upload backup files through web interface with drag-and-drop support
- **Validation**: Comprehensive file validation (type, size, format)
- **Immediate Restore**: Option to restore database immediately after upload
- **Error Handling**: Detailed error messages and rollback on failure

### ✅ Admin Interface
- **Dedicated Page**: `/admin/backup` - Full backup management interface
- **Role-Based Access**: Only Super Admin and Admin roles can access
- **Multi-language Support**: Available in English, French, Spanish, Hausa, Igbo, and Yoruba
- **Responsive Design**: Works on desktop and mobile devices

## API Endpoints

### Backup Management
- `GET /api/admin/backup` - List existing backups
- `POST /api/admin/backup` - Create, restore, or cleanup backups

### Download System
- `GET /api/admin/backup/download?action=create-and-download` - Create new backup and download
- `GET /api/admin/backup/download?action=download&filename=backup.sql` - Download existing backup

### Import System
- `POST /api/admin/backup/import` - Upload and optionally restore backup
- `GET /api/admin/backup/import` - Get import configuration and limits

## Usage

### Creating and Downloading a Backup

1. Navigate to `/admin/backup`
2. Click "Create & Download" button
3. Wait for backup creation (progress shown)
4. File automatically downloads when ready

### Uploading and Restoring a Backup

1. Navigate to `/admin/backup`
2. Select backup file (.sql or .sql.gz)
3. Optionally check "Restore immediately"
4. Click "Upload" or "Upload & Restore"
5. Monitor progress and confirmation

### Managing Existing Backups

1. View list of existing backups with metadata
2. Download any backup file
3. Restore from any backup file
4. Automatic cleanup of old backups

## Configuration

Environment variables in `.env`:

```bash
# Backup Configuration
BACKUP_DIR=./backups                    # Directory to store backups
BACKUP_RETENTION_DAYS=30               # Days to keep old backups
BACKUP_COMPRESSION=true                # Enable gzip compression
BACKUP_ENCRYPTION=false                # Enable AES encryption
BACKUP_ENCRYPTION_KEY=your-key-here    # Encryption key (if enabled)
```

## Database Support

### SQLite (Development)
- Direct file copy with optional compression
- Fast backup and restore operations
- Suitable for development and small deployments

### PostgreSQL (Production)
- Uses `pg_dump` and `psql` commands
- Supports large databases
- Includes schema and data
- Production-ready with proper error handling

## Security Features

### Authentication & Authorization
- Requires admin authentication
- Role-based access control (Super Admin, Admin only)
- Secure token validation

### File Security
- Path traversal protection
- File type validation
- Size limits (500MB max)
- Secure filename handling

### Data Protection
- Optional encryption at rest
- Secure file storage
- Automatic cleanup of temporary files

## Error Handling

### Comprehensive Validation
- Database connection checks
- File format validation
- Size and type restrictions
- Permission verification

### Graceful Failures
- Detailed error messages
- Automatic cleanup on failure
- Transaction rollback where applicable
- User-friendly error reporting

## Monitoring & Logging

### Audit Trail
- All backup operations logged
- User identification in logs
- Timestamp and duration tracking
- Success/failure status

### Performance Metrics
- Backup creation time
- File sizes and compression ratios
- Database connection health
- Storage usage tracking

## Best Practices

### Regular Backups
- Schedule automated backups
- Test restore procedures regularly
- Monitor backup success/failure
- Maintain multiple backup copies

### Security
- Use encryption for sensitive data
- Secure backup storage location
- Regular access review
- Backup retention policies

### Performance
- Run backups during low-usage periods
- Monitor disk space usage
- Optimize compression settings
- Clean up old backups regularly

## Troubleshooting

### Common Issues

1. **Backup Creation Fails**
   - Check database connection
   - Verify disk space
   - Check file permissions
   - Review error logs

2. **Restore Fails**
   - Validate backup file integrity
   - Check database permissions
   - Verify file format
   - Review compatibility

3. **Upload Issues**
   - Check file size limits
   - Verify file format
   - Check network connectivity
   - Review browser console

### Support
For technical support or issues, check the application logs and contact the system administrator.
