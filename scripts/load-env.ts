import { config } from "dotenv";
import { existsSync } from "fs";

// `dotenv/config` only reads `.env` by default. Next.js itself reads `.env.local`
// automatically, but these are plain tsx scripts, so load it explicitly (falling
// back to `.env` for CI/other setups that don't use the `.local` convention).
const path = existsSync(".env.local") ? ".env.local" : ".env";
config({ path });
