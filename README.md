# 학습 아카이브 (Study Archive)

기존에 Notion에 공부한 내용들을 따로 정리를 하던 번거로움을 더욱 편하게 하기 위해 생각해낸 서비스입니다.
새로운 것을 배우는 것은 좋았으나, 정리하기에는 너무 오래걸리고 번거롭던 작업을 지정된 프롬프트와 함께 핵심 주제와 공부했을 때 중요하게 느꼈던 포인트들을 같이 전달하여 더욱 편리하게 정리를 도와줍니다.

Notion에서 작성·검수한 학습 기록을, **원할 때만** GitHub Actions로 GitHub Pages에 발행하는 정적 사이트입니다. 작성은 익숙한 Notion에서, 공개는 빠르고 안정적인 정적 사이트로 분리했습니다. (Astro 기반)

- 라이브: https://stux12.github.io/study-archive/

## 작동 방식 — 상태 기반 발행

Notion 글의 **상태(Status)** 로 사이트 노출을 제어합니다.

| 상태 | 동작 |
| --- | --- |
| `시작 전` / `진행 중` | 초안. 사이트에 올라가지 않음 |
| `Published` | 발행 대상. 실행할 때마다 Notion에서 **다시 생성**하고 저장소에 커밋 |
| `완료` | 확정본. 이미 커밋된 파일을 **재조회 없이 그대로 고정** |
| 행 삭제 / 초안으로 전환 | 다음 실행 때 사이트에서 **제거** |
| 직접 작성 글 (`notionId` 없음) | 항상 **보존** |

발행 순서:

1. Notion 데이터베이스에 글을 작성합니다.
2. 직접 읽고 수정한 뒤, [발행 검수 체크리스트](docs/publish-review-checklist.md)를 통과한 글의 상태를 `Published`로 바꿉니다.
3. GitHub **Actions → Notion 검수본 배포 → Run workflow** 를 실행합니다. `dry_run`을 켜면 실제 배포 없이 발행 대상 목록만 미리 볼 수 있습니다.
4. 워크플로가 동기화 → 생성물 커밋 → 빌드 → 배포를 수행합니다. 중복 슬러그·0건 동기화는 자동 차단됩니다.

배포 트리거는 수동(`workflow_dispatch`)뿐입니다. Notion에서 상태를 바꿔도 워크플로를 실행하기 전에는 사이트가 바뀌지 않습니다 — 오발행을 막는 안전장치입니다.

## 커밋백(commit-back) 발행 모델

GitHub Actions는 매 실행마다 저장소를 새로 체크아웃하는 **무상태** 환경입니다. 그래서 "확정된 글은 다시 건드리지 않고 고정"하려면 생성물을 어딘가에 영속화해야 합니다.

이 프로젝트는 워크플로가 생성한 글(`src/content/posts`)과 이미지(`src/assets/posts`)를 **저장소에 커밋**해 보존합니다.

- `Published` 글: 매 실행 재생성 후 커밋
- `완료` 글: 이미 커밋된 파일을 그대로 유지(재조회하지 않음 → 수정해도 반영되지 않음)
- **`완료` 글을 갱신하려면**: 워크플로 실행 시 **`force_resync`** 옵션을 켜면 완료 글도 다시 가져와 갱신합니다. (`Published`로 되돌렸다 실행해도 됩니다)
- 사이트에 남을 글이 아닌 `notionId` 파일만 이미지 자산과 함께 삭제하며, 직접 작성한 글은 삭제하지 않습니다.

## 콘텐츠 변환

Notion 블록을 정적 사이트용 Markdown/HTML로 변환합니다. 지원 대상:

- 제목, 문단, 목록, 할 일, 인용문, 코드 블록, 구분선, 북마크
- **콜아웃**, **토글(details)**, **표**
- **Mermaid 다이어그램** — 코드 블록 언어를 `mermaid`로 지정하면 사이트에서 다이어그램으로 렌더됩니다
- **이미지** — Notion의 이미지 URL은 만료되므로, 내려받아 저장소 자산으로 보관합니다
- 인라인 서식(굵게, 기울임, 취소선, 코드, 링크)
- 코드 블록에는 **복사 버튼이 자동으로** 붙습니다 (Mermaid 제외)

## 분류 체계 (3단계)

`분야`(대분류) → `카테고리`(중분류) → `태그`(키워드) 로 글을 분류합니다. 메인 목록은 **최신순 단일 목록**이며, 분야를 고르면 **그 분야에 속한 카테고리만** 자동으로 좁혀집니다.

## 사이트 기능

- **검색·필터** — 제목·요약·태그 검색, `분야`·`카테고리`·`태그` 칩 필터(2줄 넘으면 더보기/접기)
- **목록** — 최신순, 처음 5개만 표시하고 **⋮** 버튼으로 5개씩 추가
- **분야별 기록 그래프** — 필터 아래 접이식. 분야별 글 수를 막대로 표시
- **방문자 수** — GoatCounter(쿠키 없음)로 집계, 푸터에 표시
- **테마** — 라이트/다크 토글
- **SEO·구독** — Open Graph, RSS, sitemap

## 노션 데이터베이스 준비

아래 속성을 만드세요. 한글 이름을 바꾸고 싶다면 GitHub Repository Variables에 대응하는 환경 변수를 설정하면 됩니다.

