# 공부 아카이브

대화형 AI로 만든 학습 초안을 노션에서 검수하고, **원할 때만** GitHub Actions에서 GitHub Pages로 발행하는 정적 사이트입니다.

## 작동 방식

1. AI에게 학습 내용을 정리하게 한 뒤 노션 데이터베이스에 저장합니다.
2. 직접 읽고 수정합니다. 공개할 글만 상태를 `Published`로 변경합니다.
3. GitHub의 **Actions → Notion 검수본 배포 → Run workflow**를 누릅니다.
4. 워크플로가 `Published` 글만 가져와 사이트를 빌드하고 배포합니다.

`Draft`, `Review` 등 다른 상태의 글은 절대 동기화하지 않습니다.

## 노션 데이터베이스 준비

아래 속성을 만드세요. 한글 이름을 바꾸고 싶다면 GitHub Repository Variables에 같은 이름의 환경 변수를 설정하면 됩니다.

| 이름 | Notion 속성 유형 | 필수 |
| --- | --- | --- |
| 제목 | Title | 예 |
| 상태 | Status (`Published` 옵션 필요) | 예 |
| 태그 | Multi-select | 아니오 |
| 카테고리 | Select | 아니오 |
| 슬러그 | Text | 아니오 |
| 요약 | Text | 아니오 |
| 학습일 | Date | 아니오 |

노션 본문은 제목, 문단, 목록, 할 일, 인용문, 코드 블록, 구분선, 북마크를 Markdown으로 변환합니다. 이미지·복잡한 데이터베이스 블록은 초기 버전에서 변환 대상이 아닙니다.

속성 생성, 상태 흐름, 새 글 템플릿은 [노션 데이터베이스 템플릿](docs/notion-database-template.md)을 그대로 따라 하면 됩니다.

## GitHub 설정

1. 이 폴더 자체를 새 GitHub 저장소로 올립니다.
2. 저장소 **Settings → Pages → Source**에서 **GitHub Actions**를 선택합니다.
3. 저장소 **Settings → Secrets and variables → Actions → Secrets**에 다음을 추가합니다.
   - `NOTION_TOKEN`: Notion Internal integration secret
   - `NOTION_DATA_SOURCE_ID`: 노션 데이터베이스의 data source ID
4. Notion 연결에 해당 데이터베이스 읽기 권한을 부여합니다.
5. Actions 탭에서 `Notion 검수본 배포`를 수동 실행합니다.

토큰은 로컬 `.env`나 GitHub Secrets에만 보관합니다. 정적 사이트와 Git 저장소에는 넣지 않습니다.

저장소 생성부터 최초 배포까지는 [GitHub Pages 체크리스트](docs/github-publish-checklist.md)를 참고하세요.

## 로컬 실행

```powershell
npm install
npm run dev
```

노션 동기화는 환경 변수를 설정한 뒤 실행합니다.

```powershell
$env:NOTION_TOKEN = 'secret_xxx'
$env:NOTION_DATA_SOURCE_ID = '...'
npm run sync:notion
npm run build
```

## AI 입력 템플릿

대화형 AI에 아래처럼 요청하면 결과를 노션 페이지 본문에 붙여넣기 좋습니다.

```text
아래 학습 메모를 노션 학습 기록으로 정리해줘.
사실과 추측을 구분하고, 출처가 없으면 출처가 없다고 표시해줘.
형식: 한 줄 요약 / 왜 중요한가 / 핵심 개념 / 예시 / 헷갈린 점 / 복습 질문 / 참고 자료

[여기에 메모 또는 링크]
```
