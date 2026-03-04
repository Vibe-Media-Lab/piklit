# Subtask 1-1: 페이지 파일 분석 결과

## 파일 요약

| 파일 | 라인 수 | 책임 범위 | 관심사 분리 | 상태 의존성 |
|------|---------|----------|------------|------------|
| `App.jsx` | 76 | 라우팅 + Provider 계층 + 인증 보호 | ✅ 양호 | AuthContext (useAuth) |
| `main.jsx` | 12 | React 엔트리포인트 (StrictMode + CSS) | ✅ 양호 | 없음 |
| `PostListPage.jsx` | 209 | 글 목록 + 사용량 바 + CRUD | ✅ 양호 | EditorContext (posts, createPost, deletePost), AuthContext (user) |
| `HistoryPage.jsx` | 247 | 성장 대시보드 (통계/차트) | ✅ 양호 | EditorContext (posts) |
| `LandingPage.jsx` | 1053 | 랜딩 페이지 (미인증 사용자) | ⚠️ 대형 | AuthContext (useAuth) |
| `EditorPage.jsx` | 1829 | 4단계 AI 위자드 + 에디터 통합 | ❌ 모놀리스 | EditorContext (13+ 필드), Toast, AIService |

## 상세 분석

### 1. App.jsx (76줄)
- **책임**: BrowserRouter → AuthProvider → EditorProvider → ToastProvider 계층, ProtectedRoute 가드
- **관심사 분리**: 좋음. 라우팅과 Provider 설정만 담당
- **상태 의존성**: `useAuth()` (isLoggedIn, loading) — ProtectedRoute에서 사용
- **라우트 구조**: `/` (Landing), `/posts` (PostList), `/dashboard` (History), `/editor/:id` (Editor)
- **이슈**: ErrorBoundary가 EditorPage만 감싸고 다른 protected 라우트는 미보호

### 2. main.jsx (12줄)
- **책임**: ReactDOM.createRoot + StrictMode + 전역 CSS import
- **관심사 분리**: 좋음. 최소한의 엔트리포인트
- **상태 의존성**: 없음
- **이슈**: global.css, components.css, tiptap.css를 여기서도 import하고 App.jsx에서도 global.css, components.css를 중복 import

### 3. PostListPage.jsx (209줄)
- **책임**: 글 목록 렌더링, 새 글 생성, 삭제, 사용량 표시
- **관심사 분리**: 양호. UsageBar를 내부 컴포넌트로 분리했으나 같은 파일 내 정의 (80줄)
- **상태 의존성**:
  - `useEditor()`: posts, createPost, deletePost
  - `useAuth()`: user (UsageBar 내부)
  - `useNavigate()`: 라우팅
  - 외부 서비스: `callGetUsageInfo()` (Firebase)
- **내부 컴포넌트**: UsageBar (17~79줄), stripHtml 유틸 함수
- **이슈**: UsageBar의 "무제한으로 업그레이드" 링크가 `e.preventDefault()`로 비활성화 (미구현)

### 4. HistoryPage.jsx (247줄)
- **책임**: 기간별 통계, SEO 추이 차트, AI 사용 비율
- **관심사 분리**: 양호. useMemo로 데이터 계산 분리, 차트는 CSS 기반 직접 렌더링
- **상태 의존성**:
  - `useEditor()`: posts
  - `loadHistory()`, `getStreak()`: utils/history.js
  - 로컬 state: period (기간 필터)
- **이슈**: 최소 3글 미만 시 잠금 화면 표시 (MIN_POSTS_FOR_REPORT)

### 5. LandingPage.jsx (1053줄)
- **책임**: 마케팅 랜딩, 소셜 로그인, 기능 소개, 데모 섹션
- **관심사 분리**: ⚠️ 대형. 콘텐츠 데이터(FEATURES, PAIN_POINTS 등)와 UI 로직이 혼합
- **상태 의존성**:
  - `useAuth()`: 로그인 상태 확인
  - `useNavigate()`: 로그인 후 리디렉트
- **이슈**: 콘텐츠 데이터를 별도 파일로 분리하면 500줄 이하로 감소 가능

### 6. EditorPage.jsx (1829줄) — ⚠️ 핵심 모놀리스
- **책임**: 4단계 AI 위자드 + 직접/AI 모드 토글 + 키워드 분석 + 사진 업로드 + 아웃라인 생성 + 초안 생성 + 에디터 연동
- **관심사 분리**: ❌ 심각한 모놀리스. 30+ useState, 5+ useEffect, 모든 AI 호출 로직 포함
- **상태 의존성** (EditorContext에서 13+ 필드 구조분해):
  - `openPost, posts, currentPostId, updateMainKeyword, updateSubKeywords, setSuggestedTone, setContent, content, setTargetLength, editorRef, lastCursorPosRef, closeSession, recordAiAction, updatePostMeta, setPhotoPreviewUrls`
- **로컬 상태 (30+ useState)**:
  - 모드: editorMode, isGenerating, generationStep, wizardData
  - 카테고리: selectedCategory, topicInput, showSettings
  - 위자드: aiStep (1~4)
  - 키워드: mainKeyword, suggestedKeywords, selectedKeywords, customKeywordInput, isAnalyzingKeywords, isCheckingDifficulty, difficultyChecked
  - 시즌: seasonKeywords, isAnalyzingSeason
  - 경쟁: competitorData, isAnalyzingCompetitors
  - 이미지: photoData, photoAnalysis, isAnalyzingPhotos, imageAlts, imageCaptions, cachedPhotoAssets
  - 본문: selectedLength, selectedTone
  - 아웃라인: outlineItems, isGeneratingOutline
  - 드로어: showSeoDrawer, showImageGenDrawer
- **직접 호출하는 서비스**: AIService (analyzeKeywords, analyzeSeasonKeywords, analyzeCompetitors, analyzePhotos, generateOutline, generateDraft 등)
- **리팩토링 권고**: 위자드 단계별 컴포넌트 추출, 커스텀 훅(useWizardState, useKeywordAnalysis, usePhotoUpload) 분리 필요

## 상태 의존성 매핑

```
AuthContext (useAuth)
├── App.jsx → ProtectedRoute (isLoggedIn, loading)
├── PostListPage.jsx → UsageBar (user)
└── LandingPage.jsx → 로그인 분기

EditorContext (useEditor)
├── PostListPage.jsx → posts, createPost, deletePost
├── HistoryPage.jsx → posts
├── EditorPage.jsx → 13+ 필드 (핵심 소비자)
├── Sidebar.jsx
├── TopBar.jsx
├── TitleInput.jsx
├── IntroOptimizer.jsx
├── RecommendSection.jsx
├── ReadabilityPanel.jsx
├── ThumbnailPanel.jsx
├── HumannessPanel.jsx
├── PostHistory.jsx
└── AIAnalysisDashboard.jsx
```

## 주요 발견사항

1. **StartWizardPage 부재**: CLAUDE.md에 언급되지만 실제 파일 없음. 위자드가 EditorPage에 통합됨
2. **CSS 중복 import**: main.jsx와 App.jsx에서 global.css, components.css 중복 import
3. **EditorPage 모놀리스**: 1829줄, 30+ useState — 프로젝트 최대 기술부채
4. **ErrorBoundary 편중**: EditorPage만 보호, PostListPage/HistoryPage는 미보호
5. **LandingPage 대형화**: 1053줄 — 콘텐츠 데이터 분리로 개선 가능
