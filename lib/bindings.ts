export interface RadarBindings {
  DB?: D1Database;
  SARAMIN_ACCESS_KEY?: string;
}

let runtimeBindings: RadarBindings = {};

export function setBindings(bindings: RadarBindings): void {
  runtimeBindings = bindings;
}

export function getBindings(): RadarBindings {
  return runtimeBindings;
}

export function requireDatabase(): D1Database {
  const database = getBindings().DB;
  if (!database) {
    throw new Error("D1 binding `DB` is not configured.");
  }
  return database;
}
