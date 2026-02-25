# 피클릿 (Piklit) - 세션 워크스루 (2026-02-25)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
랜딩페이지 핵심기능/사용방법 리디자인 (6탭→4카드 목업, 3단계 substeps+커넥터) + 경쟁 분석 토큰 최적화 + 에디터 정렬 통일

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `src/pages/LandingPage.jsx` | FEATURES 6→4개, STEPS substeps 추가, FeatureMockup/StepMockup 신규 컴포넌트, FeatureShowcase 탭→카드, StepsSection 커넥터 |
| `src/styles/landing.css` | 기능 탭→카드그리드 CSS 교체, 목업 CSS 7종 추가, 반응형 업데이트 |
| `src/services/openai.js` | `analyzeCompetitors` thinkingBudget: 0 추가 |
| `src/styles/PhotoUploader.css` | `.photo-upload-note` 가운데→왼쪽 정렬 |
| `src/styles/components.css` | `.ai-progress-card` 가운데 정렬, `.skeleton-bar` 가운데 정렬 |
| `docs/task.md` | 2026-02-25 세션 작업 내역 추가 |

## 현재 릴리즈 상태
- 빌드: 정상
- 주요 변경: 랜딩 리디자인 1건, 토큰 최적화 1건, 정렬 통일 1건
