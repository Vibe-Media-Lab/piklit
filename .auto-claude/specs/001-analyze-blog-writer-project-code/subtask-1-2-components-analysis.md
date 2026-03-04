# Subtask 1-2: 컴포넌트 파일 분석 결과

## 요약

총 **23개 컴포넌트** (editor: 8, analysis: 7, common: 4, layout: 4)

| 디렉토리 | 파일 수 | 총 라인 | 평균 라인 | 특성 |
|----------|---------|---------|----------|------|
| editor/ | 8 | 2,583 | 323 | AI 통합 중심, 대형 파일 다수 |
| analysis/ | 7 | 1,335 | 191 | 사이드바 패널, Context 의존적 |
| common/ | 4 | 582 | 146 | 유틸리티/글로벌 UI |
| layout/ | 4 | 173 | 43 | 얇은 레이아웃 래퍼 |

---

## editor/ (8개, 2,583줄)

### 1. PhotoUploader.jsx (644줄) ⚠️ 대형
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditorContext()` — photos, photoPreviewUrls, setPhotos 등 7+ 필드
- **책임**: 사진 업로드/드래그앤드롭, 미리보기, 크롭 다이얼로그, 에디터 삽입, 워터마크
- **내부 컴포넌트**: ImageCropper 포함 사용
- **재사용성**: ❌ 낮음 — EditorContext에 강하게 결합
- **이슈**: 644줄 모놀리스. 크롭/워터마크/삽입 로직 분리 가능

### 2. TiptapEditor.jsx (342줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditorContext()` — content, setContent, keywords, suggestedTone, editorRef
- **내부 컴포넌트**: `MenuBar` (props: editor, tone, aiFooterEnabled, onToggleAiFooter)
- **책임**: TipTap 에디터 초기화, 툴바, AI 드롭다운(문장다듬기/요약/확장), AI 푸터, BubbleMenu
- **재사용성**: ❌ 낮음 — EditorContext + AIService에 강결합
- **이슈**: MenuBar를 별도 파일로 분리 가능

### 3. ImageGeneratorPanel.jsx (398줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditorContext()` — keywords, editorRef, recordAiAction
- **책임**: AI 이미지 생성 (프롬프트 입력, 스타일 선택, 생성, 에디터 삽입)
- **재사용성**: ❌ 낮음 — AI 서비스 + Context 의존

### 4. ImageSeoGuide.jsx (343줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditorContext()` — content, keywords
- **책임**: 이미지 SEO 가이드, alt 텍스트 분석/제안, 에디터 반영
- **재사용성**: ❌ 낮음

### 5. ImageCropper.jsx (310줄)
- **Props**: `{ src, onCrop, onCancel, aspectRatio }`
- **Context 의존성**: 없음
- **책임**: 이미지 크롭 UI (캔버스 기반, 드래그 가능 영역 선택)
- **재사용성**: ✅ 높음 — props 기반, 독립적

### 6. IntroOptimizer.jsx (169줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditorContext()` — content, keywords, editorRef, recordAiAction
- **책임**: AI 기반 인트로 문단 최적화, 3개 대안 제시, 에디터 적용
- **재사용성**: ❌ 낮음

### 7. TitleInput.jsx (133줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditorContext()` — title, setTitle, keywords, recordAiAction
- **책임**: 제목 입력 + AI 제목 생성 (5개 후보)
- **재사용성**: ❌ 낮음

### 8. EditorContainer.jsx (24줄)
- **Props**: 없음
- **Context 의존성**: useParams (id)
- **책임**: EditorPage를 key={id}로 감싸서 라우트 변경 시 리마운트 보장
- **재사용성**: ⚠️ 보통 — 패턴으로서 재사용 가능하나 EditorPage 전용

---

## analysis/ (7개, 1,335줄)

### 1. ThumbnailPanel.jsx (447줄) ⚠️ 대형
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditor()` — title, keywords, posts, currentPostId, photoPreviewUrls, editorRef, recordAiAction
- **책임**: 썸네일 생성 (스타일 선택, 텍스트 편집, 폰트/색상 커스텀, 배경 이미지 줌/드래그, 다운로드/삽입)
- **재사용성**: ❌ 낮음 — 많은 Context 필드 의존
- **이슈**: 447줄 + 20개 이상 state 변수. 스타일 프리뷰/컨트롤 분리 필요

### 2. HumannessPanel.jsx (262줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditor()` — content, suggestedTone, keywords, recordAiAction, editorRef
- **내부 컴포넌트**: `MetricBar` (props: label, score, maxScore)
- **책임**: AI 글 인간미 분석, 점수/등급 표시, AI 제안 + 에디터 적용
- **재사용성**: ❌ 낮음

### 3. AIAnalysisDashboard.jsx (197줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditor()` — analysis, content, recordAiAction
- **내부 컴포넌트**: `SidebarGroup` (props: title, defaultOpen, children)
- **책임**: SEO 점수 대시보드, 체크리스트, 태그 추출/복사
- **재사용성**: ❌ 낮음

### 4. PostHistory.jsx (182줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditor()` — posts, currentPostId
- **책임**: 편집 세션 타임라인, AI 사용 통계
- **재사용성**: ❌ 낮음

### 5. ReadabilityPanel.jsx (147줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditor()` — content
- **내부 컴포넌트**: `MetricBar` (props: label, score, maxScore) — HumannessPanel과 중복
- **책임**: 가독성 분석 점수/등급/제안
- **재사용성**: ❌ 낮음
- **이슈**: MetricBar가 HumannessPanel과 중복 정의

