# AGENTS.md

## Product boundary

Dreamdurim Radar는 한중 채용 기회를 운영진에게 선별해 주는 내부 도구다. 현재 MVP의 최종 결정권자는 항상 사람이다.

## Development rules

- TypeScript를 기본 언어로 유지한다.
- 하나의 개발 단위는 하나의 수집기 또는 하나의 검수 흐름으로 제한한다.
- 플랫폼 약관과 robots 정책을 우회하지 않는다.
- 공식 API와 기업 원천 Careers를 우선한다.
- AI 생성 데이터는 원문 데이터와 분리한다.
- 화면 변경은 모바일과 데스크톱에서 잘림 여부를 확인한다.
- 기능 변경 시 테스트와 `docs/ARCHITECTURE.md`를 함께 갱신한다.
- 실제 API 키, 쿠키, 토큰, 개인정보를 커밋하지 않는다.

## Required checks

```bash
npm run lint
npm test
```
