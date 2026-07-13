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

커밋 전에 Git 사용자 정보가 없다면 한 번 설정합니다.

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## 3. Pages와 Secrets 설정

1. GitHub 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
2. **Settings → Secrets and variables → Actions → Secrets**에서 다음 두 값을 등록합니다.
   - `NOTION_TOKEN`
   - `NOTION_DATA_SOURCE_ID`
3. **Actions → Notion 검수본 배포 → Run workflow**를 누릅니다.

첫 배포 뒤 Pages 주소는 Actions 실행 결과의 `deploy` 단계에 표시됩니다.

## 배포 전 보안 확인

- `.env` 파일과 Notion 토큰을 커밋하지 않았는지 확인합니다.
- `Published` 글에 회사 자료·개인정보·비공개 링크가 없는지 확인합니다.
- 원문을 그대로 대량 복사한 글은 저작권 조건을 확인합니다.
