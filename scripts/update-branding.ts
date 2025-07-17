import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateBranding() {
  try {
    console.log('🎨 UPDATING SYSTEM BRANDING')
    console.log('=' .repeat(40))

    // Enhanced branding settings
    const brandingUpdates = [
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
        value: 'Comprehensive youth registration and management platform for MOPGOM Global ministries',
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
      },
      {
        category: 'branding',
        key: 'organizationName',
        name: 'Organization Name',
        value: 'MOPGOM Global',
        type: 'text',
        description: 'Full organization name'
      },
      {
        category: 'branding',
        key: 'contactEmail',
        name: 'Contact Email',
        value: 'admin@mopgomglobal.com',
        type: 'email',
        description: 'Primary contact email for the organization'
      },
      {
        category: 'branding',
        key: 'websiteUrl',
        name: 'Website URL',
        value: 'https://mopgomglobal.com',
        type: 'url',
        description: 'Organization website URL'
      },
      {
        category: 'branding',
        key: 'primaryColor',
        name: 'Primary Color',
        value: '#3B82F6',
        type: 'color',
        description: 'Primary brand color'
      },
      {
        category: 'branding',
        key: 'secondaryColor',
        name: 'Secondary Color',
        value: '#10B981',
        type: 'color',
        description: 'Secondary brand color'
      }
    ]

    console.log('🔧 Updating branding settings...')
    
    for (const setting of brandingUpdates) {
      const updated = await prisma.setting.upsert({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key
          }
        },
        update: {
          name: setting.name,
          value: setting.value,
          type: setting.type,
          description: setting.description
        },
        create: setting
      })
      
      console.log(`✅ ${setting.name}: ${setting.value}`)
    }

    // Also update some system settings
    const systemUpdates = [
      {
        category: 'system',
        key: 'maintenanceMode',
        name: 'Maintenance Mode',
        value: 'false',
        type: 'boolean',
        description: 'Enable maintenance mode to restrict access'
      },
      {
        category: 'system',
        key: 'debugMode',
        name: 'Debug Mode',
        value: 'false',
        type: 'boolean',
        description: 'Enable debug mode for development'
      },
      {
        category: 'system',
        key: 'timezone',
        name: 'System Timezone',
        value: 'Africa/Lagos',
        type: 'text',
        description: 'Default timezone for the system'
      }
    ]

    console.log('\n🔧 Updating system settings...')
    
    for (const setting of systemUpdates) {
      await prisma.setting.upsert({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key
          }
        },
        update: {
          name: setting.name,
          value: setting.value,
          type: setting.type,
          description: setting.description
        },
        create: setting
      })
      
      console.log(`✅ ${setting.name}: ${setting.value}`)
    }

    // Update registration settings with better defaults
    const registrationUpdates = [
      {
        category: 'registration',
        key: 'minimumAge',
        name: 'Minimum Age',
        value: '13',
        type: 'number',
        description: 'Minimum age for main registration (users below this age will use children registration)'
      },
      {
        category: 'registration',
        key: 'formClosureDate',
        name: 'Form Closure Date',
        value: '',
        type: 'date',
        description: 'Date when registration form closes (leave empty to keep open)'
      },
      {
        category: 'registration',
        key: 'allowDuplicates',
        name: 'Allow Duplicates',
        value: 'false',
        type: 'boolean',
        description: 'Allow duplicate registrations with same name'
      },
      {
        category: 'registration',
        key: 'requireParentEmail',
        name: 'Require Parent Email',
        value: 'false',
        type: 'boolean',
        description: 'Make parent/guardian email mandatory'
      }
    ]

    console.log('\n🔧 Updating registration settings...')
    
    for (const setting of registrationUpdates) {
      await prisma.setting.upsert({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key
          }
        },
        update: {
          name: setting.name,
          value: setting.value,
          type: setting.type,
          description: setting.description
        },
        create: setting
      })
      
      console.log(`✅ ${setting.name}: ${setting.value}`)
    }

    console.log('\n🎉 Branding and settings updated successfully!')
    console.log('\n📋 SUMMARY:')
    console.log('✅ System Name: MOPGOM Global Youth Registration')
    console.log('✅ Organization: MOPGOM Global')
    console.log('✅ Logo: Available')
    console.log('✅ Contact Email: admin@mopgomglobal.com')
    console.log('✅ All settings configured')
    
    console.log('\n🌐 Next Steps:')
    console.log('1. Login to admin panel')
    console.log('2. Go to Settings > General to see updated branding')
    console.log('3. Upload a custom logo if needed')
    console.log('4. Customize colors and other branding elements')

  } catch (error) {
    console.error('\n❌ Branding update failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the branding update
updateBranding()
  .then(() => {
    console.log('\n🎨 Branding update completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Branding update failed:', error)
    process.exit(1)
  })
