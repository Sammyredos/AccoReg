# 🚀 Production Deployment Guide - PostgreSQL on Render

This guide covers the complete production deployment of the Mopgomyouth Registration System with PostgreSQL database on Render.com.

## 📋 Prerequisites

- [x] Render.com account
- [x] GitHub repository with latest code
- [x] All environment variables configured
- [x] PostgreSQL database provisioned on Render

## 🗄️ Database Configuration

### PostgreSQL Setup
The application is configured to use PostgreSQL in production with the following features:

- **Database Provider**: PostgreSQL (production)
- **Auto-migrations**: Enabled
- **Schema sync**: Automatic
- **Backup system**: Integrated
- **Connection pooling**: Optimized for Render

### Environment Variables Required

```bash
# Database (Auto-configured by Render)
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_PRISMA_URL=postgresql://user:password@host:port/database
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:port/database

# Authentication & Security
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-minimum
JWT_SECRET=your-jwt-secret-32-chars-minimum
SUPER_ADMIN_PASSWORD=your-super-admin-password

# Optional Email Configuration
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Auto-Update Features
AUTO_DB_UPDATE_ENABLED=true
BACKUP_BEFORE_UPDATE=true
AUTO_SCHEMA_SYNC=true
```

## 🔧 Deployment Process

### Automatic Deployment
When you push to your main branch, Render will automatically:

1. **Install Dependencies**
   ```bash
   npm ci --production=false --legacy-peer-deps
   npm install --save-dev @types/node typescript tsx
   ```

2. **Database Setup**
   ```bash
   npx prisma generate          # Generate PostgreSQL client
   npx prisma migrate deploy    # Apply all migrations
   npx prisma db push          # Sync schema changes
   ```

3. **Auto-Update System**
   - Checks for schema differences
   - Creates database backup (if pg_dump available)
   - Applies schema updates automatically
   - Verifies database integrity

4. **Data Seeding**
   ```bash
   npx tsx scripts/create-super-admin.ts    # Create admin account
   npx tsx scripts/seed-settings.ts         # System settings
   npx tsx scripts/update-branding.ts       # Branding configuration
   npx tsx scripts/create-staff-role.ts     # Roles & permissions
   ```

5. **Application Build**
   ```bash
   NODE_ENV=production npm run build
   npm prune --production
   ```

### Manual Deployment Commands

If you need to run deployment manually:

```bash
# Full production deployment
npm run deploy:production

# Database-only operations
npm run migrate:production
npm run db:setup:production

# Health checks
npm run health:check
npm run auto:update
```

## 🔄 Auto-Update Features

### Automatic Schema Updates
The system automatically handles:

- **Schema Changes**: Detects and applies Prisma schema modifications
- **Migration Deployment**: Runs pending migrations automatically
- **Data Integrity**: Verifies database state after updates
- **Rollback Capability**: Creates backups before major changes

### Branch Field Updates
Special handling for the new branch field:
- **New Registrations**: Saves selected branch value
- **Existing Data**: Shows "Not Specified" for legacy records
- **Admin Updates**: Can modify branch for any registration

## 📊 Database Schema

### Core Tables
- `admins` - Admin users with role-based permissions
- `registrations` - Youth registrations (with branch field)
- `children_registrations` - Children registrations (with branch field)
- `rooms` - Accommodation room management
- `accommodations` - Room allocation tracking
- `settings` - System configuration
- `roles` - User role definitions

### Key Features
- **Branch Tracking**: All registrations include branch information
- **QR Code System**: Unique QR codes for attendance verification
- **Real-time Updates**: SSE for live attendance tracking
- **Audit Trail**: Verification/unverification tracking

## 🏥 Health Monitoring

### Automatic Health Checks
The system performs comprehensive health checks:

- **Database Connectivity**: PostgreSQL connection verification
- **Schema Validation**: Ensures all tables and fields exist
- **Environment Variables**: Validates required configuration
- **File System**: Checks critical application files
- **Security Settings**: Validates production security configuration

### Monitoring Endpoints
- `GET /api/admin/system/auto-update?action=health-check`
- `POST /api/admin/system/auto-update` (Super Admin only)

## 🔒 Security Configuration

### Production Security Features
- **Environment Isolation**: Production-only environment variables
- **Database Security**: PostgreSQL with connection pooling
- **Authentication**: JWT-based with secure session management
- **Role-based Access**: Granular permission system
- **HTTPS Enforcement**: Automatic SSL/TLS on Render

### Admin Access
- **Super Admin**: admin@mopgomglobal.com
- **Default Password**: Set via SUPER_ADMIN_PASSWORD environment variable
- **Role Management**: Staff, Manager, Admin, Super Admin levels

## 🚨 Troubleshooting

### Common Issues

1. **Migration Failures**
   ```bash
   # Reset and redeploy migrations
   npx prisma migrate reset --force
   npx prisma migrate deploy
   ```

2. **Schema Sync Issues**
   ```bash
   # Force schema sync
   npx prisma db push --force-reset
   ```

3. **Connection Problems**
   ```bash
   # Test database connection
   npx prisma db execute --stdin <<< "SELECT 1;"
   ```

### Logs and Debugging
- Check Render deployment logs for detailed error information
- Use health check endpoint for system status
- Monitor PostgreSQL connection metrics

## 📈 Performance Optimization

### Database Optimization
- **Indexes**: Optimized for branch, verification status, and gender queries
- **Connection Pooling**: Configured for Render's environment
- **Query Optimization**: Efficient data retrieval patterns

### Application Performance
- **Static Generation**: Optimized build for fast loading
- **Real-time Features**: Efficient SSE implementation
- **Caching**: Strategic caching for frequently accessed data

## 🔄 Backup and Recovery

### Automatic Backups
- **Pre-update Backups**: Created before schema changes
- **PostgreSQL Dumps**: Full database backups when pg_dump available
- **Rollback Capability**: Automatic rollback on update failures

### Manual Backup
```bash
# Create manual backup
curl -X POST /api/admin/system/auto-update \
  -H "Content-Type: application/json" \
  -d '{"action": "backup-database"}'
```

## 📞 Support

For deployment issues or questions:
1. Check Render deployment logs
2. Review health check results
3. Verify environment variable configuration
4. Test database connectivity

---

**🎉 Your Mopgomyouth Registration System is now production-ready with PostgreSQL!**

Access your application at: `https://your-app-name.onrender.com`
