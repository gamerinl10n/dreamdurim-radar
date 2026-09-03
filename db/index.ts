import { drizzle } from "drizzle-orm/d1";
import { requireDatabase } from "../lib/bindings";
import * as schema from "./schema";

export function getDb() {
  return drizzle(requireDatabase(), { schema });
}
