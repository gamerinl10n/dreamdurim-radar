import { recordReviewDecision } from "@/db/jobs";
import { requireDatabase } from "@/lib/bindings";
import { z } from "zod";

const decisionSchema = z.object({
  decision: z.enum(["pending", "accepted", "later", "excluded"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "올바른 검수 결정을 입력해 주세요." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const updated = await recordReviewDecision(
      requireDatabase(),
      id,
      parsed.data.decision,
    );
    if (!updated) return Response.json({ error: "공고를 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ id, decision: parsed.data.decision });
  } catch (error) {
    const message = error instanceof Error ? error.message : "검수 결정을 저장하지 못했습니다.";
    return Response.json({ error: message }, { status: 503 });
  }
}
