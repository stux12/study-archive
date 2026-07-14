# Notion 학습 데이터베이스 템플릿

노션에서 **새 데이터베이스 → 표(Table)** 를 만들고 아래 속성을 추가하세요. 속성 이름과 유형은 동기화 스크립트의 기본값과 일치합니다.

| 속성 | 유형 | 예시 | 역할 |
| --- | --- | --- | --- |
| 제목 | Title | GitHub Actions에서 Secrets 쓰기 | 글 제목 |
| 상태 | Status | Draft / Review / Published / Archived | `Published`만 사이트에 배포 |
| 태그 | Multi-select | GitHub Actions, Security | 목록과 분류 |
| 카테고리 | Select | DevOps | 상위 분류 |
| 슬러그 | Text | github-actions-secrets | URL. 비우면 제목에서 자동 생성 |
| 요약 | Text | 민감한 값을 안전하게 보관하는 방법 | 글 목록의 소개 문구 |
| 학습일 | Date | 2026-07-13 | 목록 정렬 기준 |

## 권장 상태 흐름

`Inbox` → `Draft` → `Review` → `Published` → `Archived`

- `Inbox`: 자료만 모아 둔 상태
- `Draft`: AI 초안을 붙여넣은 상태
- `Review`: 직접 확인·수정 중인 상태 → [발행 검수 체크리스트](publish-review-checklist.md)를 통과하면 `Published`로
- `Published`: GitHub Pages 발행 후보 (동기화 대상)
- `Archived`: 사이트에서 제외하되 기록은 보존 (삭제 대신 이 상태로)

> 발행 전 확인 절차는 [발행 검수 체크리스트](publish-review-checklist.md)를 참고하세요.

## 새 글 템플릿

아래 내용을 Notion 데이터베이스의 새 템플릿 본문으로 넣어두면 일관된 기록을 만들 수 있습니다.

```md
## 한 줄 요약

## 왜 중요한가

## 핵심 개념

## 예시 또는 코드

## 내가 헷갈린 점

## 복습 질문

## 참고 자료
```

## 연결 권한 확인

Notion Developer Portal에서 Internal integration을 만든 뒤, 이 데이터베이스에 연결을 추가해 **Read content** 권한을 주세요. 연결 권한이 없으면 GitHub Action이 페이지를 찾지 못합니다.
