"use client";

import {
  ArrowUpRight,
  Check,
  Clock3,
  Radar,
  ScanSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  gradeForScore,
  sampleCandidates,
  type ReviewStatus,
} from "@/lib/radar";

const decisionCopy: Record<ReviewStatus, string> = {
  pending: "검토 대기",
  accepted: "채택",
  later: "나중에 보기",
  excluded: "제외",
};

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="metric-card">
      <p>{label}</p>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

export function RadarDashboard() {
  const [candidates, setCandidates] = useState(sampleCandidates);
  const [activeId, setActiveId] = useState(sampleCandidates[0].id);

  const active =
    candidates.find((candidate) => candidate.id === activeId) ?? candidates[0];
  const pending = candidates.filter((candidate) => candidate.status === "pending");
  const accepted = candidates.filter(
    (candidate) => candidate.status === "accepted",
  ).length;

  const sourceCount = useMemo(
    () => new Set(candidates.map((candidate) => candidate.source)).size,
    [candidates],
  );

  function decide(status: ReviewStatus) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === active.id ? { ...candidate, status } : candidate,
      ),
    );

    const next = candidates.find(
      (candidate) =>
        candidate.id !== active.id && candidate.status === "pending",
    );
    if (next) setActiveId(next.id);
  }

  return (
    <main className="radar-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Radar />
          </span>
          <div>
            <p className="eyebrow">DREAMDURIM</p>
            <h1>Opportunity Radar</h1>
          </div>
        </div>
        <div className="system-state">
          <span aria-hidden="true" />
          마지막 수집 08:00 · 샘플 데이터
        </div>
      </header>

      <section className="workspace" aria-label="채용공고 검수 화면">
        <aside className="queue-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TODAY</p>
              <h2>검토 대기</h2>
            </div>
            <Badge className="queue-badge">{pending.length}</Badge>
          </div>

          <div className="queue-list">
            {candidates.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className={`queue-item ${candidate.id === active.id ? "is-active" : ""}`}
                onClick={() => setActiveId(candidate.id)}
                aria-pressed={candidate.id === active.id}
              >
                <span
                  className={`score-dot grade-${gradeForScore(candidate.score).toLowerCase()}`}
                >
                  {gradeForScore(candidate.score)}
                </span>
                <span className="queue-copy">
                  <strong>{candidate.title}</strong>
                  <small>
                    {candidate.company} · {decisionCopy[candidate.status]}
                  </small>
                </span>
                <span className="queue-score">{candidate.score}</span>
              </button>
            ))}
          </div>

          <div className="source-note">
            <ShieldCheck aria-hidden="true" />
            <p>
              원문은 공식 API와 기업 채용 페이지를 우선합니다.
              <strong>{sourceCount}개 출처 연결</strong>
            </p>
          </div>
        </aside>

        <section className="review-panel">
          <div className="metrics-grid" aria-label="오늘의 수집 현황">
            <Metric label="신규 발견" value="326" />
            <Metric label="중복 제거" value="104" />
            <Metric label="AI 선별" value="41" />
            <Metric
              label="채택"
              value={String(accepted)}
              tone="metric-green"
            />
          </div>

          <article className="job-card">
            <div className="job-main">
              <div className="job-kicker">
                <Badge
                  className={`grade-badge grade-${gradeForScore(active.score).toLowerCase()}`}
                >
                  {gradeForScore(active.score)}등급
                </Badge>
                <span>
                  {active.country} · {active.city}
                </span>
                <span>{active.publishedAt}</span>
              </div>
              <p className="company-name">{active.company}</p>
              <h2>{active.title}</h2>
              <p className="job-summary">{active.summary}</p>

              <div className="keyword-row" aria-label="일치 키워드">
                {active.matchedKeywords.map((keyword) => (
                  <Badge variant="outline" key={keyword}>
                    #{keyword}
                  </Badge>
                ))}
              </div>

              <div className="source-row">
                <ScanSearch aria-hidden="true" />
                <div>
                  <span>원천 공고</span>
                  <strong>{active.source}</strong>
                </div>
                <Button variant="ghost" size="sm" disabled>
                  원문 보기 <ArrowUpRight />
                </Button>
              </div>
            </div>

            <aside className="score-panel" aria-label="Dreamdurim 적합도">
              <p>Dreamdurim 적합도</p>
              <div className="score-number">
                <strong>{active.score}</strong>
                <span>/100</span>
              </div>
              <Progress value={active.score} />
              <ul>
                <li>
                  <Check /> 한국어 역량 직접 요구
                </li>
                <li>
                  <Check /> 한중 커리어 연관성
                </li>
                <li>
                  <Check /> 공식 원천 확인
                </li>
              </ul>
            </aside>
          </article>

          <div className="decision-bar" aria-label="검수 결정">
            <div>
              <p>운영진 최종 판단</p>
              <span>채택한 공고만 다음 AI 가공 단계로 이동합니다.</span>
            </div>
            <div className="decision-actions">
              <Button variant="outline" onClick={() => decide("excluded")}>
                <X /> 제외
              </Button>
              <Button variant="secondary" onClick={() => decide("later")}>
                <Clock3 /> 나중에 보기
              </Button>
              <Button
                className="accept-button"
                onClick={() => decide("accepted")}
              >
                <Check /> 채택
              </Button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
