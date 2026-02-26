# 피클잇 (Piklit) — 기술 아키텍처

> 현재 구현 상태 + 계획된 확장 아키텍처 참조 문서

## 현재 시스템 아키텍처

```
┌──────────────────────────────────────────────────┐
│                  브라우저 (SPA)                      │
│                                                    │
│  ┌───────────────────────────────────────────┐    │
│  │         React 19 + Vite 7                  │    │
│  │                                            │    │
│  │  ┌──────────┐  ┌────────────────────┐     │    │
│  │  │  Router   │  │  EditorContext     │     │    │
│  │  │  (v7)     │  │  (전역 상태)        │     │    │
│  │  └──────────┘  └────────────────────┘     │    │
│  │       │                   │                │    │
│  │  ┌────┴────┐    ┌────────┴────────┐       │    │
│  │  │ Pages   │    │  Components     │       │    │
│  │  │ (4개)   │    │  (editor/       │       │    │
│  │  │         │    │   analysis/     │       │    │
│  │  │         │    │   layout/       │       │    │
│  │  │         │    │   common/)      │       │    │
│  │  └─────────┘    └────────────────┘       │    │
│  │                                            │    │
│  │  ┌──────────────────────────────────┐     │    │
│  │  │  AIService (openai.js)           │     │    │
│  │  │  → Gemini 2.5 Flash API          │     │    │
│  │  └──────────────────────────────────┘     │    │
│  │                                            │    │
│  │  ┌──────────────────────────────────┐     │    │
│  │  │  localStorage                     │     │    │
│  │  │  ├ naver_blog_posts (글 데이터)    │     │    │
│  │  │  ├ naver_blog_history (히스토리)   │     │    │
│  │  │  └ openai_api_key (사용자 API 키)  │     │    │
│  │  └──────────────────────────────────┘     │    │
│  └───────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
                      │
                      ▼ HTTPS
        ┌─────────────────────────┐
        │  Gemini 2.5 Flash API   │
        │  generativelanguage.    │
        │  googleapis.com         │
        └─────────────────────────┘
```

## 계획된 Firebase 아키텍처 (Phase 1~2)

```
┌─────────────┐     ┌──────────────────────┐
│  브라우저     │────▶│  Firebase Hosting     │
│  (SPA)       │     │  (정적 파일 서빙)      │
└──────┬──────┘     └──────────────────────┘
       │
       ├──▶ Firebase Auth (소셜 로그인: 네이버/카카오/구글)
       │
       ├──▶ Cloud Functions (API 키 프록시, 사용량 제한)
       │         │
       │         ▼
       │    Gemini API (서버 사이드 호출)
       │
       └──▶ Firestore (글 데이터, 히스토리, 사용자 설정)
```

## 컴포넌트 계층

```
App.jsx
├── Router (BrowserRouter)
│   └── EditorProvider (Context)
│       └── ToastProvider
│           ├── / → PostListPage
│           │       └── Header
│           ├── /history → HistoryPage
│           │       └── Header
│           ├── /start → StartWizardPage
│           │       └── Header
│           └── /editor/:id → ErrorBoundary
│                   └── EditorPage
│                       ├── Header
│                       ├── 위자드 모드 (step 1~4)
│                       │   ├── Step 1: 카테고리+템플릿
│                       │   ├── Step 2: PhotoUploader + ImageSeoGuide
│                       │   ├── Step 3: 키워드 분석
│                       │   └── Step 4: 아웃라인 편집
│                       └── 에디터 모드
│                           ├── MainContainer
│                           │   ├── TitleInput
│                           │   ├── IntroOptimizer
│                           │   ├── EditorContainer
│                           │   │   └── TiptapEditor (BubbleMenu 포함)
│                           │   └── ImageGeneratorPanel
│                           └── AnalysisSidebar
│                               ├── AIAnalysisDashboard (SEO 체크리스트)
│                               ├── CompetitorAnalysis
│                               ├── ReadabilityPanel
│                               └── PostHistory
```

## 데이터 플로우

### 1. 글 작성 플로우 (위자드 → 에디터)

```
[StartWizardPage]
     │ createPost({ categoryId, tone, mode })
     ▼
[EditorPage — 위자드 모드]
     │
     ├── Step 1: 카테고리·톤 선택
     │       └→ updatePostMeta()
     │
     ├── Step 2: 사진 업로드
     │       ├→ Canvas 768px 리사이즈 (토큰 절감)
     │       ├→ AIService.analyzePhotos() → photoAnalysis
     │       └→ AIService.generateImageAlts() → altTexts
     │
     ├── Step 3: 키워드 분석
     │       ├→ AIService.analyzeKeywords() → mainKeyword + subKeywords
     │       ├→ AIService.analyzeCompetitors() → competitorData
     │       └→ updateMainKeyword(), updateSubKeywords()
     │
     ├── Step 4: 아웃라인 편집
     │       ├→ AIService.generateOutline() → outline
     │       └→ 사용자 편집 (H2/H3 추가/삭제/수정)
     │
     └── 본문 생성
             ├→ AIService.generateFullDraft(category, keyword, tone, ...)
             ├→ formatParagraphs() 후처리
             └→ setContent() → 에디터 모드 전환
```

