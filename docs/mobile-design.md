# 피클잇 모바일 완결 안 — 상세 설계서

> 결정일: 2026-03-06 | 이사회 만장일치 승인 + CDO 감사 반영
> 목표: 모바일에서 모든 기능 사용 가능 (PC와 동등한 기능, UI 형태만 다름)

---

## 1. 설계 원칙

1. **모바일 완결**: 위자드 ~ 편집 ~ 분석 ~ 복사까지 모바일만으로 완료 가능
2. **PC 동등 기능**: 기능 자체는 동일, UI 컨테이너만 다름 (사이드바 -> 탭바, BubbleMenu -> 문단 버튼)
3. **기존 코드 재사용**: 로직/컴포넌트는 최대한 재사용, 컨테이너만 교체
4. **브레이크포인트 3단계**: 1024px / 768px / 480px
5. **터치 타겟 최소 44px**: 모든 버튼/링크 (시각 크기와 터치 영역 분리 가능)
6. **접근성 AA 준수**: 텍스트 대비율 4.5:1 이상 보장
7. **3단 레이어 동시 노출 금지**: 바텀 시트 활성 시 에디터 dim 처리

---

## 2. 브레이크포인트 및 모바일 토큰 정의

| 토큰 | 값 | 대상 |
|------|-----|------|
| `--bp-desktop` | 1024px | 2컬럼 에디터+사이드바 |
| `--bp-tablet` | 768px | 사이드바 -> 상단 탭, 1컬럼 |
| `--bp-mobile` | 480px | 풀폭, 축소 패딩, 그리드 재배치 |

### variables.css 추가 내용
```css
:root {
  /* 브레이크포인트 */
  --bp-desktop: 1024px;
  --bp-tablet: 768px;
  --bp-mobile: 480px;

  /* 모바일 전용 토큰 (CDO 감사 반영) */
  --radius-xl: 12px;
  --radius-2xl: 16px;                              /* 바텀 시트 상단 라운딩 */
  --transition-sheet: 0.3s cubic-bezier(0.32, 0.72, 0, 1);  /* iOS 스프링 근사 */
  --shadow-sheet: 0 -4px 16px rgba(15, 15, 15, 0.08);       /* 바텀 시트 그림자 */
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);

  /* 접근성: 오렌지 텍스트용 다크 변형 (대비 4.6:1) */
  --color-brand-text: #D4541C;
}
```

### 기존 브레이크포인트 통일 작업
- 600px -> 480px로 통일
- 640px -> 480px 또는 768px로 통일
- 모든 CSS 파일에서 비표준 브레이크포인트 정리

### 접근성 색상 규칙 (CDO 감사 반영)
- `#FF6B35` (브랜드 오렌지): 아이콘, 배경, 장식에만 사용
- `#D4541C` (--color-brand-text): 오렌지 계열 텍스트 시 사용 (AA 대비 4.6:1 충족)
- 일반 텍스트: `--color-text-main (#37352F)` 유지
- 서브 텍스트: `--color-text-sub (#787774)` 유지 (AA 대비 4.8:1 충족)

---

## 3. 페이지별 모바일 설계

### 3.1 레이아웃 (AppLayout + Sidebar + TopBar)

#### 현재 구조 (PC)
```
[Sidebar 240px] [App Main                    ]
 - 로고          [TopBar 52px               ]
 - 새 글 작성    [App Content               ]
 - 내 글           - 페이지 콘텐츠
 - 성장 리포트
 - 설정/프로필
```

#### 모바일 구조 (768px 이하)
```
[TopBar (로고 + 탭 + [+] + 프로필)           ]
[App Content                                 ]
 - 페이지 콘텐츠 (풀폭)
```

#### 상세 변경사항

**Sidebar (768px 이하)**
- `display: none` (완전 숨김)
- 현재: 768px에서 64px 축약 -> 변경: 완전 숨김

