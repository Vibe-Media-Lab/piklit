# Glossary & Ontology (SSOT)

> Single Source of Truth — 프로젝트 전반에서 사용하는 용어와 개념의 정의.

## 용어 정의

| 용어 | 정의 |
|------|------|
| **블로그 작성기** | 이 프로젝트의 이름. 네이버 블로그 포스트를 작성/편집하는 웹 도구 |
| **포스트 (Post)** | 블로그에 게시되는 하나의 글 단위 |
| **에디터 (Editor)** | TipTap 기반 리치 텍스트 편집기. 본문 작성의 핵심 컴포넌트 |
| **위자드 (Wizard)** | 포스트 작성을 시작할 때 카테고리, 템플릿, 키워드, 아웃라인을 단계별로 설정하는 안내 화면 (4단계) |
| **템플릿 (Template)** | 포스트의 기본 구조를 제공하는 미리 정의된 글 틀 (`src/data/templates.js`) |
| **카테고리 (Category)** | 포스트를 분류하는 주제 영역 (`src/data/categories.js`) |
| **톤앤무드 (Tone & Mood)** | 글의 어조와 분위기. 본문 생성 및 CTA 삽입에 반영됨 |

## AI 기능 관련

| 용어 | 정의 |
|------|------|
| **키워드 분석** | 메인 키워드 기반으로 서브 키워드 10개를 추출하고, 상위 5개를 자동 선택하는 기능 |
| **아웃라인 (Outline)** | AI가 생성한 글 구조 미리보기. 위자드 4단계에서 편집 가능 (`generateOutline()`) |
| **본문 생성 (Full Draft)** | 아웃라인 + 키워드 + 사진 분석 결과를 종합하여 AI가 전체 본문을 작성하는 기능 |
| **AI 부분 재작성 (BubbleMenu)** | 에디터에서 텍스트 선택 시 나타나는 AI 메뉴. expand/condense/factboost/polish 4모드 지원 |
| **도입부 최적화 (Intro Optimizer)** | 3가지 전략(핵심정보/공감/궁금증)으로 도입부를 AI로 개선하는 기능. 네이버 검색 미리보기 시뮬레이션 포함 |
| **CTA 블록** | Call-To-Action. 5톤 x 3타입 = 15개 템플릿으로 독자 행동을 유도하는 블록 |
| **가독성 분석 (Readability)** | 6개 지표로 0~100점 실시간 분석. AI 호출 없이 클라이언트에서 처리 (`src/utils/readability.js`) |
| **경쟁자 분석 (Competitor Analysis)** | 동일 키워드의 상위 노출 블로그 5개와 비교 분석 |
| **긴 문장 감지 (Long Sentence)** | 에디터 내에서 지나치게 긴 문장을 하이라이트하는 TipTap 확장 |
| **이미지 ALT 텍스트** | 사진 분석 후 SEO 최적화된 대체 텍스트를 자동 생성하는 기능 |
| **태그 추출** | 본문에서 관련 태그를 자동 추출하여 UI 칩 + 복사 버튼으로 제공 |

## SEO 관련

| 용어 | 정의 |
|------|------|
| **SEO 체크리스트** | 메인 키워드 반복 횟수(3~5회), 첫 문단 키워드 포함 등을 검사하는 체크 항목 |
| **targetLength** | 목표 글자수. SEO 체크리스트와 동적으로 연동 |
| **formatParagraphs** | 3문장 이상인 단락을 2문장씩 강제 분리하는 후처리 함수 |
| **H2/H3 계층 구조** | SEO를 위한 제목 태그 계층 구조. 프롬프트에서 지시 |

## 기술 용어

| 용어 | 정의 |
|------|------|
| **TipTap** | ProseMirror 기반 리치 텍스트 에디터 프레임워크 (v3) |
| **BubbleMenu** | TipTap의 텍스트 선택 시 나타나는 플로팅 메뉴 |
| **EditorContext** | React Context를 사용한 에디터 전역 상태 관리 |
| **OpenAI** | AI 분석 및 텍스트 생성에 사용하는 외부 API 서비스 |
| **Pretendard** | 프로젝트에서 사용하는 한국어 폰트 |

## 파일 구조 온톨로지

```
src/
├── pages/               # 라우팅 단위 페이지
│   ├── PostListPage     # 포스트 목록
│   ├── StartWizardPage  # 작성 시작 위자드 (4단계)
│   └── EditorPage       # 에디터 + AI 기능 통합 페이지
├── components/
│   ├── editor/          # 에디터 관련 (TiptapEditor, TitleInput, PhotoUploader, IntroOptimizer, EditorContainer)
│   ├── analysis/        # AI 분석 관련 (AIAnalysisDashboard, AnalysisSidebar, CompetitorAnalysis, ReadabilityPanel)
│   ├── layout/          # 레이아웃 (Header, MainContainer)
│   └── common/          # 공통 (ErrorBoundary, SettingsModal)
├── context/             # React Context (EditorContext)
├── services/            # 외부 API 연동 (openai.js)
├── data/                # 정적 데이터 (templates, categories)
├── extensions/          # TipTap 커스텀 확장 (LongSentenceExtension)
├── utils/               # 유틸리티 (analysis, clipboard, readability)
└── styles/              # CSS 스타일
```

## 위자드 플로우

```
Step 1: 카테고리 + 템플릿 선택
Step 2: 사진 업로드 + ALT 텍스트 생성
Step 3: 키워드 분석 (메인 + 서브 키워드)
Step 4: 아웃라인 편집
→ 본문 생성 (generateFullDraft)
```
