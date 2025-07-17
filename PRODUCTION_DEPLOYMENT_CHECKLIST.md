
# 🚀 Production Deployment Checklist for Render.com

## ✅ Pre-Deployment Checklist

### Database Setup
- [ ] PostgreSQL database created on Render.com
- [ ] Database connection string added to environment variables
- [ ] Prisma schema configured for PostgreSQL
- [ ] Initial migration created

### Environment Variables
- [ ] All required environment variables set in Render dashboard
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] JWT_SECRET generated (32+ characters)
- [ ] ENCRYPTION_KEY generated (32+ characters)
- [ ] DATABASE_URL configured from Render PostgreSQL
- [ ] NEXTAUTH_URL set to your Render app URL

### Email Configuration
- [ ] SMTP settings configured
- [ ] Email credentials tested
- [ ] Admin email addresses set
- [ ] Email notifications enabled

### Security Settings
- [ ] SECURITY_HEADERS_ENABLED=true
- [ ] CSP_ENABLED=true
- [ ] HSTS_ENABLED=true
- [ ] Strong admin password set

### Performance Settings
- [ ] Rate limiting enabled
- [ ] Connection pool configured
- [ ] Timeouts set appropriately
- [ ] Logging level set to 'warn' or 'error'

## 🔧 Deployment Steps

1. **Create PostgreSQL Database on Render:**
   - Go to Render Dashboard
   - Create new PostgreSQL database
   - Note the connection details

2. **Configure Environment Variables:**
   - Copy values from .env.production.template
   - Set all required variables in Render dashboard
   - Use generated secrets for sensitive values

3. **Deploy Application:**
   - Push code to your Git repository
   - Connect repository to Render
   - Render will automatically build and deploy

4. **Post-Deployment Verification:**
   - Check application health at /api/health
   - Verify database connection
   - Test admin login
   - Verify email functionality
   - Test registration flow

## 🔍 Troubleshooting

### Common Issues:
- **Build fails:** Check environment variables are set
- **Database connection fails:** Verify DATABASE_URL format
- **Admin login fails:** Check SUPER_ADMIN_PASSWORD is set
- **Emails not sending:** Verify SMTP configuration

### Useful Commands:
```bash
# Check database connection
npx prisma db pull

# Reset database (DANGER: destroys data)
npx prisma migrate reset

# View logs
render logs --service your-service-name
```

## 📞 Support

If you encounter issues:
1. Check Render logs for error details
2. Verify all environment variables are set
3. Test database connection separately
4. Check email configuration with test script

Your app will be available at: https://your-app-name.onrender.com