**TopBar (768px 이하)**
- 높이: 52px 유지
- 좌측: 로고 (32px 아이콘 + "Piklit" 텍스트)
- 중앙: 수평 탭 네비게이션
  - [내 글] [리포트]
  - NavLink active: 하단 2px 오렌지 밑줄
  - 터치 타겟: 44px 이상
- 중앙-우측: [+] 새 글 버튼 (CDO 감사 반영)
  - 오렌지 원형 아이콘 버튼 (32px, background: var(--color-brand))
  - 탭의 평범한 텍스트가 아닌 시각적 CTA로 분리
  - 핵심 행동(primary action)의 어포던스 유지
- 우측: 프로필 아이콘 (32px, 탭하면 설정/로그아웃 드롭다운)
  - 첫 진입 시 "프로필을 눌러 설정을 변경하세요" 코치마크 (1회성, localStorage)
- 360px 이하 극소 화면: 탭 라벨을 아이콘으로 전환

**App Main (768px 이하)**
- `margin-left: 0` (사이드바 없음)
- padding 조정: 24px -> 16px

**수정 파일:**
- `src/components/layout/Sidebar.jsx` — 모바일 숨김 (CSS만으로 가능)
- `src/components/layout/TopBar.jsx` — 모바일 네비 + [+] CTA + 프로필 코치마크 (JSX 변경)
- `src/components/layout/Layout.css` — 미디어쿼리 추가/수정

---

### 3.2 위자드 5단계

#### StepIndicator 모바일 (768px 이하)

**현재 (PC)**: 원형 40px x 5개 + 라벨 하단 + 3px 커넥터
**모바일**: 하이브리드 방식

```
  2단계: 키워드 분석          <- 현재 단계명 텍스트 (탭하면 단계 선택 드롭다운)
  [==][==][  ][  ][  ]       <- 5칸 세그먼트바
```

- 상단: "N단계: {단계명}" 텍스트 (font-size: 0.9rem, font-weight: 600)
  - 텍스트 자체를 탭하면 단계 선택 드롭다운 표시 (이전 단계 복귀 대체 방식)
- 하단: 5칸 세그먼트바
  - 완료: var(--color-brand) #FF6B35
  - 현재: var(--color-brand) + 미세 펄스 (`opacity: 0.6 -> 1, 1.5s ease-in-out, infinite`)
  - 미완료: var(--color-border) #E3E2E0
  - 세그먼트 시각 높이: 4px, gap: 3px, border-radius: 2px
  - **터치 영역: padding 20px 0으로 44px 확보** (CDO 감사 반영 - 시각 4px, 터치 44px)
  - 세그먼트 클릭 -> 이전 단계 이동 가능
- 전체 높이: ~50px (텍스트 20px + gap 8px + 바 4px + padding)

**수정 파일:**
- `src/pages/EditorPage.jsx` — StepIndicator 모바일 분기 렌더링

#### Step 1: 주제 선택 (TopicStep)

**카테고리 그리드**
- PC: `repeat(auto-fill, minmax(120px, 1fr))` — 행 4~5개
- 768px 이하: 유지 (auto-fill이 자동 조정)
- 480px 이하: `minmax(100px, 1fr)` — 2~3열로 조정

**주제 입력**
- PC: 고정폭 input
- 모바일: `width: 100%`

**컨테이너**
- `.wizard-card-wrap` padding: 36px -> 20px (480px 이하)

**수정 파일:** `src/styles/components.css` (미디어쿼리 추가)

#### Step 2: 키워드 분석 (KeywordStep)

**키워드 칩**
- `flex-wrap: wrap` 이미 적용 -> 자동 줄바꿈 (변경 불필요)
- 480px 이하: 칩 padding 8px 16px -> 6px 12px, font-size 0.8rem

**키워드 직접 입력**
- `.wizard-custom-input-row` (flex)
- 480px 이하: input `flex: 1`, 버튼 유지

**시즌 키워드 칩**
- flex-wrap으로 자동 줄바꿈 (변경 불필요)

**수정 파일:** `src/styles/components.css` (미디어쿼리 추가)

#### Step 3: 스타일 설정 (ToneStep)