### 6. CompetitorAnalysis.jsx (87줄)
- **Props**: `{ data, loading, onAnalyze }`
- **Context 의존성**: 없음
- **책임**: 경쟁 글 분석 결과 표시 (평균 통계)
- **재사용성**: ✅ 높음 — props 기반, 독립적

### 7. AnalysisSidebar.jsx (13줄)
- **Props**: 없음
- **Context 의존성**: 없음
- **책임**: 분석 패널들의 래퍼 컨테이너
- **재사용성**: ✅ 높음 — 단순 래퍼

---

## common/ (4개, 582줄)

### 1. RecommendSection.jsx (270줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditor()` — posts, createPost
- **책임**: AI 주제 추천 (블로그 통계 파일 업로드 또는 기존 히스토리 기반), localStorage 캐시(24h)
- **재사용성**: ❌ 낮음

### 2. SettingsModal.jsx (183줄)
- **Props**: `{ isOpen, onClose }`
- **Context 의존성**: `useToast()`, `useAuth()` — user
- **책임**: API 키 설정, 사용량 표시, 키 저장/삭제
- **재사용성**: ⚠️ 보통 — props 인터페이스 있으나 앱 로직 포함

### 3. ErrorBoundary.jsx (72줄)
- **Props**: `{ children, onReset }`
- **Context 의존성**: 없음
- **책임**: React 에러 바운더리 (class component)
- **재사용성**: ✅ 높음 — 범용적

### 4. Toast.jsx (57줄)
- **Props**: N/A (Context Provider + Hook)
- **exports**: `ToastProvider`, `useToast()`
- **책임**: 토스트 알림 시스템 (Context + Provider 패턴)
- **재사용성**: ✅ 높음 — 범용적

---

## layout/ (4개, 173줄)

### 1. Sidebar.jsx (114줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useAuth()` — user, logout; `useEditor()` — createPost
- **책임**: 네비게이션 사이드바, 새 글 생성, 로그아웃
- **재사용성**: ❌ 낮음 — 앱 특화

### 2. TopBar.jsx (101줄)
- **Props**: 없음 (Context 소비)
- **Context 의존성**: `useEditor()` — title, content, savePost, currentPostId
- **책임**: 상단 바 (페이지 제목, 저장, 복사, 내보내기)
- **재사용성**: ❌ 낮음 — 앱 특화

### 3. AppLayout.jsx (20줄)
- **Props**: `{ children }`
- **Context 의존성**: 없음
- **책임**: Sidebar + TopBar + children 레이아웃 조합
- **재사용성**: ⚠️ 보통 — 앱 레이아웃 전용이나 구조는 범용

### 4. MainContainer.jsx (19줄)
- **Props**: 없음
- **Context 의존성**: 없음 (Outlet 사용)
- **책임**: React Router Outlet 래퍼
- **재사용성**: ✅ 높음 — 단순 래퍼

---

## 횡단 분석

### Props vs Context 의존성 패턴

| 유형 | 수 | 비율 | 컴포넌트 |
|------|---|------|---------|
| Props 기반 (재사용 가능) | 5 | 22% | ImageCropper, CompetitorAnalysis, AnalysisSidebar, ErrorBoundary, AppLayout |
| Context 소비 (앱 결합) | 16 | 70% | 나머지 대부분 |
| Provider/Hook 패턴 | 1 | 4% | Toast |
| 혼합 (Props + Context) | 1 | 4% | SettingsModal |

### 재사용성 등급

| 등급 | 수 | 컴포넌트 |
|------|---|---------|
| ✅ 높음 | 6 | ImageCropper, CompetitorAnalysis, AnalysisSidebar, ErrorBoundary, Toast, MainContainer |
| ⚠️ 보통 | 3 | EditorContainer, SettingsModal, AppLayout |
| ❌ 낮음 | 14 | 나머지 — Context 강결합 |

### 코드 중복 이슈
1. **MetricBar 컴포넌트**: ReadabilityPanel.jsx와 HumannessPanel.jsx에서 거의 동일한 구현 중복
2. **GRADE_COLORS/GRADE_LABELS 상수**: 두 패널에서 동일 정의 중복

### 크기 경고 (300줄+)
| 파일 | 라인 | 권장 |
|------|------|------|
| PhotoUploader.jsx | 644 | 크롭/워터마크/삽입 로직 분리 |
| ThumbnailPanel.jsx | 447 | 프리뷰 렌더러/컨트롤 분리 |
| ImageGeneratorPanel.jsx | 398 | 적정 범위 |
| ImageSeoGuide.jsx | 343 | 적정 범위 |
| TiptapEditor.jsx | 342 | MenuBar 분리 권장 |
| ImageCropper.jsx | 310 | 적정 (독립 컴포넌트) |

### 아키텍처 패턴 관찰
1. **Context 과의존**: 23개 중 16개(70%)가 Context를 직접 소비 → props 드릴링 없이 편리하나 테스트/재사용 어려움
2. **내부 컴포넌트 미분리**: MenuBar, MetricBar, SidebarGroup 등이 같은 파일에 정의
3. **일관된 패턴**: 모든 analysis 패널이 접기/펼치기(isOpen) + 로딩 상태 패턴 공유 → 공통 래퍼 추출 가능
