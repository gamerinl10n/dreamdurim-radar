import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    country: text("country", { enum: ["KR", "CN", "REMOTE"] }).notNull(),
    city: text("city").notNull(),
    summary: text("summary").notNull(),
    matchedKeywords: text("matched_keywords").notNull(),
    score: integer("score").notNull(),
    scoreKind: text("score_kind", { enum: ["rules", "ai"] })
      .notNull()
      .default("rules"),
    status: text("status", {
      enum: ["pending", "accepted", "later", "excluded"],
    })
      .notNull()
      .default("pending"),
    publishedAt: integer("published_at"),
    deadline: integer("deadline"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("jobs_fingerprint_unique").on(table.fingerprint),
    index("jobs_review_queue_idx").on(table.status, table.score),
    index("jobs_published_at_idx").on(table.publishedAt),
  ],
);

export const jobSources = sqliteTable(
  "job_sources",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceKind: text("source_kind", {
      enum: ["official-api", "company-careers", "discovery"],
    }).notNull(),
    firstSeenAt: integer("first_seen_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("job_sources_provider_external_unique").on(
      table.provider,
      table.externalId,
    ),
    index("job_sources_job_id_idx").on(table.jobId),
  ],
);

export const collectionRuns = sqliteTable(
  "collection_runs",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    status: text("status", {
      enum: ["running", "succeeded", "failed"],
    }).notNull(),
    query: text("query").notNull(),
    fetchedCount: integer("fetched_count").notNull().default(0),
    storedCount: integer("stored_count").notNull().default(0),
    mergedCount: integer("merged_count").notNull().default(0),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    errorMessage: text("error_message"),
  },
  (table) => [index("collection_runs_provider_started_idx").on(table.provider, table.startedAt)],
);

export const reviewDecisions = sqliteTable(
  "review_decisions",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    decision: text("decision", {
      enum: ["pending", "accepted", "later", "excluded"],
    }).notNull(),
    reviewer: text("reviewer").notNull().default("operator"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("review_decisions_job_created_idx").on(table.jobId, table.createdAt)],
);
