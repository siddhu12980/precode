import { PrismaClient } from "../app/generated/prisma/client"; 
import { PrismaPg } from "@prisma/adapter-pg"; 

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres?schema=public";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient; 
}; 
const adapter = new PrismaPg({
  connectionString, 
}); 
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, 
  }); 
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma; 
export default prisma; 