**톤앤무드 그리드 (5개)**
- PC: `1fr 1fr` (2열)
- 768px 이하: `1fr` (1열) — 이미 적용됨
- 변경 불필요

**글자수 그리드 (4개)** [깨짐 위험 높음]
- PC: `repeat(4, 1fr)`
- 480px 이하: `repeat(2, 1fr)` — 2행 2열
- 텍스트 "800~1200자"가 들어갈 수 있는 최소 폭 확보

**문단 호흡 그리드 (3개)** [깨짐 위험 높음]
- PC: `repeat(3, 1fr)`
- 480px 이하: `1fr` (1열) — 스택
- 또는 `repeat(3, 1fr)` + font-size 축소

**경쟁 분석 결과**
- 카드 레이아웃 flex-wrap 확인
- 480px 이하: padding 축소

**워너비 스타일 모달**
- 현재: 모달 (position: fixed)
- 모바일: 풀스크린 모달 (`inset: 0`, 스크롤)

**수정 파일:** `src/styles/components.css`, `src/styles/WannabeStyle.css`

#### Step 4: 이미지 업로드 (PhotoStep)

**PhotoUploader**
- 이미 반응형 부분 대응 (PhotoUploader.css에 미디어쿼리 존재)
- 480px 이하: 이미지 그리드 2열 -> 1열 확인 필요

**사진 분석 결과 카드**
- `.photo-analysis-card` — flex-wrap 확인
- 480px 이하: padding 축소

**수정 파일:** `src/styles/PhotoUploader.css`

#### Step 5: 아웃라인 + 생성 (OutlineStep)

**아웃라인 편집 행**
- `.outline-row` (flex): level 버튼 34px + input flex:1 + 액션 버튼들
- 480px 이하: 액션 버튼 아이콘만 표시 (텍스트 숨김)
- input 최소 폭 확보

**생성 버튼**
- 풀폭 (width: 100%)

**수정 파일:** `src/styles/components.css`

#### 공통: 위자드 네비게이션 버튼

**현재**: `justify-content: space-between` (이전/다음)
**480px 이하**: 유지하되 버튼 패딩 축소 (14px 32px -> 12px 20px)

---

### 3.3 에디터 페이지

#### 현재 구조 (PC, 1024px 이상)
```
[Editor Section (flex:1, max 800px)] [Analysis Section (320px, sticky)]
 - TitleInput                          - SEO 게이지
 - IntroOptimizer                      - SidebarGroup: SEO 분석
 - TiptapEditor                          - 메트릭 카드
   - MenuBar                             - 체크리스트
   - BubbleMenu (텍스트 선택 시)          - ReadabilityPanel
   - EditorContent                     - SidebarGroup: AI 도구
                                         - 태그 추출
                                         - HumannessPanel
                                         - ThumbnailPanel
                                       - SidebarGroup: 히스토리
                                         - PostHistory
```

#### 모바일 구조 (768px 이하)

```
[TopBar (로고 + 탭 + 프로필)]
[에디터 영역 (풀폭)]
 - TitleInput
 - IntroOptimizer
 - TiptapEditor
   - MenuBar (가로 스크롤)
   - 문단별 AI 버튼 (BubbleMenu 대체, 포커스 시 페이드인)
   - EditorContent
[하단 탭바 (고정, 키보드 시 숨김)]
 아이콘만 기본 표시, active 탭에만 라벨
 [글] [SEO 78] [읽기 쉬움] [AI탐지] [썸네일]
```

#### 3.3.1 에디터 본문

**EditorContainer**
- 현재: `maxWidth: 800px` 인라인 스타일
- 모바일: `maxWidth: 100%`, padding 조정

**MenuBar (에디터 툴바)**
- 현재: 고정 높이, 아이콘 나열
- 모바일: `overflow-x: auto; white-space: nowrap;` 가로 스크롤
- 터치 타겟 44px 보장

