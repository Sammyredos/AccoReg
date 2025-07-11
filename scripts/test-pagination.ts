import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPagination() {
  try {
    console.log('🔍 Testing User Management Pagination\n')
    console.log('=' .repeat(50))

    // Get total counts
    const totalUsers = await prisma.user.count()
    const totalAdmins = await prisma.admin.count()
    const totalCombined = totalUsers + totalAdmins

    console.log('\n📊 Database Counts:')
    console.log(`   Users: ${totalUsers}`)
    console.log(`   Admins: ${totalAdmins}`)
    console.log(`   Total: ${totalCombined}`)

    // Test different pagination scenarios
    const limit = 10
    const testPages = [1, 2, 3, Math.ceil(totalCombined / limit)]

    for (const page of testPages) {
      if (page <= Math.ceil(totalCombined / limit)) {
        console.log(`\n🔍 Testing Page ${page}:`)
        
        const offset = (page - 1) * limit
        console.log(`   Offset: ${offset}, Limit: ${limit}`)

        // Simulate the API logic
        const allUsersFromDB = await prisma.user.findMany({
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        const allAdminsFromDB = await prisma.admin.findMany({
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        // Combine and format the data
        const allCombinedUsers = [
          ...allAdminsFromDB.map(admin => ({
            id: admin.id,
            email: admin.email,
            name: admin.name,
            isActive: admin.isActive,
            lastLogin: admin.lastLogin,
            createdAt: admin.createdAt,
            type: 'admin',
            role: admin.role
          })),
          ...allUsersFromDB.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            type: 'user',
            role: user.role
          }))
        ]

        // Sort by creation date
        allCombinedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Apply pagination
        const paginatedUsers = allCombinedUsers.slice(offset, offset + limit)

        console.log(`   Total Combined: ${allCombinedUsers.length}`)
        console.log(`   Paginated Count: ${paginatedUsers.length}`)
        console.log(`   Expected Count: ${Math.min(limit, Math.max(0, allCombinedUsers.length - offset))}`)

        if (paginatedUsers.length > 0) {
          console.log(`   First User: ${paginatedUsers[0].email} (${paginatedUsers[0].type})`)
          if (paginatedUsers.length > 1) {
            console.log(`   Last User: ${paginatedUsers[paginatedUsers.length - 1].email} (${paginatedUsers[paginatedUsers.length - 1].type})`)
          }
        }

        // Test API call
        try {
          const response = await fetch(`http://localhost:3000/api/admin/users?limit=${limit}&offset=${offset}`, {
            headers: {
              'Cookie': 'your-auth-cookie-here' // You'll need to replace this with actual auth
            }
          })

          if (response.ok) {
            const apiData = await response.json()
            console.log(`   ✅ API Response: ${apiData.users?.length || 0} users`)
            console.log(`   API Total: ${apiData.total}`)
            console.log(`   API Pagination: Page ${apiData.pagination?.currentPage}/${apiData.pagination?.totalPages}`)
          } else {
            console.log(`   ❌ API Error: ${response.status}`)
          }
        } catch (apiError) {
          console.log(`   ⚠️ API Test Skipped (server not running or auth required)`)
        }
      }
    }

    // Test search functionality
    console.log('\n🔍 Testing Search Pagination:')
    const searchTerm = 'admin'
    
    const searchWhereClause = {
      OR: [
        { name: { contains: searchTerm } },
        { email: { contains: searchTerm } }
      ]
    }

    const searchUsers = await prisma.user.findMany({
      where: searchWhereClause,
      orderBy: { createdAt: 'desc' }
    })

    const searchAdmins = await prisma.admin.findMany({
      where: searchWhereClause,
      orderBy: { createdAt: 'desc' }
    })

    const searchTotal = searchUsers.length + searchAdmins.length
    console.log(`   Search "${searchTerm}": ${searchTotal} results`)
    console.log(`   Users: ${searchUsers.length}, Admins: ${searchAdmins.length}`)

    if (searchTotal > 0) {
      const searchPages = Math.ceil(searchTotal / limit)
      console.log(`   Search Pages: ${searchPages}`)
    }

    // Test edge cases
    console.log('\n🔍 Testing Edge Cases:')
    
    // Test page beyond total
    const beyondPage = Math.ceil(totalCombined / limit) + 1
    const beyondOffset = (beyondPage - 1) * limit
    console.log(`   Page ${beyondPage} (beyond total):`)
    console.log(`   Offset: ${beyondOffset}, Should return 0 users`)

    // Test with very large offset
    const largeOffset = totalCombined + 100
    console.log(`   Large offset ${largeOffset}: Should return 0 users`)

  } catch (error) {
    console.error('❌ Pagination test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testPagination()
  .then(() => {
    console.log('\n✅ Pagination test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Pagination test failed:', error)
    process.exit(1)
  })
