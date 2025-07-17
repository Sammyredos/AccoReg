# Production Deployment Guide

This guide covers deploying the Youth Registration System to production environments.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis (optional but recommended)
- SSL certificate for HTTPS
- Domain name

## Environment Setup

### 1. Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Required Variables
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database?schema=public
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-nextauth-secret-change-this
JWT_SECRET=your-super-secure-jwt-secret-change-this

# Admin Setup
SUPER_ADMIN_PASSWORD=YourSecurePassword123!

# Security
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_NAME=YouthReg
ADMIN_EMAILS=admin@your-domain.com

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE youthreg;
CREATE USER youthreg_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE youthreg TO youthreg_user;
```

2. Run database migrations:
```bash
npx prisma migrate deploy
```

3. Generate Prisma client:
```bash
npx prisma generate
```

## Deployment Options

### Option 1: Platform Deployment (Recommended)

Deploy to platforms like Render.com, Vercel, or Heroku using the provided configuration files.

### Option 2: Manual Deployment

1. Install dependencies:
```bash
npm ci --only=production
```

2. Build the application:
```bash
npm run build:production
```

3. Run database setup:
```bash
npm run deploy:production
```

4. Start the application:
```bash
npm run start:production
```

### Option 3: Platform Deployment (Render, Vercel, etc.)

#### Render.com Deployment

1. Connect your GitHub repository to Render
2. Set the build command: `npm run build:render`
3. Set the start command: `npm start`
4. Add environment variables in Render dashboard
5. Deploy

#### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Configure environment variables in Vercel dashboard

## Post-Deployment Setup

### 1. Initial Configuration

1. Access the admin panel at `https://your-domain.com/admin/login`
2. Login with the super admin credentials
3. Change the default password immediately
4. Configure system settings
5. Set up email notifications
6. Create additional admin users

### 2. Security Checklist

- [ ] SSL certificate installed and configured
- [ ] Strong passwords for all admin accounts
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Regular backups scheduled
- [ ] Monitoring and logging set up

### 3. Performance Optimization

- [ ] Enable Redis caching
- [ ] Configure CDN for static assets
- [ ] Set up database connection pooling
- [ ] Enable gzip compression
- [ ] Monitor application performance

## Monitoring and Maintenance

### Health Checks

The application provides health check endpoints:

- Basic health: `GET /api/health`
- Detailed health: `POST /api/health`

### Logging

Logs are written to:
- Console (stdout/stderr)
- File system (`./logs/` directory)

### Database Backups

Set up automated PostgreSQL backups:

```bash
# Daily backup script
pg_dump -h localhost -U youthreg_user youthreg > backup_$(date +%Y%m%d).sql
```

### Updates

1. Pull latest code
2. Install dependencies: `npm ci`
3. Run migrations: `npx prisma migrate deploy`
4. Build application: `npm run build:production`
5. Restart application

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check network connectivity

2. **Build Failures**
   - Clear cache: `npm run clean`
   - Check Node.js version compatibility
   - Verify all environment variables are set

3. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Ensure JWT_SECRET is properly configured

4. **Email Not Working**
   - Verify SMTP credentials
   - Check firewall settings
   - Test with a simple email client

### Support

For additional support:
1. Check the application logs
2. Use the health check endpoints
3. Review the troubleshooting section
4. Contact the development team

## Security Considerations

- Keep all dependencies updated
- Regularly rotate secrets and passwords
- Monitor for security vulnerabilities
- Implement proper access controls
- Use HTTPS everywhere
- Regular security audits
- Backup and disaster recovery planning
