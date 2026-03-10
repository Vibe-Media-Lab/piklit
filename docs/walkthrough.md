# 피클잇 (Piklit) - 세션 워크스루 (2026-03-10)

## 프로젝트 개요
네이버 블로그 SEO 최적화 AI 작성기 (React 19 + Vite 7 + TipTap + Google Gemini 2.5 Flash API)

## 이번 세션 요약
이미지 본문 표시 근본 수정 + UX 버그 모음 수정 + CLAUDE.md 핵심 규칙 강화 + Hook·스킬 확장

## 수정 파일

| 파일 | 변경 사항 |
|------|----------|
| `src/components/editor/TiptapEditor.jsx` | Image inline+allowBase64 설정, AI 고지 푸터 DOMParser로 안전 제거 |
| `src/pages/EditorPage.jsx` | blob→base64 전환, 적응형 스트리밍, 이미지 폴백, 이탈 방지 확장 |
| `src/components/editor/PhotoUploader.jsx` | blob URL → fileToDataUrl 전환 |
| `src/components/editor/IntroOptimizer.jsx` | 도입부 적용 시 기존 <p> 교체(prepend→replace) |
| `src/components/analysis/HumannessPanel.jsx` | 원문 클릭 시 본문 위치 형광펜 깜빡임 |
| `src/components/wizard/PhotoStep.jsx` | 중복 로딩 UI 제거 |
| `src/components/wizard/KeywordStep.jsx` | 고급 옵션 오렌지 dot, 카테고리 반영 키워드 분석 |
| `src/components/wizard/ToneStep.jsx` | 워너비 UI 통일, 경쟁 분석 컴팩트 리디자인 |
| `src/context/EditorContext.jsx` | 3초 debounce 자동저장, beforeunload 즉시 저장, 빈 글 정리 |
| `src/components/layout/Sidebar.jsx` | 이탈 방지 저장/롤백/삭제 로직 |
| `src/utils/readability.js` | 긴 문장/문단 형광펜 깜빡임 효과 |
| `src/utils/image.js` | fileToDataUrl 함수 추가 |
| `src/services/openai.js` | 서브키워드 카테고리 반영, 소제목 프롬프트 강화 |
| `src/styles/tiptap.css` | blink-highlight 애니메이션, humanness locatable 스타일 |
| `src/styles/components.css` | 고급 옵션 dot, 경쟁 분석 컴팩트 스타일 |
| `CLAUDE.md` | 핵심 규칙 9개로 확장 (질문금지, 단순함, 수술적변경, 커밋확인, 스킬제안) |
| `.claude/settings.json` | Hook: Edit마다 빌드 → 커밋 전에만 빌드로 변경 |
| `.claude/hooks/pre-commit-build.sh` | 신규 — 커밋 직전 빌드 검증 Hook |
| `.claude/skills/fix-batch/SKILL.md` | 신규 — 버그 일괄 수정 스킬 |
| `.claude/skills/pre-commit-qa/SKILL.md` | 신규 — 커밋 전 품질 점검 스킬 |

## 현재 릴리즈 상태
- 빌드: 정상 (2.01s)
- 커밋: 04e16bc — pushed to origin/main
