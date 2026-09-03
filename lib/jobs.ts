import {
  fingerprintJob,
  TARGET_KEYWORDS,
  type Country,
  type SourceKind,
} from "./radar.ts";

export interface CollectedJob {
  provider: string;
  externalId: string;
  sourceLabel: string;
  sourceKind: SourceKind;
  sourceUrl: string;
  company: string;
  title: string;
  country: Country;
  city: string;
  summary: string;
  matchedKeywords: string[];
  score: number;
  publishedAt: number | null;
  deadline: number | null;
}

export function matchedTargetKeywords(text: string): string[] {
  const normalized = text.toLocaleLowerCase();
  return [...new Set(
    TARGET_KEYWORDS.filter((keyword) =>
      normalized.includes(keyword.toLocaleLowerCase()),
    ),
  )];
}

export function preliminaryScore(matchedKeywords: string[]): number {
  return Math.min(89, 58 + matchedKeywords.length * 7 + 4);
}

export function stableHash(input: string): string {
  let first = 0xdeadbeef;
  let second = 0x41c6ce57;

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 2_654_435_761);
    second = Math.imul(second ^ code, 1_597_334_677);
  }

  first = Math.imul(first ^ (first >>> 16), 2_246_822_507) ^
    Math.imul(second ^ (second >>> 13), 3_266_489_909);
  second = Math.imul(second ^ (second >>> 16), 2_246_822_507) ^
    Math.imul(first ^ (first >>> 13), 3_266_489_909);

  return `${(second >>> 0).toString(16).padStart(8, "0")}${
    (first >>> 0).toString(16).padStart(8, "0")
  }`;
}

export function jobIdentity(job: Pick<CollectedJob, "company" | "title" | "city">) {
  const fingerprint = fingerprintJob(job.company, job.title, job.city);
  return {
    fingerprint,
    id: `job_${stableHash(fingerprint)}`,
  };
}
