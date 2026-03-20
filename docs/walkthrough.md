# 피클잇 (Piklit) - 세션 워크스루 (2026-03-20 세션 2)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
QA 재테스트 11건 수정 + SEO 자동 보정(autoFixSeo 2회 루프) 신규 기능 + 모바일 이탈 경고

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `src/services/openai.js` | autoFixSeo 2회 검증 루프, fixSeoIssues 서브키워드 보존, TIP blockquote 스타일 후처리, 제목 15~30자+thinkingBudget 1024 |
| `src/pages/EditorPage.jsx` | 본문 생성 후 autoFixSeo 호출 통합 |
| `src/utils/analysis.js` | "메인 키워드 반복 과다" 문구 변경, formatParagraphs 따옴표 분리 방지 |
| `src/components/analysis/HumannessPanel.jsx` | 자연스러움 적용 HTML replace 방식 재수정 |
| `src/context/EditorContext.jsx` | localStorage 원본 먼저 저장 + 자동저장 플레이스홀더 보호 |
| `src/components/layout/TopBar.jsx` | 모바일 "내 글" 탭 이탈 경고 가드 추가 |

## 현재 릴리즈 상태
- 빌드: 정상 (2.00s)
- 마지막 커밋: 679506d
- 미푸쉬: 0건 (모두 배포 완료)
