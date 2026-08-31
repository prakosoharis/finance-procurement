import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

/**
 * Lazily builds the Drizzle client on first real use (a request handler calling `db.*`),
 * rather than at module import time — Next.js imports every route module during
 * `next build`'s page-data-collection pass, which happens without DATABASE_URL available
 * on most CI/build machines.
 */
function getDb(): Db {
  if (cached) return cached;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  cached = drizzle(pool, { schema });
  return cached;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real as object);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
