import {
  completeCollectionRun,
  createCollectionRun,
  failCollectionRun,
  storeCollectedJobs,
} from "@/db/jobs";
import { getBindings, requireDatabase } from "@/lib/bindings";
import {
  fetchSaraminJobs,
  normalizeSaraminJobs,
  SaraminApiError,
} from "@/lib/collectors/saramin";
import { z } from "zod";

const requestSchema = z.object({
  keyword: z.string().trim().min(1).max(80).default("한국어"),
  start: z.number().int().min(0).max(100).default(0),
  count: z.number().int().min(1).max(110).default(110),
  updatedMin: z.number().int().positive().optional(),
  locationCode: z.string().trim().regex(/^\d+$/).optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "사람인 수집 조건이 올바르지 않습니다." }, { status: 400 });
  }

  const bindings = getBindings();
  const accessKey = bindings.SARAMIN_ACCESS_KEY?.trim();
  if (!accessKey) {
    return Response.json(
      {
        error: "사람인 API 키가 아직 설정되지 않았습니다.",
        code: "SARAMIN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let database: D1Database;
  try {
    database = requireDatabase();
  } catch {
    return Response.json(
      { error: "공고 저장소가 아직 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const options = {
    ...parsed.data,
    accessKey,
    updatedMin: parsed.data.updatedMin ?? Date.now() - 7 * 24 * 60 * 60 * 1_000,
  };
  const runId = await createCollectionRun(database, "saramin", {
    keyword: options.keyword,
    start: options.start,
    count: options.count,
    updatedMin: options.updatedMin,
    locationCode: options.locationCode,
  });

  try {
    const search = await fetchSaraminJobs(options);
    const normalized = normalizeSaraminJobs(search.jobs);
    const stored = await storeCollectedJobs(database, normalized);
    await completeCollectionRun(database, runId, search.jobs.length, stored);

    return Response.json({
      runId,
      provider: "saramin",
      keyword: options.keyword,
      page: search.start,
      total: search.total,
      fetched: search.jobs.length,
      normalized: normalized.length,
      inserted: stored.inserted,
      merged: stored.merged,
    });
  } catch (error) {
    await failCollectionRun(database, runId, error);
    const status = error instanceof SaraminApiError && error.code === 4 ? 429 : 502;
    const message = error instanceof Error ? error.message : "사람인 수집에 실패했습니다.";
    return Response.json({ error: message, runId }, { status });
  }
}
