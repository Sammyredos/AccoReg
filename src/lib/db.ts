import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // Optimize database connections for memory efficiency
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Reduce connection pool size to save memory
  __internal: {
    engine: {
      connectionLimit: 5, // Reduced from default 10
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown to prevent memory leaks
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
