# 블로그 작성기 - Task 현황

## 완료된 작업 (2026-02-06)

### 버그 수정
- [x] EditorContext `targetLength` TDZ 에러 수정 (흰 화면 원인) — 상태 선언 위치 이동
- [x] SettingsModal API 키 우선순위 수정 (`localStorage` → `.env` 순으로 통일)
- [x] `generateFullDraft` 파라미터 시그니처 수정 (8개 파라미터 정상 수신)
- [x] 키워드 분석 오류 수정 (`google_search` + `responseMimeType` 비호환 해결)
- [x] 키워드 분석 1회차 무응답 / 2회차 빈 결과 수정 (multi-part 응답 처리)
- [x] 본문에 코드 문자(`{"html":"`, `\n\n`) 노출 수정 (`_tryParseJson` 3단계 파싱)
- [x] SEO 체크리스트 `keywords.main` 빈 값 수정 (`mainKeyword` → Context 동기화)
- [x] 제목이 본문에 자동 포함되는 문제 수정 (프롬프트에 "제목 금지" 명시)

### 기능 개선
- [x] 키워드 분석 시 서브 키워드 5개 자동 선택 (나머지 5개는 제안 목록)
- [x] 키워드 제안 수 5개 → 10개 확대
- [x] 톤앤무드 선택이 실제 본문 생성에 반영되도록 수정
- [x] 에디터 툴바 sticky 처리 (header 60px 오프셋, z-index 50)
- [x] 이미지 토큰 최적화: Canvas 768px 리사이즈 (~80% 절감)
- [x] 태그 추출 기능 재작성 (UI 칩 + 복사 버튼)
- [x] 중복 "제목 추천" 버튼 제거
- [x] TIP 조언 → `<blockquote>` TIP 박스 스타일링

### SEO 최적화 (줄바꿈/구조화)
- [x] 프롬프트에 H2/H3 계층 구조 지시 추가
- [x] `<br><br>` → `</p><p>` 변경 (TipTap 네이티브 방식)
- [x] `formatParagraphs()` 후처리 함수 추가 (3문장 이상 → 2문장씩 강제 분리)
- [x] 후처리에서 `<b>` 등 HTML 태그 보존 (innerHTML 기반 regex)
- [x] 메인 키워드 3~5회 반복 규칙 프롬프트 추가
- [x] 첫 문단 메인 키워드 포함 규칙 프롬프트 추가
- [x] `targetLength` 동적 연동 (SEO 체크리스트 ↔ 글자수 선택)

### 토큰 최적화
- [x] `analyzeKeywords` 2회 → 1회 API 호출 통합
- [x] 사진 분석 결과 텍스트 재활용 (이미지 이중 전송 방지)
- [x] 미사용 `AI_GUIDES` import 제거
- [x] `generateTitle`/`recommendTitles` 중복 함수 통합
- [x] `usageMetadata` 토큰 사용량 로깅 추가

## 완료된 작업 (2026-02-11) — 8대 기능 구현 세션

### 기능 1: AI 부분 재작성 (BubbleMenu)
- [x] `openai.js`에 `rewriteSelection()` 메서드 추가 (expand/condense/factboost/polish 4모드)
- [x] `TiptapEditor.jsx` BubbleMenu에 AI 드롭다운 확장 (B/I/S | AI ▾)
- [x] `tiptap.css`에 AI 버튼/스피너/드롭다운 스타일 추가

### 기능 2: 이미지 ALT 텍스트 SEO 최적화
- [x] `openai.js`에 `generateImageAlts()` 메서드 추가
- [x] `EditorPage.jsx`에 사진 분석 후 ALT 자동 생성, 본문 삽입 시 3단계 fallback 적용
- [x] Step 2 UI에 ALT 텍스트 미리보기 표시

### 기능 3: 도입부 자동 최적화
- [x] `openai.js`에 `generateIntroAlternatives()` 메서드 추가 (3전략: 핵심정보/공감/궁금증)
- [x] `IntroOptimizer.jsx` 컴포넌트 신규 생성 (네이버 검색 미리보기 시뮬레이션)
- [x] `EditorContainer.jsx`에 통합, `tiptap.css`에 스타일 추가

### 기능 4: CTA 블록 삽입
- [x] `TiptapEditor.jsx`에 `CTA_TEMPLATES` (5톤 x 3타입 = 15개) + CTA 드롭다운 추가
- [x] MenuBar에 `tone` prop 전달 (`suggestedTone` 연동)
- [x] `tiptap.css`에 CTA 드롭다운 스타일 추가

### 기능 5: 글 구조 아웃라인 미리보기 & 편집
- [x] `openai.js`에 `generateOutline()`, `_outlinePrompt()` 추가
- [x] `generateFullDraft`/`generateRestaurantDraft`에 `outline` 파라미터 추가
- [x] `EditorPage.jsx` 위저드 3단계 → 4단계 확장 (Step 4: 아웃라인 편집 UI)

### 기능 6: 가독성 점수 & 개선 제안
- [x] `readability.js` 신규 생성 (6지표 0~100점 실시간 분석, AI 호출 없음)
- [x] `ReadabilityPanel.jsx` 컴포넌트 신규 생성 (게이지+바차트+제안)
- [x] 개선 제안 클릭 시 해당 위치로 스크롤 + 노란 플래시 하이라이트 (`locateSuggestion()`)

### 추가 개선
- [x] 서브 키워드 필수 포함 프롬프트 강화 (`_subKeywordPrompt()` 헬퍼 추가)
- [x] 경쟁 블로그 분석 프롬프트 수정 (1개 → 5개 블로그 예시, 캐시 검증 로직)

### 보류
- [ ] 기능 7: 시즌/트렌드 키워드 추천 (보류)
- [ ] 기능 8: 내부 링크/시리즈 관리 (보류)

## 완료된 작업 (2026-02-12) — 정리·카테고리 개편 세션

### 프로젝트 정리
- [x] 빈 디렉토리 삭제 (`Agent/`, `src/components/discovery/`)
- [x] 불필요 코드 파일 점검 — 미사용 파일 없음 확인 (30개 소스 파일 전수 검증)

### 카테고리 개편
- [x] `맛집` 카테고리 제거, `카페&맛집`으로 통폐합 (슬롯·프롬프트·라벨 전체 연동 확인)
- [x] `반려동물` 카테고리 신규 추가 (여행 다음 5번째 위치)
  - 사진 슬롯 6종: 반려동물/일상/산책/사료·간식/용품/추가
  - `categories.js`, `PhotoUploader.jsx`, `openai.js`, `EditorPage.jsx` 4개 파일 반영

## 완료된 작업 (2026-02-13) — 작성 히스토리 기능 구현 세션

### 신규 기능: 히스토리 대시보드 (`/history`)
- [x] `HistoryPage.jsx` 신규 생성 — 기간 필터(7일/30일/90일/전체) + 7개 분석 섹션
- [x] 요약 카드 4개: 총 글수, 금주 작성(전주 대비 증감), 평균 SEO 점수, 총 작성시간
- [x] 생산성 트렌드: 일별 작성 수 CSS 바 차트 + 연속 작성일 배지
- [x] SEO 점수 추이: 주간 평균 도트 차트 + 목표 80점 가이드라인
- [x] 카테고리 분포: CSS `conic-gradient` 도넛 차트 + 범례
- [x] 키워드 전략: 재사용 vs 신규 비율 스택 바 + 상위 키워드 횡 바 차트
- [x] AI 활용 비율: AI vs 직접 작성 스택 바 + 기능별 사용 횟수 횡 바 차트
- [x] 작성 패턴: 요일(7)×시간(24) CSS 히트맵 그리드 (투명도 강도 표현)

### 신규 기능: 글별 히스토리 타임라인 (사이드바)
- [x] `PostHistory.jsx` 신규 생성 — 에디터 사이드바 접이식 패널
- [x] SEO 점수 미니 게이지 + 글자수 성장 바
- [x] 편집 세션 타임라인 (생성/수정 이벤트, 글자수·SEO 변화, 소요 시간)
- [x] AI 사용 내역 배지 (기능별 활성/비활성 표시)
- [x] `AIAnalysisDashboard.jsx`에 PostHistory 컴포넌트 통합

### 데이터 레이어 확장
- [x] `history.js` 유틸리티 신규 생성 — 마이그레이션, 집계, 프루닝, 스토리지 모니터링
- [x] 글 스키마 확장: `categoryId`, `tone`, `mode`, `seoScore`, `charCount`, `imageCount`, `headingCount`, `editSessions`, `aiUsage` 필드 추가
- [x] 별도 히스토리 저장소(`naver_blog_history`): 일별 집계 180일, 주간 SEO, 카테고리 분포, 키워드 이력 100개
- [x] 기존 글 자동 마이그레이션 (앱 로드 시 1회)
- [x] localStorage 80% 초과 시 경고 표시

### 편집 세션 추적
- [x] `EditorContext.jsx`에 `sessionRef` 기반 편집 세션 추적 (렌더 비용 없음)
- [x] `openPostStable()`에서 세션 시작 (charsBefore, seoScoreBefore 기록)
- [x] `closeSession()`에서 세션 종료 (5초 미만 필터링, editSessions에 저장, dailyStats 갱신)
- [x] `recordAiAction()` — 6개 AI 기능에 추적 코드 삽입 (키워드·경쟁·사진·본문·아웃라인·태그)
- [x] `beforeunload` + 라우트 변경 시 자동 세션 종료

### 데이터 수집 연동
- [x] `EditorPage.jsx` — AI 호출 시 `recordAiAction` 호출 (5개 함수)
- [x] `StartWizardPage.jsx` — `createPost()`에 `categoryId`, `tone`, `mode` 메타데이터 전달
- [x] `PostListPage.jsx` — SEO 점수 뱃지(초록/노랑/빨강) + AI 모드 표시 + 히스토리 링크
- [x] `AIAnalysisDashboard.jsx` — 태그 추출 시 `recordAiAction` 호출

### 라우팅 & 내비게이션
- [x] `App.jsx`에 `/history` 라우트 추가
- [x] `Header.jsx`에 "히스토리" NavLink 추가
- [x] `PostListPage.jsx`에 "히스토리" 버튼 추가

### 스타일
- [x] `history.css` 신규 생성 (470줄) — 대시보드·차트·타임라인·히트맵·반응형 전용 CSS

## 완료된 작업 (2026-02-19) — CDO 문서 4종 + 시즌 키워드 기능 세션

