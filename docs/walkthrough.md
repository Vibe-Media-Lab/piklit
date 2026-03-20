# 피클잇 (Piklit) - 세션 워크스루 (2026-03-20 세션 3)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
베타 D-1 QA 9건 수정 + 키워드 SEO 근본 수정 (이사회 결의 7건) + autoFixSeo 후처리 순서 변경 + 블로그 복사 여백 + 추천 뱃지

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `api/gemini-image.js` | 이미지 생성 모델 gemini-2.5-flash-image로 변경 |
| `src/services/firebase.js` | 로컬 이미지 생성 모델 동일 변경 |
| `src/services/openai.js` | 키워드 임계값 4-7/6-10 하향, 프롬프트 h2 별도 카운트, fixSeoIssues intro+key_first 통합, autoFixSeo 진단 로그 |
| `src/utils/analysis.js` | h2/h3 제외 본문 카운팅, 임계값 하향, 도입부 첫 h2 이전 한정, 서브키워드 본문 전용, firstPara 스코프 수정 |
| `src/pages/EditorPage.jsx` | 마크다운→볼드 변환, autoFixSeo 후처리 이후 실행, finalHtml 참조 수정 |
| `src/utils/humanness.js` | 개선 제안 중간 점수에도 생성 |
| `src/context/EditorContext.jsx` | blob URL 이미지 localStorage 제거 대상 추가 |
| `src/components/layout/Layout.css` | 모바일 '마이' 탭 스타일 수정 |
| `src/components/analysis/HumannessPanel.jsx` | 수정 적용 시 문단 경계 보존 |
| `src/utils/clipboard.js` | 블로그 복사 시 h2 앞 빈 줄 추가 |
| `src/data/categories.js` | 카페&맛집 verified 플래그 |
| `src/components/wizard/TopicStep.jsx` | 추천 뱃지 UI |
| `src/styles/components.css` | 추천 뱃지 삼각형 스타일 |

## 현재 릴리즈 상태
- 빌드: 정상 (1.52s)
- 마지막 커밋: dd2dddd
- 미푸쉬: 0건 (모두 배포 완료)
