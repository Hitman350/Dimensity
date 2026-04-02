import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient for serverless environments.
// Prevents connection pool exhaustion from hot-reloading in development
// and ensures a single connection pool in production.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
