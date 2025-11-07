import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const hasDatabaseUrl = !!process.env.DATABASE_URL;

// Provide a resilient, chainable fallback when DATABASE_URL is missing so the server can still start
// and DB-backed calls reject with a clear 503 at await time (compatible with drizzle's chain style).
function createDbNotConfiguredStub() {
  const err: any = new Error("Database not configured. Set DATABASE_URL in .env");
  err.status = 503;

  const builder: any = {
    // Drizzle-like chain methods (return self)
    from() { return builder; },
    where() { return builder; },
    orderBy() { return builder; },
    limit() { return builder; },
    innerJoin() { return builder; },
    leftJoin() { return builder; },
    set() { return builder; },
    returning() { return builder; },
    values() { return builder; },
    onConflictDoNothing() { return builder; },
    // Thenable: when awaited or then-chained, reject with 503
    then(onFulfilled: any, onRejected: any) {
      return Promise.reject(err).then(onFulfilled, onRejected);
    },
    catch(onRejected: any) {
      return Promise.reject(err).catch(onRejected);
    },
    finally(onFinally: any) {
      return Promise.reject(err).finally(onFinally);
    },
  };

  // Drizzle root methods
  const root: any = {
    select() { return builder; },
    insert() { return builder; },
    update() { return builder; },
    delete() { return builder; },
    // raw query style (pool.query), also reject
    query() { return Promise.reject(err); },
  };

  return root as any;
}

export const pool = hasDatabaseUrl ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined as any;
export const db = hasDatabaseUrl ? drizzle({ client: pool, schema }) : createDbNotConfiguredStub();

if (!hasDatabaseUrl) {
  // eslint-disable-next-line no-console
  console.warn("[startup] DATABASE_URL not set. API will run in 'no-database' mode and return 503 for DB-backed routes.");
}