### 신규 문서: CDO 문서 4종
- [x] `CLAUDE.md` (프로젝트 루트, 106줄) — Claude Code 자동 로드용 AI 코딩 매뉴얼
  - 서비스 정체성, 기술 스택, 파일 구조 맵, 코딩 컨벤션, DO/DON'T, 현재 Phase, 사용자 프로필
- [x] `docs/CDO.md` (158줄) — 비즈니스 전략 문서
  - 비전·미션, 페르소나 3명, 가치 제안, BYOK 모델, 경쟁 분석, 3단계 로드맵, KPI, 리스크
- [x] `docs/architecture.md` (335줄) — 기술 아키텍처 참조 문서
  - ASCII 다이어그램(현재/Firebase 계획), 컴포넌트 트리, 데이터 플로우 3개, AI 메서드 표 20개, localStorage 스키마, API 패턴
- [x] `docs/design-system.md` (241줄) — 디자인 토큰 & UI 패턴
  - 컬러 팔레트, 타이포그래피, 간격·라운딩·그림자, 컴포넌트 패턴, 애니메이션, AI 전용 UI
- [x] CLAUDE.md 내 42개 파일 경로 전수 검증 완료
- [x] `npm run build` 정상 확인 (문서만 추가, 코드 영향 없음)

### 기능 구현: 시즌/트렌드 키워드 추천 (기능 7 — 보류 해제)
- [x] `openai.js`에 `analyzeSeasonKeywords()` 메서드 추가 (google_search + thinkingBudget 0)
  - 현재 시즌/다음 시즌 자동 계산, 기존 키워드 중복 필터, JSON 파싱 재시도
- [x] `analyzeKeywords()`에 시즌/트렌드 반영 규칙 추가 (규칙 6~7번)
- [x] `EditorPage.jsx` 위자드 3단계에 시즌 키워드 UI 추가
  - 시즌 분석 버튼, 시즌 키워드 칩 (이유·시기 툴팁), 선택/해제 연동
  - `recordAiAction('seasonKeywordAnalysis')` 추적

## 완료된 작업 (2026-02-23) — UI 디자인 정리 + AI 품질 개선 세션

### UI 디자인 통일
- [x] 아웃라인 편집 UI — 인라인 스타일 → CSS 클래스 전환, hover 시 액션 버튼 표시, H2 뱃지 브랜드 오렌지
- [x] 본문 생성 로딩 UI — 초록 체크 → 브랜드 오렌지 통일, 인라인 스타일 → CSS 클래스
- [x] 메트릭 카드 — hover 툴팁(overflow 잘림) → 클릭 토글 인포바로 변경
- [x] 히스토리 게이지 — 레인보우 그라데이션 → 브랜드 단색 (SEO=오렌지, 글자수=회색)
- [x] 사진 분석 결과 — 연속 나열 → 사진별 개별 카드 분리 (`.photo-analysis-card`)

### AI 품질 개선
- [x] 이미지 슬롯 미치환 — 정규식 공백 미지원 → `[^\]]+`로 수정 + 부분 별칭 매칭
- [x] 이모지 줄바꿈 — AI가 별도 `<p>` 생성 → 후처리에서 다음 문단과 병합
- [x] 이미지 SEO 플로팅 버튼 — `imageAlts` 존재 시에도 표시되도록 조건 보완
- [x] 도입부 최적화 톤앤무드 — `toneDesc` 항상 포함하도록 프롬프트 수정
- [x] 도입부 중복 방지 — 프롬프트에 "본문 첫 문단과 겹치면 안 됨" 규칙 추가
- [x] 도입부 글자수 — 프롬프트 강화 + thinkingBudget 0→2048 + 130자 미만 시 자동 재생성

### 보류
- [ ] 기능 8: 내부 링크/시리즈 관리 (보류)
- [ ] 도입부 글자수 140~160자 준수율 추가 모니터링

## 완료된 작업 (2026-02-25) — 랜딩 리디자인 + 토큰 최적화 + 정렬 통일

### 랜딩페이지 핵심기능 + 사용방법 리디자인
- [x] `LandingPage.jsx` FEATURES 6개→4개 축소 (edit/history 제거, 텍스트 사용자 이익 시점)
- [x] `LandingPage.jsx` STEPS substeps 3개씩 추가, Step 2/3 텍스트 구체화, Step 3 아이콘 Rocket
- [x] `LandingPage.jsx` FeatureMockup 컴포넌트 신규 — 4가지 CSS 미니 목업 (사진 태그, 키워드 바차트, 에디터+버블메뉴, SEO 게이지)
- [x] `LandingPage.jsx` FeatureShowcase 탭 UI→4카드 세로 나열, 홀수 번째 좌우 교대
- [x] `LandingPage.jsx` StepMockup 컴포넌트 신규 — 3가지 CSS 미니 목업 (드롭존+카테고리, AI 파이프라인, 결과카드+발행)
- [x] `LandingPage.jsx` StepsSection substeps 체크리스트 + 단계 간 화살표 커넥터
- [x] `landing.css` 기능 섹션 CSS 교체 (탭→카드그리드), 목업 CSS 4종 + 스텝 목업 3종 추가
- [x] `landing.css` 반응형 업데이트 (1024px, 768px)

### 토큰 최적화
- [x] `openai.js` `analyzeCompetitors` — `thinkingBudget: 0` 추가 (불필요 thinking 토큰 제거)

### 정렬 통일 (CDO 감사)
- [x] `PhotoUploader.css` `.photo-upload-note` — `justify-content: center` 제거 (왼쪽 정렬)
- [x] `components.css` `.ai-progress-card` — `text-align: center` 추가 (경쟁 분석과 통일)
- [x] `components.css` `.ai-progress-header` — `justify-content: center` 추가
- [x] `components.css` `.ai-progress-steps` — `inline-flex` + `text-align: left` (가운데 카드 안 왼쪽 정렬)
- [x] `components.css` `.skeleton-bar` — `margin: 0 auto` (스켈레톤 바 가운데 정렬)

## 완료된 작업 (2026-02-24) — 랜딩 페이지 전면 리뉴얼 + 전략 수립

### 랜딩 페이지 전면 리뉴얼 (LandingPage.jsx + landing.css)
- [x] 12개 섹션 구성: Sticky 헤더, 히어로(2컬럼+데모 애니메이션), 신뢰 바(카운터), 샘플 캐러셀, 고민 해결, 기능 쇼케이스(6탭), 3단계, 카테고리 그리드, 페르소나, 비교 테이블, 요금제, FAQ, 하단 CTA, 푸터
- [x] 히어로 3단계 자동 데모 애니메이션 (사진 업로드 → AI 분석 → 글 완성, 9초 루프)
- [x] 히어로 텍스트 순차 페이드업 + "완성됩니다" 타이핑 효과
- [x] 신뢰 바 카운터 애니메이션 (IntersectionObserver + 카운트업)
- [x] 샘플 결과물 캐러셀 (6개 블로그 예시, 무한 자동 스크롤)
- [x] 스크롤 애니메이션 (IntersectionObserver + reveal-on-scroll)
- [x] 반응형 3단계 (1024px / 768px / 480px)
- [x] BYOK → "무제한 (내 키 연결)" 용어 변경

