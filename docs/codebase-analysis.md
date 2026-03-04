# 피클잇 (Piklit) — 코드베이스 진단 보고서

> 작성일: 2026-03-04 | 분석 범위: 전체 소스코드 (45+ 파일, 21,000+ 줄)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | 피클잇 (Piklit) — piklit.pro |
| **핵심 기능** | 사진 업로드 → SEO 최적화 네이버 블로그 글 자동 생성 |
| **기술 스택** | React 19 + Vite 7 + React Router v7 + TipTap v3 |
| **AI 엔진** | Gemini 2.5 Flash (google_search 도구 포함) |
| **배포** | Vercel (Hosting + Serverless Functions) |
| **인증** | Firebase Auth (Google/Naver/Kakao 소셜 로그인) |
| **저장소** | localStorage (클라이언트) — Firestore 마이그레이션 예정 |
| **총 소스 라인** | ~21,000줄 (JSX 31파일, JS 14파일, CSS 10파일, API 6파일) |

### 아키텍처 요약

```
브라우저 (React SPA)
  ├── 4개 페이지 (PostList / Editor / History / Landing)
  ├── 23개 컴포넌트 (editor 8 / analysis 7 / common 4 / layout 4)
  ├── EditorContext (전역 상태) + AuthContext (인증)
  ├── AIService (23개 AI 메서드 → Gemini API)
  └── localStorage (글 데이터, 히스토리)
        │
        ▼ HTTPS
  Vercel Serverless Functions (API 프록시 6개)
        │
        ├── Gemini 2.5 Flash API
        └── Firebase Auth (커스텀 토큰)
```

---

## 2. 파일 구조 맵

### 페이지 (src/pages/) — 3,338줄

| 파일 | 줄 수 | 역할 | 비고 |
|------|------:|------|------|
| EditorPage.jsx | 1,829 | 위자드 4단계 + 에디터 통합 | ⚠️ 모놀리스 (30+ useState) |
| LandingPage.jsx | 1,053 | 랜딩 페이지 + 프라이싱 | ⚠️ 1000줄 초과 |
| HistoryPage.jsx | 247 | 히스토리 대시보드 | 적정 |
| PostListPage.jsx | 209 | 글 목록 (홈) | 적정 |

> **참고**: CLAUDE.md에 기재된 `StartWizardPage.jsx`는 실제 부재 — EditorPage 내 위자드 모드로 통합됨

### 컴포넌트 (src/components/) — 4,534줄

| 디렉토리 | 파일 수 | 총 줄 수 | 대형 파일 |
|----------|--------:|--------:|----------|
| editor/ | 8 | 2,363 | PhotoUploader (644), ImageGeneratorPanel (398) |
| analysis/ | 7 | 1,335 | ThumbnailPanel (447), HumannessPanel (262) |
| common/ | 4 | 582 | RecommendSection (270) |
| layout/ | 4 | 254 | — |

### 서비스 & 컨텍스트 — 2,025줄

| 파일 | 줄 수 | 역할 |
|------|------:|------|
| openai.js | 1,589 | AI 서비스 (23개 메서드) — Gemini API 호출 |
| firebase.js | 120 | Firebase 초기화 + API 프록시 3종 |
| EditorContext.jsx | 316 | 전역 상태 (posts, keywords, content, analysis) |
| AuthContext.jsx | ~120 | 인증 상태 (소셜 로그인 3종) |

### 유틸리티 & 데이터 — 2,600줄

| 파일 | 줄 수 | 역할 |
|------|------:|------|
| readability.js | 528 | 가독성 분석 엔진 |
| humanness.js | 447 | AI 감지 분석 + 휴먼라이징 |
| thumbnail.js | 393 | Canvas 기반 썸네일 생성 |
| analysis.js | 331 | SEO 분석 (12항목) + formatParagraphs (80자 규칙) |
| history.js | 329 | localStorage 기반 통계/세션 (16개 export) |
| clipboard.js | 147 | 내보내기 4종 (클립보드/MD/HTML/텍스트) |
| excelParser.js | 123 | 네이버 블로그 통계 엑셀 파싱 |
| watermark.js | 48 | AI 워터마크 |
| fontLoader.js | 41 | 구글 폰트 동적 로드 |
| categories.js | 37 | 15개 카테고리 SSOT |
| templates.js | 129 | 5개 SEO 템플릿 (A~E) |

