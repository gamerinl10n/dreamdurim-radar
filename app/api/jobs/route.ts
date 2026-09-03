import { listJobs } from "@/db/jobs";
import { requireDatabase } from "@/lib/bindings";

export async function GET() {
  try {
    const data = await listJobs(requireDatabase());
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "공고를 불러오지 못했습니다.";
    return Response.json({ error: message }, { status: 503 });
  }
}
