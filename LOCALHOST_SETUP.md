# Localhost Development Setup

This guide shows you how to run your Youth Registration System locally for development and testing.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database & Admin (One Command)
```bash
# Set up everything for development (SQLite + Admin)
npm run setup:dev
```

**OR manually:**
```bash
# Generate Prisma client for development
npm run db:generate:dev

# Push database schema (creates SQLite database)
npm run db:push:dev

# Create super admin account
npm run setup:admin
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access Your App
- **Main App**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin/login
- **Health Check**: http://localhost:3000/api/health

## 🔐 Login Credentials

### Default Admin Account
- **Email**: `admin@mopgomglobal.com`
- **Password**: `SuperAdmin123!`
- **URL**: http://localhost:3000/admin/login

⚠️ **Change password after first login!**

## 📋 Available Scripts

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
```

### Database
```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Create and run migrations
npm run db:studio        # Open Prisma Studio
```

### Admin & Testing
```bash
npm run setup:admin      # Create super admin
npm run test:login       # Test login functionality
npm run test:production  # Test production setup
```

### Utilities
```bash
npm run clean            # Clean build files
npm run fresh            # Clean and restart dev server
```

## 🗄️ Database

### Development Database
- **Type**: SQLite
- **File**: `dev.db` (created automatically)
- **Location**: Project root directory

### View Database
```bash
# Open Prisma Studio to view/edit data
npm run db:studio
```
Then visit: http://localhost:5555

### Reset Database
```bash
# Reset database and recreate admin
npx prisma db push --force-reset
npm run setup:admin
```

## 📧 Email Configuration (Development)

For development, emails are logged to console by default. To test real emails:

1. **Update `.env.local`**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_NAME=YouthReg
```

2. **Test Email**:
   - Login to admin panel
   - Go to Settings → Email Configuration
   - Click "Send Test Email"

## 🔧 Environment Variables

### Required for Development
```bash
# Database
DATABASE_URL="file:./dev.db"

# Authentication
NEXTAUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
NEXTAUTH_URL=http://localhost:3000

# Admin
SUPER_ADMIN_PASSWORD=SuperAdmin123!
```

### Optional for Development
```bash
# Email (for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Features
RATE_LIMIT_ENABLED=false
SMS_ENABLED=false
```

## 🧪 Testing

### Test Login
```bash
npm run test:login
```

### Test Production Setup
```bash
npm run test:production
```

### Manual Testing
1. **Registration Flow**:
   - Visit: http://localhost:3000/register
   - Fill out registration form
   - Check admin panel for new registration

2. **Admin Functions**:
   - Login to admin panel
   - Test user management
   - Test email functionality
   - Test reports and analytics

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Error**:
   ```bash
   npx prisma db push
   npm run setup:admin
   ```

2. **Admin Login Not Working**:
   ```bash
   # Recreate admin user
   npm run setup:admin
   ```

3. **Port Already in Use**:
   ```bash
   # Use different port
   npm run dev -- -p 3001
   ```

4. **Build Errors**:
   ```bash
   # Clean and rebuild
   npm run clean
   npm install
   npm run dev
   ```

### Reset Everything
```bash
# Complete reset
rm -f dev.db
npm run clean
npm install
npx prisma db push
npm run setup:admin
npm run dev
```

## 📊 Development Tools

### Prisma Studio
```bash
npm run db:studio
```
- View and edit database records
- Test database queries
- Monitor data changes

### Health Check
Visit: http://localhost:3000/api/health
- Check application status
- Monitor database connection
- View system information

### Logs
- Console logs appear in terminal
- Error logs show in browser console
- Database queries logged in development mode

## 🎯 Next Steps

1. **Customize Settings**:
   - Login to admin panel
   - Configure system settings
   - Update branding and logos

2. **Add Test Data**:
   - Create test registrations
   - Add additional admin users
   - Test all functionality

3. **Prepare for Production**:
   - Test email functionality
   - Review security settings
   - Prepare deployment configuration

---

**Happy coding!** 🚀

Your localhost development environment is ready. Login at http://localhost:3000/admin/login with `admin@mopgomglobal.com` / `SuperAdmin123!`
