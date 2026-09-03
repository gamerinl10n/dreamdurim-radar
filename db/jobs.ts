import type { JobCandidate, ReviewStatus, SourceKind } from "../lib/radar";
import { jobIdentity, stableHash, type CollectedJob } from "../lib/jobs";

interface StoredIdentity {
  id: string;
}

interface StoredJobRow {
  id: string;
  company: string;
  title: string;
  country: "KR" | "CN" | "REMOTE";
  city: string;
  summary: string;
  matched_keywords: string;
  score: number;
  status: ReviewStatus;
  published_at: number | null;
  deadline: number | null;
  provider: string | null;
  source_url: string | null;
  source_kind: SourceKind | null;
}

interface CollectionRunRow {
  id: string;
  provider: string;
  status: "running" | "succeeded" | "failed";
  query: string;
  fetched_count: number;
  stored_count: number;
  merged_count: number;
  started_at: number;
  finished_at: number | null;
  error_message: string | null;
}

export interface StoreSummary {
  processed: number;
  inserted: number;
  merged: number;
}

export interface CollectionRunSummary {
  id: string;
  provider: string;
  status: "running" | "succeeded" | "failed";
  query: string;
  fetchedCount: number;
  storedCount: number;
  mergedCount: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

function sourceLabel(provider: string | null): string {
  if (provider === "saramin") return "사람인 API";
  return provider || "출처 미정";
}

function parseKeywords(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((keyword): keyword is string => typeof keyword === "string")
      : [];
  } catch {
    return [];
  }
}

function dateOnly(value: number | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "날짜 미정";
}

function runSummary(row: CollectionRunRow | null): CollectionRunSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    query: row.query,
    fetchedCount: row.fetched_count,
    storedCount: row.stored_count,
    mergedCount: row.merged_count,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    errorMessage: row.error_message,
  };
}

export async function listJobs(database: D1Database): Promise<{
  items: JobCandidate[];
  lastRun: CollectionRunSummary | null;
}> {
  const result = await database
    .prepare(
      `SELECT
        j.id,
        j.company,
        j.title,
        j.country,
        j.city,
        j.summary,
        j.matched_keywords,
        j.score,
        j.status,
        j.published_at,
        j.deadline,
        (
          SELECT source.provider
          FROM job_sources AS source
          WHERE source.job_id = j.id
          ORDER BY source.first_seen_at ASC
          LIMIT 1
        ) AS provider,
        (
          SELECT source.source_url
          FROM job_sources AS source
          WHERE source.job_id = j.id
          ORDER BY source.first_seen_at ASC
          LIMIT 1
        ) AS source_url,
        (
          SELECT source.source_kind
          FROM job_sources AS source
          WHERE source.job_id = j.id
          ORDER BY source.first_seen_at ASC
          LIMIT 1
        ) AS source_kind
      FROM jobs AS j
      ORDER BY
        CASE j.status
          WHEN 'pending' THEN 0
          WHEN 'later' THEN 1
          WHEN 'accepted' THEN 2
          ELSE 3
        END,
        j.score DESC,
        j.published_at DESC
      LIMIT 250`,
    )
    .all<StoredJobRow>();

  const latestRun = await database
    .prepare(
      `SELECT id, provider, status, query, fetched_count, stored_count,
              merged_count, started_at, finished_at, error_message
       FROM collection_runs
       ORDER BY started_at DESC
       LIMIT 1`,
    )
    .first<CollectionRunRow>();

  return {
    items: result.results.map((row) => ({
      id: row.id,
      company: row.company,
      title: row.title,
      country: row.country,
      city: row.city,
      source: sourceLabel(row.provider),
      sourceKind: row.source_kind ?? "discovery",
      sourceUrl: row.source_url ?? undefined,
      publishedAt: dateOnly(row.published_at),
      deadline: row.deadline ? dateOnly(row.deadline) : null,
      summary: row.summary,
      matchedKeywords: parseKeywords(row.matched_keywords),
      score: row.score,
      status: row.status,
      persisted: true,
    })),
    lastRun: runSummary(latestRun),
  };
}

