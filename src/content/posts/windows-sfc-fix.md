---
title: "윈도우 알림이 안오고 달력을 열면 자꾸 먹통이 될때"
description: "윈도우 알림이 안 오고 달력을 열면 먹통이 될 때, 손상된 시스템 파일을 검사·복구하는 sfc /scannow로 해결한 기록."
date: 2026-07-16
group: "트러블슈팅"
category: "Windows"
tags: ["Bugfix"]
draft: false
notionId: "39f04f27-e5ef-81d8-8b8a-c85dd11bb7d9"
---

# 증상

- 윈도우 **알림이 오지 않음**

- 작업표시줄 시계를 눌러 **달력을 열면 먹통**(멈추거나 안 뜨기)

# 해결 — `sfc /scannow`

관리자 권한으로 **명령 프롬프트**(또는 PowerShell)를 열고 실행:

```powershell
sfc /scannow
```

검사가 끝나면 손상된 시스템 파일을 자동으로 복구해준다. 완료 후 재부팅하니 알림·달력이 정상 동작.

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">⚠️</span><div class="callout-body"><p><strong>관리자 권한 필수.</strong> 시작 버튼 → '명령 프롬프트' 우클릭 → '관리자 권한으로 실행'. 검사는 몇 분 걸린다.</p></div></aside>

# sfc /scannow가 뭐길래 (짧게)

`sfc`(System File Checker) = 윈도우 **핵심 시스템 파일이 손상됐는지 검사하고 정상본으로 복구**하는 내장 도구다. 알림·달력 같은 윈도우 쉐(UI) 기능이 시스템 파일 손상으로 깨졌을 때 자주 이걸로 해결된다.

# 그래도 안 되면

`sfc`가 못 고치면 시스템 이미지부터 복구한 뒤 다시 실행:

```powershell
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
```
