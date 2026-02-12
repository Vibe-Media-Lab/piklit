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
