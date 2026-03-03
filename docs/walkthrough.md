# 피클잇 (Piklit) - 세션 워크스루 (2026-03-03)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
코드 스플리팅 + 프롬프트 품질 개선 + 에이전트팀 구축

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `src/App.jsx` | React.lazy() 코드 스플리팅 + Suspense fallback 추가 |
| `vite.config.js` | manualChunks — tiptap/firebase 별도 청크 분리 |
| `src/services/openai.js` | extractTags 한국어 프롬프트, recommendKeywords 삭제, refineManualDraft 헬퍼 적용 |
| `docs/agent-team.md` | 에이전트팀 매뉴얼 (신규) |
| `docs/setup-agents.sh` | 에이전트팀 셋업 스크립트 (신규) |
| `.claude/commands/team.md` | /team 슬래시 커맨드 (신규) |

## 현재 릴리즈 상태
- 빌드: 정상 (500KB 경고 해소, 최대 청크 445KB)
- 배포 전 필요: Firebase Firestore 데이터베이스 생성 (Console에서 수동)
- Vercel 환경변수 확인 필요 (FIREBASE_SA_CLIENT_EMAIL, FIREBASE_SA_PRIVATE_KEY)
