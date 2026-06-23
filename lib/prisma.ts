import { PrismaClient } from "@prisma/client"; 
import { PrismaPg } from "@prisma/adapter-pg"; 

const connectionString = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const databaseUrlDiagnostics = describeDatabaseUrl(connectionString);
const directUrlDiagnostics = directUrl ? describeDatabaseUrl(directUrl) : null;

console.info("[prisma] runtime configuration", {
  databaseUrlPresent: true,
  databaseHost: databaseUrlDiagnostics.host,
  databaseUsesPooler: databaseUrlDiagnostics.usesPooler,
  directUrlPresent: Boolean(directUrl),
  directHost: directUrlDiagnostics?.host ?? null,
  directUsesPooler: directUrlDiagnostics?.usesPooler ?? null,
});

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

function describeDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host,
      usesPooler: parsed.hostname.includes("-pooler"),
    };
  } catch {
    return {
      host: "invalid-url",
      usesPooler: false,
    };
  }
}
