import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  smallint,
  integer,
  numeric,
  timestamp,
  jsonb,
  inet,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "viewer"]);
export const recordTypeEnum = pgEnum("record_type", ["actual", "budget"]);
export const peerTypeEnum = pgEnum("peer_type", ["named", "body"]);
export const uploadStatusEnum = pgEnum("upload_status", ["processing", "success", "failed"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

// Self-contained auth (replaces Supabase auth.users + auth.uid()).
// Passwords are hashed with bcrypt; RBAC is enforced in the API layer (see src/lib/rbac.ts)
// rather than via Postgres RLS, since RLS in the original spec depended on Supabase's
// session-scoped auth.uid() function which has no equivalent on plain Neon Postgres.
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  divisionAccess: text("division_access").array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  invitedBy: uuid("invited_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const divisions = pgTable("divisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  isVirtual: boolean("is_virtual").notNull().default(false),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const periods = pgTable("periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: varchar("label", { length: 20 }).notNull().unique(),
  year: smallint("year").notNull(),
  quarter: smallint("quarter"),
  isFy: boolean("is_fy").notNull().default(false),
  isYtd: boolean("is_ytd").notNull().default(false),
  ytdThroughQ: smallint("ytd_through_q"),
  sortOrder: integer("sort_order").notNull(),
});

export const pnlData = pgTable(
  "pnl_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    divisionId: uuid("division_id").notNull().references(() => divisions.id),
    periodId: uuid("period_id").notNull().references(() => periods.id),
    recordType: recordTypeEnum("record_type").notNull(),
    costSaving: numeric("cost_saving", { precision: 12, scale: 4 }).notNull().default("0"),
    costAvoidance: numeric("cost_avoidance", { precision: 12, scale: 4 }).notNull().default("0"),
    totalValueCreation: numeric("total_value_creation", { precision: 12, scale: 4 }).notNull().default("0"),
    initialSum: numeric("initial_sum", { precision: 12, scale: 4 }).notNull().default("0"),
    sumAfterSaving: numeric("sum_after_saving", { precision: 12, scale: 4 }).notNull().default("0"),
    totalCostIncurred: numeric("total_cost_incurred", { precision: 12, scale: 4 }).notNull().default("0"),
    netValueCreation: numeric("net_value_creation", { precision: 12, scale: 4 })
      .generatedAlwaysAs(sql`(total_value_creation - total_cost_incurred)`)
      .notNull(),
    roiPct: numeric("roi_pct", { precision: 8, scale: 4 })
      .generatedAlwaysAs(
        sql`(CASE WHEN total_cost_incurred > 0 THEN (total_value_creation - total_cost_incurred) / total_cost_incurred * 100 ELSE 0 END)`
      )
      .notNull(),
    valueToSumPct: numeric("value_to_sum_pct", { precision: 8, scale: 4 })
      .generatedAlwaysAs(
        sql`(CASE WHEN initial_sum > 0 THEN total_value_creation / initial_sum * 100 ELSE 0 END)`
      )
      .notNull(),
    revenue: numeric("revenue", { precision: 14, scale: 4 }).notNull().default("0"),
    grossProfit: numeric("gross_profit", { precision: 14, scale: 4 }).notNull().default("0"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    sourceFile: varchar("source_file", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqDivPeriodType: uniqueIndex("pnl_div_period_type_uniq").on(t.divisionId, t.periodId, t.recordType),
    divIdx: index("idx_pnl_division").on(t.divisionId),
    periodIdx: index("idx_pnl_period").on(t.periodId),
  })
);

export const costComponents = pgTable(
  "cost_components",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pnlDataId: uuid("pnl_data_id").notNull().references(() => pnlData.id, { onDelete: "cascade" }),
    componentKey: varchar("component_key", { length: 50 }).notNull(),
    componentLabel: varchar("component_label", { length: 100 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 4 }).notNull().default("0"),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => ({
    pnlIdx: index("idx_cc_pnl").on(t.pnlDataId),
  })
);

export const fxRates = pgTable("fx_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id").notNull().unique().references(() => periods.id),
  rateIdrPerUsd: numeric("rate_idr_per_usd", { precision: 10, scale: 2 }).notNull(),
  rateDate: timestamp("rate_date", { mode: "date" }).notNull(),
  source: varchar("source", { length: 100 }).notNull().default("BI JISDOR"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const benchmarkPeers = pgTable("benchmark_peers", {
  id: uuid("id").defaultRandom().primaryKey(),
  divisionScope: varchar("division_scope", { length: 50 }).notNull(),
  peerName: varchar("peer_name", { length: 255 }).notNull(),
  peerType: peerTypeEnum("peer_type").notNull(),
  roiMultiple: numeric("roi_multiple", { precision: 6, scale: 2 }).notNull(),
  sourceLabel: varchar("source_label", { length: 255 }).notNull(),
  sourceUrl: varchar("source_url", { length: 500 }),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(true),
});

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    payload: jsonb("payload"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_sessions_user").on(t.userId),
  })
);

export const dataUploads = pgTable("data_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  filename: varchar("filename", { length: 500 }).notNull(),
  storagePath: varchar("storage_path", { length: 1000 }),
  rowsProcessed: integer("rows_processed").notNull().default(0),
  divisionsUpdated: text("divisions_updated").array().notNull().default(sql`'{}'::text[]`),
  periodsUpdated: text("periods_updated").array().notNull().default(sql`'{}'::text[]`),
  status: uploadStatusEnum("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiChatHistory = pgTable(
  "ai_chat_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    sessionId: uuid("session_id").notNull(),
    role: chatRoleEnum("role").notNull(),
    content: text("content").notNull(),
    filterContext: jsonb("filter_context"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index("idx_chat_session").on(t.userId, t.sessionId),
  })
);

export const dashboardPreferences = pgTable("dashboard_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  theme: varchar("theme", { length: 30 }).notNull().default("dark"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  defaultDivision: varchar("default_division", { length: 50 }).notNull().default("Combine"),
  defaultYear: varchar("default_year", { length: 10 }).notNull().default("All"),
  defaultQuarter: varchar("default_quarter", { length: 10 }).notNull().default("All"),
  chartMetric: varchar("chart_metric", { length: 20 }).notNull().default("sum"),
  pnlrepMode: varchar("pnlrep_mode", { length: 10 }).notNull().default("both"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