**TopBar 에디터 액션 버튼**
- 현재: "저장" "블로그로 복사" "내보내기" 텍스트 버튼
- 480px 이하: 아이콘만 표시 (Save, Copy, Export 아이콘)
- 또는 "..." 더보기 메뉴로 통합

#### 3.3.2 BubbleMenu -> 문단 AI 버튼 (Phase 1.5)

**현재 (PC)**
- 텍스트 드래그 선택 -> BubbleMenu 팝업
- B/I/S + AI 드롭다운 (확장/축약/팩트/다듬기)

**모바일 (768px 이하)**
- BubbleMenu: `display: none`
- 각 paragraph/heading 노드 좌측에 `...` 아이콘 버튼
  - 아이콘 시각 크기: 24px
  - **터치 영역: padding 10px으로 44px 확보** (CDO 감사 반영)
  - **상시 노출 대신, 문단 탭/포커스 시에만 페이드인** (CDO 감사 반영)
    - `opacity: 0 -> 0.5` (0.2s ease), 터치 시 `opacity: 1`
    - 에디터의 시각적 소음(feature overload) 방지
- 탭하면 BottomSheet 올라옴:
  ```
  +-------------------------------+
  |  --- (드래그 핸들)         [X] |  <- X 닫기 버튼 병행 (CDO 감사 반영)
  |                               |
  |  "이 문단을 AI로 개선"         |
  |                               |
  |  [Wand] 더 자세하게            |  <- 세로 리스트 (CDO 감사 반영)
  |         선택한 문단을 확장합니다 |     각 행 48px, 아이콘+라벨+설명
  |  [Min]  더 간결하게            |
  |         핵심만 남기고 축약합니다 |
  |  [Zap]  팩트 보강              |
  |         구체적 수치를 추가합니다 |
  |  [Pen]  문장 다듬기            |
  |         자연스럽게 다듬습니다    |
  |                               |
  |  v 고급 옵션                   |  <- 접힌 상태 (CDO 감사 반영)
  |    문장 선택하여 부분 수정      |     펼치면 문장별 탭 선택 UI
  +-------------------------------+
  ```

**바텀 시트 높이:** 고정 스냅 포인트 방식 (CDO 감사 반영)
  - 기본: 40% (4개 버튼 표시에 충분)
  - 드래그 확장: 75% (고급 옵션 펼침 시)
  - 최대: 90%
  - 닫힘: 아래로 드래그 또는 X 버튼

**기술 구현:**
- TipTap Decoration 또는 NodeView로 paragraph 노드에 버튼 주입
- `handleAiRewrite()` 함수 그대로 재사용
- 문단 전체 자동 선택 (터치 텍스트 선택 불필요)
- 문장 단위 선택: `analysis.js`의 문장 분리 로직 재사용

**온보딩:** 최초 1회 "AI로 문단 개선" 툴팁 (CDO 감사 반영 - `...` 의미 불투명 보완)
  - 첫 에디터 진입 시 첫 번째 문단의 `...` 버튼 위에 말풍선 표시
  - "탭하면 AI가 문장을 다듬어줍니다"
  - localStorage로 1회성 제어

**수정 파일:**
- `src/components/editor/TiptapEditor.jsx` — 모바일 분기, Decoration 추가
- `src/styles/tiptap.css` — 문단 버튼 스타일

#### 3.3.3 분석 사이드바 -> 하단 탭바 + 바텀 시트 (Phase 1.5)

**현재 (PC, 1024px 이상)**
- `aside.analysis-section` 우측 320px 고정
- 5개 패널 SidebarGroup 아코디언

