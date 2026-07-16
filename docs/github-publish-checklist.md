# GitHub Pages 최초 배포 체크리스트

## 1. 저장소 만들기

GitHub에서 빈 저장소를 만듭니다. 개인 학습 기록을 공개할 계획이라면 Public 저장소가 편리합니다. 비공개 자료가 포함된다면 절대 Public으로 만들지 마세요.

## 2. 코드 올리기

아래 명령의 `<GITHUB_ID>`와 저장소 이름을 자신의 것으로 바꿉니다.

```powershell
git remote add origin https://github.com/<GITHUB_ID>/study-archive.git
git add .
git commit -m "feat: initialize study archive"
git push -u origin main
```

커밋 전에 Git 사용자 정보가 없다면 설정합니다. **기여도 그래프(잔디)에 잡히려면 GitHub 계정에 연결된 이메일**이어야 합니다. 실제 메일을 공개하고 싶지 않다면 GitHub의 noreply 주소를 쓰세요.

```powershell
git config user.name "<GITHUB_ID>"
git config user.email "<ID숫자>+<GITHUB_ID>@users.noreply.github.com"
```

> noreply 주소의 `<ID숫자>`는 `https://api.github.com/users/<GITHUB_ID>` 의 `id` 값입니다.

## 3. Pages·Secrets·권한 설정

1. **Settings → Pages → Build and deployment → Source** 에서 **GitHub Actions** 를 선택합니다.
2. **Settings → Secrets and variables → Actions → Secrets** 에 다음을 등록합니다.
   - `NOTION_TOKEN` — Notion Internal integration secret
   - `NOTION_DATABASE_ID` — 데이터베이스 ID (또는 특정 데이터 소스를 지정하려면 `NOTION_DATA_SOURCE_ID`)
3. **Settings → Actions → General → Workflow permissions** 를 **Read and write permissions** 로 설정합니다.
   → 워크플로가 생성물(글·이미지)을 저장소에 커밋하는 **커밋백**에 필요합니다.
4. Notion 연결(integration)에 해당 데이터베이스 **Read content** 권한을 부여합니다.
5. **Actions → Notion 검수본 배포 → Run workflow** 를 누릅니다.

첫 배포 뒤 Pages 주소는 Actions 실행 결과의 `deploy` 단계에 표시됩니다.

## 4. 실행 옵션

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `sync_notion` | true | Notion 글을 먼저 동기화 |
| `dry_run` | false | 미리보기만 (배포·커밋 안 함) |
| `force_resync` | false | `완료` 글도 다시 가져와 갱신 |

처음에는 **`dry_run`을 켜고 한 번 실행**해 대상 글 목록을 확인하는 것을 권장합니다.

## 배포 전 보안 확인

- `.env` 파일과 Notion 토큰을 커밋하지 않았는지 확인합니다.
- 발행할 글(`Published`·`완료`)에 회사 자료·개인정보·비공개 링크가 없는지 확인합니다.
- 원문을 그대로 대량 복사한 글은 저작권 조건을 확인합니다.

## 참고: 배포 트리거

이 워크플로는 **수동 실행(`workflow_dispatch`)만** 지원합니다. Notion에서 상태를 바꿔도 워크플로를 실행하기 전에는 사이트가 바뀌지 않습니다 — 오발행을 막는 의도된 안전장치입니다.
