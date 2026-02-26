# 피클잇 (Piklit) - 세션 워크스루 (2026-02-26)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
무료 체험 제한(3회/월) + API 키 숨김 + 가입 첫 달 무료 프로모션 구현. CDO 가격 구조 확정 (BYOK ₩4,900 / Pro ₩18,900).

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `api/lib/auth.js` | (신규) 공유 인증 헬퍼 — verifyFirebaseToken 추출 |
| `api/lib/firestore.js` | (신규) Firestore REST API 헬퍼 — jose 기반 access token, getDoc/setDoc |
| `api/gemini.js` | 글 생성 3회/월 quota 체크 + 첫 달 프로모션 + createdAt 자동 기록 |
| `api/gemini-image.js` | BYOK 전용 차단 + 첫 달 프로모션 허용 |
| `api/usage.js` | stub → 실제 Firestore 사용량 조회 (isPromo, promoDaysLeft 포함) |
| `src/services/openai.js` | action 라벨 전달 + 429/403 에러 핸들링 |
| `src/services/firebase.js` | callVercelFunction 에러에 status/code 속성 첨부 |
| `docs/CDO.md` | 가격 구조 확정 (BYOK ₩4,900, Pro ₩18,900, 첫 달 무료) |

## 현재 릴리즈 상태
- 빌드: 정상
- 배포 전 필요: Firebase Firestore 데이터베이스 생성 (Console에서 수동)
- Vercel 환경변수 확인 필요 (FIREBASE_SA_CLIENT_EMAIL, FIREBASE_SA_PRIVATE_KEY)
