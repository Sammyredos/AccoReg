const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updatePermissions() {
  console.log('🔄 Updating permission descriptions to be more user-friendly...')

  // Simple, easy-to-understand permission descriptions
  const permissionUpdates = [
    // Registration permissions
    { name: 'registrations:read', description: 'See who signed up' },
    { name: 'registrations:write', description: 'Add/edit registrations' },
    { name: 'registrations:delete', description: 'Remove registrations' },
    { name: 'registrations:manage', description: 'Full control over registrations' },

    // User permissions
    { name: 'users:read', description: 'See user accounts' },
    { name: 'users:write', description: 'Add/edit users' },
    { name: 'users:delete', description: 'Remove users' },
    { name: 'users:manage', description: 'Full control over users' },

    // Analytics permissions
    { name: 'analytics:read', description: 'View reports' },
    { name: 'analytics:export', description: 'Download reports' },

    // Notification permissions
    { name: 'notifications:read', description: 'See messages' },
    { name: 'notifications:write', description: 'Send messages' },
    { name: 'notifications:delete', description: 'Remove messages' },
    { name: 'notifications:manage', description: 'Full control over messages' },

    // System permissions
    { name: 'system:settings', description: 'Change system settings' },
    { name: 'system:admin', description: 'Full system control' },
  ]

  try {
    for (const update of permissionUpdates) {
      await prisma.permission.update({
        where: { name: update.name },
        data: { description: update.description }
      })
      console.log(`✅ Updated: ${update.name} -> "${update.description}"`)
    }

    console.log('🎉 All permission descriptions updated successfully!')
    console.log('\n📋 Summary of changes:')
    console.log('• Made descriptions simple and easy to understand')
    console.log('• Removed technical jargon')
    console.log('• Used everyday language')
    console.log('• Focused on what users can actually do')

  } catch (error) {
    console.error('❌ Error updating permissions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePermissions()