### API 엔드포인트 (api/) — 428줄 (중복 제외)

| 파일 | 줄 수 | 역할 |
|------|------:|------|
| gemini.js | 113 | Gemini API 프록시 (텍스트) |
| gemini-image.js | 78 | Gemini API 프록시 (이미지) |
| usage.js | 68 | 사용량 조회 |
| auth/callback.js | 159 | OAuth 콜백 (커스텀 토큰 발급) |
| auth/naver.js | 16 | 네이버 OAuth 리다이렉트 |
| auth/kakao.js | 16 | 카카오 OAuth 리다이렉트 |
| lib/auth.js | 20 | Firebase Admin 초기화 |
| lib/firestore.js | 127 | Firestore 사용량 관리 |

### 스타일 (src/styles/) — 8,569줄

| 파일 | 줄 수 | 비고 |
|------|------:|------|
| components.css | 2,443 | ⚠️ 단일 파일에 전체 컴포넌트 스타일 |
| landing.css | 2,379 | 랜딩 페이지 전용 |
| history.css | 1,148 | 히스토리 페이지 전용 |
| tiptap.css | 1,119 | TipTap 에디터 커스텀 |
| 기타 6개 | 1,480 | variables, global, toast 등 |

---

## 3. 기능 인벤토리 (42개)

### 완성 기능 — 38개 (90.5%)

| # | 기능 | 구현 위치 | 상태 |
|---|------|----------|------|
| 1 | 사진 업로드 + 768px 리사이즈 | PhotoUploader.jsx | ✅ 완성 |
| 2 | 사진 AI 분석 (멀티모달) | AIService.analyzePhotos() | ✅ 완성 |
| 3 | 이미지 ALT 텍스트 생성 | AIService.generateImageAlts() | ✅ 완성 |
| 4 | 이미지 SEO 가이드 | ImageSeoGuide.jsx | ✅ 완성 |
| 5 | 이미지 크롭 | ImageCropper.jsx | ✅ 완성 |
| 6 | AI 키워드 분석 (google_search) | AIService.analyzeKeywords() | ✅ 완성 |
| 7 | 시즌 키워드 추천 | AIService.analyzeSeasonKeywords() | ✅ 완성 |
| 8 | 경쟁 블로그 분석 (캐싱) | AIService.analyzeCompetitors() | ✅ 완성 |
| 9 | AI 아웃라인 생성 (H2/H3 트리) | AIService.generateOutline() | ✅ 완성 |
| 10 | AI 초안 생성 | AIService.generateFullDraft() | ⚠️ 부분 (단일 드래프트) |
| 11 | 15개 카테고리별 맞춤 프롬프트 | categories.js + _categorySlots | ✅ 완성 |
| 12 | 5개 톤 프리셋 | _toneMap (friendly~guide) | ✅ 완성 |
| 13 | 5개 SEO 템플릿 | templates.js (A~E) | ✅ 완성 |
| 14 | TipTap 에디터 (리치 텍스트) | TiptapEditor.jsx | ✅ 완성 |
| 15 | BubbleMenu AI 재작성 (4모드) | AIService.rewriteSelection() | ✅ 완성 |
| 16 | 도입부 최적화 (3전략) | IntroOptimizer.jsx | ✅ 완성 |
| 17 | 실시간 SEO 분석 (12항목) | analysis.js + AIAnalysisDashboard | ✅ 완성 |
| 18 | SEO 점수 (0~100) | computeSeoScore() | ✅ 완성 |
| 19 | 가독성 분석 | readability.js + ReadabilityPanel | ✅ 완성 |
| 20 | AI 감지 분석 + 휴먼라이징 | humanness.js + HumannessPanel | ✅ 완성 |
| 21 | 80자 문장 분리 규칙 | formatParagraphs() + LongSentenceExtension | ✅ 완성 |
| 22 | 성장 대시보드 | HistoryPage.jsx | ⚠️ 부분 (posts<3 가드) |
| 23 | 세션 추적 (AI 액션 기록) | sessionRef in EditorContext | ✅ 완성 |
| 24 | 히스토리 통계 (일간/주간) | history.js (16개 export) | ✅ 완성 |
| 25 | 글 목록 CRUD | PostListPage.jsx + EditorContext | ✅ 완성 |
| 26 | 글 자동 저장 (1초 debounce) | EditorContext useEffect | ✅ 완성 |
| 27 | 클립보드 내보내기 (4종) | clipboard.js | ✅ 완성 |
| 28 | Canvas 썸네일 생성 (5스타일) | thumbnail.js + ThumbnailPanel | ✅ 완성 |
| 29 | AI 워터마크 | watermark.js | ✅ 완성 |
| 30 | 엑셀 통계 파싱 | excelParser.js | ✅ 완성 |
| 31 | 구글 폰트 동적 로드 | fontLoader.js | ✅ 완성 |
| 32 | 소셜 로그인 3종 | AuthContext + api/auth/ | ✅ 완성 |
| 33 | BYOK (사용자 API 키) | SettingsModal.jsx | ⚠️ 부분 (키 명칭 불일치) |
| 34 | 무료 체험 (월 3회 제한) | api/usage.js + firestore.js | ✅ 완성 |
| 35 | Vercel 서버리스 프록시 | api/gemini.js, gemini-image.js | ✅ 완성 |
| 36 | 429 자동 재시도 (5회) | generateContent() | ✅ 완성 |
| 37 | JSON 3전략 파싱 | _tryParseJson() | ✅ 완성 |
| 38 | 토큰 사용량 추적 | _tokenStats + window.tokenStats | ✅ 완성 |
| 39 | 랜딩 페이지 | LandingPage.jsx | ✅ 완성 |
| 40 | 다음 글 추천 | RecommendSection.jsx | ✅ 완성 |
| 41 | 코드 스플리팅 | React.lazy (tiptap+firebase) | ⚠️ 부분 |
| 42 | 키워드 직접 입력 | EditorPage 위자드 Step 3 | ✅ 완성 |