export async function storeCollectedJobs(
  database: D1Database,
  candidates: CollectedJob[],
): Promise<StoreSummary> {
  let inserted = 0;
  let merged = 0;

  for (const candidate of candidates) {
    const now = Date.now();
    const identity = jobIdentity(candidate);
    const existing = await database
      .prepare("SELECT id FROM jobs WHERE fingerprint = ? LIMIT 1")
      .bind(identity.fingerprint)
      .first<StoredIdentity>();

    await database
      .prepare(
        `INSERT INTO jobs (
          id, fingerprint, company, title, country, city, summary,
          matched_keywords, score, score_kind, status, published_at,
          deadline, created_at, updated_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'rules', 'pending', ?, ?, ?, ?, ?)
        ON CONFLICT(fingerprint) DO UPDATE SET
          company = excluded.company,
          title = excluded.title,
          country = excluded.country,
          city = excluded.city,
          summary = excluded.summary,
          matched_keywords = excluded.matched_keywords,
          score = MAX(jobs.score, excluded.score),
          published_at = COALESCE(excluded.published_at, jobs.published_at),
          deadline = COALESCE(excluded.deadline, jobs.deadline),
          updated_at = excluded.updated_at,
          last_seen_at = excluded.last_seen_at`,
      )
      .bind(
        identity.id,
        identity.fingerprint,
        candidate.company,
        candidate.title,
        candidate.country,
        candidate.city,
        candidate.summary,
        JSON.stringify(candidate.matchedKeywords),
        candidate.score,
        candidate.publishedAt,
        candidate.deadline,
        now,
        now,
        now,
      )
      .run();

    const stored = existing ??
      (await database
        .prepare("SELECT id FROM jobs WHERE fingerprint = ? LIMIT 1")
        .bind(identity.fingerprint)
        .first<StoredIdentity>());

    if (!stored) throw new Error("저장한 공고의 식별자를 다시 찾지 못했습니다.");

    await database
      .prepare(
        `INSERT INTO job_sources (
          id, job_id, provider, external_id, source_url, source_kind,
          first_seen_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, external_id) DO UPDATE SET
          job_id = excluded.job_id,
          source_url = excluded.source_url,
          source_kind = excluded.source_kind,
          last_seen_at = excluded.last_seen_at`,
      )
      .bind(
        `source_${stableHash(`${candidate.provider}:${candidate.externalId}`)}`,
        stored.id,
        candidate.provider,
        candidate.externalId,
        candidate.sourceUrl,
        candidate.sourceKind,
        now,
        now,
      )
      .run();

    if (existing) merged += 1;
    else inserted += 1;
  }

  return { processed: candidates.length, inserted, merged };
}

export async function createCollectionRun(
  database: D1Database,
  provider: string,
  query: Record<string, string | number | undefined>,
): Promise<string> {
  const id = `run_${crypto.randomUUID()}`;
  await database
    .prepare(
      `INSERT INTO collection_runs
        (id, provider, status, query, fetched_count, stored_count,
         merged_count, started_at)
       VALUES (?, ?, 'running', ?, 0, 0, 0, ?)`,
    )
    .bind(id, provider, JSON.stringify(query), Date.now())
    .run();
  return id;
}

export async function completeCollectionRun(
  database: D1Database,
  id: string,
  fetchedCount: number,
  summary: StoreSummary,
): Promise<void> {
  await database
    .prepare(
      `UPDATE collection_runs
       SET status = 'succeeded', fetched_count = ?, stored_count = ?,
           merged_count = ?, finished_at = ?, error_message = NULL
       WHERE id = ?`,
    )
    .bind(fetchedCount, summary.inserted, summary.merged, Date.now(), id)
    .run();
}

export async function failCollectionRun(
  database: D1Database,
  id: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "알 수 없는 수집 오류";
  await database
    .prepare(
      `UPDATE collection_runs
       SET status = 'failed', finished_at = ?, error_message = ?
       WHERE id = ?`,
    )
    .bind(Date.now(), message.slice(0, 500), id)
    .run();
}

export async function recordReviewDecision(
  database: D1Database,
  jobId: string,
  decision: ReviewStatus,
): Promise<boolean> {
  const updated = await database
    .prepare("UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?")
    .bind(decision, Date.now(), jobId)
    .run();

  if (!updated.meta.changes) return false;

  await database
    .prepare(
      `INSERT INTO review_decisions (id, job_id, decision, reviewer, created_at)
       VALUES (?, ?, ?, 'operator', ?)`,
    )
    .bind(`decision_${crypto.randomUUID()}`, jobId, decision, Date.now())
    .run();
  return true;
}