**모바일 (768px 이하)**
- `analysis-section`: `display: none`
- 하단 고정 탭바 신규:
  ```
  +-------------------------------------------+
  | [글]  [SEO]  [읽기쉬움] [AI탐지]  [썸네일] |
  |        78                                  |
  +-------------------------------------------+
  ```
  - 높이: 48px + var(--safe-area-bottom)
  - 배경: `rgba(255,255,255,0.95); backdrop-filter: blur(8px)` (CDO 감사 반영)
  - 상단: `border-top: 1px solid var(--color-border)`
  - **아이콘만 기본 표시, active 탭에만 라벨** (CDO 감사 반영 - Material 3 패턴)
  - "글" 탭: 에디터로 돌아감 (바텀 시트 닫힘)
  - SEO 탭 아이콘 우상단: 점수 뱃지
    - `min-width: 18px; height: 18px; font-size: 10px; border-radius: 9px;`
    - 점수 구간 색상: 80+ 초록, 60~79 노랑, 59- 빨강
  - 각 탭 클릭 -> 바텀 시트 올라옴 + 에디터 dim 오버레이
  - **키보드 활성 시 탭바 숨김** (CDO 감사 반영)
    - `visualViewport.resize` 이벤트 감지
    - 키보드 올라오면 `display: none`, 내려가면 복원

**바텀 시트 활성 시 에디터 처리 (CDO 감사 반영 - 3단 레이어 금지):**
- 에디터 영역에 dim 오버레이: `opacity: 0.4; pointer-events: none;`
- 탭바는 유지 (탭 전환 가능)
- 바텀 시트 배경 탭 또는 X 버튼으로 닫으면 dim 해제

**탭 매핑:**
| 탭 | 아이콘 | 라벨 | 바텀 시트 내용 | 기존 컴포넌트 |
|----|-------|------|--------------|-------------|
| 글 | Edit3 | 글 | (에디터로 복귀) | -- |
| SEO | BarChart3 | SEO | SEO 게이지 + 메트릭 카드 + 체크리스트 | AIAnalysisDashboard 일부 |
| 읽기 쉬움 | BookOpen | 읽기 쉬움 | ReadabilityPanel | ReadabilityPanel |
| AI탐지 | Sparkles | AI탐지 | HumannessPanel | HumannessPanel |
| 썸네일 | Image | 썸네일 | ThumbnailPanel (풀스크린) | ThumbnailPanel |

**라벨 변경 (CDO 감사 반영):**
- "가독성" -> "읽기 쉬움" (비전문가 이해 용이)
- "자연스러움" -> "AI탐지" (기능 목적 명확)

**플로팅 복사 버튼 통합:**
- Phase 1에서 하단 플로팅 버튼으로 시작
- Phase 1.5에서 탭바 도입 시 "글" 탭 상단에 복사/내보내기 액션 통합
- 플로팅 버튼 제거 (하단 UI 충돌 방지)

**수정 파일:**
- `src/components/analysis/MobileAnalysisBar.jsx` — 신규
- `src/components/common/BottomSheet.jsx` — 신규
- `src/components/layout/MainContainer.jsx` — 모바일 분기
- `src/styles/components.css` — 탭바, 바텀 시트 스타일

#### 3.3.4 썸네일 편집 -> 풀스크린 모달 (Phase 1.5)

**현재 (PC)**
- 사이드바 패널 내 접이식
- 드래그 패닝 + 슬라이더 줌

**모바일**
```
+-------------------------------+
| [X 닫기]         [완료]        |  <- 상단 바 (완료: color: var(--color-brand-text), weight 600)
|                               |
| +---------------------------+ |
| |                           | |
| |     썸네일 미리보기         | |  <- 핀치 줌 + 터치 패닝
| |     (풀폭, 1:1.78 비율)    | |     touch-action: none
| |                           | |
| +---------------------------+ |
| ─────────────────────────── | |  <- 구분선 (CDO 감사 반영)
| [하단 컨트롤 영역]            | |  <- background: var(--color-surface-hover)
|                               |     touch-action: pan-y (제스처 격리)
| 1차 탭: [사진] [스타일] [텍스트]|  <- 탭 전환 (CDO 감사 반영 - 2단계 계층화)
|                               |
|  (사진 탭 활성 시)             |
|  [사진1] [사진2] [사진3] >>   |  <- 가로 스크롤 + 우측 그래디언트 페이드 힌트
|                               |
|  (스타일 탭 활성 시)           |
|  [A] [B] [C] [D] [E]         |  <- 스타일 선택
|  + 세부 옵션 (슬라이드)        |
|                               |
|  (텍스트 탭 활성 시)           |
|  메인: [___________]          |
|  서브: [___________]          |
|  [AI 텍스트 생성]              |
|  폰트/크기 세부 옵션           |
|                               |
| [다운로드]  [본문 삽입]         |  <- 하단 고정 액션
+-------------------------------+
```

