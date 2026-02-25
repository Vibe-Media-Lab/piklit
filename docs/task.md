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
- [ ] 다음 글 추천 (히스토리 기반 AI 주제 제안)
- [ ] 사진 묶음 → 여러 글 분리 (다수 사진 그룹핑)

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
- [x] `docs/bod-piklit.md` 신규 생성 — 범용 BOD 프롬프트를 피클릿 전용으로 커스텀
  - CEO 비전→피클릿 비전, COO 지표→피클릿 KPI, CTO→React+Gemini 특화
  - CRO→블로거 심리 4인 박사단, CMO→네이버 블로그 SEO 전문가단, CDO→Notion-style 디자인
  - 상단에 피클릿 컨텍스트 내장 (매번 별도 설명 불필요)

### docs 정리 (7개 삭제)
- [x] `bod.md` 삭제 — `bod-piklit.md`로 대체 완료
- [x] `GEMINI.md` 삭제 — "Antigravity" 구 브랜드, CLAUDE.md가 대체
- [x] `always_be_on_the_same_page.md` 삭제 — "Vibe Media Lab" 구 브랜드, CLAUDE.md가 대체
- [x] `start_work.md` 삭제 — 구 워크플로, CLAUDE.md 세션 규칙이 대체
- [x] `end_work.md` 삭제 — 구 워크플로, 현재 미사용
- [x] `session-manager.md` 삭제 — 다른 프로젝트 범용 에이전트 스펙, 피클릿 무관
- [x] `Prompt Architect.md` 삭제 — 범용 프롬프트 엔지니어링 페르소나, 피클릿 무관

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
  - [ ] Step 1 분리 (카테고리+주제 / 키워드+설정) (Phase 2, 별도 세션)
  - [ ] 주제 입력 시 카테고리 자동 감지 (Phase 3)

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