### 부분 구현 4건 상세

1. **#10 초안 생성**: 카테고리별 단일 드래프트만 지원, 복수 초안 비교 미구현
2. **#22 성장 대시보드**: 글 3개 미만 시 빈 상태 가드만 표시, 인사이트 부족
3. **#33 BYOK**: localStorage 키 명칭이 `openai_api_key`로 Gemini와 불일치
4. **#41 코드 스플리팅**: TipTap과 Firebase만 lazy — 페이지 단위 분리 미적용

### CDO 로드맵 대비 진행률

| Phase | 계획 | 완료 | 진행률 |
|-------|-----:|-----:|-------:|
| Phase 1 (MVP) | 14 | 14 | **100%** |
| Phase 2 (더 잘 쓰기) | 25 | 7 | **28%** |
| Phase 3 (발행과 성장) | 15 | 1 (부분) | **~3%** |

#### Phase 2 미착수 핵심 기능
- 아카이브 v1 (주제 메모 CRUD)
- AI 콘텐츠 캘린더 (트렌드 키워드)
- 시리즈(연재) 기능
- 협찬/체험단 글 모드
- Firestore 마이그레이션 (클라우드 저장)

---

## 4. 코드 품질 진단

### 4.1 주요 이슈 요약

| 이슈 | 심각도 | 영향 |
|------|--------|------|
| EditorPage 모놀리스 (1,829줄, 30+ useState) | 🔴 높음 | 유지보수 극히 어려움, 버그 발생 확률 ↑ |
| 테스트 전무 (0개) | 🔴 높음 | 회귀 테스트 불가, 리팩토링 위험 |
| PropTypes/TypeScript 부재 | 🔴 높음 | 런타임 에러 취약, IDE 지원 ↓ |
| console 문 55개 잔존 (log 21, error 16, warn 8) | 🟡 중간 | 프로덕션 콘솔 오염 |
| ErrorBoundary 단일 최상위 | 🟡 중간 | 에러 시 전체 앱 크래시 |
| components.css 단일 파일 (2,443줄) | 🟡 중간 | 스타일 충돌·관리 어려움 |
| useCallback/useMemo 0건 | 🟡 중간 | 불필요한 리렌더링 |

