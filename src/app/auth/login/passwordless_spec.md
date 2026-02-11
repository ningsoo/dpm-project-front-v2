# Passwordless 로그인 스펙

## 2-1. 목적

Passwordless 등록/로그인 플로우를 로그인 화면에 통합한다.

---

## 2-2. 원본 HTML 엔드포인트/동작 요약

| 구분 | HTTP | URL / Body | 용도 |
|------|------|------------|------|
| **status** | GET | `/api/v1/auth/status?user={id}` | 등록 여부 판단. 응답 `json.data.exist` 로 기등록 여부 확인 |
| **register** | POST | `/api/v1/auth/register` body `{ id }` | 비밀번호 없음 등록. 응답 `json.data.qr` 로 QR 이미지 표시 |
| **login-trigger** | POST | `/api/v1/auth/login-trigger?userId={id}&ip=127.0.0.1` | 로그인 트리거. 응답 `json.data.servicePassword` 표시 후 폴링 시작 |
| **result** | GET | `/api/v1/auth/result?userId={id}` | 승인 결과 조회. `json.data.auth === "Y"` 이면 승인 성공 |
| **폴링** | - | - | result 호출 주기: **2초** |

- **status**: 사용자(id)가 이미 Passwordless 등록된 경우 `exist: true`
- **register**: 미등록 사용자가 등록 시 QR 코드 발급, 화면에 QR 표시
- **login-trigger**: 로그인 시도 시 일회용 코드(servicePassword) 발급, 화면에 6자리 코드 표시 후 result 폴링
- **result**: 2초마다 호출하여 `auth === "Y"` 이면 로그인 성공 처리(메인 이동 등)

---

## 2-3. UI 요구사항 요약 (추후 구현)

- **로그인 버튼 위**: 라디오 선택 — **Password** / **Passwordless**
- **하단 링크**: "Passwordless 설정" 링크 추가
- **Passwordless 설정 클릭 시 모달**
  - QR 코드 표시
  - 안내 텍스트
  - 카운트다운
  - 시간에 따라 줄어드는 게이지
- **Passwordless 로그인 시**
  - 비밀번호 input 자리에 **6자리 코드** 표시
  - 승인 **폴링** (result 2초 주기)
  - 성공 시 메인(또는 redirect)으로 이동

---

## 2-4. 원본 HTML 코드 전문


<!DOCTYPE html>
<html>
<head>
    <title>X1280 Student Sample</title>
    <style>
        .sp-box { background: #ffffcc; padding: 10px; border: 1px dashed #666; margin-top: 10px; font-size: 1.2em; }
        .success { color: green; font-weight: bold; }
    </style>
</head>
<body>
    <h2>Passwordless X1280 Demo</h2>
    
    <input type="text" id="userId" value="student01">
    <button onclick="check()">1. Check Status</button>
    <hr>

    <div id="status">Status: Waiting...</div>
    
    <div id="actions" style="margin-top: 10px;">
        <button id="reg" style="display:none" onclick="reg()">2. Register (Show QR)</button>
        <button id="auth" style="display:none" onclick="login()">2. Request Login Push</button>
    </div>

    <!-- This will show the Service Password -->
    <div id="spContainer"></div>
    <div id="qr"></div>

    <script>
        const log = (msg) => document.getElementById('status').innerText = "Status: " + msg;
        let pollInterval;

        async function check() {
            clearInterval(pollInterval); // Stop any old polling
            const id = document.getElementById('userId').value;
            const res = await fetch(`/api/v1/auth/status?user=${id}`);
            const json = await res.json();
            const exists = json.data.exist;
            
            log(exists ? "User Registered" : "New User");
            document.getElementById('reg').style.display = exists ? 'none' : 'block';
            document.getElementById('auth').style.display = exists ? 'block' : 'none';
            document.getElementById('spContainer').innerHTML = '';
        }

        async function reg() {
            const id = document.getElementById('userId').value;
            const res = await fetch(`/api/v1/auth/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: id})
            });
            const json = await res.json();
            document.getElementById('qr').innerHTML = `<p>Scan this:</p><img src="${json.data.qr}">`;
            log("QR Generated. Scan then click Check again.");
        }

        async function login() {
            const id = document.getElementById('userId').value;
            log("Sending Push...");
            const res = await fetch(`/api/v1/auth/login-trigger?userId=${id}&ip=127.0.0.1`, {method: 'POST'});
            const json = await res.json();
            
            if(json.result) {
                const sp = json.data.servicePassword;
                document.getElementById('spContainer').innerHTML = 
                    `<div class="sp-box"><strong>Service Password:</strong> ${sp}<br><small>Approve on phone now...</small></div>`;
                log("PUSH SENT! Polling for approval...");
                
                // START POLLING for the result
                startPolling(id);
            } else {
                log("Error: " + json.msg);
            }
        }

        function startPolling(userId) {
            clearInterval(pollInterval);
            pollInterval = setInterval(async () => {
                const res = await fetch(`/api/v1/auth/result?userId=${userId}`);
                const json = await res.json();
                
                // If 'auth' is 'Y', the user clicked "Approve" on their phone
                if (json.data && json.data.auth === "Y") {
                    clearInterval(pollInterval);
                    log("SUCCESS!");
                    document.getElementById('status').className = 'success';
                    document.getElementById('spContainer').innerHTML += '<h3 class="success">LOGIN APPROVED!</h3>';
                }
            }, 2000); // Check every 2 seconds
        }
    </script>
</body>
</html>