| 이름 | Notion 속성 유형 | 필수 | 환경 변수 |
| --- | --- | --- | --- |
| 제목 | Title | 예 | `NOTION_TITLE_PROPERTY` |
| 상태 | Status (`Published`·`완료` 옵션 필요) | 예 | `NOTION_STATUS_PROPERTY` |
| 분야 | Select (대분류) | 아니오 | `NOTION_GROUP_PROPERTY` |
| 카테고리 | Select | 아니오 | `NOTION_CATEGORY_PROPERTY` |
| 태그 | Multi-select | 아니오 | `NOTION_TAGS_PROPERTY` |
| 슬러그 | Text | 아니오 | `NOTION_SLUG_PROPERTY` |
| 요약 | Text | 아니오 | `NOTION_SUMMARY_PROPERTY` |
| 학습일 | Date | 아니오 | `NOTION_DATE_PROPERTY` |

속성 생성, 상태 흐름, 새 글 템플릿은 [노션 데이터베이스 템플릿](docs/notion-database-template.md)을 따라 하면 됩니다. 시각 자료 작성 규칙은 [콘텐츠·시각자료 정책](docs/content-visual-policy.md)을 참고하세요.

## GitHub 설정

1. 이 폴더를 새 GitHub 저장소로 올립니다.
2. 저장소 **Settings → Pages → Source** 에서 **GitHub Actions** 를 선택합니다.
3. 저장소 **Settings → Secrets and variables → Actions → Secrets** 에 다음을 추가합니다.
   - `NOTION_TOKEN`: Notion Internal integration secret
   - `NOTION_DATABASE_ID`: 노션 데이터베이스 ID (또는 특정 데이터 소스를 직접 지정하려면 `NOTION_DATA_SOURCE_ID`)
4. Notion 연결(integration)에 해당 데이터베이스 읽기 권한을 부여합니다.
5. 커밋백을 위해 **Settings → Actions → General → Workflow permissions** 가 **Read and write permissions** 인지 확인합니다.
6. Actions 탭에서 `Notion 검수본 배포`를 수동 실행합니다.

토큰은 로컬 `.env`나 GitHub Secrets에만 보관하며, 소스 코드와 Git 저장소에는 넣지 않습니다. 저장소 생성부터 최초 배포까지는 [GitHub Pages 체크리스트](docs/github-publish-checklist.md)를 참고하세요.

## 로컬 실행

```powershell
npm install
npm run dev
```

노션 동기화는 환경 변수를 설정한 뒤 실행합니다.

```powershell
$env:NOTION_TOKEN = 'secret_xxx'
$env:NOTION_DATABASE_ID = '...'
npm run sync:notion            # Published·완료 글을 로컬 src/content/posts로 생성
npm run sync:notion -- --dry-run   # 파일을 쓰지 않고 발행 대상만 출력
npm run build
```

## AI로 초안 작성하기

대화형 AI에 아래처럼 요청하면 결과를 Notion 페이지 본문에 붙여넣기 좋습니다. 학습 글의 표준 구조입니다.

```text
아래 학습 메모를 노션 학습 기록으로 정리해줘.
초보자 눈높이로, 어려운 용어는 쉬운 설명·비유를 곁들여줘.
사실과 추측을 구분하고, 출처가 없으면 없다고 표시해줘.
Mermaid 다이어그램·콜아웃·표를 적극 활용해줘.

형식:
한 줄 요약 / 왜 중요한가 / 핵심 개념(+시각자료) / 예제 / 함정과 방지책 / 정리하자면

[여기에 메모 또는 링크]
```

`정리하자면`은 정리된 글을 읽고 **스스로의 언어·비유로 직접** 채우는 칸입니다(AI가 채우지 않습니다).

버그·트러블슈팅 글은 이 틀 대신 **증상 → 해결 → 짧은 설명** 정도로 간단히 씁니다.

## 업데이트 이력

### 2026-07-16
- 분야별 기록 그래프 추가 (검색·필터 아래, 접이식)
- 문서 4종 최신화 — 상태 모델·3단계 분류·글 구조 반영, 사실 오류 정정
- 코드 블록 복사 버튼 추가
- 방문자 수 집계 도입 (GoatCounter, 쿠키 없음) + 푸터에 표시
- `force_resync` 옵션 추가 — `완료` 글도 갱신 가능
- 필터 칩 더보기/접기, 글 목록 5개씩 더보기(⋮) 페이지네이션
- 히어로 상단 안내 문구 추가
- 커밋백 커밋 작성자 지정 — 발행 시 기여도(잔디) 반영

### 2026-07-15
- 히어로 명언 추가 및 문구 정리
- 분야 필터 + 분야별 카테고리 캐스케이드 + 최신순 정렬 (목록은 평탄하게 유지)
- **`분야`(대분류) 도입** — 분야 > 카테고리 > 태그 3단계 분류
- **커밋백 발행 모델 도입** — `Published` 재생성 / `완료` 고정 / 삭제 반영
- 직접 작성 고정 글 정리
- Mermaid 다이어그램 지원
- 시각자료 파이프라인 확장 — 이미지·표·토글·콜아웃·인라인 서식
- 콘텐츠·시각자료 정책 수립 (이중 부호화 기반)
- 사이트 전면 리디자인 — 라이트/다크 테마
- SEO — 메타 태그·OG 이미지·RSS·사이트맵
- 발행 안전장치 3단계 — 중복 슬러그·0건 가드, dry-run 미리보기, 검수 체크리스트
- GitHub Actions Node 24 상향

### 2026-07-13
- 초기 구축 — Notion → Astro → GitHub Pages 파이프라인
- Notion 데이터베이스 ID 기반 동기화
- 목록 필터·콘텐츠 스타일링
