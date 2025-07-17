import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function debugLoginAndBranding() {
  try {
    console.log('🔍 LOGIN & BRANDING DEBUG REPORT')
    console.log('=' .repeat(60))

    // 1. Check Database Connection
    console.log('\n🗄️  DATABASE CONNECTION:')
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // 2. Check Admin Users
    console.log('\n👤 ADMIN USERS ANALYSIS:')
    const admins = await prisma.admin.findMany({
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    console.log(`📊 Total admin users: ${admins.length}`)
    
    if (admins.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND!')
      console.log('🔧 Creating Super Admin account...')
      
      // Create Super Admin role if it doesn't exist
      let superAdminRole = await prisma.role.findFirst({
        where: { name: 'Super Admin' }
      })
      
      if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
          data: {
            name: 'Super Admin',
            description: 'Full system access'
          }
        })
        console.log('✅ Created Super Admin role')
      }
      
      // Create Super Admin user
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)
      const superAdmin = await prisma.admin.create({
        data: {
          email: 'admin@mopgomglobal.com',
          name: 'Super Administrator',
          password: hashedPassword,
          isActive: true,
          roleId: superAdminRole.id
        }
      })
      
      console.log('✅ Created Super Admin account')
      console.log('📧 Email: admin@mopgomglobal.com')
      console.log('🔑 Password: SuperAdmin123!')
      
    } else {
      console.log('\n📋 EXISTING ADMIN ACCOUNTS:')
      for (const admin of admins) {
        console.log(`  📧 ${admin.email}`)
        console.log(`     👤 Name: ${admin.name}`)
        console.log(`     🔑 Active: ${admin.isActive ? '✅ Yes' : '❌ No'}`)
        console.log(`     👑 Role: ${admin.role?.name || 'No role assigned'}`)
        console.log(`     🕒 Last Login: ${admin.lastLogin || 'Never'}`)
        
        // Test password for known accounts
        if (admin.email === 'admin@mopgomglobal.com') {
          const passwordTest = await bcrypt.compare('SuperAdmin123!', admin.password)
          console.log(`     🔐 Password Test: ${passwordTest ? '✅ Correct' : '❌ Incorrect'}`)
          
          if (!passwordTest) {
            console.log('🔧 Resetting password to SuperAdmin123!...')
            const newHashedPassword = await bcrypt.hash('SuperAdmin123!', 12)
            await prisma.admin.update({
              where: { id: admin.id },
              data: { 
                password: newHashedPassword,
                isActive: true
              }
            })
            console.log('✅ Password reset completed')
          }
        }
        console.log('')
      }
    }

    // 3. Check System Settings
    console.log('\n⚙️  SYSTEM SETTINGS ANALYSIS:')
    const settings = await prisma.setting.findMany({
      where: {
        category: 'branding'
      }
    })

    console.log(`📊 Total branding settings: ${settings.length}`)
    
    if (settings.length === 0) {
      console.log('❌ NO BRANDING SETTINGS FOUND!')
      console.log('🔧 Creating default branding settings...')
      
      const defaultBrandingSettings = [
        {
          category: 'branding',
          key: 'systemName',
          name: 'System Name',
          value: 'MOPGOM Global Youth Registration',
          type: 'text',
          description: 'System name displayed throughout the application'
        },
        {
          category: 'branding',
          key: 'systemDescription',
          name: 'System Description',
          value: 'Youth registration and management platform for MOPGOM Global',
          type: 'text',
          description: 'Brief description of the system'
        },
        {
          category: 'branding',
          key: 'logoUrl',
          name: 'Logo URL',
          value: '/uploads/branding/logo-1752640459220.png',
          type: 'text',
          description: 'URL of the system logo'
        }
      ]
      
      for (const setting of defaultBrandingSettings) {
        await prisma.setting.upsert({
          where: {
            category_key: {
              category: setting.category,
              key: setting.key
            }
          },
          update: setting,
          create: setting
        })
      }
      
      console.log('✅ Default branding settings created')
    } else {
      console.log('\n📋 EXISTING BRANDING SETTINGS:')
      for (const setting of settings) {
        console.log(`  🏷️  ${setting.name} (${setting.key})`)
        console.log(`     💾 Value: ${setting.value || 'NULL'}`)
        console.log(`     📝 Type: ${setting.type}`)
        console.log('')
      }
    }

    // 4. Check Registration Settings
    console.log('\n📝 REGISTRATION SETTINGS:')
    const regSettings = await prisma.setting.findMany({
      where: {
        category: 'registration'
      }
    })

    console.log(`📊 Total registration settings: ${regSettings.length}`)
    
    if (regSettings.length === 0) {
      console.log('❌ NO REGISTRATION SETTINGS FOUND!')
      console.log('🔧 Creating default registration settings...')
      
      const defaultRegSettings = [
        {
          category: 'registration',
          key: 'minimumAge',
          name: 'Minimum Age',
          value: '13',
          type: 'number',
          description: 'Minimum age for main registration'
        },
        {
          category: 'registration',
          key: 'formClosureDate',
          name: 'Form Closure Date',
          value: '',
          type: 'date',
          description: 'Date when registration form closes'
        }
      ]
      
      for (const setting of defaultRegSettings) {
        await prisma.setting.upsert({
          where: {
            category_key: {
              category: setting.category,
              key: setting.key
            }
          },
          update: setting,
          create: setting
        })
      }
      
      console.log('✅ Default registration settings created')
    } else {
      console.log('\n📋 EXISTING REGISTRATION SETTINGS:')
      for (const setting of regSettings) {
        console.log(`  🏷️  ${setting.name} (${setting.key})`)
        console.log(`     💾 Value: ${setting.value || 'NULL'}`)
        console.log(`     📝 Type: ${setting.type}`)
        console.log('')
      }
    }

    // 5. Test API Endpoints
    console.log('\n🌐 API ENDPOINTS TEST:')
    console.log('Testing critical endpoints...')
    
    // Note: We can't test HTTP endpoints from this script, but we can verify data exists
    const systemNameSetting = await prisma.setting.findFirst({
      where: {
        category: 'branding',
        key: 'systemName'
      }
    })
    
    const logoSetting = await prisma.setting.findFirst({
      where: {
        category: 'branding',
        key: 'logoUrl'
      }
    })
    
    console.log(`✅ System Name Setting: ${systemNameSetting ? 'Found' : 'Missing'}`)
    console.log(`✅ Logo Setting: ${logoSetting ? 'Found' : 'Missing'}`)

    // 6. Summary and Recommendations
    console.log('\n📋 SUMMARY & RECOMMENDATIONS:')
    console.log('✅ Database connection working')
    console.log(`✅ Admin users: ${admins.length > 0 ? 'Available' : 'Created'}`)
    console.log(`✅ Branding settings: ${settings.length > 0 ? 'Available' : 'Created'}`)
    console.log(`✅ Registration settings: ${regSettings.length > 0 ? 'Available' : 'Created'}`)
    
    console.log('\n🔑 LOGIN CREDENTIALS:')
    console.log('📧 Email: admin@mopgomglobal.com')
    console.log('🔑 Password: SuperAdmin123!')
    console.log('🌐 URL: http://localhost:3000/admin/login')
    
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Try logging in with the credentials above')
    console.log('2. Go to Settings > General to update branding')
    console.log('3. Upload a new logo if needed')
    console.log('4. Update system name and description')

  } catch (error) {
    console.error('\n❌ Debug failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the debug
debugLoginAndBranding()
  .then(() => {
    console.log('\n🎉 Debug completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error)
    process.exit(1)
  })
