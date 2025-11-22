import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// PostgreSQL connection pool for raw queries if needed
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;

// Prisma Client
const prismaClientSingleton = () => {
  if (!process.env.DATABASE_URL) {
    console.warn('[startup] DATABASE_URL not set. API will run in no-database mode.');
    // Return a mock client that throws on use
    return {
      $connect: async () => { throw new Error('Database not configured'); },
      $disconnect: async () => {},
      $on: () => {},
      $use: () => {},
    } as unknown as PrismaClient;
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = db;
}

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
  if (pool) {
    await pool.end();
  }
});

