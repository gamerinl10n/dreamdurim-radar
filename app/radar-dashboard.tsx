"use client";

import {
  ArrowUpRight,
  Check,
  Clock3,
  LoaderCircle,
  Radar,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  gradeForScore,
  sampleCandidates,
  type JobCandidate,
  type ReviewStatus,
} from "@/lib/radar";

type DataMode = "loading" | "live" | "sample" | "error";

interface SystemStatus {
  storageConfigured: boolean;
  saraminConfigured: boolean;
}

interface CollectionRun {
  status: "running" | "succeeded" | "failed";
  storedCount: number;
  mergedCount: number;
  finishedAt: string | null;
}

interface JobsResponse {
  items: JobCandidate[];
  lastRun: CollectionRun | null;
  error?: string;
}

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

function collectionTime(lastRun: CollectionRun | null): string {
  if (!lastRun?.finishedAt) return "수집 이력 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(lastRun.finishedAt));
}

export function RadarDashboard() {
  const [candidates, setCandidates] = useState<JobCandidate[]>(sampleCandidates);
  const [activeId, setActiveId] = useState(sampleCandidates[0].id);
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [system, setSystem] = useState<SystemStatus>({
    storageConfigured: false,
    saraminConfigured: false,
  });
  const [lastRun, setLastRun] = useState<CollectionRun | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  const loadRadar = useCallback(async () => {
    try {
      const [statusResponse, jobsResponse] = await Promise.all([
        fetch("/api/system/status", { cache: "no-store" }),
        fetch("/api/jobs", { cache: "no-store" }),
      ]);
      const status = (await statusResponse.json()) as SystemStatus;
      const jobs = (await jobsResponse.json()) as JobsResponse;

      if (!statusResponse.ok || !jobsResponse.ok) {
        throw new Error(jobs.error || "레이더 저장소에 연결하지 못했습니다.");
      }

      setSystem(status);
      setLastRun(jobs.lastRun);
      if (jobs.items.length > 0) {
        setCandidates(jobs.items);
        setActiveId((current) =>
          jobs.items.some((candidate) => candidate.id === current)
            ? current
            : jobs.items[0].id,
        );
        setDataMode("live");
      } else {
        setCandidates(sampleCandidates);
        setActiveId(sampleCandidates[0].id);
        setDataMode("sample");
      }
    } catch (error) {
      setDataMode("error");
      setNotice(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRadar(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRadar]);

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

  async function decide(status: ReviewStatus) {
    const previousStatus = active.status;
    setNotice(null);
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === active.id ? { ...candidate, status } : candidate,
      ),
    );

    if (active.persisted) {
      const response = await fetch(`/api/jobs/${encodeURIComponent(active.id)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: status }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setCandidates((current) =>
          current.map((candidate) =>
            candidate.id === active.id
              ? { ...candidate, status: previousStatus }
              : candidate,
          ),
        );
        setNotice(payload.error || "검수 결정을 저장하지 못했습니다.");
        return;
      }
    }

    const next = candidates.find(
      (candidate) => candidate.id !== active.id && candidate.status === "pending",
    );
    if (next) setActiveId(next.id);
  }

  async function collectSaramin() {
    setIsCollecting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/collectors/saramin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: "한국어" }),
      });
      const payload = (await response.json()) as {
        error?: string;
        inserted?: number;
        merged?: number;
      };
      if (!response.ok) throw new Error(payload.error || "사람인 수집에 실패했습니다.");

      setNotice(
        `사람인 수집 완료 · 신규 ${payload.inserted ?? 0}건 · 병합 ${payload.merged ?? 0}건`,
      );
      await loadRadar();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "사람인 수집에 실패했습니다.");
    } finally {
      setIsCollecting(false);
    }
  }

  const isSample = dataMode !== "live";
  const statusCopy =
    dataMode === "loading"
      ? "저장소 연결 확인 중"
      : dataMode === "live"
        ? `마지막 수집 ${collectionTime(lastRun)}`
        : dataMode === "error"
          ? "저장소 연결 오류 · 샘플 표시"
          : system.saraminConfigured
            ? "수집 이력 없음 · 샘플 표시"
            : "사람인 API 키 대기 · 샘플 표시";

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
        <div className="topbar-actions">
          <div className={`system-state ${dataMode === "error" ? "is-error" : ""}`}>
            <span aria-hidden="true" />
            {statusCopy}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void collectSaramin()}
            disabled={!system.saraminConfigured || isCollecting}
          >
            {isCollecting ? <LoaderCircle className="spin" /> : <RefreshCw />}
            사람인 수집
          </Button>
        </div>
      </header>

      {notice ? <div className="system-notice" role="status">{notice}</div> : null}

      <section className="workspace" aria-label="채용공고 검수 화면">
        <aside className="queue-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{isSample ? "DEMO" : "TODAY"}</p>
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
          <div className="metrics-grid" aria-label="최근 수집 현황">
            <Metric
              label={isSample ? "샘플 공고" : "신규 발견"}
              value={String(isSample ? candidates.length : lastRun?.storedCount ?? candidates.length)}
            />
            <Metric label="출처 병합" value={String(isSample ? 0 : lastRun?.mergedCount ?? 0)} />
            <Metric label="검토 대기" value={String(pending.length)} />
            <Metric label="채택" value={String(accepted)} tone="metric-green" />
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
                {active.matchedKeywords.length > 0 ? (
                  active.matchedKeywords.map((keyword) => (
                    <Badge variant="outline" key={keyword}>
                      #{keyword}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">#공고본문 일치</Badge>
                )}
              </div>

              <div className="source-row">
                <ScanSearch aria-hidden="true" />
                <div>
                  <span>원천 공고</span>
                  <strong>{active.source}</strong>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!active.sourceUrl}
                  onClick={() => active.sourceUrl && window.open(active.sourceUrl, "_blank", "noopener,noreferrer")}
                >
                  원문 보기 <ArrowUpRight />
                </Button>
              </div>
            </div>

            <aside className="score-panel" aria-label="Dreamdurim 사전 적합도">
              <p>규칙 기반 사전 적합도</p>
              <div className="score-number">
                <strong>{active.score}</strong>
                <span>/100</span>
              </div>
              <Progress value={active.score} />
              <ul>
                <li>
                  <Check /> 타깃 키워드 {active.matchedKeywords.length}개 일치
                </li>
                <li>
                  <Check /> {active.sourceKind === "official-api" ? "공식 API 출처" : "기업 원천 출처"}
                </li>
                <li>
                  <Check /> AI 정밀 평가는 채택 후 진행
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
              <Button variant="outline" onClick={() => void decide("excluded")}>
                <X /> 제외
              </Button>
              <Button variant="secondary" onClick={() => void decide("later")}>
                <Clock3 /> 나중에 보기
              </Button>
              <Button className="accept-button" onClick={() => void decide("accepted")}>
                <Check /> 채택
              </Button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
