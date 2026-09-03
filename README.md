# Dreamdurim Radar

한국과 중국의 채용 기회를 수집·정규화·선별하고, Dreamdurim 운영진이 최종 판단하는 내부 도구입니다.

## 기술 선택

- **TypeScript**: 운영 화면부터 수집 어댑터까지 한 언어로 관리합니다.
- **Next.js-compatible Vinext + React**: Cloudflare Workers 배포를 지원하는 검수 화면입니다.
- **Cloudflare D1 + Drizzle**: 공고, 출처, 수집 이력, 운영진 판단을 영속 저장합니다.
- **Node test runner**: 핵심 필터와 중복 식별 규칙을 가볍게 검증합니다.

Python은 기본 언어로 섞지 않습니다. 공식 API나 HTTP 수집은 TypeScript로 구현하고, 브라우저 자동화·문서 분석처럼 Python이 명확히 유리한 독립 작업이 생길 때만 별도 워커로 추가합니다.

## 현재 구현

- 검토 대기 공고 큐
- Dreamdurim 적합도와 S/A/B/C 등급 표시
- `채택 / 나중에 보기 / 제외` 판단 흐름
- 한·중·영문 1차 키워드 필터
- 교차 출처 중복 제거용 정규화 지문
- 사람인 공식 API 수집·정규화 어댑터
- D1 통합 공고 저장소와 출처 병합
- 수집 실행 이력과 검수 결정 영속화
- 실제 데이터가 없거나 API 키가 없을 때의 안전한 샘플 상태
- 자동 테스트

사람인 API 키를 설정하기 전에는 화면에 `DEMO` 표시와 함께 샘플 공고가 나타납니다. 샘플에서 내린 판단은 저장되지 않으며, 실제로 수집한 공고의 판단만 D1에 기록됩니다.

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

## 사람인 API 설정

1. [사람인 Open API](https://oapi.saramin.co.kr/guide/1)에서 서비스 등록과 키 승인을 받습니다.
2. 로컬 개발 환경에는 `.env.example`과 같은 이름으로 `SARAMIN_ACCESS_KEY`를 설정합니다.
3. 배포 환경의 키는 Sites 런타임 설정에서 관리합니다. 실제 키는 Git에 커밋하지 않습니다.

수집 버튼은 최근 7일 동안 수정된 `한국어` 검색 결과의 첫 페이지를 가져옵니다. 사람인 API의 페이지당 상한인 110건을 적용하며, 이후 자동 스케줄러에서 키워드별 페이지 순회를 맡길 예정입니다.

## API 경계

| 경로 | 역할 |
|---|---|
| `GET /api/system/status` | D1과 사람인 키 준비 상태 확인 |
| `GET /api/jobs` | 통합 검수 큐와 최근 수집 이력 조회 |
| `POST /api/collectors/saramin` | 사람인 공고 한 페이지 수집·정규화·저장 |
| `POST /api/jobs/:id/decision` | 채택·나중에 보기·제외 판단 기록 |

## 다음 개발 단위

1. 승인된 사람인 키로 실제 응답 통합 검증
2. 다중 키워드·페이지 순회 스케줄러와 일일 호출 예산
3. 규칙 기반 사전 필터 후 AI 평가
4. 주요 기업 Careers 수집기
5. 채택 공고의 게시용 가공 큐

자세한 경계와 흐름은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)를 참고하세요.