- `position: fixed; inset: 0; z-index: 200;`
- **핀치 줌 영역**: `touch-action: none` (브라우저 제스처 완전 차단)
- **하단 컨트롤 영역**: `touch-action: pan-y` (세로 스크롤만 허용, CDO 감사 반영)
- **영역 구분**: 구분선 + 배경색 차별화 (CDO 감사 반영 - 제스처 충돌 방지)
  - 핀치 줌 영역: `background: #000` (이미지 배경)
  - 하단 컨트롤: `background: var(--color-surface-hover)`
  - 사이: `1px solid var(--color-border)` + `margin: 0 16px`
- **사진 가로 스크롤 힌트**: 우측에 `linear-gradient(to left, white, transparent)` 24px 페이드 (CDO 감사 반영)
- **옵션 2단계 계층화** (CDO 감사 반영): 1차 탭(사진/스타일/텍스트) -> 2차 서브 옵션 슬라이드
- 핀치 줌: 두 손가락 터치 거리 계산 -> zoom 값 변경
- 기존 `handlePointerDown/Move/Up` 로직 재사용
- 기존 `renderPreview()` 캔버스 렌더링 재사용

**수정 파일:**
- `src/components/editor/ThumbnailPanel.jsx` — 모바일 풀스크린 분기
- `src/styles/ThumbnailPanel.css` — 풀스크린 스타일

---

### 3.4 글 목록 (PostListPage)

**현재**
- `max-width: 800px`, padding 40px 20px
- 카드 flex row (본문 + 삭제 버튼)

**768px 이하**
- padding: 16px
- 카드 padding: 16px

**480px 이하**
- 카드 내 메타 정보 font-size 축소
- 삭제 버튼 크기 조정

**사용량 바/추천 섹션**
- 풀폭 조정, padding 축소

**수정 파일:** `src/styles/components.css`

---

### 3.5 히스토리 (HistoryPage)

**현재**
- 요약 카드 3열 그리드
- 바 차트, 도넛 차트, 히트맵

**768px 이하**
- 요약 카드: 3열 -> 2열 (이미 적용)

**480px 이하**
- 요약 카드: 2열 -> 1열
- 히트맵: `overflow-x: auto` 가로 스크롤
- 바 차트: 폭 축소

**수정 파일:** `src/styles/history.css`

---

## 4. 신규 컴포넌트 설계

### 4.1 BottomSheet.jsx

```
Props:
- isOpen: boolean
- onClose: () => void
- snapPoints: number[] (예: [0.4, 0.75, 0.9])  <- 고정 스냅 포인트 (CDO 감사 반영)
- title?: string
- children: ReactNode

기능:
- 배경 dim 클릭 -> 닫기
- **우상단 X 닫기 버튼** (CDO 감사 반영 - 드래그와 병행, 접근성)
- 드래그 핸들 (상단 4px 바) -> 아래로 드래그하면 닫기
- 스냅 포인트: 40% -> 75% -> 닫힘 (드래그 방향에 따라)
- iOS Safari 대응: dvh 단위, overscroll-behavior: contain
- 내부 스크롤: overflow-y: auto
- **활성 시 뒤 콘텐츠 dim** (CDO 감사 반영)
  - 오버레이: rgba(15, 15, 15, 0.4) (Notion 동일 컬러 베이스)
  - pointer-events: none

CSS 토큰 (기존 디자인 시스템에서 파생):
- 드래그 핸들: width: 36px, height: 4px, border-radius: 2px, background: var(--color-border)
- 라운딩: var(--radius-2xl) var(--radius-2xl) 0 0
- 그림자: var(--shadow-sheet)
- 배경: var(--color-surface)
- 오버레이: rgba(15, 15, 15, 0.4)

애니메이션:
- 열기: translateY(100%) -> translateY(0), var(--transition-sheet)
- 닫기: translateY(0) -> translateY(100%), 0.2s ease-in
```

