# 피클릿 (Piklit) - 세션 워크스루 (2026-02-24)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
AI 감지 분석(Humanness Detection) 2단계 시스템 구현 + 키워드 직접 입력 + 사진 분석 파서/톤 수정 + 레이아웃 수정

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `src/utils/humanness.js` | **신규** — 로컬 실시간 분석 유틸 (6개 지표, 톤별 가중치 프리셋, 100점 만점) |
| `src/components/analysis/HumannessPanel.jsx` | **신규** — 접이식 패널 UI (게이지+메트릭바+AI 제안+적용 버튼) |
| `src/services/openai.js` | `analyzeHumanness()` 메서드 추가, `generateImageAlts()` tone 파라미터 추가 |
| `src/components/analysis/AIAnalysisDashboard.jsx` | HumannessPanel 삽입 (ReadabilityPanel 아래) |
| `src/pages/EditorPage.jsx` | 키워드 직접 입력 UI, 사진 분석 파서 4패턴 대응, tone 전달 |
| `src/styles/tiptap.css` | `.humanness-*` 스타일 ~180줄 추가, 에디터 툴바 z-index 조정 |
| `src/components/layout/Layout.css` | TopBar flex-shrink 고정, app-main 높이/오버플로우 수정 |
| `src/pages/LandingPage.jsx` | 랜딩페이지 미세 조정 |
| `src/styles/landing.css` | 랜딩 스타일 미세 조정 |
| `docs/task.md` | 2026-02-24 세션 작업 내역 추가 |

## 현재 릴리즈 상태
- 빌드: 정상
- 주요 변경: AI 감지 분석 기능 1건, 키워드 직접 입력 1건, 버그 수정 3건 (사진 파서, 톤 불일치, TopBar 레이아웃)
