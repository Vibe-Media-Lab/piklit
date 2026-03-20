# 피클잇 (Piklit) - 세션 워크스루 (2026-03-20)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
베타 런칭 준비 + QA 11건 수정 + SEO 프롬프트 대폭 개선 — 내일 베타테스터 모집 대비

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `api/usage.js` | 베타테스터 사용량(isBeta, betaUsed, betaLimit, betaDaysLeft) 응답 추가 |
| `src/services/openai.js` | 프롬프트 개선: 금지어 축약, 서브키워드 각 1~2회, 최종 검증 체크리스트, 동적 키워드 횟수, intro 동적 범위 |
| `src/context/EditorContext.jsx` | humanAppliedIndices 상태 추가, totalScore 계산, localStorage 이미지 플레이스홀더, 클라우드 보호 |
| `src/components/editor/TiptapEditor.jsx` | CTA 항상 글 끝 삽입, humanAppliedIndices 연동 |
| `src/components/analysis/AIAnalysisDashboard.jsx` | 태그 추가 추출(기존 유지), cachedAppliedIndices 정리 |
| `src/components/analysis/HumannessPanel.jsx` | context의 humanAppliedIndices 직접 참조 |
| `src/components/analysis/ThumbnailPanel.jsx` | PC 바로 다운로드 (모바일만 공유 시트) |
| `src/components/common/SettingsModal.jsx` | 베타 사용량 UI, 버그 제보 안내 |
| `src/components/common/BugReportButton.jsx` | /beta-guide에서 숨김 |
| `src/components/common/MobileFab.jsx` | /beta-guide에서 숨김 |
| `src/components/layout/MainContainer.jsx` | cachedAppliedIndices 캐시 제거 |
| `src/components/layout/TopBar.jsx` | 내보내기 MD 옵션 제거 |
| `src/pages/LandingPage.jsx` | Google 전용 로그인, CTA 축약 |
| `src/pages/PostListPage.jsx` | 종합 점수(totalScore) 뱃지 표시 |
| `src/pages/BetaGuidePage.jsx` | 신규 — 베타 가이드 페이지 |
| `src/data/landingContent.js` | FAQ 로그인 설명 수정 |
| `src/utils/analysis.js` | sub_missing에 missingSubs 배열 포함 |
| `src/styles/landing.css` | 로그인 disabled/badge/beta-note 스타일 |
| `src/styles/components.css` | 베타 사용량/버그 안내 스타일 |
| `src/App.jsx` | /beta-guide 라우트 추가 |

## 현재 릴리즈 상태
- 빌드: 정상 (2.35s)
- 마지막 커밋: 11c1ed0
- 미푸쉬: 0건 (모두 배포 완료)
