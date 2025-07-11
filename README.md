# AccoReg - Youth Registration System

A comprehensive youth registration and accommodation management system built with Next.js, TypeScript, and Prisma.

## 🚀 Quick Start for New Developers

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (v8.0.0 or higher) - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/your-repo-name.git
cd AccoReg

# Run the automated setup script
npm run setup
```

The setup script will:
- ✅ Check Node.js version
- ✅ Install dependencies
- ✅ Create .env.local with secure secrets
- ✅ Set up the database
- ✅ Create a super admin account
- ✅ Show next steps

### Option 2: Manual Setup

If you prefer manual setup or the automated script fails:

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/your-repo-name.git
cd AccoReg
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local  # If .env.example exists
# OR create .env.local manually
```

Add the following environment variables to `.env.local`:

```bash
# Application
NODE_ENV=development
PORT=3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secure-nextauth-secret-at-least-32-chars

# Database (SQLite for development)
DATABASE_URL=file:./dev.db

# JWT
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters

# Email Configuration (Optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
EMAIL_FROM_NAME=AccoReg
EMAIL_REPLY_TO=noreply@yourdomain.com
ADMIN_EMAILS=admin@yourdomain.com

# File Upload (Cloudinary - Optional for development)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# SMS Configuration (Optional for development)
SMS_ENABLED=false
SMS_PROVIDER=mock
SMS_API_KEY=mock-api-key
SMS_FROM_NUMBER=YouthReg

# Security (Development defaults)
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=false
HSTS_ENABLED=false

# Rate Limiting (Optional for development)
RATE_LIMIT_ENABLED=false
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs

# GDPR Compliance
GDPR_ENABLED=true
DATA_RETENTION_DAYS=2555
CONSENT_VERSION=1.0
```

#### 4. Database Setup

Initialize the database and run migrations:

```bash
# Generate Prisma client
npm run db:generate

# Push database schema (for development)
npm run db:push

# OR run migrations (for production-like setup)
npm run db:migrate
```

#### 5. Create Super Admin Account

Run the setup script to create your first admin account:

```bash
npx tsx scripts/create-super-admin.ts
```

Follow the prompts to create your admin account.

#### 6. Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

#### 7. Access the Application

1. **Registration Form**: http://localhost:3000/register
2. **Admin Login**: http://localhost:3000/admin/login
3. **Database Studio**: `npm run db:studio` (opens Prisma Studio)

## 📁 Project Structure

```
AccoReg/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── api/               # API routes
│   │   ├── register/          # Registration pages
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable UI components
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── middleware/            # Custom middleware
│   ├── styles/                # Additional styles
│   └── types/                 # TypeScript type definitions
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── dev.db                 # SQLite database (development)
├── public/                    # Static assets
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── .env.local                 # Environment variables (create this)
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🛠️ Development Workflow

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:simple       # Start simple dev server without custom setup

# Building
npm run build            # Build for production
npm run build:production # Build for production (skip type check)

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio

# Utilities
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
npm run clean            # Clean build artifacts
npm run clean:cache      # Clean Next.js cache
npm run fresh            # Clean and restart development
```

### Database Management

The project uses **Prisma** as the ORM with **SQLite** for development and **PostgreSQL** for production.

#### Development Database (SQLite)
- Located at `prisma/dev.db`
- Automatically created when you run `npm run db:push`
- Perfect for local development

#### Making Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `npm run db:push` (development) or `npm run db:migrate` (production)
3. Run `npm run db:generate` to update the Prisma client

#### Viewing Data
```bash
npm run db:studio
```
This opens Prisma Studio in your browser for easy database browsing.

## 🔧 Configuration

### Email Setup (Optional)

For local development, you can either:

1. **Use real email** (see [docs/LOCALHOST-EMAIL-SETUP.md](docs/LOCALHOST-EMAIL-SETUP.md))
2. **Use console logging** (emails will be logged to terminal)

### SMS Setup (Optional)

For SMS functionality, see [docs/LOCALHOST-SMS-SETUP.md](docs/LOCALHOST-SMS-SETUP.md)

### File Uploads

The system supports file uploads via Cloudinary. For development:
- You can skip Cloudinary setup (uploads will be disabled)
- Or create a free Cloudinary account and add the credentials

## 🚨 Common Issues & Solutions

### 1. Database Connection Issues
```bash
# Reset database
rm prisma/dev.db
npm run db:push
```

### 2. Environment Variable Errors
- Ensure all required variables are set in `.env.local`
- Check for typos in variable names
- Restart the development server after changes

### 3. Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use a different port
npm run dev -- -p 3001
```

### 4. Prisma Client Issues
```bash
# Regenerate Prisma client
npm run db:generate
```

### 5. Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Documentation

### For New Developers
- [Developer Onboarding Checklist](docs/DEVELOPER-ONBOARDING.md) - Complete setup guide
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions

### Configuration Guides
- [Email Setup Guide](docs/LOCALHOST-EMAIL-SETUP.md)
- [SMS Setup Guide](docs/LOCALHOST-SMS-SETUP.md)
- [Settings Configuration](docs/SETTINGS-CONFIGURATION.md)
- [Rate Limiting Guide](docs/RATE_LIMITING_GUIDE.md)

### Advanced Topics
- [External Scanner Integration](docs/EXTERNAL_SCANNER_INTEGRATION.md)
- [Deployment Guide](DEPLOY_TO_RENDER.md)

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Database**: Prisma ORM, SQLite (dev), PostgreSQL (prod)
- **Authentication**: Custom JWT implementation
- **File Upload**: Cloudinary
- **Email**: Nodemailer
- **SMS**: Multiple providers (Twilio, AWS SNS, etc.)
- **Validation**: Zod
- **Icons**: Lucide React

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit with descriptive messages
5. Push and create a pull request

## 📞 Support

If you encounter any issues:

1. Check this README and the documentation in the `docs/` folder
2. Search existing issues in the repository
3. Create a new issue with detailed information
4. Contact the development team

## 🔐 Security Notes

- Never commit `.env.local` or any environment files
- Use strong passwords for admin accounts
- Keep dependencies updated
- Follow security best practices

---

**Happy coding! 🎉**
