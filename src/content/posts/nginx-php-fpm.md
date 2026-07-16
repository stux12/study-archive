---
title: "NGINX에서 PHP-FPM을 사용하는 이유"
description: "NGINX는 PHP를 직접 실행하지 못한다. 그래서 PHP 요청을 FastCGI로 PHP-FPM에 넘겨 실행시키고 결과만 받아 응답한다. 이 분리 덕분에 정적 처리와 PHP 실행을 각각 최적화·확장할 수 있다."
date: 2026-07-16
group: "백엔드"
category: "Web Server"
tags: ["Nginx"]
draft: false
notionId: "39f04f27-e5ef-817d-8c63-dd0d2a77582e"
---

# 한 줄 요약

NGINX는 **PHP를 직접 실행하지 못한다.** 그래서 `.php` 요청이 오면 **FastCGI**라는 규격으로 **PHP-FPM**에 넘기고, PHP-FPM이 실행한 결과를 받아 다시 브라우저에 전달한다.

<aside class="callout callout--note"><span class="callout-icon" aria-hidden="true">🎯</span><div class="callout-body"><p>비유: <strong>NGINX는 문지기 겸 배달원, PHP-FPM은 주방</strong>이다. NGINX는 요리를 못 한다. 주문(요청)을 받아 주방에 넘기고, 나온 음식(결과)을 손님에게 가져다 줄 뿐이다.</p></div></aside>

# 1. 왜 이런 구조가 됐나 — Apache와 비교

예전 Apache는 **mod_php**로 PHP 인터프리터를 웹서버 프로세스 **안에 넣어** 실행했다. 편하지만 문제가 있었다 — 이미지·CSS 같은 **정적 파일을 줄 때도 PHP가 통째로 메모리에 올라와 있었다.**

NGINX는 설계 철학이 다르다. **적은 프로세스로 많은 연결을 비동기로 처리**하는 데 특화되어 있고, **언어 인터프리터를 내장하지 않는다.** 그래서 실행은 밖으로 맡긴다.

<div class="table-wrap"><table><tr><th>구분</th><th>Apache + mod_php</th><th>NGINX + PHP-FPM</th></tr><tr><td>PHP 실행 위치</td><td>웹서버 프로세스 안</td><td>별도 프로세스(PHP-FPM)</td></tr><tr><td>정적 파일 요청</td><td>PHP가 매달린 채 처리(낝비)</td><td>NGINX가 바로 응답(가벼움)</td></tr><tr><td>튜닝·재시작</td><td>웹서버와 한 덩어리</td><td>각각 따로 가능</td></tr></table></div>

# 2. PHP-FPM이 뭐길래

**PHP-FPM = FastCGI Process Manager.** PHP 프로세스(워커)를 **미리 여러 개 띄워두고 관리**하다가, FastCGI로 들어온 요청을 빈 워커에 맡겨 실행시킨다.

<aside class="callout callout--tip"><span class="callout-icon" aria-hidden="true">💡</span><div class="callout-body"><p><strong>CGI vs FastCGI (짧게).</strong> 예전 CGI는 <strong>요청마다 PHP 프로세스를 새로 띄웠다</strong> — 느리다. FastCGI는 <strong>살아있는 프로세스를 재사용</strong>한다. 그래서 매번 켜고 끄는 비용이 없다.</p></div></aside>

# 3. 요청이 흐르는 길

```mermaid
flowchart LR
    B["브라우저"] --> N["NGINX"]
    N -->|"정적 파일(.css/.jpg)"| B
    N -->|".php → FastCGI로 전달"| F["PHP-FPM 워커"]
    F --> D["DB · 파일 등"]
    F -->|"실행 결과(HTML)"| N
    N -->|"응답"| B
```

1. 브라우저 요청이 NGINX에 도착.

1. 정적 파일이면 NGINX가 **그냥 바로** 준다.

1. `.php`면 **FastCGI로 PHP-FPM에 전달**.

