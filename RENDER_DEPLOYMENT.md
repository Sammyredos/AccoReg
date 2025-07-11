# Deploy to Render.com (No Docker)

## 🚀 Quick Deployment Steps

### 1. Push Your Code
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Create Render Service
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:

**Basic Settings:**
- **Name**: `youth-registration-system`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: `npm install && npm install jose && npx prisma generate && npx prisma db push --force-reset && npm run build`
- **Start Command**: `npm start`

### 3. Environment Variables
Add these in Render dashboard:

**Required:**
- `NODE_ENV` = `production`
- `NEXTAUTH_SECRET` = (auto-generate 32+ char string)
- `JWT_SECRET` = (auto-generate 32+ char string)
- `ENCRYPTION_KEY` = (auto-generate 32+ char string)
- `NEXTAUTH_URL` = `https://your-app-name.onrender.com`

**Database:**
- `DATABASE_URL` = (from Render PostgreSQL database)

### 4. Create Database
1. In Render dashboard: "New +" → "PostgreSQL"
2. **Name**: `youth-registration-database` (or any valid name)
3. **Database Name**: `youth_registration` (this is the actual database name)
4. **User**: `youth_user` (or leave default)
5. **Plan**: Free
6. Copy the "External Database URL"
7. Add it as `DATABASE_URL` environment variable

### 5. Deploy
- Click "Create Web Service"
- Wait for deployment to complete
- Visit your app URL

## 🔐 Login After Deployment

**Super Admin Credentials:**
- **Email**: `admin@mopgomglobal.com`
- **Password**: `SuperAdmin123!`
- **URL**: `https://your-app-name.onrender.com/admin/login`

⚠️ **Change password immediately after first login!**

## 🛠️ Post-Deployment Setup

### ✅ Automatic Setup (Free Tier Compatible)
The admin account and default settings are **automatically created** during deployment!

- **Admin account** is created/updated during build
- **Default settings** are seeded automatically
- **No shell access required** - works on free tier

### Manual Setup (if needed)
If you have shell access and need to recreate the admin:
```bash
npx tsx scripts/create-super-admin.ts
npx tsx scripts/seed-settings.ts
```

## 📋 Troubleshooting

### Failed Migration Error (P3009)?
If you see "migrate found failed migrations in the target database":
1. **Quick Fix**: Delete and recreate your PostgreSQL database in Render
2. **Alternative**: Use `npx prisma db push --force-reset` in build command
3. **Manual Fix**: Use Render Shell to run `npx prisma migrate reset --force`

### Migration Provider Mismatch Error (P3019)?
If you see "datasource provider postgresql does not match sqlite":
1. **Fix**: Update `prisma/migrations/migration_lock.toml`
2. **Change**: `provider = "sqlite"` to `provider = "postgresql"`
3. **Alternative**: Use `npx prisma db push` instead of `npx prisma migrate deploy`

### Migration Failed Error (P3018)?
If you see "A migration failed to apply" or "no such table":

**This means DATABASE_URL is not set correctly!**

1. **Create PostgreSQL Database FIRST:**
   - Go to Render Dashboard → "New +" → "PostgreSQL"
   - Name: `youth-database`
   - Database Name: `youth_registration`
   - Wait for it to be "Available"

2. **Copy Database URL:**
   - Go to your database → "Info" tab
   - Copy "External Database URL"
   - Should start with `postgresql://`

3. **Add to Web Service:**
   - Go to Web Service → "Environment"
   - Add: `DATABASE_URL` = (paste the PostgreSQL URL)
   - **Save Changes**

4. **Redeploy:**
   - Go to "Deploys" tab
   - Click "Deploy latest commit"

### Database Name Issues?
If Render rejects your database name:
1. **Service Name**: Use letters, numbers, hyphens only (e.g., `youth-database`)
2. **Database Name**: Use underscores, not hyphens (e.g., `youth_registration`)
3. **Avoid**: Special characters, spaces, or starting with numbers

### Build Fails?
1. Check build logs in Render dashboard
2. Ensure all dependencies are in package.json
3. Verify environment variables are set
4. Make sure `jose` package is installed

### Database Issues?
1. Confirm DATABASE_URL is correct
2. Check database is running
3. Run migrations manually if needed
4. Verify database name matches exactly

### Login Not Working?
1. Create super admin account
2. Check database connection
3. Verify JWT_SECRET is set

## 🔄 Updates & Redeployment

To update your app:
1. Make changes locally
2. Commit and push to GitHub
3. Render auto-deploys from main branch

## 📞 Support

If deployment fails:
1. Check Render build logs
2. Verify all environment variables
3. Ensure database is connected
4. Run admin creation script

Your app should be live at: `https://mopgomyouth.onrender.com`

## 📧 Email Configuration

Your email is already configured in `render.yaml`:

- **SMTP Host**: Gmail (smtp.gmail.com)
- **Port**: 587
- **Username**: samuel.obadina93@gmail.com
- **Password**: mlre wwdl wnvr vimd (App Password)
- **From Name**: MopgomYouth
- **Admin Emails**: admin@youthreg.com, samuel.obadina93@gmail.com

### ⚠️ Important Email Security Notes:

1. **App Password**: The password `mlre wwdl wnvr vimd` should be a Gmail App Password, not your regular Gmail password
2. **Enable 2FA**: Make sure 2-factor authentication is enabled on samuel.obadina93@gmail.com
3. **Generate App Password**: Go to Google Account Settings → Security → App Passwords

### 🧪 Test Email Configuration:
1. Login to admin panel at `https://mopgomyouth.onrender.com/admin/login`
2. Go to Settings → Email Configuration
3. Click "Send Test Email"
4. Check both admin email addresses for delivery

## 🎉 Deployment Complete!

Your Youth Registration System is now live with email configured!
