import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSaraminSearchUrl,
  fetchSaraminJobs,
  normalizeSaraminJob,
  SaraminApiError,
} from "../lib/collectors/saramin.ts";
import { jobIdentity, preliminaryScore } from "../lib/jobs.ts";

test("builds a bounded Saramin incremental search request", () => {
  const url = buildSaraminSearchUrl({
    accessKey: "secret-key",
    keyword: "한국어",
    start: 2,
    count: 110,
    updatedMin: 1_787_776_000_000,
    locationCode: "211300",
  });

  assert.equal(url.origin, "https://oapi.saramin.co.kr");
  assert.equal(url.pathname, "/job-search");
  assert.equal(url.searchParams.get("keywords"), "한국어");
  assert.equal(url.searchParams.get("start"), "2");
  assert.equal(url.searchParams.get("count"), "110");
  assert.equal(url.searchParams.get("sort"), "ud");
  assert.equal(url.searchParams.get("loc_cd"), "211300");
  assert.equal(url.searchParams.get("updated_min"), "1787776000");
});

test("normalizes Saramin metadata into the shared job shape", () => {
  const normalized = normalizeSaraminJob({
    id: "49382011",
    url: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=49382011",
    active: 1,
    "posting-timestamp": "1788393600",
    "expiration-timestamp": "1789603200",
    company: { detail: { name: "드림 게임즈" } },
    position: {
      title: "중국어 게임 로컬라이제이션 담당자",
      location: { code: "101000", name: "서울 &gt; 강남구" },
      industry: { code: "314", name: "게임" },
      "job-type": { code: "1", name: "정규직" },
      "experience-level": { code: 2, name: "경력 2년" },
      "required-education-level": { code: "0", name: "학력무관" },
    },
    keyword: "중국어,게임,로컬라이제이션",
  });

  assert.ok(normalized);
  assert.equal(normalized.provider, "saramin");
  assert.equal(normalized.country, "KR");
  assert.equal(normalized.city, "서울 · 강남구");
  assert.deepEqual(normalized.matchedKeywords, ["게임", "로컬라이제이션", "중국어"]);
  assert.equal(normalized.publishedAt, 1_788_393_600_000);
  assert.match(normalized.summary, /게임 · 정규직/);
});

test("surfaces Saramin quota errors even when HTTP succeeds", async () => {
  await assert.rejects(
    () =>
      fetchSaraminJobs(
        { accessKey: "secret-key", keyword: "한국어" },
        async () =>
          new Response(JSON.stringify({ code: 4, message: "일일 호출 한도 초과" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    (error: unknown) =>
      error instanceof SaraminApiError &&
      error.code === 4 &&
      error.message === "일일 호출 한도 초과",
  );
});

test("creates stable cross-source identities and bounded prefilter scores", () => {
  const first = jobIdentity({
    company: "NetEase Games",
    title: "Korean Localization",
    city: "Guangzhou",
  });
  const second = jobIdentity({
    company: "NETEASE-GAMES",
    title: "Korean  Localization",
    city: "GUANGZHOU",
  });

  assert.deepEqual(first, second);
  assert.equal(preliminaryScore([]), 62);
  assert.equal(preliminaryScore(Array.from({ length: 20 }, (_, index) => String(index))), 89);
});
