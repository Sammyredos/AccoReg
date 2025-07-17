# 🚀 Render.com Production Deployment Guide

## 📋 Overview

This guide will help you deploy your AccoReg application to Render.com with PostgreSQL database support.

## 🎯 Prerequisites

- ✅ Git repository with your code
- ✅ Render.com account
- ✅ Code prepared for PostgreSQL (completed ✅)

## 🔧 Step 1: Prepare Your Code

Your code is already prepared! But let's verify:

```bash
# Run the preparation script
npm run prepare:production
```

This will:
- ✅ Verify PostgreSQL configuration
- ✅ Check render.yaml setup
- ✅ Generate database migrations
- ✅ Validate build process
- ✅ Create deployment checklist

## 🗄️ Step 2: Create PostgreSQL Database on Render

1. **Go to Render Dashboard**
   - Visit [render.com](https://render.com)
   - Sign in to your account

2. **Create New PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - **Name**: `youth-registration-database`
   - **Database**: `youth_registration`
   - **User**: `youth_user`
   - **Region**: `Oregon (US West)`
   - **Plan**: `Free` (or paid for production)

3. **Note Connection Details**
   - After creation, copy the **Internal Database URL**
   - Format: `postgresql://username:password@hostname:port/database`

## 🌐 Step 3: Deploy Web Service

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your Git repository

2. **Configure Service**
   - **Name**: `mopgomyouth` (or your preferred name)
   - **Region**: `Oregon (US West)`
   - **Branch**: `main` (or your production branch)
   - **Runtime**: `Node`
   - **Build Command**: (auto-detected from render.yaml)
   - **Start Command**: (auto-detected from render.yaml)

3. **Environment Variables**
   The render.yaml will automatically configure most variables, but verify these key ones:

   ```
   NODE_ENV=production
   DATABASE_URL=[Your PostgreSQL Internal URL from Step 2]
   NEXTAUTH_URL=https://your-app-name.onrender.com
   NEXTAUTH_SECRET=[Generate 32+ character secret]
   JWT_SECRET=[Generate 32+ character secret]
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```

## ⚙️ Step 4: Configure Environment Variables

### Required Variables (Auto-configured by render.yaml):
- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL` (from PostgreSQL service)
- ✅ `NEXTAUTH_SECRET` (auto-generated)
- ✅ `JWT_SECRET` (auto-generated)
- ✅ `ENCRYPTION_KEY` (auto-generated)

### Email Configuration (Update these):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_NAME=AccoReg
ADMIN_EMAILS=admin@yourdomain.com
```

### Security Settings (Pre-configured):
```
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
RATE_LIMIT_ENABLED=true
```

## 🚀 Step 5: Deploy

1. **Trigger Deployment**
   - Click "Create Web Service"
   - Render will automatically start building

2. **Monitor Build Process**
   - Watch the build logs
   - The process includes:
     - Installing dependencies
     - Generating Prisma client
     - Running database migrations
     - Setting up admin account
     - Building Next.js application

3. **Build Success Indicators**
   ```
   ✅ Dependencies installed successfully
   ✅ Prisma client generated
   ✅ Database migrations deployed
   ✅ Super Admin account ready
   ✅ Settings seeded successfully
   ✅ Next.js build completed
   ```

## 🔍 Step 6: Post-Deployment Verification

### 1. Health Check
Visit: `https://your-app.onrender.com/api/health`
Should return: `{"status": "ok", "database": "connected"}`

### 2. Admin Login
- URL: `https://your-app.onrender.com/admin/login`
- Email: `admin@mopgomglobal.com`
- Password: `SuperAdmin123!` (or your custom password)

### 3. Test Core Features
- ✅ Admin dashboard loads
- ✅ Registration form works
- ✅ Database operations function
- ✅ Email notifications work
- ✅ QR code generation works

## 🛠️ Troubleshooting

### Common Issues:

**❌ Build Fails**
```bash
# Check environment variables are set
# Verify DATABASE_URL format
# Check render.yaml syntax
```

**❌ Database Connection Error**
```bash
# Verify PostgreSQL service is running
# Check DATABASE_URL is correct
# Ensure database allows connections
```

**❌ Admin Login Fails**
```bash
# Check SUPER_ADMIN_PASSWORD is set
# Verify admin account was created
# Check database has admin table
```

**❌ Emails Not Sending**
```bash
# Verify SMTP credentials
# Check email environment variables
# Test with Gmail app password
```

### Debug Commands:
```bash
# View application logs
render logs --service your-service-name

# Check database connection
npx prisma db pull

# Reset admin password
npx tsx scripts/reset-admin-password.ts
```

## 📊 Performance Optimization

Your render.yaml includes optimizations:
- ✅ Connection pooling (15 connections)
- ✅ Query timeouts (30s)
- ✅ Rate limiting enabled
- ✅ Gzip compression
- ✅ Security headers
- ✅ Real-time features optimized

## 🔒 Security Features

Production security enabled:
- ✅ HTTPS enforced
- ✅ Security headers (CSP, HSTS)
- ✅ Rate limiting
- ✅ Input validation
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ CSRF protection

## 📱 Mobile Optimization

Your app includes:
- ✅ Responsive design
- ✅ Touch-friendly interface
- ✅ Mobile-optimized charts
- ✅ Progressive Web App features

## 🎉 Success!

Your AccoReg application is now live at:
**https://your-app-name.onrender.com**

### Default Admin Access:
- **Email**: `admin@mopgomglobal.com`
- **Password**: `SuperAdmin123!`

### Features Available:
- ✅ Youth registration system
- ✅ QR code generation and scanning
- ✅ Room allocation and management
- ✅ Real-time attendance tracking
- ✅ Email notifications
- ✅ Admin dashboard with analytics
- ✅ Backup and import system
- ✅ Mobile-responsive interface

## 📞 Support

If you need help:
1. Check the build logs in Render dashboard
2. Review environment variables
3. Test database connection
4. Verify email configuration
5. Check the troubleshooting section above

Your production deployment is complete! 🎉
