# 🚀 Mopgomyouth App Deployment Guide

## ✅ Issues Fixed

1. **Build Error**: Fixed backup system initialization that was causing build failures
2. **Dependencies**: Updated render.yaml to install all dependencies (not just production)
3. **Environment Variables**: Configured proper environment variables for deployment

## 🔧 How to Make Your App Work

### Step 1: Deploy to Render.com

1. **Create PostgreSQL Database**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "PostgreSQL"
   - Name: `youth-registration-database`
   - Database Name: `youth_registration`
   - User: `youth_user`
   - Plan: Free
   - Wait for it to be "Available"

2. **Deploy Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Name**: `Mopgomyouth`
     - **Environment**: `Node`
     - **Build Command**: (Use the one from render.yaml)
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Configure Environment Variables**:
   The render.yaml file already includes the necessary environment variables.
   Render will automatically:
   - Generate `NEXTAUTH_SECRET`
   - Generate `JWT_SECRET`
   - Generate `ENCRYPTION_KEY`
   - Connect `DATABASE_URL` from your PostgreSQL database

### Step 2: Access Your App

1. **Wait for Deployment**: First deployment takes 10-15 minutes
2. **Check Build Logs**: Monitor the build process in Render dashboard
3. **Access Your App**: Visit `https://mopgomyouth.onrender.com`

### Step 3: Login as Super Admin

- **URL**: `https://mopgomyouth.onrender.com/admin/login`
- **Email**: `admin@mopgomglobal.com`
- **Password**: `SuperAdmin123!`

## 🎯 What Your App Does

This is a **Youth Registration System** for the "Linger no Longer 6.0" event:

### Public Features:
- **Landing Page**: Beautiful event information page
- **Registration Form**: Youth can register for the event
- **Event Details**: August 7th-9th, 2025 at MOPGOM Gudugba

### Admin Features:
- **Dashboard**: Overview of registrations and statistics
- **Registration Management**: View, edit, approve registrations
- **Accommodation Management**: Assign rooms to participants
- **Attendance Tracking**: Mark attendance with QR codes
- **Communication**: Send emails/SMS to participants
- **Reports**: Generate various reports
- **Settings**: Configure system settings

## 🔍 Troubleshooting

### If Build Fails:
1. Check that PostgreSQL database is created and "Available"
2. Verify environment variables are set correctly
3. Check build logs for specific errors

### If App Doesn't Load:
1. Check that health check passes: `/api/health`
2. Verify database connection: `/api/health/database`
3. Check application logs in Render dashboard

### If Login Fails:
1. Ensure super admin was created during build
2. Try resetting admin password using the script
3. Check database has admin records

## 📱 Using Your App

1. **Share Registration Link**: `https://mopgomyouth.onrender.com/register`
2. **Admin Access**: `https://mopgomyouth.onrender.com/admin`
3. **Monitor Health**: `https://mopgomyouth.onrender.com/api/health`

## 🎉 Your App is Now Working!

The app is a complete youth event management system with:
- ✅ Registration system
- ✅ Admin dashboard
- ✅ Accommodation management
- ✅ Attendance tracking
- ✅ Communication tools
- ✅ Reporting features
- ✅ Health monitoring

Perfect for managing youth events and retreats!
