---
title: "IPC, 분리된 프로세스끼리 어떻게 대화하나?"
description: "프로세스는 서로 메모리가 격리되어 있어 직접 데이터를 나눌 수 없다. IPC(프로세스 간 통신)는 커널을 거쳐 프로세스끼리 데이터를 주고받는 방법으로, 파이프·메시지 큐·공유 메모리·소켓 등이 있다."
date: 2026-07-21
group: "CS·기초"
category: "기타"
tags: ["IPC"]
draft: false
notionId: "3a404f27-e5ef-8129-b28b-c9e844908f64"
---

# 한 줄 요약

프로세스는 서로 **메모리가 격리**되어 있어 상대의 데이터에 직접 손대지 못한다. **IPC(Inter-Process Communication)** 는 그 베를 넘어 **커널을 중간에 두고 프로세스끼리 데이터를 주고받는** 방법을 통틀어 부르는 말이다.

<aside class="callout callout--note"><span class="callout-icon" aria-hidden="true">🎯</span><div class="callout-body"><p>비유: 프로세스는 <strong>각자 분리된 방</strong>에 있다. 옆 방의 물건을 직접 건드릴 수 없으니, <strong>복도(커널)</strong> 를 통해 쪽지를 전달하거나, 둘만 쓸 수 있는 <strong>공용 테이블(공유 메모리)</strong> 를 둔다.</p></div></aside>

# 1. 왜 필요한가

운영체제는 프로세스를 **서로 격리**한다. 한 프로세스가 다른 프로세스의 메모리를 마음대로 읽고 쓰면 안정성·보안이 무너지기 때문이다.

하지만 실제로는 프로세스끼리 협력해야 할 일이 많다.

- 브라우저의 탭 프로세스가 데이터를 주고받기

- 웹 서버가 버퍼를 별도 캐시 프로세스(Redis 등)와 주고받기

- 쉘이 명령어를 파이프(`|`)로 이어붙이기

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">⚠️</span><div class="callout-body"><p><strong>스레드와 다른 점.</strong> 같은 프로세스 안의 스레드들은 메모리(힙)를 이미 공유해서 변수로 바로 주고받는다. IPC는 <strong>메모리를 공유하지 않는 서로 다른 프로세스</strong> 사이의 문제다.</p></div></aside>

# 2. 큰 그림 — 커널을 거친다

거의 모든 IPC는 **커널이 중간에서 중계**한다. 한 프로세스가 커널에 쓰면, 다른 프로세스가 커널에서 읽는 식이다.

```mermaid
flowchart LR
    A["프로세스 A<br>(자기 메모리)"] -->|"쓰기"| K["커널<br>(파이프·큐·공유메모리)"]
    K -->|"읽기"| B["프로세스 B<br>(자기 메모리)"]
```

<aside class="callout callout--tip"><span class="callout-icon" aria-hidden="true">💡</span><div class="callout-body"><p>예외가 <strong>공유 메모리</strong>다. 이건 커널이 만들어준 <strong>공동 메모리 구역을 두 프로세스가 직접 읽고 쓰기</strong> 때문에, 매번 커널을 거치지 않아 가장 빠르다. 대신 동기화를 직접 해야 한다(뒤에서).</p></div></aside>

# 3. IPC 종류

상황에 따라 고른다. 큰 틀은 **"데이터를 전달하느냐"** vs **"메모리를 공유하느냐"**이다.

<div class="table-wrap"><table><tr><th>방식</th><th>설명</th><th>특징</th></tr><tr><td><strong>파이프(Pipe)</strong></td><td>한 쪽이 쓰고 한 쪽이 읽는 단방향 통로</td><td>쉘 <code>|</code>의 그것. 보통 부모-자식 프로세스</td></tr><tr><td><strong>이름 있는 파이프(FIFO)</strong></td><td>파일 이름을 가진 파이프</td><td>관계 없는 프로세스끼리도 가능</td></tr><tr><td><strong>메시지 큐</strong></td><td>커널에 메시지를 줄 세워 주고받음</td><td>메시지 단위로 경계가 명확</td></tr><tr><td><strong>공유 메모리</strong></td><td>공동 메모리 구역을 둘이 직접 사용</td><td><strong>가장 빠름</strong>. 동기화 필요</td></tr><tr><td><strong>소켓(Socket)</strong></td><td>네트워크 방식의 양방향 통신</td><td><strong>다른 머신</strong>과도 가능(로컬은 유닉스 소켓)</td></tr><tr><td><strong>시그널(Signal)</strong></td><td>"종료해"즜 간단한 알림</td><td>데이터가 아니라 이벤트 통지용</td></tr></table></div>

# 4. 동기화 — 공유 메모리의 짝꿍

공유 메모리처럼 둘이 같은 곳을 쓰면 **동시에 손대다가 값이 꼬이는** 문제가 생긴다. 그래서 순서를 맞춰주는 도구가 필요하다.

- **세마포어(Semaphore)** — "동시에 몇 개까지 들어갈 수 있는가"를 세는 신호등.

- **뮤텍스(Mutex)** — 한 번에 하나만 들어가게 하는 잠금.

<aside class="callout callout--note"><span class="callout-icon" aria-hidden="true">📌</span><div class="callout-body"><p>파이프·메시지 큐는 커널이 순서를 정리해주지만, <strong>공유 메모리는 속도를 얻는 대신 동기화를 개발자가 직접</strong> 챙겨야 한다. "빠르지만 손이 많이 간다"가 트레이드오프.</p></div></aside>

# 5. 예제 — 가장 친숙한 IPC, 쉘 파이프

매일 쓰는 명령어가 사실 IPC다.

```bash
ps aux | grep java
```

<details class="toggle"><summary>여기서 무슨 일이 일어나나</summary><div class="toggle-body"><ul><li><code>ps aux</code> 프로세스와 <code>grep java</code> 프로세스가 <strong>따로</strong> 뜬다.</li><li><code>|</code>(파이프)가 앞 프로세스의 <strong>출력을 뒷 프로세스의 입력으로</strong> 연결한다.</li><li>즉 두 프로세스가 <strong>파이프라는 IPC로 데이터를 주고받는</strong> 것.</li></ul><p>이처럼 IPC는 먼 기술이 아니라 이미 매일 쓰고 있다.</p></div></details>

# 6. 함정과 방지책

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">🧨</span><div class="callout-body"><p><strong>함정 1 — 공유 메모리를 동기화 없이 쓴다.</strong> 두 프로세스가 동시에 쓰면 데이터가 깨진다(race condition).</p><p><strong>방지:</strong> 세마포어·뮤텍스로 접근 순서를 보장한다.</p></div></aside>

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">🧨</span><div class="callout-body"><p><strong>함정 2 — 무조건 공유 메모리가 빠르니까 쓴다.</strong> 빠르지만 동기화 버그가 가장 잡기 어렵다.</p><p><strong>방지:</strong> 간단한 메시지 교환이면 메시지 큐·파이프가 더 안전하고 단순하다.</p></div></aside>

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">🧨</span><div class="callout-body"><p><strong>함정 3 — 파이프의 버퍼가 차면 멈춘다.</strong> 읽는 쪽이 느리면 쓰는 쪽이 대기(블로킹)하다가 먹통처럼 보일 수 있다.</p><p><strong>방지:</strong> 약속된 크기·배압 처리를 이해하고, 큰 데이터는 큐·소켓 등을 고려한다.</p></div></aside>
