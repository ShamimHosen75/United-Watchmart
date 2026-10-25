import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { seedInventory } from "./seed";

/**
 * Database access.
 * - DATABASE_URL set (Supabase, or any Postgres): postgres-js. Run `npm run db:migrate` to apply migrations.
 * - Not set (local development and tests): PGlite, an embedded Postgres stored in .data/pglite,
 *   migrated automatically on first use. Never used on Vercel.
 */

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __uwmDb?: Promise<DB> };

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    // prepare: false is required by Supabase's transaction pooler (port 6543).
    const client = postgres(url, { prepare: false, max: 5 });
    const db = drizzle(client, { schema }) as unknown as DB;
    await seedInventory(db);
    return db;
  }

  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set");

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seedInventory(db as unknown as DB);
  return db as unknown as DB;
}

/** One shared connection per server process. */
export function getDb(): Promise<DB> {
  if (!globalForDb.__uwmDb) {
    globalForDb.__uwmDb = connect().catch((err) => {
      globalForDb.__uwmDb = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return globalForDb.__uwmDb;
}

export { schema };
