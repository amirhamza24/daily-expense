import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const isLocal = 
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost') || 
  process.env.DATABASE_URL.includes('127.0.0.1');

const isSSLDisabled = process.env.DATABASE_URL?.includes('sslmode=disable');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (isLocal || isSSLDisabled) ? false : {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);

export const db = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
