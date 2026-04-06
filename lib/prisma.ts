import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaInstance: PrismaClient;

if (typeof window === 'undefined') {
  // SERVER-ONLY: Import and initialize driver adapter
  const { PrismaPg } = require('@prisma/adapter-pg')
  const { Pool } = require('pg')

  const connectionString = `${process.env.DATABASE_URL}`
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({ adapter })
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance
  }
} else {
  // CLIENT-SIDE: Minimal client for type safety (actions will handle actual DB calls)
  prismaInstance = new PrismaClient()
}

export const prisma = prismaInstance;
