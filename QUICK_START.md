# 🚀 AccoReg Quick Start Guide

Get AccoReg running on both localhost and production in minutes!

## 📋 Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Database**: SQLite (development) or PostgreSQL (production)

## ⚡ Quick Start (Any Environment)

### Option 1: Auto Setup (Recommended)
```bash
# Clone and setup
git clone <your-repo>
cd AccoReg

# Auto-start (detects environment automatically)
npm run start:auto
```

### Option 2: Manual Environment Selection
```bash
# For localhost development
npm run start:local

# For production
npm run start:production
```

## 🔧 What the Auto-Setup Does

✅ **Detects your environment** (localhost vs production)  
✅ **Creates environment files** (.env.local or .env.production)  
✅ **Installs dependencies** automatically  
✅ **Sets up database** (SQLite for dev, PostgreSQL for prod)  
✅ **Generates secure secrets** automatically  
✅ **Starts the application** in the correct mode  

## 🌍 Environment-Specific Behavior

### 🏠 Localhost Development
- **Database**: SQLite (`./dev.db`)
- **URL**: `http://localhost:3000`
- **Mode**: Development with hot reload
- **Security**: Relaxed headers
- **Logging**: Debug level

### 🚀 Production
- **Database**: PostgreSQL (configurable)
- **URL**: Your production domain
- **Mode**: Optimized build
- **Security**: Full security headers
- **Logging**: Info level

## 📁 Environment Files

The setup automatically creates:

- **`.env.local`** - Development environment
- **`.env.production`** - Production environment

## 🔑 Required Configuration

### Minimal Setup (Auto-Generated)
- `DATABASE_URL` - Database connection
- `JWT_SECRET` - Authentication secret
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - Application URL

### Optional Features
- **Email**: SMTP configuration for notifications
- **SMS**: SMS provider for notifications  
- **File Upload**: Cloudinary for file storage
- **Monitoring**: Sentry for error tracking

## 🛠️ Manual Setup (If Needed)

### 1. Environment File
```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

### 2. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Setup database
npm run db:push

# Create admin user
npm run setup:admin
```

### 3. Start Application
```bash
# Development
npm run dev

# Production
npm run build && npm run start
```

## 🔍 Health Check

Check if your app is running correctly:

```bash
# Local
curl http://localhost:3000/api/health

# Production  
curl https://yourdomain.com/api/health
```

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check DATABASE_URL in your .env file
# For SQLite: "file:./dev.db"
# For PostgreSQL: "postgresql://user:pass@host:port/db"
```

**Port Already in Use**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run start:auto
```

**Missing Dependencies**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Build Errors**
```bash
# Clean build
npm run clean
npm run build
```

### Environment Validation

The app automatically validates your environment on startup. If you see errors:

1. **Check required environment variables**
2. **Ensure secrets are at least 32 characters**
3. **Verify database URL format**
4. **Check file permissions**

## 📚 Additional Resources

- **Full Documentation**: `README.md`
- **Environment Setup**: `ENVIRONMENT_SETUP.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`

## 🎯 Quick Commands Reference

```bash
# Start in any environment
npm run start:auto

# Development only
npm run start:local
npm run dev

# Production only  
npm run start:production
npm run build && npm run start

# Database operations
npm run db:push
npm run db:generate
npm run setup:admin

# Utilities
npm run clean
npm run type-check
npm run lint
```

## 🔐 Security Notes

- **Development**: Uses relaxed security for easier debugging
- **Production**: Enables all security headers and HTTPS
- **Secrets**: Auto-generated securely, but update for production
- **Database**: SQLite for dev, PostgreSQL recommended for production

## 🆘 Need Help?

1. Check the health endpoint: `/api/health`
2. Review logs in the console
3. Check environment file configuration
4. Refer to full documentation
5. Check GitHub issues

---

**🎉 That's it! Your AccoReg app should now be running smoothly in any environment.**
