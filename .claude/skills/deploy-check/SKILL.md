# /deploy-check -- 배포 전 점검

배포 전 빌드, 환경변수, 라우팅, 보안을 한 번에 점검한다.

## 실행 순서

### 1. 빌드 검증
```bash
npm run build
```
- 실패 시: 오류 내용 보고 후 중단
- 성공 시: 번들 사이즈 요약 (500KB 초과 청크 경고)

### 2. 린트 검증
```bash
npm run lint
```
- 경고/에러 수 보고

### 3. 환경변수 확인
필수 환경변수 존재 여부 체크 (값은 확인하지 않음):
- `.env` 파일: `VITE_GEMINI_API_KEY`
- Vercel 배포 시 필요: `FIREBASE_SA_CLIENT_EMAIL`, `FIREBASE_SA_PRIVATE_KEY`
- 소스 코드에 API 키 하드코딩 여부 검사 (`grep`으로 `AIza`, `sk-` 등 패턴 탐색)

### 4. 라우팅 확인
- `App.jsx`의 라우트 정의 읽기
- 각 라우트의 대상 컴포넌트가 존재하는지 확인
- lazy import 경로가 유효한지 확인

### 5. 보안 체크
```bash
npm audit
```
- high/critical 취약점 보고
- `.env`가 `.gitignore`에 포함되어 있는지 확인

### 6. 결과 보고
```
## 배포 전 점검 결과

| 항목 | 상태 | 비고 |
|------|------|------|
| 빌드 | PASS/FAIL | {시간, 청크 수} |
| 린트 | PASS/WARN | {경고 N개} |
| 환경변수 | PASS/FAIL | {누락 항목} |
| 라우팅 | PASS/FAIL | {문제 라우트} |
| 보안 | PASS/WARN | {취약점 수} |

**배포 가능 여부**: YES / NO (FAIL 항목 해결 필요)
```

## 주의사항
- 읽기 + 빌드/린트 실행만 함 — 코드 수정하지 않음
- `.env` 파일의 실제 값은 출력하지 않음 (존재 여부만 확인)
- FAIL 항목이 있으면 배포하지 말 것을 권고
