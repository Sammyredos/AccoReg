# 🚀 Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ **Environment Configuration**
- [ ] Set `NODE_ENV=production` in your environment
- [ ] Configure production database URL (PostgreSQL recommended)
- [ ] Set up SMTP email configuration with real credentials
- [ ] Configure SSL certificates
- [ ] Set up Redis for rate limiting (recommended)
- [ ] Configure monitoring (Sentry, APM)

### ✅ **Security Configuration**
- [ ] Enable security headers (`SECURITY_HEADERS_ENABLED=true`)
- [ ] Enable CSP (`CSP_ENABLED=true`)
- [ ] Enable HSTS (`HSTS_ENABLED=true`)
- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Configure backup encryption
- [ ] Set up rate limiting

### ✅ **Required Environment Variables**
```bash
# Core Configuration
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secure-secret-key-here
DATABASE_URL=postgresql://user:password@host:port/database

# Email Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true

# Rate Limiting (Recommended)
RATE_LIMIT_ENABLED=true
REDIS_URL=redis://localhost:6379

# Monitoring (Recommended)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info

# Backup Configuration
BACKUP_ENCRYPTION=true
BACKUP_ENCRYPTION_KEY=your-32-character-encryption-key
```

## 🏗️ **Build Process**

### **1. Install Dependencies**
```bash
npm ci --production
```

### **2. Generate Prisma Client**
```bash
npx prisma generate
```

### **3. Run Database Migrations**
```bash
npx prisma migrate deploy
```

### **4. Build Application**
```bash
npm run build:production
```

### **5. Create Super Admin**
```bash
npm run setup:admin
```

## 🚀 **Deployment Options**

### **Option 1: Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Option 2: PM2 Deployment**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "youth-registration" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### **Option 3: Systemd Service**
```ini
[Unit]
Description=Youth Registration System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/youth-registration
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## 🔧 **Production Optimizations**

### **1. Database**
- Use PostgreSQL for production
- Set up connection pooling
- Configure database backups
- Enable query logging for monitoring

### **2. Caching**
- Set up Redis for session storage
- Enable Next.js caching
- Configure CDN for static assets

### **3. Monitoring**
- Set up Sentry for error tracking
- Configure APM monitoring
- Set up log aggregation
- Monitor database performance

### **4. Security**
- Enable all security headers
- Set up SSL/TLS certificates
- Configure firewall rules
- Regular security updates

## 📊 **Health Checks**

### **Application Health**
```bash
curl https://yourdomain.com/api/health
```

### **Database Health**
```bash
curl https://yourdomain.com/api/admin/health/database
```

### **Email Health**
```bash
curl https://yourdomain.com/api/admin/health/email
```

## 🔄 **Backup Strategy**

### **1. Database Backups**
```bash
# Daily database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### **2. Application Backups**
```bash
# Export system settings
curl -X GET https://yourdomain.com/api/admin/settings/export > settings-backup.json
```

### **3. File Backups**
- Back up uploaded files
- Back up configuration files
- Back up SSL certificates

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Database Connection**: Check DATABASE_URL and network connectivity
2. **Email Issues**: Verify SMTP credentials and firewall settings
3. **Build Errors**: Check Node.js version and dependencies
4. **Performance**: Monitor memory usage and database queries

### **Logs Location**
- Application logs: `/var/log/youth-registration/`
- PM2 logs: `~/.pm2/logs/`
- System logs: `/var/log/syslog`

## 📞 **Support**

For production support:
1. Check application logs
2. Review monitoring dashboards
3. Check database performance
4. Contact system administrator

---

**🎉 Your Youth Registration System is now production-ready!**
