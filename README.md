# Dreamdurim Radar

한국과 중국의 채용 기회를 수집·정규화·선별하고, Dreamdurim 운영진이 최종 판단하는 내부 도구입니다.

## 기술 선택

- **TypeScript**: 운영 화면부터 수집 어댑터까지 한 언어로 관리합니다.
- **Next.js-compatible Vinext + React**: Cloudflare Workers 배포를 지원하는 검수 화면입니다.
- **Drizzle-ready**: 영속 저장이 필요해지는 다음 단계에서 D1/PostgreSQL 계열로 확장합니다.
- **Node test runner**: 핵심 필터와 중복 식별 규칙을 가볍게 검증합니다.

Python은 기본 언어로 섞지 않습니다. 공식 API나 HTTP 수집은 TypeScript로 구현하고, 브라우저 자동화·문서 분석처럼 Python이 명확히 유리한 독립 작업이 생길 때만 별도 워커로 추가합니다.

## 현재 구현

- 검토 대기 공고 큐
- Dreamdurim 적합도와 S/A/B/C 등급 표시
- `채택 / 나중에 보기 / 제외` 판단 흐름
- 한·중·영문 1차 키워드 필터
- 교차 출처 중복 제거용 정규화 지문
- 샘플 공고와 자동 테스트

현재 화면의 공고와 집계 수치는 UI 흐름을 검증하기 위한 샘플입니다.

## 로컬 실행

```bash
npm ci
npm run dev
```

검증:

```bash
npm run lint
npm test
```

## 다음 개발 단위

1. 사람인 공식 API 어댑터
2. 통합 공고 스키마와 저장소
3. 출처별 원문 URL 병합 및 중복 제거
4. 규칙 기반 사전 필터 후 AI 평가
5. 검수 결정 영속화와 게시용 가공 큐

자세한 경계와 흐름은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)를 참고하세요.
