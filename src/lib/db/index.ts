import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

/**
 * Lazily builds the Drizzle client on first real use (a request handler calling `db.*`),
 * rather than at module import time — Next.js imports every route module during
 * `next build`'s page-data-collection pass, which happens without DATABASE_URL available
 * on most CI/build machines.
 *
 * Uses Neon's HTTP driver (one query = one HTTP request) rather than the WebSocket
 * `Pool` driver — it needs no `ws` polyfill, has no connection/session state to manage,
 * and is the driver Neon recommends for serverless/edge Next.js deployments.
 */
function getDb(): Db {
  if (cached) return cached;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
  }
  const sql = neon(process.env.DATABASE_URL);
  cached = drizzle(sql, { schema });
  return cached;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real as object);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
