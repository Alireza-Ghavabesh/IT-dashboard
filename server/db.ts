import { PrismaLibSql } from '@prisma/adapter-libsql';
import pkg from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Handle ESM / CJS module interop for @prisma/client across Node versions
const PrismaClientConstructor = (pkg as any).PrismaClient || (pkg as any).default?.PrismaClient || pkg;

const dbPath = path.resolve(process.cwd(), 'dev.db');

function createPrismaInstance() {
  const adapter = new PrismaLibSql({
    url: `file:${dbPath}`
  });
  return new (PrismaClientConstructor as any)({ adapter });
}

let prisma: any = createPrismaInstance();

export const DDL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Letter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "letterId" TEXT,
    "actionType" TEXT NOT NULL DEFAULT 'ویرایش',
    "subject" TEXT,
    "orgUnit" TEXT,
    "sender" TEXT,
    "receiver" TEXT,
    "dateStr" TEXT,
    "monthName" TEXT,
    "creatorName" TEXT,
    "creatorRole" TEXT,
    "creatorRaw" TEXT,
    "urgency" TEXT,
    "status" TEXT,
    "registrationNumber" TEXT,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EraProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processName" TEXT NOT NULL,
    "orgUnit" TEXT NOT NULL,
    "executionDate" TEXT NOT NULL,
    "operationType" TEXT NOT NULL DEFAULT 'اصلاح',
    "entityType" TEXT DEFAULT 'فرآیند',
    "description" TEXT NOT NULL,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProcessImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processId" TEXT NOT NULL,
    "processName" TEXT,
    "imageData" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CauseRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "targetUnit" TEXT,
    "matchType" TEXT NOT NULL DEFAULT 'contains',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "color" TEXT DEFAULT '#2563EB',
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ExclusionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "targetUnit" TEXT,
    "matchType" TEXT NOT NULL DEFAULT 'contains',
    "field" TEXT NOT NULL DEFAULT 'subject',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Letter_orgUnit_idx" ON "Letter"("orgUnit");
CREATE INDEX IF NOT EXISTS "Letter_actionType_idx" ON "Letter"("actionType");
CREATE INDEX IF NOT EXISTS "Letter_dateStr_idx" ON "Letter"("dateStr");
CREATE INDEX IF NOT EXISTS "EraProcess_orgUnit_idx" ON "EraProcess"("orgUnit");
CREATE INDEX IF NOT EXISTS "EraProcess_operationType_idx" ON "EraProcess"("operationType");
CREATE INDEX IF NOT EXISTS "EraProcess_entityType_idx" ON "EraProcess"("entityType");
CREATE INDEX IF NOT EXISTS "ProcessImage_processId_idx" ON "ProcessImage"("processId");
CREATE INDEX IF NOT EXISTS "ProcessImage_processName_idx" ON "ProcessImage"("processName");
CREATE INDEX IF NOT EXISTS "CauseRule_cause_idx" ON "CauseRule"("cause");
CREATE INDEX IF NOT EXISTS "CauseRule_targetUnit_idx" ON "CauseRule"("targetUnit");
CREATE INDEX IF NOT EXISTS "ExclusionRule_keyword_idx" ON "ExclusionRule"("keyword");
CREATE INDEX IF NOT EXISTS "ExclusionRule_targetUnit_idx" ON "ExclusionRule"("targetUnit");
`;

/**
 * Initializes and ensures the SQLite database schema is intact.
 * If corruption is detected, it automatically recreates the database and re-initializes tables.
 */
export async function ensureDatabaseHealthy(): Promise<void> {
  try {
    // Quick test if tables exist and DB is accessible
    await prisma.letter.count();

    // Proactively make sure ProcessImage table exists for backward compatibility
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProcessImage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "processId" TEXT NOT NULL,
        "processName" TEXT,
        "imageData" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL DEFAULT 'image/png',
        "title" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProcessImage_processId_idx" ON "ProcessImage"("processId");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProcessImage_processName_idx" ON "ProcessImage"("processName");`).catch(() => {});

    // Proactively ensure entityType column exists in EraProcess
    await prisma.$executeRawUnsafe(`ALTER TABLE "EraProcess" ADD COLUMN "entityType" TEXT DEFAULT 'فرآیند';`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EraProcess_entityType_idx" ON "EraProcess"("entityType");`).catch(() => {});
  } catch (error: any) {
    console.warn('Database health check encountered error:', error?.message || error);
    const isCorrupt = error?.message?.includes('SQLITE_CORRUPT') ||
      error?.message?.includes('malformed') ||
      error?.message?.includes('no such table') ||
      error?.code === 11;

    if (isCorrupt || !fs.existsSync(dbPath)) {
      console.log('Rebuilding SQLite database file and schema...');
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        }
      } catch (unlinkErr) {
        console.error('Failed to unlink corrupt db:', unlinkErr);
      }

      // Re-initialize client instance
      prisma = createPrismaInstance();

      // Execute DDL statements
      const statements = DDL_SCHEMA_SQL.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (ddlErr) {
          console.error('Error executing DDL statement:', ddlErr);
        }
      }
      console.log('Database tables successfully initialized.');
    }
  }
}

export { prisma };