### 4.2 에러 핸들링 패턴 (4가지 혼재)

```
패턴 A: try-catch + console.error (가장 많음)
패턴 B: try-catch + Toast 알림 (사용자에게 노출)
패턴 C: try-catch + 무시 (catch 블록 비어있음)
패턴 D: .catch() 체이닝 (Promise)
```
→ **권고**: 패턴 B (Toast 알림)로 통일, 공통 에러 핸들러 추출

### 4.3 코드 중복

- `MetricBar` 유사 컴포넌트가 AIAnalysisDashboard, ReadabilityPanel, HumannessPanel에 중복
- CSS 파일 간 `border-radius`, `box-shadow`, `transition` 패턴 반복
- API 호출 에러 처리 로직 반복 (openai.js 내 각 메서드)

---

## 5. 보안 취약점

### 🔴 HIGH — 즉시 조치 필요

| # | 취약점 | 위치 | 위험 |
|---|--------|------|------|
| S1 | **CORS Origin: `*`** | api/gemini.js, gemini-image.js, usage.js | 모든 도메인에서 API 호출 가능 → 서버 키 남용 |
| S2 | **BYOK 키 평문 저장** | localStorage `openai_api_key` | XSS 공격 시 API 키 탈취 가능 |

### 🟡 MEDIUM — Phase 2까지 조치 권고

| # | 취약점 | 위치 | 위험 |
|---|--------|------|------|
| S3 | OAuth state 파라미터 미검증 | api/auth/callback.js | CSRF 공격 가능성 |
| S4 | TipTap HTML 콘텐츠 미sanitize | TiptapEditor.jsx | XSS 벡터 (AI 응답 삽입 시) |
| S5 | 서버사이드 입력 길이 제한 미설정 | api/gemini.js | 대용량 요청으로 비용 폭증 가능 |

### ✅ GOOD — 양호한 보안 요소

- Firebase JWT 인증 체인 (api/lib/auth.js → Firebase Admin SDK)
- API 키 서버사이드 숨김 (Vercel Serverless Functions)
- 사용량 제한 (Firestore 기반 월 3회)

---

## 6. 성능 평가

### 6.1 번들 분석

| 항목 | 현재 상태 | 이상적 상태 |
|------|----------|------------|
| 메인 번들 | ~1,071KB (단일 청크) | 200KB 이하 (초기 로드) |
| React.lazy 사용 | TipTap, Firebase만 | 모든 페이지 + 대형 컴포넌트 |
| manualChunks | 미설정 | vendor/tiptap/firebase 분리 |
| useCallback | 0건 | EditorPage 핸들러 30+ 필요 |
| useMemo | 최소 | analysis 결과 캐싱 필요 |

### 6.2 메모리 누수 위험 포인트

1. **ObjectURL 미해제**: PhotoUploader에서 `URL.createObjectURL()` 후 `revokeObjectURL()` 누락 가능성
2. **Canvas 참조**: ThumbnailPanel의 Canvas 요소 cleanup 확인 필요
3. **이벤트 리스너**: LandingPage의 scroll/resize 리스너 cleanup 확인 필요

### 6.3 리렌더링 최적화

- EditorContext 변경 시 **모든 소비 컴포넌트** 리렌더링 (13개 컴포넌트)
- 해결: Context 분리 (EditorDataContext / EditorUIContext) 또는 `useSyncExternalStore`

---

## 7. P0 / P1 / P2 개선 로드맵

### 🔴 P0 — 즉시 (1~2주)

| # | 개선 항목 | 근거 | 예상 공수 |
|---|----------|------|----------|
| P0-1 | **CORS Origin 제한** (`piklit.pro`로 한정) | 서버 API 키 남용 방지 | 0.5일 |
| P0-2 | **EditorPage 분할** (위자드/에디터/핸들러 분리) | 1,829줄 모놀리스 → 유지보수 불가 | 3~5일 |
| P0-3 | **페이지 레벨 코드 스플리팅** (React.lazy 전 페이지) | 초기 로드 1,071KB → 300KB 이하 | 1일 |
| P0-4 | **console 문 제거** (프로덕션 빌드) | 사용자 콘솔 오염 + 정보 노출 | 0.5일 |

