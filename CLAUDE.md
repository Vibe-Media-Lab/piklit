# 피클릿 (Piklit) — AI 코딩 매뉴얼

## 서비스 정체성
- **이름**: 피클릿 (Piklit) — piklit.pro
- **콘셉트**: Pickle + Lit — "사진을 글로 절이다"
- **핵심**: 사진 업로드 → SEO 최적화 네이버 블로그 글 자동 생성
- **타겟**: 개인 블로거 (네이버 블로그 중심)

## 기술 스택
- React 19.2 + Vite 7 + React Router v7
- TipTap v3 (에디터) + BubbleMenu
- Gemini 2.5 Flash API (`google_search` tool, `thinkingBudget`)
- 상태관리: EditorContext (React Context)
- 스타일: CSS Variables (Notion-style) + Pretendard 폰트
- 저장: localStorage (posts, history)
- 계획: Firebase (Auth/Firestore/Hosting/Functions)

## 파일 구조
```
src/
├── pages/                  # 라우팅 페이지
│   ├── PostListPage.jsx    # 글 목록 (/)
│   ├── StartWizardPage.jsx # 작성 시작 위자드 (/start)
│   ├── EditorPage.jsx      # 에디터 + AI 기능 (/editor/:id)
│   └── HistoryPage.jsx     # 히스토리 대시보드 (/history)
├── components/
│   ├── editor/             # TiptapEditor, TitleInput, PhotoUploader, IntroOptimizer, ImageCropper, ImageGeneratorPanel, ImageSeoGuide, EditorContainer
│   ├── analysis/           # AIAnalysisDashboard, AnalysisSidebar, CompetitorAnalysis, ReadabilityPanel, PostHistory
│   ├── layout/             # Header, MainContainer
│   └── common/             # ErrorBoundary, SettingsModal, Toast
├── context/
│   └── EditorContext.jsx   # 전역 상태 (posts, keywords, content, analysis, session)
├── services/
│   └── openai.js           # ⚠️ 파일명은 openai지만 실제 Gemini API 사용 (역사적 네이밍)
├── data/                   # categories.js, templates.js
├── extensions/             # LongSentenceExtension.js (TipTap 커스텀)
├── utils/                  # analysis.js, history.js, clipboard.js, readability.js, watermark.js
└── styles/                 # variables.css, global.css, components.css, tiptap.css, history.css, toast.css, PhotoUploader.css, ImageSeoGuide.css
```

## 코딩 컨벤션
- **네이밍**: PascalCase (컴포넌트/페이지), camelCase (함수/변수), UPPER_SNAKE (상수)
- **import 순서**: React → 라이브러리 → 컴포넌트 → 유틸 → 스타일
- **CSS**: CSS Variables (`variables.css`) 기반, 인라인 스타일 최소화
- **상태**: 전역은 EditorContext, 로컬은 useState
- **AI 호출**: 모두 `AIService.메서드()` 패턴 (openai.js)
- **한국어**: UI 텍스트·주석·프롬프트 모두 한국어

## 디자인 시스템 요약
- **브랜드 컬러**: Orange `#FF6B35` (AI 버튼), `#E67E22` (CTA)
- **기본 팔레트**: Notion-style — `#37352F`(텍스트), `#787774`(서브), `#E3E2E0`(보더), `#2EAADC`(악센트)
- **폰트**: Pretendard, 크기 14px~36px (rem)
- **간격**: 4/8/16/24/40px, 라운딩 4/6/8px
- 상세 → `docs/design-system.md`

## AI 서비스 패턴 (openai.js)
```
새 AI 메서드 추가 시:
1. AIService 객체에 async 메서드 추가
2. this.generateContent(parts, options, label) 호출
3. options: { tools, thinkingBudget, rawText, generationConfig }
4. 프롬프트는 한국어, 출력은 "Output strictly a valid JSON: {...}"
5. 결과 후처리 (검증, 정규화)
6. EditorPage에서 호출 + recordAiAction() 추적
```

## DO / DON'T
### DO
- `variables.css` 토큰 사용
- AI 호출 시 `recordAiAction()` 추적
- `_tryParseJson()` 으로 JSON 파싱
- 프롬프트에 `Output strictly a valid JSON` 명시
- google_search 사용 시 multi-part 응답 처리
- 80자 이하 문장 규칙 유지

### DON'T
- openai.js 파일명 변경 금지 (import 전체 깨짐)
- h1 태그 사용 금지 (네이버 블로그 SEO 규칙)
- `google_search` + `responseMimeType` 동시 사용 금지 (비호환)
- 서비스명으로 "Antigravity", "바이브 미디어 랩" 사용 금지 → "피클릿 (Piklit)"
- 불필요한 파일 생성 금지 (기존 파일 수정 우선)

## 주요 파일 주의사항
- `EditorPage.jsx` — 위자드 4단계 + 에디터 통합, 800줄+ 대형 파일
- `openai.js` — AI 메서드 17개+, `_competitorCache` 주의
- `EditorContext.jsx` — `sessionRef` 기반 세션 추적, `postsRef` dependency 최적화
- `analysis.js` — `formatParagraphs()` 80자 분리 로직

## 현재 Phase & 우선순위
- **Phase 1 (MVP)**: Landing, 소셜 로그인, API 키 숨김, 무료 체험, 배포
- **Phase 2**: 결과물 품질 강화, 대시보드, 클라우드 저장
- **Phase 3**: BYOK + 구독 결제
- 상세 → `docs/CDO.md`

## 사용자 프로필
- 비개발자 (바이브코딩)
- 한국어 커뮤니케이션
- 코드 변경 전 반드시 승인 요청
- 구현 전 계획 설명 필수

## 참조 문서
- `docs/CDO.md` — 비즈니스 전략·로드맵
- `docs/architecture.md` — 기술 아키텍처
- `docs/design-system.md` — 디자인 토큰·UI 패턴
- `docs/glossary-ontology-ssot.md` — 용어 정의
- `docs/task.md` — 작업 이력
