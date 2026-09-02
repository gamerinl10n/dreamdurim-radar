import assert from "node:assert/strict";
import test from "node:test";

import {
  containsTargetKeyword,
  fingerprintJob,
  gradeForScore,
} from "../lib/radar.ts";

test("maps scores to review grades", () => {
  assert.equal(gradeForScore(100), "S");
  assert.equal(gradeForScore(90), "S");
  assert.equal(gradeForScore(89), "A");
  assert.equal(gradeForScore(65), "B");
  assert.equal(gradeForScore(20), "C");
});

test("detects Korean and Chinese opportunity keywords", () => {
  assert.equal(containsTargetKeyword("Korean Localization Specialist"), true);
  assert.equal(containsTargetKeyword("韩国市场内容运营"), true);
  assert.equal(containsTargetKeyword("일반 회계 담당자"), false);
});

test("normalizes job identity for cross-source deduplication", () => {
  const first = fingerprintJob("NetEase Games", "Korean Localization", "Guangzhou");
  const second = fingerprintJob("NETEASE-GAMES", "Korean  Localization", "GUANGZHOU");
  assert.equal(first, second);
});