### 2. 실시간 SEO 분석 플로우

```
[사용자 편집]
     │ title / content / keywords 변경
     ▼
[EditorContext useEffect]
     │ debounce 1초
     ├→ analyzePost() → checks(12개), issues, totalChars, imageCount...
     ├→ computeSeoScore() → seoScore (0~100)
     └→ setPosts() → localStorage 자동 저장
           │
           ▼
     [AnalysisSidebar] 실시간 반영
     [ReadabilityPanel] 가독성 점수 실시간 계산
```

### 3. AI 재작성 플로우 (BubbleMenu)

```
[텍스트 선택] → BubbleMenu 표시
     │ expand / condense / factboost / polish 선택
     ▼
AIService.rewriteSelection(selectedText, context, keyword, mode)
     │ rawText: true (HTML 없이 순수 텍스트)
     │ factboost만 google_search 사용
     ▼
[에디터에 교체 삽입]
     └→ recordAiAction('rewrite')
```

## EditorContext 상태 관리 패턴

```javascript
// 전역 상태 (EditorProvider)
{
    posts: [],               // 전체 글 목록 (localStorage 동기화)
    currentPostId: null,     // 현재 편집 중인 글 ID
    keywords: { main, sub }, // 키워드 (main: string, sub: string[])
    title: '',               // 제목
    content: '<p></p>',      // HTML 본문
    analysis: { checks, issues, totalChars, ... },  // 실시간 분석
    suggestedTone: 'friendly',  // 톤앤무드
    targetLength: 1500,         // 목표 글자수
    editorRef,                  // TipTap 에디터 ref
    lastCursorPosRef,           // 마지막 커서 위치
}

// 세션 추적 (ref 기반, 렌더 비용 없음)
sessionRef = {
    postId, startedAt,
    charsBefore, seoScoreBefore,
    aiActions: []
}
```

## AI 서비스 메서드 표

| 메서드 | 용도 | google_search | thinkingBudget | 비고 |
|--------|------|:---:|:---:|------|
| `generateContent` | 공통 API 호출 엔진 | 옵션 | 옵션 | 429 자동 재시도 (5회) |
| `analyzeKeywords` | 키워드 분석 | O | 0 | JSON 실패 시 재시도 |
| `analyzeSeasonKeywords` | 시즌 키워드 추천 | O | 0 | 보류 기능 |
| `analyzeCompetitors` | 경쟁 블로그 분석 | O | - | `_competitorCache` 캐싱 |
| `analyzePhotos` | 사진 분석 | X | - | inline_data 멀티모달 |
| `generateOutline` | 아웃라인 생성 | X | 0 | H2/H3 트리 |
| `generateFullDraft` | 일반 본문 생성 | O | - | 카테고리 분기 |
| `generateRestaurantDraft` | 맛집 본문 생성 | O | - | searchPlaceInfo 선행 |
| `generateShoppingDraft` | 쇼핑 본문 생성 | O | - | searchProductInfo 선행 |
| `searchPlaceInfo` | 업장 정보 검색 | O | 0 | 맛집 전용 |
| `searchProductInfo` | 제품 정보 검색 | O | 0 | 쇼핑 전용 |
| `refineManualDraft` | 직접 작성 보완 | O | - | Flow 1 |
| `rewriteSelection` | 선택 텍스트 재작성 | factboost만 | 0 | 4모드 |
| `generateImageAlts` | ALT 텍스트 생성 | X | 0 | 슬롯별 개별 |
| `generateIntroAlternatives` | 도입부 최적화 | X | 0 | 3전략 |
| `recommendTitles` | 제목 추천 | O | 0 | 5개 생성 |
| `extractTags` | 태그 추출 | X | 0 | 10개 |
| `enhanceImagePrompt` | 이미지 프롬프트 최적화 | X | 0 | 한→영 변환 |
| `generateImage` | AI 이미지 생성 | X | - | gemini-2.5-flash-image |
| `recommendKeywords` | 키워드 추천 (레거시) | X | 0 | 단순 버전 |

## localStorage 스키마