### 🟡 P1 — 단기 (1~2개월)

| # | 개선 항목 | 근거 | 예상 공수 |
|---|----------|------|----------|
| P1-1 | **PropTypes 또는 TypeScript 도입** | 런타임 에러 방지, 개발 생산성 | 5~7일 |
| P1-2 | **ErrorBoundary 세분화** (에디터/사이드바/위자드별) | 부분 에러 격리 | 1일 |
| P1-3 | **BYOK 키 암호화 저장** (Web Crypto API) | XSS 시 키 탈취 방지 | 2일 |
| P1-4 | **OAuth state 검증** 추가 | CSRF 방지 | 1일 |
| P1-5 | **공통 에러 핸들러** 추출 (에러 패턴 통일) | 코드 일관성 + UX 개선 | 2일 |
| P1-6 | **서버사이드 입력 검증** (길이 제한, sanitize) | 비용 폭증 + XSS 방지 | 1일 |
| P1-7 | **components.css 분할** (컴포넌트별 CSS 모듈) | 스타일 충돌 방지 | 3일 |
| P1-8 | **Vite manualChunks** 설정 (vendor/tiptap/firebase) | 캐시 효율 + 로드 최적화 | 0.5일 |

### 🟢 P2 — 중기 (2~4개월)

| # | 개선 항목 | 근거 | 예상 공수 |
|---|----------|------|----------|
| P2-1 | **테스트 도입** (Vitest + React Testing Library) | 회귀 방지, 리팩토링 안전망 | 10일+ |
| P2-2 | **EditorContext 분리** (Data/UI/Session) | 리렌더링 최적화 | 3일 |
| P2-3 | **useCallback/useMemo 최적화** | 렌더링 성능 | 2일 |
| P2-4 | **MetricBar 공통 컴포넌트** 추출 | 코드 중복 제거 | 1일 |
| P2-5 | **architecture.md 갱신** (6건 스테일 항목) | 문서 정합성 | 0.5일 |
| P2-6 | **openai.js 파일명 → aiService.js** (import 일괄 변경) | 혼란 방지 | — (CLAUDE.md에서 금지) |
| P2-7 | **Pretendard 폰트 서브셋** 적용 | 로드 시간 단축 | 0.5일 |

### 문서 정합성 이슈 (architecture.md 스테일 6건)

1. `StartWizardPage.jsx` 기재 → 실제 부재 (EditorPage에 통합)
2. 카테고리 수 16개 기재 → 실제 15개
3. Firebase Hosting 기재 → 실제 Vercel 배포
4. AI 메서드 수 20개 기재 → 실제 23개
5. `MainContainer` 역할 변경 (layout → 래퍼)
6. `Header` 기재 → 실제 `TopBar`로 변경

### CDO 미기재 구현 기능 3건

코드에 존재하지만 CDO.md 로드맵에 없는 기능:
1. **AI 감지 분석** (humanness.js, HumannessPanel) — AI 생성 텍스트 탐지 + 대안 제시
2. **키워드 직접 입력** 모드 — google_search 없이 수동 키워드 입력
3. **다음 글 추천** (RecommendSection) — 작성 완료 후 관련 주제 추천

---

## 부록: 총평

피클잇은 **MVP로서 높은 완성도**(42개 기능 중 38개 완성)를 달성했으나, **엔지니어링 기반이 취약**합니다. 특히 EditorPage 모놀리스(1,829줄), 테스트 전무, 타입 안전성 부재는 Phase 2 기능 추가 시 생산성을 크게 저하시킬 위험이 있습니다.

**즉시 조치(P0)**: CORS 제한 → EditorPage 분할 → 코드 스플리팅 순서로 진행을 권고합니다. 이 3가지만으로도 보안 위험 해소 + 개발 생산성 50% 이상 향상이 기대됩니다.

**전략적 권고**: Phase 2 기능 개발 전에 P0 + P1 항목을 먼저 해결하여 기술 부채를 청산하는 것이 중장기적으로 유리합니다.
