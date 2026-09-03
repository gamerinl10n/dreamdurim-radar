export const TARGET_KEYWORDS = [
  "한국어",
  "韩语",
  "韩国",
  "韩国籍",
  "朝鲜语",
  "korean",
  "korea",
  "topik",
  "localization",
  "本地化",
  "번역",
  "翻译",
  "게임",
  "游戏",
  "海外运营",
  "韩国市场",
  "韩国运营",
  "현지화",
  "로컬라이제이션",
  "통역",
  "중국어",
  "해외운영",
  "글로벌",
] as const;

export type Country = "KR" | "CN" | "REMOTE";
export type ReviewStatus = "pending" | "accepted" | "later" | "excluded";
export type SourceKind = "official-api" | "company-careers" | "discovery";

export interface JobCandidate {
  id: string;
  company: string;
  title: string;
  country: Country;
  city: string;
  source: string;
  sourceKind: SourceKind;
  publishedAt: string;
  summary: string;
  matchedKeywords: string[];
  score: number;
  status: ReviewStatus;
  deadline?: string | null;
  sourceUrl?: string;
  persisted?: boolean;
}

export function gradeForScore(score: number): "S" | "A" | "B" | "C" {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  return "C";
}

export function containsTargetKeyword(text: string): boolean {
  const normalized = text.toLocaleLowerCase();
  return TARGET_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLocaleLowerCase()),
  );
}

export function fingerprintJob(
  company: string,
  title: string,
  city: string,
): string {
  return [company, title, city]
    .map((value) =>
      value
        .normalize("NFKC")
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ""),
    )
    .join(":");
}

export const sampleCandidates: JobCandidate[] = [
  {
    id: "netease-localization",
    company: "NetEase Games",
    title: "Korean Localization Specialist",
    country: "CN",
    city: "Guangzhou",
    source: "NetEase Careers",
    sourceKind: "company-careers",
    publishedAt: "2026-09-02",
    summary:
      "게임 콘텐츠의 한중 번역과 한국어 품질 검수를 담당하는 현지화 포지션입니다.",
    matchedKeywords: ["Korean", "Localization", "게임"],
    score: 96,
    status: "pending",
  },
  {
    id: "bytedance-korea-ops",
    company: "ByteDance",
    title: "韩国市场内容运营",
    country: "CN",
    city: "Shanghai",
    source: "ByteDance Careers",
    sourceKind: "company-careers",
    publishedAt: "2026-09-01",
    summary:
      "한국 시장 대상 콘텐츠 운영과 현지 이용자 인사이트 분석을 수행합니다.",
    matchedKeywords: ["韩国市场", "运营", "Korea"],
    score: 89,
    status: "pending",
  },
  {
    id: "studio-localization-pm",
    company: "Sample Game Studio",
    title: "중국어 게임 로컬라이제이션 PM",
    country: "KR",
    city: "Seoul",
    source: "사람인 API",
    sourceKind: "official-api",
    publishedAt: "2026-08-31",
    summary:
      "중국어권 프로젝트의 일정 관리, 번역 검수, 개발팀 커뮤니케이션을 맡습니다.",
    matchedKeywords: ["게임", "Localization", "번역"],
    score: 84,
    status: "pending",
  },
];