### 경쟁사 분석 기반 개선 (가제트AI + 워들리 분석)
- [x] 히어로 해시태그 키워드 추가 (#사진_AI_분석 등)
- [x] 신뢰 바 성과 중심 수치 변경 (90% 시간 절약 등)
- [x] 사용자 후기 섹션 신규 추가 (4.9/5.0 만족도 + 6개 후기 + 배지)
- [x] 페르소나 시나리오 인용 추가
- [x] 요금제 가격 앵커링 카피 추가 ("블로그 대행 월 30~50만원 vs...")
- [x] FAQ "AI 글 품질" 불안 해소 질문 추가

### 전략 문서 업데이트
- [x] CDO.md Phase 2 업데이트 — 사진 차별점 4개 기능 추가
- [x] CDO.md Phase 3 업데이트 — 리텐션(성과 추적) + 소상공인 특화 4개 기능 추가
- [x] CDO.md 경쟁 분석 — 가제트AI, 워들리 추가, 비교표 5개 서비스로 확장

## 완료된 작업 (2026-02-24) — 사진 SEO 3요소 자동화 + 경쟁 분석 간소화

### 사진 SEO 3요소 자동화 (Phase 2 첫 기능)
- [x] `openai.js` — `generateImageAlts()` ALT+캡션 동시 생성으로 확장 ({alt, caption} 객체 배열 반환)
- [x] `PhotoUploader.jsx` — 업로드 시 SEO 파일명 자동 적용 (`generateSeoFilename` import, 키워드-슬롯명-순번.jpg)
- [x] `EditorPage.jsx` — `imageCaptions` 상태 추가, AI 결과 ALT/캡션 분리 저장, 이미지 아래 캡션 HTML 자동 삽입
- [x] `ImageSeoGuide.jsx` — `generateSeoFilename` export, `imageCaptions` prop, 파일명/ALT/캡션 3요소 표시+복사

### 경쟁 분석 간소화
- [x] `openai.js` — 프롬프트에서 개별 blogs 배열 제거, 평균값만 반환하도록 변경
- [x] `CompetitorAnalysis.jsx` — 개별 블로그 카드 섹션 제거, 평균 가이드만 표시
- [x] `EditorPage.jsx` — 응답 검증 `result.blogs` → `result?.average` 기준으로 수정
- [x] `components.css` — 미사용 CSS 정리 (competitor-card, competitor-bar 등 ~120줄 삭제)

### 버그 수정
- [x] `openai.js` 캐시 체크 — `blogs.length >= 3` → `data?.average` 존재 여부로 변경
- [x] `EditorPage.jsx` 경쟁 분석 응답 검증 — `result.blogs && Array.isArray(...)` → `result?.average`

### Phase 2 신규 기능 계획 (구현 예정)
- [x] 사진 SEO 최적화 (파일명, alt, 캡션 자동 생성) ← 완료
- [x] 사진 → 썸네일 자동 생성 (Canvas + 텍스트 오버레이) ← 2026-02-25 완료
- [x] 다음 글 추천 (히스토리 기반 AI 주제 제안) ← 3ffa5d8 완료
### Phase 3 신규 기능 계획 (Firebase Functions 필요)
- [ ] 발행 후 성과 추적 (검색 순위, 조회수 대시보드)
- [ ] 네이버 플레이스 연동 (가게 정보 자동 삽입)
- [ ] 경쟁 매장 블로그 모니터링
- [ ] 주간 자동 포스팅

## 완료된 작업 (2026-02-24) — AI 감지 분석 + 키워드 직접 입력 + 레이아웃 수정

### 신규 기능: AI 감지 분석 (Humanness Detection)
- [x] `humanness.js` 신규 생성 — 6개 지표 + 5가지 톤별 가중치 프리셋 (100점 만점)
  - 문장 길이 다양성, 개인 표현, AI 패턴 감지, 문단 다양성, 구어체 마커, 이모지/비격식
  - 톤앤무드(friendly/professional/honest/emotional/guide)별 배점 자동 조정
- [x] `openai.js`에 `analyzeHumanness()` 메서드 추가 — Gemini API 기반 AI 휴먼라이징 제안
- [x] `HumannessPanel.jsx` 신규 생성 — 접이식 패널 + 게이지 + 메트릭바 + AI 제안 카드
  - "적용" 버튼 클릭 시 TipTap 에디터에서 원문 찾아 수정안으로 자동 치환
- [x] `AIAnalysisDashboard.jsx`에 HumannessPanel 삽입 (ReadabilityPanel 아래)
- [x] `tiptap.css`에 `.humanness-*` 스타일 추가 (~180줄)

### 신규 기능: 키워드 직접 입력
- [x] `EditorPage.jsx` 위자드 Step 1에 키워드 직접 입력 필드 추가
  - Enter 키 또는 "추가" 버튼으로 추가, 5개 제한 + 중복 검사
  - 직접 입력 키워드는 보라색 칩 + 연필 아이콘으로 시각 구분
  - 삭제 시 제안 목록으로 복귀하지 않고 바로 삭제

### 버그 수정
- [x] 사진 분석 결과 마크다운 원문 노출 — `### 사진 N:` 형태 헤더 파서 추가 (줄 단위 재작성)
- [x] 이미지 캡션 톤 불일치 — `generateImageAlts()`에 `tone` 파라미터 추가, 프롬프트에 톤 가이드 삽입
- [x] 사이드바 sticky 미동작 — `.analysis-section` `top: 76px` → `top: 24px`

### 레이아웃 수정
- [x] TopBar 사라짐 — `.app-main` `min-height: 100vh` → `height: 100vh; overflow: hidden`
- [x] TopBar에 `flex-shrink: 0` 추가, `position: sticky` 제거 (불필요)
- [x] `.app-content`에 `min-height: 0` 추가 (flex 자식 overflow 정상 처리)
- [x] `.editor-toolbar` `top: 60px` → `top: 0`, `z-index: 50` → `40` (TopBar와 충돌 방지)

## 완료된 작업 (2026-02-25) — 썸네일 자동 생성 기능 구현

### 신규 기능: 썸네일 자동 생성 (Canvas 기반)
- [x] `thumbnail.js` 신규 생성 — Canvas 렌더링 엔진 (1200×675 출력, 세이프존 675×675)
  - 5가지 스타일: 하단 그라데이션(A), 중앙 박스(B), 상단 오렌지 띠(C), 전면 블러(D), 원본(E)
  - `getImageData` 기반 자동 밝기 감지 → 스타일별 텍스트 색상 자동 전환
  - 줌(1x~2.5x) + 오프셋(-1~1) 기반 사진 위치·확대 커스텀
- [x] `fontLoader.js` 신규 생성 — Google Fonts 동적 로더 (중복 방지 Set + document.fonts.load 대기)
- [x] `ThumbnailPanel.jsx` 신규 생성 — 사이드바 접이식 패널
  - 사진 선택 그리드, 스타일 드롭다운, 커스텀 폰트 드롭다운 (실제 글씨체로 미리보기)
  - 메인/서브 텍스트 편집, AI 텍스트 자동 생성, 다운로드, 본문 삽입
  - 줌 슬라이더 + 드래그 패닝 (마우스/터치)
  - 200ms 디바운스 Canvas 실시간 렌더링
- [x] `ThumbnailPanel.css` 신규 생성 — 전용 스타일
- [x] `openai.js`에 `generateThumbnailText()` 메서드 추가 (10자/15자 트렁케이션)
- [x] `EditorContext.jsx`에 `photoPreviewUrls` 상태 + setter 추가
- [x] `EditorPage.jsx`에 photoData.files → Context 동기화 useEffect 추가
- [x] `AIAnalysisDashboard.jsx`에 ThumbnailPanel 마운트

### 카테고리별 폰트 (Google Fonts, 각 4개)
- [x] 맛집: Black Han Sans, Jua, Do Hyeon, Gugi
- [x] 카페: Gowun Batang, Nanum Myeongjo, IBM Plex Sans KR, Noto Serif KR
- [x] 여행: Gaegu, Nanum Pen Script, Hi Melody, Gamja Flower
- [x] 일상: Jua, Gowun Dodum, Sunflower, Poor Story
- [x] 반려동물: Jua, Cute Font, Gamja Flower, Hi Melody

### 모바일 가독성 최적화
- [x] 폰트 사이즈 상향 — 메인 64~68px, 서브 34~38px (모바일 360px에서 실효 10px 이상 보장)
- [x] 서브 텍스트 font-weight 500→600, 그림자 blur 6→10px / opacity 0.5→0.7

### 버그 수정
- [x] 사진 미업로드 슬롯의 null URL이 깨진 이미지로 표시 — files 기반 ObjectURL 동기화로 수정
- [x] PhotoUploader onUpdate 인라인 콜백 → 무한 루프 위험 — 안정된 setter + useEffect 분리

### 기타
- [x] `/commit` 스킬 신규 생성 (빌드 확인 → 변경 분석 → 커밋 메시지 제안 → 승인 → 커밋)
- [x] Phase 2 task.md "사진 → 썸네일 자동 생성" 항목 완료 처리

## 완료된 작업 (2026-02-25) — 로딩 UI 통일 + BOD 문서 + 랜딩 BOD 감사

### 로딩 UI 디자인 통일 (4개 파일)
- [x] `CompetitorAnalysis.jsx` — Loader2→Sparkles 36px, "~합니다"→"~있어요" 친근체, 부제목 추가
- [x] `HumannessPanel.jsx` — 버튼에 Loader2 14px 스피너 추가 (텍스트만 → 아이콘+텍스트)
- [x] `IntroOptimizer.jsx` — ⏳ 이모지→Loader2 14px 스피너 (아이콘 통일)
- [x] `components.css` — `.btn-loading-spinner` 공통 클래스, 경쟁 분석 로딩 아이콘/텍스트 스타일

### 문서
- [x] `docs/bod-piklit.md` 신규 생성 — 범용 BOD 프롬프트를 피클잇 전용으로 커스텀
  - CEO 비전→피클잇 비전, COO 지표→피클잇 KPI, CTO→React+Gemini 특화
  - CRO→블로거 심리 4인 박사단, CMO→네이버 블로그 SEO 전문가단, CDO→Notion-style 디자인
  - 상단에 피클잇 컨텍스트 내장 (매번 별도 설명 불필요)

### docs 정리 (7개 삭제)
- [x] `bod.md` 삭제 — `bod-piklit.md`로 대체 완료
- [x] `GEMINI.md` 삭제 — "Antigravity" 구 브랜드, CLAUDE.md가 대체
- [x] `always_be_on_the_same_page.md` 삭제 — "Vibe Media Lab" 구 브랜드, CLAUDE.md가 대체
- [x] `start_work.md` 삭제 — 구 워크플로, CLAUDE.md 세션 규칙이 대체
- [x] `end_work.md` 삭제 — 구 워크플로, 현재 미사용
- [x] `session-manager.md` 삭제 — 다른 프로젝트 범용 에이전트 스펙, 피클잇 무관
- [x] `Prompt Architect.md` 삭제 — 범용 프롬프트 엔지니어링 페르소나, 피클잇 무관

### 랜딩페이지 BOD 감사 → 즉시 실행 3건
- [x] "경쟁 블로그 상위 10개 분석" → "상위 노출 분석" (과장 카피 수정)
- [x] 비교 테이블 3열→5열 확장 — 가제트AI, 워들리 추가 (CDO.md 경쟁 분석 반영)
- [x] Footer `© 2025` 하드코딩 → `{new Date().getFullYear()}` 동적 처리

### UX 플로우 BOD 감사 (CDO 중심) — 감사 완료, 실행 항목 도출
- [x] 의장 판정: Pass
- 발견된 핵심 이슈 5건:
  1. Step 1 과밀 (카테고리+주제+키워드+시즌+경쟁+톤+글자수가 단일 스텝)
  2. 위자드→에디터 전환 시 생성 완료 요약 피드백 부재
  3. 사이드바 5+패널 수직 나열 (스크롤 부담)
  4. Step 2 "사진 없이 진행하기" 명시적 버튼 부재
  5. EditorPage/AIAnalysisDashboard 인라인 스타일 과다
- 실행 항목:
  - [x] 글 생성 완료 후 요약 피드백 추가 (Phase 1) ← 완료
  - [x] Step 2 "사진 없이 진행하기" 명시적 버튼 (Phase 1) ← 완료
  - [x] 사이드바 패널 아코디언 3그룹화 (SEO분석/AI도구/히스토리) (Phase 2) ← 완료
  - [x] AIAnalysisDashboard 인라인 스타일 → CSS 클래스 전환 (Phase 2) ← 완료
  - [x] EditorPage 위자드 인라인 스타일 → CSS 클래스 전환 (Phase 2) ← 완료
  - [x] Step 1 분리 (카테고리+주제 / 키워드+설정) (Phase 2) ← 2026-02-26 완료
  - [ ] 주제 입력 시 카테고리 자동 감지 (Phase 3)

## 완료된 작업 (2026-02-26) — 위자드 UX 개선 + 소셜 로그인 완성

### 위자드 3→4단계 분리
- [x] Step 1 (주제+키워드+설정) → Step 1 (주제 선택) + Step 2 (키워드+설정) 분리
- [x] STEP_LABELS 4개로 확장, 기존 Step 2/3 → Step 3/4 번호 이동

### 위자드 UX/디자인 전면 개선 (CDO 리뷰)
- [x] h1 "AI 본문 자동 작성" 제거, 헤더 구조 재설계 (StepIndicator→heading→desc→meta→content)
- [x] StepIndicator 리디자인 — 40px 원형, 라벨 하단 배치, 3px 커넥터
- [x] wizard-step-meta 카드 신규 — 주제+카테고리 정보 표시 (카테고리 bold)
- [x] 3티어 버튼 시스템 — primary(네비게이션), accent(AI 분석 6개), secondary(보조)
- [x] wizard-info-box 통일 — dashed 보더(정보), green 배경(성공), 오렌지 혼재 해소
- [x] photo-upload-banner 오렌지→회색 dashed 변경
- [x] 디자인 시스템 적용 — 12px radius(카드), hover shadow, font-weight 600
- [x] 사진 분석 AI junk 텍스트 필터 추가

### Firebase 프로젝트 전환
- [x] piklit-vml → piklit-vml-a4620 전체 전환 (.env + Vercel 환경변수)

### 네이버/카카오 소셜 로그인
- [x] Vercel Serverless Functions 설정 (api/auth/naver.js, kakao.js, callback.js)
- [x] Firebase Custom Token 생성 (jose RS256)
- [x] 서비스 계정 환경변수 분리 (JSON 파싱→개별 변수: FIREBASE_SA_CLIENT_EMAIL + FIREBASE_SA_PRIVATE_KEY)
- [x] 카카오 로그인 동작 확인

### 무료 체험 제한 + 가입 첫 달 프로모션
- [x] 공유 인증 헬퍼 추출 (api/lib/auth.js)
- [x] Firestore REST API 헬퍼 (api/lib/firestore.js — jose 기반 access token + getDoc/setDoc)
- [x] 글 생성 3회/월 quota 체크 (api/gemini.js — action 기반, 서버 키 사용자만)
- [x] AI 이미지 BYOK 전용 차단 (api/gemini-image.js — 403 반환)
- [x] 사용량 API 실제 Firestore 연동 (api/usage.js — isPromo/promoDaysLeft 포함)
- [x] 클라이언트 action 라벨 전달 + 429/403 에러 핸들링 (openai.js, firebase.js)
- [x] 가입 첫 달 무료 프로모션 (30일간 무제한 — gemini.js, gemini-image.js, usage.js)
- [x] CDO.md 가격 구조 업데이트 (BYOK ₩4,900 / Pro ₩18,900 / 첫 달 무료)

### 남은 작업
- [x] **Firebase Firestore 데이터베이스 생성** (Console에서 수동 — asia-northeast3, 프로덕션 모드)
- [x] Vercel 환경변수 확인 (FIREBASE_SA_CLIENT_EMAIL, FIREBASE_SA_PRIVATE_KEY)
- [x] 배포 후 프로모션 플로우 테스트 (글 생성 무제한 → 30일 후 3회 제한)
- [x] 카카오 동의항목 설정 (닉네임/프로필사진/이메일)
- [x] 네이버 테스터 등록 후 로그인 테스트
- [x] Google 로그인 프로덕션 테스트

## 완료된 작업 (2026-02-26) — 톤 미리보기 + UI 개선 + 로드맵 업데이트

### 톤 프리셋 샘플 미리보기
- [x] TONES 배열에 `sample` 필드 추가 (5개 톤별 예시 문단)
- [x] 위자드 Step 2 톤 카드 선택 시 샘플 문단 조건부 렌더링
- [x] `components.css`에 미리보기 스타일 3클래스 + 768px 모바일 반응형

### UI 개선
- [x] 사이드바·상단바·히스토리·글목록 UI 개선 (Sidebar, TopBar, HistoryPage, PostListPage, App.jsx, history.css)

### 문서
- [x] CDO.md 로드맵 전면 업데이트 — Phase 2~3 재구성, 체험단/협찬 모드 기획 추가

## 이전 완료 작업 (2026-02-06)

### 버그 수정
- [x] EditorContext `targetLength` TDZ 에러 수정 (흰 화면 원인) — 상태 선언 위치 이동
- [x] SettingsModal API 키 우선순위 수정 (`localStorage` → `.env` 순으로 통일)
- [x] `generateFullDraft` 파라미터 시그니처 수정 (8개 파라미터 정상 수신)
- [x] 키워드 분석 오류 수정 (`google_search` + `responseMimeType` 비호환 해결)
- [x] 키워드 분석 1회차 무응답 / 2회차 빈 결과 수정 (multi-part 응답 처리)
- [x] 본문에 코드 문자(`{"html":"`, `\n\n`) 노출 수정 (`_tryParseJson` 3단계 파싱)
- [x] SEO 체크리스트 `keywords.main` 빈 값 수정 (`mainKeyword` → Context 동기화)
- [x] 제목이 본문에 자동 포함되는 문제 수정 (프롬프트에 "제목 금지" 명시)

### 기능 개선
- [x] 키워드 분석 시 서브 키워드 5개 자동 선택 (나머지 5개는 제안 목록)
- [x] 키워드 제안 수 5개 → 10개 확대
- [x] 톤앤무드 선택이 실제 본문 생성에 반영되도록 수정
- [x] 에디터 툴바 sticky 처리 (header 60px 오프셋, z-index 50)
- [x] 이미지 토큰 최적화: Canvas 768px 리사이즈 (~80% 절감)
- [x] 태그 추출 기능 재작성 (UI 칩 + 복사 버튼)
- [x] 중복 "제목 추천" 버튼 제거
- [x] TIP 조언 → `<blockquote>` TIP 박스 스타일링

### 기타
- [x] 줄바꿈 후처리(`formatParagraphs`) 실제 AI 생성 결과로 검증 완료
- [x] `streamContentToEditor` 스트리밍 로직 점검 완료
- [x] EditorContext 내 미사용 함수 정리 완료

## 완료된 작업 (2026-03-03) — 도입부 SEO 최적화 + 경쟁 분석 UI 개선

### 카테고리별 도입부 SEO 프롬프트 개선
- [x] `openai.js`에 `_introPromptByCategory()` 헬퍼 추가 — 5개 카테고리별 도입부 구조·글자수 가이드
  - 맛집/카페: 150~200자, 방문 계기→가게명+지역→대표메뉴 한줄
  - 여행: 150~200자, 여행 동기→여행지+기간→하이라이트 예고
  - 일상: 100~150자, 공감 질문→주제 키워드→해결책 예고
  - 반려동물: 150~200자, 에피소드→키워드+주제→경험 해결 예고
  - 제품리뷰: 150~200자, 문제/고민→제품명→사용기간·한줄결론
- [x] `generateRestaurantDraft` — 도입부 프롬프트 카테고리 특화 적용
- [x] `generateFullDraft` — 일반 카테고리(여행/일상/반려동물)에 도입부 구조 지시 추가
- [x] `generateShoppingDraft` — 제품리뷰 도입부 프롬프트 개선

### 맛집/카페 정보카드 하단 이동
- [x] 정보카드(주소/영업시간/메뉴/주차/예약) 도입부 아래 → 글 맨 마지막 "📍 찾아가는 길"로 이동
- [x] `<h3>` → `<h2>` 승격, `<hr>` 제거
- [x] IntroOptimizer 정보카드 감지 패턴 `<h2>`/`<h3>` 모두 대응

### 도입부 최적화 카테고리 분기
- [x] `generateIntroAlternatives`에 `category` 파라미터 추가
- [x] 카테고리별 글자수 범위 + 전략 3가지 분기 (맛집/카페/여행/일상/반려동물/쇼핑)
- [x] IntroOptimizer에서 현재 포스트의 `categoryId` 전달

### SEO 체크리스트 카테고리별 도입부 글자수
- [x] `analysis.js`에 `INTRO_LENGTH_BY_CATEGORY` 상수 추가
- [x] `analyzePost`에 `categoryId` 파라미터 추가
- [x] `EditorContext.jsx` — 자동저장+실시간 분석 모두 현재 포스트의 categoryId 전달

### 경쟁 분석 데이터 부족 UI
- [x] `CompetitorAnalysis.jsx` — charCount+headingCount 모두 0일 때 "분석 데이터 부족" 안내 표시
- [x] 주황색 dashed 박스 스타일 추가 (`.competitor-insufficient`)

## 완료된 작업 (2026-03-03) — 보안 취약점 해결

### 의존성 보안
- [x] `xlsx` (SheetJS) 제거 — high 취약점 2건 (Prototype Pollution, ReDoS), 패치 불가
- [x] `read-excel-file` 교체 — `excelParser.js`를 `read-excel-file/browser` 기반으로 재작성
- [x] `npm audit` 취약점 0건 달성

## 완료된 작업 (2026-03-03) — 코드 스플리팅 + 프롬프트 개선 + 에이전트팀

### 번들 최적화: 코드 스플리팅
- [x] `App.jsx` — 4개 페이지 React.lazy() + Suspense fallback 적용
- [x] `vite.config.js` — manualChunks 함수형 (tiptap+prosemirror / firebase 분리)
- [x] 메인 번들 1,071KB → 254KB, 500KB 경고 해소

### 프롬프트 품질 개선
- [x] `extractTags` — 영어→한국어 프롬프트, 네이버 태그 규칙 추가 (대중5+틈새5 배합)
- [x] `recommendKeywords` — 레거시 삭제 (사용처 0건, analyzeKeywords와 중복)
- [x] `refineManualDraft` — `_toneMap` + `_htmlRules(keyword)` 적용 (기존 헬퍼 미사용 버그 수정)

### 에이전트팀 구축
- [x] `docs/agent-team.md` — 팀 매뉴얼 (메인+QA+프롬프트 3인 구성)
- [x] `docs/setup-agents.sh` — 셋업 가이드 스크립트
- [x] `.claude/commands/team.md` — `/team` 슬래시 커맨드

## 완료된 작업 (2026-03-06) — 랜딩 CSS 복원 + 에이전트팀/스킬 확장

### 랜딩페이지 CSS 복원
- [x] 오토클로드가 삭제한 4개 섹션 CSS 복원 (Sample Carousel, Category Grid, Persona Cards, Comparison Table)
- [x] 섹션 padding/center 규칙에 pain, categories, personas, comparison 복원
- [x] 반응형 768px에 persona-grid 1열, comparison-table 축소 추가
- [x] 미사용 Mid CTA CSS 제거 (JSX에 없는 코드 정리)

### 에이전트팀 확장
- [x] 디자인QA 에이전트 신규 — CSS 감사, 반응형 체크, 디자인 시스템 준수 검증
- [x] `docs/agent-team.md` 업데이트 (4인 구성: 메인+QA+디자인QA+프롬프트)
- [x] `.claude/commands/team.md` 업데이트 (디자인QA 탭 셋업 안내)

### 스킬 신규 3개
- [x] `/qa` — 변경 파일 수집 + QA 붙여넣기 메시지 자동 생성
- [x] `/design-audit` — JSX vs CSS 클래스 불일치 검출
- [x] `/deploy-check` — 배포 전 점검 (빌드+환경변수+라우팅+보안)

### 문서
- [x] `docs/commands-cheatsheet.md` 신규 — 전체 명령어·에이전트·훅·세션 흐름 치트시트

## 완료된 작업 (2026-03-06) — 5단계 위자드 + 베타 테스터 + 버그 리포트

### 위자드 5단계 재구성
- [x] 4단계→5단계: 주제 → 키워드 → 스타일설정 → 이미지 → 아웃라인+생성
- [x] `ToneStep.jsx` 신규 — 경쟁분석+글자수+톤앤무드+문단호흡+워너비스타일 통합
- [x] 워너비 스타일 분석/프리셋 기능 (`WannabeStylePanel.jsx`, `wannabeStyle.js`)
- [x] 문단 호흡 선택 (한줄씩/보통/긴호흡) — 프롬프트+후처리 이중 적용
- [x] 직접 작성 모드 제거 (BOD 승인)
- [x] TONES 상수 KeywordStep→ToneStep 이동, OutlineStep import 수정

### 베타 테스터 시스템
- [x] `api/beta.js` — 코드 검증(PIKLIT-VIP) + 30명 선착순 + 7일 한정
- [x] `SettingsModal.jsx` — 베타 코드 입력 UI + 활성 배지(D-day)
- [x] `EditorPage.jsx` — userPlan 동적 연동 (free/beta/pro)
- [x] AI 이미지 생성 pro 전용 제한 (beta 플랜 제외)

### 버그 리포트 시스템
- [x] `consoleCapture.js` — 콘솔 로그 자동 수집 (log/warn/error + 전역 에러)
- [x] `BugReportButton.jsx` — 플로팅 버튼 + 스크린샷(html2canvas) + 로그 자동 첨부
- [x] `api/bug-report.js` — 버그 저장/조회/상태변경 API
- [x] `AdminBugsPage.jsx` — /admin/bugs 관리 페이지 (sylee@datable.co.kr 전용)
- [x] 상태 관리: 신규/확인/해결 3단계

### 버그 수정
- [x] OutlineStep에서 headingCount 0이 화면에 "0"으로 렌더링 — `> 0 &&` 조건 수정
- [x] ImageSeoGuide 미임포트 오류 수정
- [x] 워너비 분석 실패 — google_search + thinkingBudget 비호환 해결
- [x] [[VIDEO:text]] 태그 미변환 — 정규식 확장
- [x] 느낌표(!) 뒤 줄바꿈 미동작 — 문장 분리 정규식 수정

### 남은 작업
- [x] Vercel 환경변수 `BETA_CODE=PIKLIT-VIP` 추가 완료
- [x] 베타 테스터 + 버그 리포트 실제 동작 검증
- [ ] 랜딩 페이지에 워너비 스타일 기능 소개 추가

## 완료된 작업 (2026-03-06) — 스킬 시스템 정리

### 스킬 정리
- [x] `/skill-creator` 스킬 신규 생성 — 새 스킬을 대화형으로 생성
- [x] 글로벌 `~/.claude/commands/start.md` 삭제 — skills 버전과 중복, 구버전 파일 참조
- [x] 글로벌 `~/.claude/commands/wrap-up.md` 삭제 — skills 버전과 중복
- [x] `/wrap-up` 스킬 수정 — `git add -A` → 특정 파일만 add (CLAUDE.md 규칙 준수)

## 완료된 작업 (2026-03-07) — 이사회 감사 기반 /posts + /editor + 위자드 품질 개선

### PostListPage 이사회 7개 항목
- [x] Empty state → 3단계 온보딩 가이드 (사진→AI→발행)
- [x] CTA 카드 dashed→solid + 브랜드 좌측 4px 보더
- [x] 삭제 확인 커스텀 모달 (window.confirm 제거, ESC 지원)
- [x] 삭제 버튼 hover-only 표시 (모바일은 항상 표시)
- [x] 포스트 카드 미리보기 2줄 말줄임 (CSS line-clamp)
- [x] 키워드를 메타 행에 인라인 통합
- [x] UsageBar 80%+ 경고 스타일 + BYOK 업그레이드 CTA 버튼

### EditorPage 이사회 7개 항목
- [x] SLOT_CONFIG 150줄 → `data/slotConfig.js` 별도 파일 분리
- [x] AI 이미지 버튼 인라인 스타일 20줄 → `.image-gen-floating-btn` CSS 클래스
- [x] 플로팅 버튼 간격 정리 (`.shift-up` 조건부 위치)
- [x] 생성 완료 축하 카드 + "다음 할 일" 3단계 안내 모달
- [x] 에디터 첫 진입 온보딩 툴팁 (localStorage 기반 1회)
- [x] 위자드 이탈 방지 (beforeunload 경고)
- [x] Pro 기능 잠금 표시 (회색 버튼 + Lock 뱃지 + 안내 토스트)
- [x] title 변수 EditorContext 구조분해 추가 (lint 에러 해결)

### 위자드 UX 5개 항목
- [x] "Step N:" 영어 → 한국어 타이틀 통일 (전 5개 스텝)
- [x] StepIndicator↔헤딩 중복 해소 (모바일 여백 대폭 축소)
- [x] 메타 정보 뱃지 스타일 (둥근 테두리 + 배경)
- [x] 안내 박스 → CTA 아래 힌트 텍스트로 통합
- [x] StepIndicator margin/padding 축소 (40→24px)

### 추가 완료 (2026-03-07 후반)
- [x] 마스터/관리자 계정 시스템 — 3개 이메일 Pro 전체 권한 자동 부여
- [x] AdminBugsPage 하드코딩 이메일 → 공통 adminEmails.js로 통합

## 완료된 작업 (2026-03-09) — CDO 이사회 A+ 디자인 전면 개선

### 리포트 탭 (HistoryPage) A+ 개선
- [x] 기간 필터: 카드 박스 → pill 그룹 스타일
- [x] 서머리 카드: 값/단위 분리, 배경색 surface-hover, border 제거
- [x] SEO 차트: 데이터 3개 이하 시 컴팩트 모드 (100px), overflow hidden
- [x] AI 활용: 직접 작성 바 뉴트럴(회색), 범례 축소, 섹션 제목 간결화
- [x] AI 기능별: seasonKeywordAnalysis → "시즌 키워드" 라벨 추가, 유동 폭
- [x] 섹션 간격: gap 24→12px, padding 24→16px, h3 0.9rem/600
- [x] h1 "성장 리포트" 헤딩 제거 (탭 이름과 중복)

### 글 목록 탭 (PostListPage) 개선
- [x] 상단 헤딩 제거 (탭 이름과 중복)

### TopBar 개선
- [x] "내 글" 탭에 posts.length 배지 추가 (.topbar-nav-badge)

### 디자인 시스템 강화
- [x] variables.css: --color-score-high/mid/low + bg/text 변수 9개 신설
- [x] history.css: dot-chart·SEO badge·streak badge 하드코딩 컬러 → CSS 변수
- [x] stacked-bar border-radius → var(--radius-xl)
- [x] Layout.css dead code 제거 (active badge 중복 선언)

### MobileFab 위자드 진입 수정
- [x] `/editor/new` 직행 → createPost() + navigate(isNew: true) 위자드 모드

### BugReportButton 모바일 수정
- [x] 인라인 스타일 → .bug-report-fab CSS 클래스 전환
- [x] 모바일 768px: 탭바 위로 이동 (bottom: 60px+safe-area), 크기 36px 축소

### 랜딩 텍스트 축약
- [x] 모바일 한 줄 표시 최적화 (4개 텍스트 축약)

## 완료된 작업 (2026-03-09) — 모바일/PC UX 전면 개선 + CRO A+

### URL 통일
- [x] `piklit.pro` → `piklit.vercel.app` 전체 교체 (8파일 12건: index.html, CLAUDE.md, api/auth/*, docs/*)

### 사이드바/분석 패널 개선 (PC)
- [x] 경쟁 분석 compact 결과 → `wizard-summary-inline` 스타일 통일 (dot 구분자)
- [x] PC 1024px에서 분석 사이드바 하단 이동 버그 수정 (flex-direction: column 제거, 280px 축소)
- [x] MetricBar 라벨 한줄 표기 — 라벨 축약 + `white-space: nowrap`
- [x] ReadabilityPanel, HumannessPanel 원형 게이지 그래프 제거 (중복 점수 표시 해소)
- [x] "사람이 쓴 것처럼 자연스럽습니다!" → "자연스러운 글입니다!" 축약
- [x] humanness.js 라벨 축약 (문장 길이 다양성→문장 길이, AI 패턴 감지→AI 패턴 등)

### 버그 수정 (PC)
- [x] 버그 리포트 FAB 사이드바 뒤 잘림 — `left: 24px` → `left: 256px`
- [x] FAB 사이즈 불일치 — image-seo-floating-btn 48px→44px 통일

### 에디터 개선
- [x] 에디터 온보딩 팁에서 "우측 사이드바에서" 제거 (플랫폼 중립)
- [x] AI footer "..." 표시 버그 수정 — 삽입 전 빈 `<p></p>` 정리
- [x] `splitLongSentence` 숫자 콤마("16,000원") 분리 버그 수정 — 정규식 `(?!\d)` lookahead
- [x] Humanness "적용" 버튼 원문 찾기 실패 수정 — 3단계 fuzzy matching (정규화→부분매칭)
- [x] "AI 추천" → "타이틀 AI 추천" 직관성 개선

### 모바일 UX 개선
- [x] CTA 드롭다운 미표시 수정 — `position: fixed; bottom: 80px; z-index: 1000`
- [x] 에디터 툴바 하단 여백 추가 (`margin-bottom: 80px`)
- [x] 랜딩 pain-card 텍스트 오버플로우 수정 (`overflow: hidden` + `min-width: 0`)
- [x] 썸네일 패널 버튼 잘림 수정 — chips `flex-wrap: wrap`, body padding 120px
- [x] 썸네일 다운로드 Web Share API 적용 (iOS 사진앱 저장 지원)
- [x] 클립보드 복사 HTML 미지원 수정 — 3단계 fallback (ClipboardItem→execCommand→text)
- [x] TopBar 복사 결과 text-only 처리 + 토스트 안내
- [x] "마이" 메뉴 열릴 때 모든 FAB 숨김 (`body:has(.my-menu-overlay)`)

### 관리자 계정
- [x] `hyoho1110@gmail.com` 마스터 계정 추가

## 완료된 작업 (2026-03-10) — 이미지 근본 수정 + UX 버그 모음 + 개발 환경 강화

### 이미지 본문 표시 근본 수정
- [x] TipTap Image `inline: true, allowBase64: true` 설정 — block node가 `<p>` 안에서 무시되던 근본 원인 해결
- [x] blob URL → base64 data URL 전환 (PhotoUploader, EditorPage) — 페이지 이동 후 이미지 유지
- [x] 적응형 스트리밍 청크 사이즈 — base64 포함 시 속도 최적화

### UX 버그 수정
- [x] 도입부 제안 적용 시 기존 도입부 위에 추가 → 교체(replace)로 수정
- [x] AI 고지 푸터 해제 시 본문 전체 삭제 → DOMParser로 안전하게 해당 `<p>`만 제거
- [x] 사진 분석 중 로딩 UI 2개 중복 표시 → 하단 프로그레스 제거
- [x] 이탈 방지 가드 에디터 모드 확장 + 저장/롤백/삭제 로직
- [x] 자동저장 3초 debounce + beforeunload 즉시 저장
- [x] 빈 글 자동 정리 (제목 없음 + 내용 20자 미만)

### UX 개선
- [x] 긴 문장/긴 문단 "위치 보기" 형광펜 3회 깜빡임 효과
- [x] HumannessPanel 원문 클릭 시 본문 위치 형광펜 깜빡임
- [x] 고급 옵션 오렌지 dot 표시 (1~2회 후 자동 숨김)
- [x] 경쟁 분석 결과 UI 컴팩트 리디자인
- [x] 워너비 스타일 UI 통일

### AI 품질 개선
- [x] 서브키워드 카테고리 반영 (무관한 키워드 방지)
- [x] 소제목 구조 아웃라인/서브키워드 준수 프롬프트 강화

### 개발 환경 강화
- [x] CLAUDE.md 핵심 규칙 6→9개 (질문금지, 단순함우선, 수술적변경, 커밋확인, 스킬제안)
- [x] Hook: 매 Edit마다 빌드 → 커밋 전에만 빌드로 변경
- [x] `/fix-batch` 스킬 신규 — 버그 일괄 수정
- [x] `/pre-commit-qa` 스킬 신규 — 커밋 전 품질 점검

### 완료된 작업 (2026-03-10) — 모바일 UX + 관리자 UI 세션

#### 사이드바/관리자
- [x] 사이드바 접기 버튼 로고 행 이동 + 접힌 상태 72px로 확대
- [x] 모바일 관리자 탭(버그/베타/관리자목록) → 마이 바텀시트로 이동

#### 모바일 UX
- [x] 모바일 하단 도구바 확대 (56→72px, 아이콘 24px, 라벨 항상 표시)
- [x] 아웃라인 H2 뱃지 → 주황색 점으로 교체
- [x] SEO 체크리스트 H2+H3 → 소제목 용어 통일 (H2만 체크)
- [x] AI 고지 자동체크 버그 수정 (localStorage → content 기반)
- [x] AI 고지 문구 빈 줄 중복 제거

## 완료된 작업 (2026-03-11) — QA 보고서 + 베타 테스터 피드백 반영

### QA/디자인QA 보고서 반영
- [x] ESLint: functions/, api/ Node.js 폴더 린트 제외 (33개 false positive 해소)
- [x] CSS: --color-bg-hover(미정의) → --color-surface-hover 교체 (4곳)
- [x] 디자인 문서: --color-accent, --color-accent-bg 값 코드와 동기화

### 베타 테스터 모바일 UX 버그 수정 (8건)
- [x] 키워드 강도 이모지에 텍스트 라벨 병기 (🔴 어려움/🟡 보통/🟢 쉬움)
- [x] 위자드 5단계 메타 박스 세로 레이아웃으로 변경
- [x] 타이틀 생성 로딩 시 Bot→Loader2 스피너 교체
- [x] 모바일 FAB 크기 통일 (40→44px)
- [x] AI 고지 토글 시 에디터 사이즈 점프 수정 (setContent 1회 통합)
- [x] AI 고지 앞 빈 `<p>` 제거 → margin-top 대체 ("..." 표시 해소)
- [x] API 에러 메시지 한국어 변환 (high demand 등)
- [x] 모바일 썸네일 패널 기본 펼침 상태로 변경

### 추가 UX 개선 (3건)
- [x] 고급 옵션 dot 클릭 전까지 유지 (localStorage 기반)
- [x] 키워드 직접 입력 추가 버튼 줄바꿈 방지 (nowrap + flex-shrink)
- [x] 로딩 중복 제거 3건 (키워드 분석, 시즌 트렌드, 아웃라인 생성)

### 남은 작업

#### 우선순위 HIGH
- [x] 베타 테스터 + 버그 리포트 실제 동작 검증 (디스코드 알림 확인 완료)
- [x] 배포 후 전체 플로우 E2E 테스트 (로그인→위자드→생성→발행)

#### 기능 기획 논의 (다음 세션)
- [x] AI 전체 리라이트 + 점수 변화 시각화 ← 2026-03-11 완료 (재작성 전후 SEO 점수 비교 카드 + 되돌리기)
- [x] SEO 체크리스트에서 항목별 AI 자동 수정 ← 2026-03-11 완료
- [x] 워너비 스타일 고도화 (게시글 단위 분석 + 스크린샷 영역별 첨부) ← 2026-03-11 완료
- [x] 휴먼라이징 제안 에디터 인라인 TIP 카드 (원문 클릭 → 본문 형광펜 + 수정안 TIP) ← 2026-03-11 완료

#### 우선순위 MEDIUM
- [x] 에디터 내 재생성 진입 경로 (위자드로 돌아가기) ← 2026-03-11 완료
- [x] 생성된 글 경쟁 블로그 대비 품질 비교 피드백 — 제거 (경쟁 데이터 기반 생성 + SEO 체크리스트와 중복)
- [x] 랜딩 페이지에 워너비 스타일 기능 소개 추가 ← 2026-03-11 완료 (스크린샷 슬롯 + 내스타일 이원화 반영)

#### 우선순위 LOW (디자인 QA 잔여)
- [x] history.css: gap 10px/12px → 8px 토큰 정규화 ← 2026-03-17 완료
- [x] history.css: font-size 0.78rem/0.8rem → var(--font-size-2xs) 토큰 정규화 ← 2026-03-17 완료
- [x] Layout.css: 480px 미디어쿼리 블록 추가 (소형 모바일 대응) ← 2026-03-17 완료

#### Phase 3 (Firebase 필요)
- [ ] 발행 후 성과 추적 (검색 순위, 조회수 대시보드)
- [ ] 네이버 플레이스 연동 (가게 정보 자동 삽입)
- [ ] 경쟁 매장 블로그 모니터링
- [ ] 주간 자동 포스팅
- [ ] 주제 입력 시 카테고리 자동 감지

#### 보류
- [ ] 기능 8: 내부 링크/시리즈 관리

## 완료된 작업 (2026-03-11) — AI 편집 도구 4종 + 배포 안정성 + 위자드 재진입

### AI 편집 도구 4종
- [x] 인라인 TIP 카드 — 인체감 제안 클릭 시 본문 하이라이트 + 수정안 TIP 카드 (적용/닫기)
- [x] SEO 자동수정 — AI 배지 표시 + "AI SEO 자동 수정 (N건)" 일괄 수정 버튼
- [x] 워너비/내스타일 이원화 — 스크린샷 슬롯 기반 분석, 타입별 프리셋 저장/적용
- [x] AI 전체 재작성 — 에디터 상단 "AI 전체 재작성" 버튼 (confirm 후 실행)

### 배포 안정성
- [x] safeImport 래퍼 — 청크 로드 실패 시 1회 자동 새로고침 (sessionStorage 플래그)
- [x] vercel.json 캐시 헤더 — HTML no-cache, assets immutable

### UX 개선
- [x] 설정 모달 로그아웃 버튼 추가
- [x] 에디터 상단 설정 변경 바 — 위자드 재진입 경로 (기존 설정 유지)
- [x] AIAnalysisDashboard 이중 setContent 버그 수정

### 남은 작업
- [x] AI 리라이트 전후 점수 변화 시각화 ← 2026-03-11 완료
- [ ] 이번 세션 구현 기능 전체 브라우저 테스트
- [x] 랜딩 페이지에 워너비 스타일 기능 소개 추가 ← 2026-03-11 완료

## 완료된 작업 (2026-03-11) — SEO 점수 시각화 + 랜딩 워너비 업데이트

### AI 재작성 SEO 점수 비교 카드
- [x] 재작성 전후 SEO 점수 시각화 (이전 취소선 → 이후 볼드 + 변화량 배지)
- [x] 되돌리기 버튼으로 원본 복원 기능
- [x] 카드 닫기 시 confirm 안내 (원본 복원 불가 경고)

### 랜딩 워너비 스타일 업데이트
- [x] 목업 UI 교체: URL 바 → 세그먼트 탭 + 스크린샷 슬롯 + 프리셋 저장
- [x] 텍스트 수정: 내스타일 이원화 반영, 불릿 업데이트
- [x] dead CSS 정리 (fm-wannabe-url/icon/input/btn 제거)

## 완료된 작업 (2026-03-12) — 디자인 QA + 컬러 시스템 감사 + 문서 업데이트

### Lint 수정 (안전 항목만)
- [x] `OutlineStep.jsx` — 미사용 `handleOutlineToggleLevel` 함수 제거 (영향 분석 후)
- [x] `AdminBetaPage.jsx` — 미사용 `userName` 파라미터 제거 (영향 분석 후)

### 디자인 QA HIGH 항목
- [x] `BugReportButton.jsx` — 인라인 스타일 9곳 → CSS 클래스 전환 (components.css에 ~79줄 추가)
- [x] `tiptap.css` — 점수 diff 하드코딩 컬러 → CSS 변수 (score-high/low)
- [x] `tiptap.css` — 480px 미디어쿼리 신규 추가

### 디자인 QA MEDIUM 항목
- [x] `PhotoUploader.jsx` — 인라인 스타일 6곳 → CSS 클래스 전환
- [x] `PhotoUploader.css` — 768px 미디어쿼리 추가
- [x] `PhotoUploader.css` — 하드코딩 컬러 8개 → CSS 변수 (#f0faf0, #4caf50, #ff4d4f, #d63031 등)

### 컬러 시스템 감사 (BOD 이사회)
- [x] 전체 컬러 전수 조사 — ~198개 하드코딩 발견 (14 CSS + 10 JSX 파일)
- [x] `variables.css` — 시맨틱 토큰 5개 신규 등록 (success-bg, error-bg, text-hint, panel-bg, highlight)
- [x] BOD 결정: `--color-success`(#27AE60)와 `--color-score-high`(#10B981) 시맨틱 구분 유지
- [x] BOD 결정: `--color-text-hint` #999999 → #767676 (WCAG AA 준수)
- [x] Phase 2 컬러 정규화 로드맵 수립: P1(orange) → P2(green) → P3(gray) → P4(toast) → P5(bg) → P6(JSX)

### 문서 업데이트
- [x] `design-system.md` — 새 토큰 문서화 (score 9개, 시맨틱 확장 4개, brand-text)
- [x] `walkthrough.md` — 이번 세션 내용 반영
- [x] `task.md` — 이번 세션 작업 이력 추가

### 프롬프트 에이전트 감사
- [x] openai.js AI 메서드 22개 + 헬퍼 7개 분석 완료
- [x] 6개 개선 포인트 발견 → 메모리에 저장 (다음 세션 착수)

### 기타
- [x] `preview-color-status.html` 정리 (삭제)

## 완료된 작업 (2026-03-12) — 브라우저 QA 이슈 수정 (긴급+1순위+2순위)

### 긴급 (#14 CRITICAL)
- [x] `EditorContext.jsx` — localStorage 저장 try-catch 추가 (QuotaExceeded 시 백화 방지)

### 1순위 (#8, #7)
- [x] `openai.js` fixSeoIssues — thinkingBudget 2048→1024 (응답 속도 개선 + JSON 파싱 실패 감소)
- [x] `analysis.js` — 도입부 글자수 공백 포함으로 통일 (IntroOptimizer와 일관성 확보)

### 2순위 (#6, #9, #11)
- [x] `openai.js` — 전 카테고리 도입부 프롬프트에 최소 글자수 강조 + 키워드 밀도 1~2% 명시
- [x] `analysis.js` — 키워드 밀도% 중복 이슈 제거 (횟수 체크 key_density로 통합)
- [x] `openai.js` analyzeHumanness — 소제목 변경 금지 + 80자 이내 + 구조 변경 금지 규칙 추가
- [x] `WannabeStylePanel.jsx` — 미사용 filledSlotCount 변수 제거 (lint fix)

### 3순위 (#5, #13, #12)
- [x] `openai.js` — 4개 생성 프롬프트에 title 필드 추가 + EditorPage 자동 채움
- [x] `ThumbnailPanel.jsx` — 썸네일 삽입 시 커서 위치 우선, 없으면 문서 끝
- [x] `HumannessPanel.jsx` — 사이드바 적용 시 팝업 닫기 + 팝업 적용 시 사이드바 applied 동기화

### 4순위 (#1, #2, #3)
- [x] `ToneStep.jsx` — 고급옵션 기본 펼침 상태로 변경
- [x] `KeywordStep.jsx` + `TopicStep.jsx` — "+N개 더보기" 텍스트 통일
- [x] `KeywordStep.jsx` — 키워드 경쟁도 뱃지에 설명 툴팁 추가

## 완료된 작업 (2026-03-12) — 프롬프트 감사 + QA 2차 수정 + SEO 고도화

### 프롬프트 감사 (openai.js)
- [x] 쇼핑 infoCard `<h3>` → `<h2>`, `<hr>` 제거
- [x] `analyzeCompetitors` thinkingBudget: 0 추가
- [x] `rewriteFullContent` `<strong>` → `<b>`, `<h3>` 제거
- [x] `_competitorPrompt` dead code (blogs 배열) 제거

### QA 1차 (9건)
- [x] #1 KeywordStep 고급옵션 기본 펼침
- [x] #2 키워드 입력 + 추가 버튼 일체형 디자인
- [x] #4 워너비 스타일 "필수" 라벨 제거
- [x] #5 워너비 요약 텍스트 잘림 수정 (word-break)
- [x] #8 타이틀 AI 추천 버튼 너비 안정화
- [x] #9 타이틀 미반환 시 키워드 기반 기본값
- [x] #11 AI 고지 토글 시 "..." 버그 수정
- [x] #14 인체감 적용 시 "..." 버그 수정
- [x] #15 썸네일 삽입 위치 → 문서 최상단 고정

### QA 2차 (6건)
- [x] #3 워너비/내스타일 → "스타일 분석" 1개 카드로 통합 (모달 내부 탭 유지)
- [x] #6 아웃라인 "다시 생성" 버튼 제거
- [x] #7 아웃라인 소제목 직접 입력 필드 추가
- [x] #10 장소 검색 프롬프트 개선 (매장 맥락 + 지도 서비스 우선)
- [x] #12 SEO 프롬프트 체크리스트 일치 고도화
- [x] #13 fixSeoIssues base64 이미지 플레이스홀더 치환 (토큰 오버플로 방지)

### SEO 프롬프트 고도화
- [x] `_htmlRules` — 키워드 밀도 "1~2%" → 위치별 횟수 (도입부1+소제목1+본문2+결론1=총5~6회)
- [x] `_subKeywordPrompt` — "70% 이상" → "전부 포함, 소제목에 분산 배치"
- [x] `_htmlRules` — "H2 소제목 중 최소 1개에 메인 키워드 포함" 추가
- [x] `_introPromptByCategory` — 6개 카테고리 글자수 기반 → 문장 수 기반으로 변경

### 버그 수정
- [x] EditorPage setTitle 미참조 에러 수정 (useEditor 구조분해 누락)

### 남은 작업
- [x] 베타 테스터 + 버그 리포트 실제 동작 검증
- [x] 배포 후 전체 플로우 E2E 테스트

## 완료된 작업 (2026-03-13) — 사이드바 v3 디자인 + 버그 수정 세션

### 사이드바 v3 디자인 전면 적용
- [x] AnalysisSidebar — v3-panel 3개 패널 분리 (AI 어드바이저/썸네일/히스토리)
- [x] AIAnalysisDashboard — 점수 변화 토스트 추가 (AI 수정 후 SEO/종합 점수 표시)
- [x] PostHistory — v3 심플 히스토리 (도트 AI=주황/수동=파랑 + 액션명 + 시간)
- [x] ThumbnailPanel — 텍스트 효과(그림자/윤곽선/배경박스) + 내 스타일 저장(3개까지)
- [x] thumbnail.js — 텍스트 효과 캔버스 렌더링 엔진 추가
- [x] CSS — v3 토스트, 히스토리, 텍스트 효과, 내 스타일 스타일 추가

### 버그 수정
- [x] thumbnail.js — 서브 텍스트에 선택 폰트 미적용 (Pretendard 하드코딩) → fontFamily 적용
- [x] analysis.js — 썸네일 이미지 첫 문단 오인식 방지 (텍스트 10자 이상 `<p>` 기준)
- [x] tiptap.css — CTA 드롭다운 위치 수정 (position: fixed → absolute, 버튼 기준)
- [x] wannabeStyle.js — seo 그룹 누락 수정 (CTA 스타일이 본문 생성 프롬프트에 반영)

### 모바일 이슈 수정 (세션 2)
- [x] 작성 히스토리 토글 중복 제거 (overview 모드 Section 래퍼 삭제)
- [x] SEO AI 수정 버튼 개별 로딩 처리 (seoFixLoadingId 도입)
- [x] SEO AI 수정 JSON 파싱 개선 (responseMimeType + content 키 fallback)
- [x] ReadabilityPanel 기본 접힘 설정
- [x] 썸네일 깨진 이미지 숨김 (onError + brokenImgs Set)
- [x] 모바일 자연스러움 탭 V3 디자인 통일 (mode="natural" + HumannessPanel suggestOnly)
- [x] 모바일 자연스러움 탭 가독성 섹션 제거 (AI 감지와 중복)
- [x] 모바일 자연스러움 개선 제안 → SEO와 동일 v3 카드 스타일
- [x] SEO 탭에서 자연스러움 제안 필터링
- [x] AI 수정 fix count 정확화 (issuesToFix.length 사용)
- [x] base64 이미지 플레이스홀더 복원 로직 안정화
- [x] 썸네일 본문 삽입 후 바텀시트 닫기 + 에디터 스크롤
- [x] 프리뷰 HTML 파일 9개 삭제

### 남은 작업
- [x] 기존 린트 에러 9건 정리 (에러 0개 달성, 경고 13개는 의도적 dependency 제한)
- [x] 썸네일 반분할(H)/매거진(I) 스타일 캔버스 렌더링 구현 — 다중 사진 선택 UI + 방향/색상/간격 커스텀
- [x] 베타 테스터 + 버그 리포트 실제 동작 검증
- [x] 배포 후 전체 플로우 E2E 테스트

## 완료된 작업 (2026-03-16) — 스타일 반영 강화 + 버그 수정 세션

### 스타일 반영 강화
- [x] `wannabeStyle.js` — `buildStyleRules()` 명령형 전면 개편 (16항목 × 구체적 AI 명령 매핑 RULE_COMMANDS)
- [x] `wannabeStyle.js` — sampleSentences 문체 예시 프롬프트 활용 추가
- [x] `openai.js` — 스타일 규칙 프롬프트 위치를 Output JSON 직전(최하단)으로 이동 (3개 Draft 메서드)
- [x] `openai.js` — 스타일 분석 시 기본 톤 대신 스타일 규칙 우선 적용

### AI 수정 고도화
- [x] `openai.js` fixSeoIssues — RULE_MAP 기반 이슈별 규칙 분리 (13개 규칙 일괄 → 요청된 이슈만)
- [x] `openai.js` fixSeoIssues — 제목 보호 이중 가드 (TITLE_ISSUE_IDS + 클라이언트 검증)
- [x] `openai.js` fixSeoIssues — length_short 규칙 추가
- [x] `AIAnalysisDashboard.jsx` — AI 수정 후 검증 토스트 (점수 비교 표시)

### 버그 수정
- [x] `ThumbnailPanel.jsx` — isMultiStyle TDZ 에러 수정 (프로덕션 빌드 크래시)
- [x] `postSync.js` — Firebase Storage 미활성 시 base64 fallback 추가
- [x] `EditorContext.jsx` — localStorage 저장 시 base64 이미지 제거 (5MB 용량 초과 방지)
- [x] `AIAnalysisDashboard.jsx` — length_short AI 수정 버튼 추가

### 기타
- [x] `WannabeStylePanel.jsx` — 다중 이미지 업로드 (슬롯당 최대 5장, 대표 이미지 + +N 뱃지)
- [x] `WannabeStyle.css` — PhotoUploader 디자인 매칭

### 남은 작업
- [x] Firebase Storage 관리자 확인 — 정상 동작 확인 (2026-03-17)
- [x] 미푸쉬 커밋 5건 배포 — 완료 (2026-03-17)

## 완료된 작업 (2026-03-17) — 버그 수정 + 프롬프트 감사 + 디자인 QA 완료

### 버그 수정
- [x] 키워드 밀도 AI 수정 핑퐁 해소 — fixSeoIssues에 현재 횟수/목표 범위 구체적 숫자 전달
- [x] 썸네일 매거진 드래그 크래시 수정 (단일+다중) — multiDragRef/dragRef null 참조 방지
- [x] 사진 분석 시 일부 사진 누락 방지 — 프롬프트에 전체 사진 수만큼 출력 형식 명시
- [x] 저장/복사 버튼 클릭 피드백 추가 — :active 스타일 (scale + 색상 변화)

### 프롬프트 감사 완료 (6건 전부 처리)
- [x] rewriteFullContent — _htmlRules 호출로 인라인 규칙 중복 제거
- [x] fixSeoIssues — AI 금지어 2개 → 16개 확대 + 금지 문형 추가
- [x] analyzeWannabeStyle — 미사용 url 파라미터 정리

### 디자인 QA 잔여 3건 완료
- [x] history.css gap 10px → 8px 정규화
- [x] history.css font-size 0.78rem/0.8rem → var(--font-size-2xs) 정규화
- [x] Layout.css 480px 소형 모바일 미디어쿼리 추가
- [x] variables.css — --font-size-2xs: 0.8rem 토큰 신설

### 기타
- [x] Firebase Storage 정상 동작 확인
- [x] 경쟁 대비 품질 비교 기능 — 제거 (SEO 체크리스트와 중복)

### 남은 작업
- [x] 미푸쉬 커밋 배포 — 완료

## 완료된 작업 (2026-03-17 세션 2) — 모바일 QA 9건

### 모바일 QA 1차 (4건)
- [x] CTA 안내창 모바일 하단 고정 (position: fixed)
- [x] AI 고지 "..." 재발 방지 — 빈 `<p>` 연속 제거 강화
- [x] 자연스러움 분석 결과 캐시 유지 (Dashboard 레벨)
- [x] 로딩 UI 스피너+점 중복 제거 (KeywordStep/OutlineStep)

### 모바일 QA 2차 (5건)
- [x] 모바일 핀치 줌 방지 — viewport user-scalable=no
- [x] 본문 `[1]`, `ALT. 1` 검색 각주 자동 제거 — generateContent 후처리
- [x] 모바일 하단 탭 뱃지 SEO→종합 점수로 변경
- [x] 자연스러움 분석 캐시를 MainContainer 레벨로 이동 (탭 전환 시 유지)
- [x] AI 고지 토글 setContent→insertContent/transaction.delete 변경 (모바일 "..." 근본 해결)

### 기타
- [x] claude-dashboard 플러그인 설치 (상태 표시줄 모니터링)

### 남은 확인 사항
- [x] CTA 안내창 모바일 동작 확인 — 정상
- [ ] AI 고지 "..." — 모바일 브라우저 환경 이슈 (간헐적, 별도 추적)

## 완료된 작업 (2026-03-20) — 베타 런칭 준비 + QA 11건 + 프롬프트 개선

### 베타 런칭 준비
- [x] 베타테스터 사용량(N/21회) usage API + SettingsModal UI 표시
- [x] 로그인 모달: Google 버튼 최상단, 네이버/카카오 "준비 중" 비활성화
- [x] FAQ: "네이버, 카카오, Google" → "Google (네이버/카카오 준비 중)"
- [x] 베타 활성화 시 🐛 버그 제보 안내 토스트 + 설정 카드 상시 안내
- [x] CTA "30초 만에 시작하기" → "지금 시작하기" (모바일 줄바꿈 방지)
- [x] 베타 테스터 가이드 페이지 (/beta-guide) — CSS 목업 4종, 할인 혜택·코드 공유 금지·감사 문구

### SEO 프롬프트 개선
- [x] _htmlRules에 targetLength 기반 동적 키워드 반복 횟수 (체크리스트와 동일 기준)
- [x] AI 금지어 16개×대체 32개 → 핵심 8개 한 줄 요약 (프롬프트 40% 축소)
- [x] 서브 키워드: "전부 포함" → "각 1~2회 필수, 빠지면 SEO 감점"
- [x] 일반/맛집/쇼핑 프롬프트 끝에 SEO 체크리스트 4개 추가 (자기검증)
- [x] fixSeoIssues intro_short/intro_long: 하드코딩 140~160자 → metric 기반 동적 범위
- [x] fixSeoIssues sub_missing: 누락 키워드 목록 명시

### QA 버그 수정
- [x] 자연스러움 적용 상태 미반영 → humanAppliedIndices를 EditorContext로 이동
- [x] CTA 블록 상단 삽입 → 항상 글 끝(endPos)에 삽입
- [x] 글 목록 뱃지 SEO 점수 → 종합 점수(SEO 60% + 자연스러움 40%) 표시
- [x] 태그 "+5개 더 추출" 기존 태그 사라짐 → 기존 유지 + 중복 제외 추가
- [x] 내보내기 Markdown(.md) 옵션 제거
- [x] 썸네일 다운로드 PC 공유 시트 → 바로 다운로드 (모바일만 공유 시트)
- [x] 글 소실 방지 — localStorage 이미지 플레이스홀더 + 클라우드 업로드 보호

### 남은 확인 사항
- [x] 배포 후 QA — CTA 하단 ✅, 종합 점수 ✅, 태그 추가 ✅, MD 제거 ✅, TIP 박스 ✅, 줄바꿈 ✅, 메인 키워드 문구 ✅
- [ ] autoFixSeo 2회 검증 루프 효과 확인 (키워드 과다/도입부/제목 자동 보정)
- [ ] 자연스러움 적용 문단 병합 재수정 확인
- [ ] 글 소실 방지 (localStorage 원본 저장) 확인
- [ ] 모바일 이탈 경고 팝업 확인
- [ ] 모바일 브라우저 "..." 간헐 발생 (환경 이슈, 별도 추적)
- [ ] 썸네일 탭 리셋 (구조 변경 필요, 다음 세션)

## 완료된 작업 (2026-03-20 세션 2) — QA 재수정 + SEO 자동 보정 + 이탈 경고

### SEO 자동 보정 신규 기능
- [x] autoFixSeo() — 본문 생성 직후 SEO 체크 → 이슈 있으면 자동 2회 보정
- [x] 보정 대상: key_density, key_first, sub_missing, intro_short, intro_long

### QA 버그 수정
- [x] "키워드 반복 과다" → "메인 키워드 반복 과다" 문구 변경
- [x] fixSeoIssues: 서브 키워드 삭제 금지 지시 추가
- [x] 자연스러움 적용: HTML replace 방식 재수정 (문단 병합 방지)
- [x] TIP 박스: blockquote 깨진 style 속성 후처리 제거
- [x] 타이틀 AI 추천: 15~30자 명시, thinkingBudget 1024 (안정성)
- [x] formatParagraphs: 따옴표 안 마침표에서 분리 방지
- [x] 자동저장: 플레이스홀더 content 저장/클라우드 업로드 차단
- [x] localStorage: 원본 먼저 저장 → 용량 초과 시에만 이미지 제거
- [x] 모바일 TopBar: "내 글" 탭에 이탈 경고 가드 추가

## 완료된 작업 (2026-03-20 세션 3) — 베타 D-1 QA + 키워드 SEO 근본 수정

### 이미지 생성 모델 수정
- [x] gemini-2.5-flash-preview-04-17 → gemini-2.5-flash-image (404 해결)
- [x] api/gemini-image.js + src/services/firebase.js 동시 수정

### QA 버그 수정 (7건)
- [x] `**볼드**` 마크다운 → `<b>` HTML 변환 추가
- [x] 자연스러움 개선 제안 0건 → 중간 점수에도 제안 생성 (문장 길이, 이모지)
- [x] localStorage blob: URL 이미지도 제거 대상 추가
- [x] 모바일 '마이' 탭 글씨 크기 불균형 수정 (all:unset)
- [x] 자연스러움 수정 적용 시 문단 병합 방지 (</p><p> 경계 보존)
- [x] autoFixSeo 2회 보정 루프 정상 동작 확인
- [x] 모바일 이탈 경고 팝업 정상 동작 확인

### 키워드 SEO 근본 수정 (이사회 결의 7건)
- [x] 키워드 밀도 카운팅: h2/h3 소제목 제외, 본문(p) 텍스트만
- [x] 밀도 임계값 하향: 3-5 / 4-7 / 6-10 (5곳 통일)
- [x] 경계값 `< 2500` 통일 (analysis.js + openai.js 5곳)
- [x] 생성 프롬프트: 본문 기준 횟수 명시, h2 키워드는 별도 카운트
- [x] 도입부 판별: 첫 h2 이전 p 태그로 한정 (key_first + intro_length 통일)
- [x] fixSeoIssues: intro_short + key_first 동시 발생 시 통합 규칙
- [x] 서브 키워드: 본문(p) 전용 체크 (h2 제외)

### 추가 수정
- [x] autoFixSeo를 후처리 이후에 실행 (사이드바와 동일 HTML 기준 분석)
- [x] finalHtml 참조 오류 수정
- [x] 블로그 복사 시 h2 앞 빈 줄 추가 (네이버 블로그 여백 반영)
- [x] 카페&맛집 카테고리 '추천' 뱃지 추가
- [x] 이미지 우클릭 저장 — 정상 동작 확인 (오류 아님)
- [x] 키워드 밀도 개선 확인 — 종합 91%, SEO 85%, autoFixSeo 3건 보정 정상

### 남은 이슈 (다음 세션)
- [ ] 글 목록 blob URL 이미지 액박 — 깨진 이미지 대신 플레이스홀더 표시 (근본 해결은 클라우드 저장)
- [ ] 썸네일 탭 리셋 — 증상/환경(PC or 모바일)/재현 조건 미기록. 다음 세션에서 재확인 필요
- [ ] localStorage 용량 초과 경고 — 이미지 포함 글 저장 시 발생. 클라우드 저장으로 근본 해결

## 아이디어 보관함 (Icebox)

> 당장 구현하지 않지만 나중에 재검토할 수 있는 아이디어

- **사진 묶음 → 여러 글 분리**: 다수 사진을 장소/시간 기준으로 그룹핑하여 글 여러 개 자동 생성. 이사회 검토 결과 실사용 수요 낮고 UX 복잡도 높아 보류 (2026-03-03)
