import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import * as schema from "../src/lib/db/schema";
import { COST_COMPONENT_DEFS } from "../src/lib/calculations";

neonConfig.webSocketConstructor = ws;

const DIVISION_CODES = [
  { code: "SMM", name: "SMM Mining Procurement" },
  { code: "SUN", name: "SUN Energy Procurement" },
  { code: "OliveLink", name: "OliveLink Sourcing" },
  { code: "Combine", name: "Combined All Divisions", isVirtual: true },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Seeding divisions...");
  for (const d of DIVISION_CODES) {
    await db
      .insert(schema.divisions)
      .values({ code: d.code, name: d.name, isVirtual: !!d.isVirtual })
      .onConflictDoNothing({ target: schema.divisions.code });
  }

  console.log("Seeding periods (2022-2026)...");
  let sortOrder = 1;
  for (let year = 2022; year <= 2026; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      await db
        .insert(schema.periods)
        .values({ label: `Q${quarter} ${year}`, year, quarter, sortOrder: sortOrder++ })
        .onConflictDoNothing({ target: schema.periods.label });
    }
    await db
      .insert(schema.periods)
      .values({ label: `FY ${year}`, year, isFy: true, sortOrder: sortOrder++ })
      .onConflictDoNothing({ target: schema.periods.label });
  }

  console.log("Seeding benchmark peers...");
  const peers = [
    { divisionScope: "All", peerName: "Hackett Group World Class", peerType: "body" as const, roiMultiple: "9.00", sourceLabel: "The Hackett Group — Procurement Benchmark" },
    { divisionScope: "All", peerName: "Hackett Group Excellent", peerType: "body" as const, roiMultiple: "7.00", sourceLabel: "The Hackett Group — Procurement Benchmark" },
    { divisionScope: "SMM", peerName: "Anglo American", peerType: "named" as const, roiMultiple: "6.50", sourceLabel: "Anglo American Annual Procurement Report" },
  ];
  for (const p of peers) {
    await db.insert(schema.benchmarkPeers).values(p);
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@berau-coal.local";
  const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  const existingAdmin = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, adminEmail) });
  if (!existingAdmin) {
    console.log("Creating initial admin user...");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(schema.users).values({
      email: adminEmail,
      passwordHash,
      fullName: "System Admin",
      role: "admin",
    });
    console.log("─────────────────────────────────────────────");
    console.log(" Admin login created:");
    console.log(` Email:    ${adminEmail}`);
    console.log(` Password: ${adminPassword}`);
    console.log(" (change this after first login — set ADMIN_EMAIL/ADMIN_PASSWORD env vars to control it next time)");
    console.log("─────────────────────────────────────────────");
  } else {
    console.log("Admin user already exists, skipping.");
  }

  console.log(`Cost component keys available: ${COST_COMPONENT_DEFS.map((c) => c.key).join(", ")}`);
  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
