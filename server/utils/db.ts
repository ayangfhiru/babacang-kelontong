import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client";

// Nitro does not load `.env` in production builds (only `nuxt dev` does).
// Load it explicitly so `node .output/server/index.mjs` works with a local
// `.env`; when absent (e.g. containers), the process environment is used.
try {
  process.loadEnvFile();
} catch {
  // No .env file in the working directory — rely on exported env vars.
}

const prismaClientSingleton = () => {
  const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter: pool });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
