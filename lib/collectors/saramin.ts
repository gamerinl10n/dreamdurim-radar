import {
  matchedTargetKeywords,
  preliminaryScore,
  type CollectedJob,
} from "../jobs.ts";

const SARAMIN_JOB_SEARCH_URL = "https://oapi.saramin.co.kr/job-search";

type JsonRecord = Record<string, unknown>;

export interface SaraminSearchOptions {
  accessKey: string;
  keyword: string;
  start?: number;
  count?: number;
  updatedMin?: number;
  locationCode?: string;
}

export interface SaraminSearchResult {
  total: number;
  start: number;
  count: number;
  jobs: JsonRecord[];
}

export class SaraminApiError extends Error {
  public readonly code: number | null;
  public readonly status: number | null;

  constructor(
    message: string,
    code: number | null = null,
    status: number | null = null,
  ) {
    super(message);
    this.name = "SaraminApiError";
    this.code = code;
    this.status = status;
  }
}

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function timestamp(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed < 1_000_000_000_000 ? parsed * 1_000 : parsed;
}

function nestedName(value: unknown): string {
  return text(record(value)?.name);
}

function jobArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.map(record).filter((job): job is JsonRecord => Boolean(job));
  }
  const one = record(value);
  return one ? [one] : [];
}

function apiError(payload: unknown): { code: number; message: string } | null {
  const root = record(payload);
  const candidate = record(root?.result) ?? root;
  if (!candidate || candidate.code === undefined) return null;
  return {
    code: number(candidate.code, 99),
    message: text(candidate.message) || "사람인 API 요청에 실패했습니다.",
  };
}

export function buildSaraminSearchUrl(options: SaraminSearchOptions): URL {
  const count = options.count ?? 110;
  const start = options.start ?? 0;

  if (!options.accessKey.trim()) throw new Error("사람인 API access key가 필요합니다.");
  if (!options.keyword.trim()) throw new Error("검색 키워드가 필요합니다.");
  if (!Number.isInteger(start) || start < 0) throw new Error("start는 0 이상의 페이지 번호여야 합니다.");
  if (!Number.isInteger(count) || count < 1 || count > 110) {
    throw new Error("count는 1~110 사이여야 합니다.");
  }

  const url = new URL(SARAMIN_JOB_SEARCH_URL);
  url.searchParams.set("access-key", options.accessKey);
  url.searchParams.set("keywords", options.keyword.trim());
  url.searchParams.set("start", String(start));
  url.searchParams.set("count", String(count));
  url.searchParams.set("sort", "ud");
  url.searchParams.set("fields", "posting-date,expiration-date");

  if (options.updatedMin) {
    url.searchParams.set("updated_min", String(Math.floor(options.updatedMin / 1_000)));
  }
  if (options.locationCode) url.searchParams.set("loc_cd", options.locationCode);

  return url;
}

export async function fetchSaraminJobs(
  options: SaraminSearchOptions,
  fetcher: typeof fetch = fetch,
): Promise<SaraminSearchResult> {
  const response = await fetcher(buildSaraminSearchUrl(options), {
    headers: { Accept: "application/json" },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SaraminApiError(
      "사람인 API가 JSON이 아닌 응답을 반환했습니다.",
      null,
      response.status,
    );
  }

  const failure = apiError(payload);
  if (!response.ok || failure) {
    throw new SaraminApiError(
      failure?.message ?? `사람인 API HTTP ${response.status}`,
      failure?.code ?? null,
      response.status,
    );
  }

  const jobs = record(record(payload)?.jobs);
  if (!jobs) throw new SaraminApiError("사람인 API 응답에 jobs가 없습니다.");

  return {
    total: number(jobs.total),
    start: number(jobs.start),
    count: number(jobs.count),
    jobs: jobArray(jobs.job),
  };
}

function cleanLocation(value: string): string {
  return value
    .replace(/&gt;/gi, "·")
    .replace(/\s*>\s*/g, " · ")
    .replace(/\s*·\s*/g, " · ")
    .trim();
}

export function normalizeSaraminJob(job: JsonRecord): CollectedJob | null {
  if (number(job.active, 1) === 0) return null;

  const position = record(job.position);
  const company = record(record(job.company)?.detail);
  const title = text(position?.title);
  const companyName = text(company?.name);
  const externalId = text(job.id);
  const sourceUrl = text(job.url);

  if (!title || !companyName || !externalId || !sourceUrl) return null;

  const location = record(position?.location);
  const locationCode = text(location?.code);
  const locationName = cleanLocation(text(location?.name)) || "지역 미정";
  const country =
    locationCode.startsWith("2113") || /중국|홍콩|china|hong kong/i.test(locationName)
      ? "CN"
      : /재택|remote/i.test(locationName)
        ? "REMOTE"
        : "KR";

  const keywordText = text(job.keyword);
  const matchedKeywords = matchedTargetKeywords(
    `${companyName} ${title} ${keywordText}`,
  );

  const experience = nestedName(position?.["experience-level"]);
  const education = nestedName(position?.["required-education-level"]);
  const summary = [
    nestedName(position?.industry),
    nestedName(position?.["job-type"]),
    experience,
    education,
  ]
    .filter(Boolean)
    .join(" · ") || "사람인 공식 API가 제공한 공고 메타데이터";

  return {
    provider: "saramin",
    externalId,
    sourceLabel: "사람인 API",
    sourceKind: "official-api",
    sourceUrl,
    company: companyName,
    title,
    country,
    city: locationName,
    summary,
    matchedKeywords,
    score: preliminaryScore(matchedKeywords),
    publishedAt: timestamp(job["posting-timestamp"]),
    deadline: timestamp(job["expiration-timestamp"]),
  };
}

export function normalizeSaraminJobs(jobs: JsonRecord[]): CollectedJob[] {
  return jobs
    .map(normalizeSaraminJob)
    .filter((job): job is CollectedJob => Boolean(job));
}
