import "./load-env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import * as schema from "../src/lib/db/schema";
import { COST_COMPONENT_DEFS } from "../src/lib/calculations";

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
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

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

  console.log("Seeding BI JISDOR FX rates...");
  // Bank Indonesia JISDOR quarterly averages, IDR per USD. FY rows carry the year average.
  const BI_RATES: Record<string, number> = {
    "Q1 2022": 14345, "Q2 2022": 14556, "Q3 2022": 14935, "Q4 2022": 15566, "FY 2022": 14871,
    "Q1 2023": 15242, "Q2 2023": 14866, "Q3 2023": 15214, "Q4 2023": 15629, "FY 2023": 15255,
    "Q1 2024": 15656, "Q2 2024": 16174, "Q3 2024": 15820, "Q4 2024": 15780, "FY 2024": 15847,
    "Q1 2025": 16352, "Q2 2025": 16514, "Q3 2025": 16364, "Q4 2025": 16667, "FY 2025": 16516,
    "Q1 2026": 16352, "Q2 2026": 16514, "Q3 2026": 16364, "Q4 2026": 16667, "FY 2026": 16516,
  };
  const allPeriods = await db.query.periods.findMany();
  const periodIdByLabel = new Map(allPeriods.map((p) => [p.label, p.id]));
  /** Representative date for a period: quarter-end (or year-end for FY rows). */
  const rateDateFor = (label: string) => {
    const [head, yearStr] = label.split(" ");
    const year = Number(yearStr);
    if (head === "FY") return new Date(Date.UTC(year, 11, 31));
    const q = Number(head.replace("Q", ""));
    return new Date(Date.UTC(year, q * 3 - 1, q === 1 || q === 4 ? 31 : 30));
  };
  for (const [label, rate] of Object.entries(BI_RATES)) {
    const periodId = periodIdByLabel.get(label);
    if (!periodId) continue;
    await db
      .insert(schema.fxRates)
      .values({ periodId, rateIdrPerUsd: String(rate), rateDate: rateDateFor(label), source: "BI JISDOR" })
      .onConflictDoUpdate({ target: schema.fxRates.periodId, set: { rateIdrPerUsd: String(rate), rateDate: rateDateFor(label) } });
  }

  console.log("Seeding benchmark peers...");
  const peers = [
    { divisionScope: "All", peerName: "Hackett Group World Class", peerType: "body" as const, roiMultiple: "9.00", sourceLabel: "The Hackett Group — Procurement Benchmark" },
    { divisionScope: "All", peerName: "Hackett Group Excellent", peerType: "body" as const, roiMultiple: "7.00", sourceLabel: "The Hackett Group — Procurement Benchmark" },
    { divisionScope: "SMM", peerName: "Anglo American", peerType: "named" as const, roiMultiple: "6.50", sourceLabel: "Anglo American Annual Procurement Report" },
  ];
  // benchmark_peers has no unique constraint to conflict on, so skip rows that already
  // exist — otherwise re-running the seed silently duplicates every peer.
  const existingPeers = await db.query.benchmarkPeers.findMany();
  const peerKey = (p: { divisionScope: string; peerName: string }) => `${p.divisionScope}__${p.peerName}`;
  const seenPeers = new Set(existingPeers.map(peerKey));
  for (const p of peers) {
    if (seenPeers.has(peerKey(p))) continue;
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
