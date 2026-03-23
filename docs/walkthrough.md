# 피클잇 (Piklit) - 세션 워크스루 (2026-03-23 세션 4)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
협찬/체험단 가이드 파싱 개선 (유형 구분 + 필드 확장) + 글 생성 후 가이드 준수 체크 자동 실행 UX 추가

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `src/services/openai.js` | parseSponsorGuide 프롬프트 확장 (13개 신규 필드), _sponsorGuidePrompt 새 필드 반영, checkGuideCompliance 검사 항목 13개 |
| `src/components/wizard/GuideUploadStep.jsx` | 유형 선택 버튼 3종 (맛집/상품/기자단) + 결과 카드 확장 |
| `src/components/analysis/GuideCompliancePanel.jsx` | autoRun 자동 체크 + 통과/미충족 배지 + 상세 칩 + 접기/펼치기 |
| `src/pages/EditorPage.jsx` | 축하 카드에 가이드 준수 체크 버튼 (협찬 모드) + autoRunCompliance 상태 |
| `src/styles/components.css` | guide-type-btn, guide-compliance-badge, guide-check-details 스타일 추가 |

## 현재 릴리즈 상태
- 빌드: 정상 (1.52s)
- 마지막 커밋: 34293a0
- 미푸쉬: 0건 (모두 배포 완료)