### `naver_blog_posts` (글 데이터)
```javascript
[{
    id: "uuid",
    title: "제목",
    content: "<p>HTML 본문</p>",
    keywords: { main: "메인키워드", sub: ["서브1", "서브2", "서브3"] },
    createdAt: "ISO string",
    updatedAt: "ISO string",
    categoryId: "food",       // 16개 카테고리 ID
    tone: "friendly",         // friendly/professional/honest/emotional/guide
    mode: "direct",           // direct/wizard
    seoScore: 85,             // 0~100
    charCount: 2400,
    imageCount: 8,
    headingCount: 6,
    editSessions: [{          // 최근 10개
        startedAt, endedAt,
        charsBefore, charsAfter,
        seoScoreBefore, seoScoreAfter,
        aiActions: ["키워드 분석", "본문 생성"]
    }],
    aiUsage: {                // 기능별 사용 횟수
        "키워드 분석": 1,
        "본문 생성": 2
    }
}]
```

### `naver_blog_history` (히스토리)
```javascript
{
    version: 1,
    dailyStats: {
        "2026-02-19": {
            postsCreated: 2,
            postsEdited: 3,
            totalCharsWritten: 5400,
            totalEditMinutes: 45,
            avgSeoScore: 78,
            aiActionsCount: 8,
            keywordsUsed: ["키워드1", "키워드2"]
        }
    },
    weeklyScores: [           // 최근 12주
        { week: "2026-W08", avgScore: 75, postCount: 5 }
    ],
    categoryStats: {          // 카테고리별 글 수
        food: 5, travel: 3, daily: 2
    },
    keywordHistory: {         // 최근 100개
        "키워드": { count: 3, lastUsed: "2026-02-19", firstUsed: "2026-02-10" }
    }
}
```

### `openai_api_key` (사용자 API 키)
```javascript
"사용자가 입력한 Gemini API 키 문자열"
// 우선순위: localStorage → .env (VITE_GEMINI_API_KEY)
```

## API 호출 패턴 & 제약사항

### 기본 호출 패턴
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}

Body: {
    contents: [{ parts: [{ text: "프롬프트" }, { inline_data: {...} }] }],
    generationConfig: {
        thinkingConfig: { thinkingBudget: 0 },  // 선택
        responseMimeType: "application/json"      // google_search와 비호환!
    },
    tools: [{ google_search: {} }]               // 선택
}
```

### 제약사항
1. **google_search + responseMimeType 비호환**: 동시 사용 불가. google_search 사용 시 JSON 파싱은 `_tryParseJson()` 3단계 fallback으로 처리
2. **429 Rate Limit**: 지수 백오프 재시도 (최대 5회, 2초 × 2^n + 랜덤)
3. **google_search 응답**: multi-part 가능 → `parts.map(p => p.text).join('\n')`
4. **이미지 입력**: Canvas 768px 리사이즈 후 base64 (토큰 ~80% 절감)
5. **이미지 생성**: 별도 모델 `gemini-2.5-flash-image`, `responseModalities: ['TEXT', 'IMAGE']`

## 성능 최적화

| 항목 | 구현 |
|------|------|
| 자동 저장 디바운스 | 1초 debounce (`useEffect` + `setTimeout`) |
| EditorContext 메모이제이션 | `useMemo` value, `useCallback` actions |
| 세션 추적 | `useRef` 기반 (렌더 트리거 없음) |
| posts 참조 | `postsRef`로 dependency 최적화 |
| 이미지 리사이즈 | Canvas 768px 리사이즈 (토큰 절감) |
| 경쟁 분석 캐시 | `_competitorCache` (동일 키워드 재분석 방지) |
| 히스토리 프루닝 | dailyStats 180일, weeklyScores 12주, keywordHistory 100개 |
| 스토리지 모니터링 | 80% 초과 시 경고 |

## 카테고리 목록 (16개)

| ID | 이름 | 사진 슬롯 |
|----|------|-----------|
| food | 카페&맛집 | entrance, parking, menu, interior, food, extra |
| shopping | 쇼핑 | unboxing, product, detail, usage, compare, extra |
| travel | 여행 | transport, accommodation, spot, restaurant, scenery, extra |
| pet | 반려동물 | pet, daily, walk, food, product, extra |
| recipe | 레시피 | ingredients, prep, cooking, complete, plating, extra |
| tips | 생활꿀팁 | problem, tools, step, result, compare, extra |
| tutorial | 튜토리얼 | setup, config, step1, step2, result, extra |
| comparison | 제품비교 | productA, productB, spec, usage, detail, extra |
| parenting | 육아 | baby, product, activity, milestone, tip, extra |
| economy | 경제 | main, data, detail, example, reference, extra |
| medical | 의학 | main, data, detail, example, reference, extra |
| law | 법률 | main, data, detail, example, reference, extra |
| daily | 일상 | main, scene1, scene2, food, selfie, extra |
| review | 리뷰 | unboxing, product, detail, usage, compare, extra |
| tech | 테크 | unboxing, product, detail, usage, compare, extra |
| cafe | 카페 | entrance, parking, menu, interior, food, extra |