### 4.2 MobileAnalysisBar.jsx

```
Props:
- seoScore: number
- children (패널 컴포넌트들): ReactNode

구조:
- 하단 고정 탭바 (position: fixed, bottom: 0)
- **아이콘만 기본 표시, active 탭에만 라벨** (CDO 감사 반영 - Material 3)
- 탭 클릭 -> BottomSheet 오픈 + 해당 패널 렌더링
- "글" 탭 클릭 -> 바텀 시트 닫고 에디터로 복귀
- "글" 탭 상단에 복사/내보내기 인라인 액션
- **키보드 활성 시 숨김** (CDO 감사 반영)

CSS:
- height: 48px + var(--safe-area-bottom)
- background: rgba(255, 255, 255, 0.95)
- backdrop-filter: blur(8px)
- border-top: 1px solid var(--color-border)
- z-index: 100

탭 아이콘: lucide-react (Edit3, BarChart3, BookOpen, Sparkles, Image)
SEO 뱃지: min-width 18px, height 18px, font-size 10px, 점수 구간 색상
```

---

## 5. Phase 구분 및 작업 순서

### Phase 1: 기본 반응형 (MVP 배포 전)

| 순서 | 작업 | 파일 | 예상 |
|-----|------|------|-----|
| 1-1 | variables.css 브레이크포인트 + 모바일 토큰 추가 | variables.css | 0.5h |
| 1-2 | 기존 비표준 브레이크포인트 통일 | 전체 CSS 파일 | 1h |
| 1-3 | 접근성 색상 적용 (--color-brand-text) | 전체 CSS/JSX | 1h |
| 1-4 | Sidebar 768px 이하 숨김 | Layout.css | 0.5h |
| 1-5 | TopBar 모바일 네비 + [+] CTA + 코치마크 | TopBar.jsx, Layout.css | 2h |
| 1-6 | App Main margin-left: 0 | Layout.css | 0.5h |
| 1-7 | 위자드 StepIndicator 모바일 (터치 44px) | EditorPage.jsx, components.css | 2h |
| 1-8 | 위자드 5단계 반응형 CSS | components.css | 3h |
| 1-9 | 에디터 TopBar 버튼 모바일 | TopBar.jsx, Layout.css | 1h |
| 1-10 | 에디터 MenuBar 가로 스크롤 | tiptap.css | 0.5h |
| 1-11 | 에디터 BubbleMenu 모바일 숨김 | tiptap.css | 0.5h |
| 1-12 | 에디터 하단 플로팅 복사 버튼 | EditorPage.jsx, components.css | 1h |
| 1-13 | 글 목록 반응형 | components.css | 1h |
| 1-14 | 히스토리 반응형 보강 | history.css | 1h |
| | **Phase 1 합계** | | **~16h** |

### Phase 1.5: 모바일 완결 (MVP 직후, 5~7일)

| 순서 | 작업 | 파일 | 예상 |
|-----|------|------|-----|
| 1.5-1 | BottomSheet 공통 (X 닫기, 스냅, dim, iOS) | BottomSheet.jsx, components.css | 1~1.5일 |
| 1.5-2 | MobileAnalysisBar (Material 3, 키보드 숨김) | MobileAnalysisBar.jsx | 1일 |
| 1.5-3 | SEO/읽기쉬움/AI탐지 바텀 시트 연결 | MainContainer.jsx 분기 | 0.5일 |
| 1.5-4 | AI 재작성 문단 버튼 (포커스 페이드, 세로 리스트) | TiptapEditor.jsx, tiptap.css | 1.5~2일 |
| 1.5-5 | 썸네일 풀스크린 (제스처 격리, 2단계 옵션) | ThumbnailPanel.jsx/css | 1일 |
| 1.5-6 | 플로팅 버튼 -> 탭 내 액션 통합 | EditorPage.jsx | 0.5일 |
| 1.5-7 | 온보딩 힌트 3건 + 프로필 코치마크 | 각 컴포넌트 | 0.5일 |
| | **Phase 1.5 합계** | | **5~7일** |

