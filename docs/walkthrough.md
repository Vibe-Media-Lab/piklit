# 피클잇 (Piklit) - 세션 워크스루 (2026-03-03)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
xlsx 보안 취약점 해결 — read-excel-file로 교체 (npm audit 0건 달성)

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `package.json` | `xlsx` 제거, `read-excel-file` 추가 |
| `package-lock.json` | 의존성 트리 갱신 |
| `src/utils/excelParser.js` | `read-excel-file/browser` 기반으로 재작성 (반환 형태 동일) |

## 현재 릴리즈 상태
- 빌드: 정상
- 배포 전 필요: Firebase Firestore 데이터베이스 생성 (Console에서 수동)
- Vercel 환경변수 확인 필요 (FIREBASE_SA_CLIENT_EMAIL, FIREBASE_SA_PRIVATE_KEY)
