import { getBindings } from "@/lib/bindings";

export async function GET() {
  const bindings = getBindings();
  return Response.json({
    storageConfigured: Boolean(bindings.DB),
    saraminConfigured: Boolean(bindings.SARAMIN_ACCESS_KEY?.trim()),
  });
}