### Phase 2: 크로스 디바이스

| 작업 | 내용 |
|------|------|
| Firestore 글 저장 | localStorage -> Firestore 마이그레이션 |
| 실시간 동기화 | onSnapshot 리스너 |
| 모바일 -> PC 이어쓰기 | 계정 기반 글 동기화 |

---

## 6. 전환 안내 문구

### 에디터 상단 배너 (Phase 1, 모바일 접속 시)
```
PC에서 편집하면 AI 분석과 재작성 기능을 모두 사용할 수 있어요  [X]
```
- 닫기 가능, localStorage로 1회만 표시
- Phase 1.5 완료 후 제거 (모바일에서도 가능해지므로)

### 글 본문 터치 시 토스트 (Phase 1, BubbleMenu 숨김 상태)
```
AI 재작성 기능은 곧 모바일에서도 지원됩니다
```
- Phase 1.5 완료 후 제거

### 위자드 -> 에디터 전환 안내 (Phase 1.5)
```
글이 완성되었습니다! 하단 탭에서 SEO를 점검해보세요
```
- 1회성 오버레이, 탭하면 닫힘

### 프로필 코치마크 (Phase 1, 첫 모바일 진입 시)
```
프로필을 눌러 설정을 변경하세요
```
- 프로필 아이콘 위 말풍선, 1회성 (localStorage)

---

## 7. iOS Safari 주의사항

| 이슈 | 대응 |
|------|------|
| 100vh 주소창 포함 | `100dvh` 사용 |
| position: fixed + 키보드 | `visualViewport` API로 키보드 감지 -> 탭바 숨김 |
| safe-area-inset-bottom | `var(--safe-area-bottom)` 적용 |
| 바텀 시트 스크롤 관통 | `overscroll-behavior: contain` |
| 썸네일 핀치 줌/스크롤 충돌 | 영역별 `touch-action` 격리 (none vs pan-y) |
| 핀치 줌 방지 | `<meta name="viewport" content="user-scalable=no">` 검토 |
| 바텀 시트 iOS 스프링 | `var(--transition-sheet)` cubic-bezier 사용 |

---

## 8. 테스트 체크리스트

### 디바이스/뷰포트
- [ ] iPhone SE (375px)
- [ ] iPhone 14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] Galaxy S21 (360px)
- [ ] iPad Mini (768px)
- [ ] iPad (1024px)

### 기능별
- [ ] 위자드 5단계 완주 (모바일)
- [ ] 에디터 기본 텍스트 편집 (모바일)
- [ ] 글 복사 -> 네이버 블로그 앱 붙여넣기
- [ ] 문단 AI 재작성 (Phase 1.5)
- [ ] 바텀 시트 SEO 분석 확인 (Phase 1.5)
- [ ] 썸네일 풀스크린 편집 (Phase 1.5)
- [ ] 하단 탭바 + 바텀 시트 전환
- [ ] iOS Safari safe-area 동작
- [ ] 가로 모드(landscape) 동작
- [ ] 키보드 활성 시 탭바 숨김 동작
- [ ] 바텀 시트 활성 시 에디터 dim 동작

### 접근성 (CDO 감사 반영)
- [ ] 모든 터치 타겟 44px 이상
- [ ] 오렌지 텍스트 대비율 4.5:1 이상 (--color-brand-text 사용)
- [ ] 바텀 시트 X 닫기 버튼 동작
- [ ] 세그먼트바 터치 영역 충분
- [ ] 문단 AI 버튼 터치 영역 충분

### 성능
- [ ] 바텀 시트 애니메이션 60fps
- [ ] 에디터 터치 입력 지연 없음
- [ ] 썸네일 핀치 줌 부드러움