1. PHP-FPM 워커가 PHP를 실행(필요시 DB 조회).

1. 결과(HTML)를 NGINX에 돌려주고, NGINX가 브라우저에 응답.

# 4. 설정 예시

```javascript
server {
    listen 80;
    root /var/www/html;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

<details class="toggle"><summary>한 줄씩 쉽게 풀어보기</summary><div class="toggle-body"><ul><li><code>location ~ \.php$</code> — 주소가 <code>.php</code>로 끝나면 이 블록이 처리</li><li><code>fastcgi_pass unix:/run/php/...sock</code> — <strong>이 소켓으로 PHP-FPM에 넘긴다</strong> (핵심 한 줄)</li><li><code>SCRIPT_FILENAME</code> — "어떤 파일을 실행해라"를 PHP-FPM에 알려줌</li><li><code>try_files</code> — 실제 있는 파일을 먼저 찾고, 없으면 <code>index.php</code>로 보냄</li></ul><p>소켓(<code>unix:</code>) 대신 <code>127.0.0.1:9000</code> 처럼 <strong>TCP</strong>로도 연결할 수 있다.</p></div></details>

# 5. 그래서 얻는 것 — 왜 이렇게 쓰나

<div class="table-wrap"><table><tr><th>장점</th><th>설명</th></tr><tr><td><strong>역할 분리</strong></td><td>NGINX는 연결·정적에 집중, PHP-FPM은 실행에 집중</td></tr><tr><td><strong>자원 효율</strong></td><td>정적 파일 줄 때 PHP 메모리를 안 쓴다</td></tr><tr><td><strong>독립 재시작</strong></td><td>PHP만 재시작해도 NGINX는 그대로</td></tr><tr><td><strong>독립 튜닝</strong></td><td>워커 수를 PHP 쪽에서 따로 조절</td></tr><tr><td><strong>격리·다중화</strong></td><td>사이트별로 풀(pool)을 나눠 다른 계정·PHP 버전 사용 가능</td></tr><tr><td><strong>서버 분리</strong></td><td>TCP로 연결하면 PHP-FPM을 다른 서버에 둘 수도 있다</td></tr></table></div>

# 6. 함정과 방지책

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">🧨</span><div class="callout-body"><p><strong>함정 1 — 502 Bad Gateway.</strong> PHP-FPM이 꺼졌거나, 소켓 경로·권한이 안 맞을 때 자주 남. NGINX 유저가 소켓을 읽을 수 있어야 한다.</p><p><strong>방지:</strong> PHP-FPM 상태와 소켓 경로·권한(<code>listen.owner</code>/<code>listen.group</code>)을 먼저 확인.</p></div></aside>

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">🧨</span><div class="callout-body"><p><strong>함정 2 — File not found.</strong> <code>SCRIPT_FILENAME</code>을 안 넘겨서 PHP-FPM이 어떤 파일을 실행할지 모르는 경우.</p><p><strong>방지:</strong> <code>fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;</code>을 빼먹지 않는다.</p></div></aside>

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">🧨</span><div class="callout-body"><p><strong>함정 3 — 워커 고갈(502/504).</strong> 동시 접속이 늘면 <code>pm.max_children</code> 부족으로 요청이 밀린다.</p><p><strong>방지:</strong> 워커 1개당 메모리를 재서 가용 메모리에 맞게 <code>pm.max_children</code>를 정한다.</p></div></aside>

<aside class="callout callout--warn"><span class="callout-icon" aria-hidden="true">🧨</span><div class="callout-body"><p><strong>함정 4 — 업로드 폴더의 PHP가 실행됨(보안).</strong> 공격자가 <code>.php</code>를 올려 실행시킬 수 있다.</p><p><strong>방지:</strong> 업로드 디렉터리에선 PHP 실행을 막고, 존재하는 파일만 처리하도록 제한한다.</p></div></aside>
