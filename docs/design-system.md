# 피클잇 (Piklit) — 디자인 시스템

> CSS Variables 기반 디자인 토큰 & UI 컴포넌트 패턴 참조 문서
> 원본: `src/styles/variables.css`

## 컬러 팔레트

### 기본 컬러 (Notion-style)
| 토큰 | 값 | 용도 |
|------|------|------|
| `--color-bg` | `#FFFFFF` | 페이지 배경 |
| `--color-surface` | `#FFFFFF` | 카드/컨테이너 배경 |
| `--color-surface-hover` | `#F7F6F3` | 호버 배경 (Notion 그레이) |
| `--color-primary` | `#37352F` | 주요 텍스트, 기본 버튼 (Notion 다크 그레이) |
| `--color-text-main` | `#37352F` | 본문 텍스트 |
| `--color-text-sub` | `#787774` | 보조 텍스트, 라벨 |
| `--color-border` | `#E3E2E0` | 기본 보더 |
| `--color-border-hover` | `#D3D1CB` | 호버 보더 |
| `--color-accent` | `#2EAADC` | 포커스, 선택 (Notion 블루) |
| `--color-accent-bg` | `#E3F2FD` | 악센트 배경 |

### 상태 컬러
| 토큰 | 값 | 용도 |
|------|------|------|
| `--color-success` | `#27AE60` | 성공, SEO 점수 양호 |
| `--color-warning` | `#EB5757` | 경고, SEO 점수 부족 |
| `--color-error` | `#EB5757` | 에러 |

### 브랜드 & AI 컬러 (인라인 사용)
| 값 | 용도 | 사용처 |
|------|------|--------|
| `#FF6B35` | 피클잇 브랜드 오렌지 | 로고, AI 버튼 |
| `#E67E22` | CTA 오렌지 | CTA 툴바 버튼 |
| `#FFF8F0` | CTA 호버 배경 | CTA 드롭다운 호버 |
| `#6366F1` | 인디고 | 도입부 최적화 버튼, 전략 라벨 |
| `#8B5CF6` | 퍼플 | 도입부 그래디언트 |
| `#4F46E5` | 딥 인디고 | 도입부 적용 버튼 호버 |

### SEO 점수 컬러 (인라인 사용)
| 범위 | 컬러 | 의미 |
|------|-------|------|
| 80~100 | `#16A34A` / `#D1FAE5` | 양호 (초록) |
| 50~79 | `#F59E0B` / `#FEF3C7` | 보통 (노랑) |
| 0~49 | `#EB5757` | 부족 (빨강) |

## 타이포그래피

### 폰트 패밀리
```css
--font-main: 'Pretendard', -apple-system, BlinkMacSystemFont,
             "Segoe UI", Helvetica, Arial, sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji";
```

### 크기 스케일
| 토큰 | 값 | px | 용도 |
|------|------|-----|------|
| `--font-size-sm` | `0.875rem` | 14px | 보조 텍스트, 힌트, 배지 |
| `--font-size-base` | `1rem` | 16px | 본문 텍스트 |
| `--font-size-lg` | `1.125rem` | 18px | 강조 텍스트 |
| `--font-size-xl` | `1.5rem` | 24px | 섹션 제목 |
| `--font-size-2xl` | `2.25rem` | 36px | 페이지 제목 |

### 에디터 내부 타이포
| 요소 | 크기 | 굵기 | 여백 |
|------|------|------|------|
| 제목 (title-input) | `clamp(2rem, 5vw, 2.5rem)` | 700 | mb 20px |
| H1 (사용 금지) | 2.2em | 700 | mt 2em, mb 0.5em |
| H2 | 1.6em | 600 | mt 1.8em, mb 0.4em, 하단 보더 |
| H3 | 1.3em | 600 | mt 1.4em, mb 0.2em |
| 본문 (p) | 1rem | 400 | mb 8px, line-height 1.7 |

## 간격 토큰

| 토큰 | 값 | 용도 |
|------|------|------|
| `--spacing-xs` | `4px` | 아이콘 간격, 인라인 갭 |
| `--spacing-sm` | `8px` | 요소 내부 패딩, 작은 갭 |
| `--spacing-md` | `16px` | 기본 패딩, 섹션 간격 |
| `--spacing-lg` | `24px` | 섹션 패딩, 큰 갭 |
| `--spacing-xl` | `40px` | 페이지 패딩, 큰 여백 |

## 라운딩 토큰

| 토큰 | 값 | 용도 |
|------|------|------|
| `--radius-sm` | `4px` | 버튼, 인풋, 작은 카드 |
| `--radius-md` | `6px` | 일반 카드 |
| `--radius-lg` | `8px` | 큰 카드, 대시보드 패널 |
| (인라인) | `10px` | 배지, 드롭다운, 메트릭 카드 |
| (인라인) | `12px` | 정보 카드, 대시보드 섹션 |
| (인라인) | `50%` | 아바타, 원형 아이콘 |

## 그림자 토큰

| 토큰 | 값 | 용도 |
|------|------|------|
| `--shadow-sm` | `0 1px 2px rgba(15,15,15,0.05)` | 카드, 이미지 |
| `--shadow-md` | `0 4px 8px rgba(15,15,15,0.05)` | 떠 있는 요소 |
| `--shadow-lg` | `0 8px 16px rgba(15,15,15,0.05)` | 버블메뉴, 드롭다운 |
| (인라인) | `0 4px 16px rgba(0,0,0,0.12)` | 내보내기 드롭다운 |
| (인라인) | `0 2px 8px rgba(0,0,0,0.06)` | 에디터 툴바 |

## 컴포넌트 패턴

### 버튼
| 유형 | 스타일 | 사용처 |
|------|--------|--------|
| Primary | `bg: --color-primary`, 흰 텍스트, radius 4px | 위자드 "다음" 버튼 |
| Text | 테두리 없음, `color: --color-text-sub`, 호버 시 밑줄 | "건너뛰기", 링크형 |
| Toolbar | 투명 bg, 호버 시 `--color-surface-hover` | 에디터 툴바 |
| AI CTA | `color: #E67E22`, font-weight 600 | AI 기능 드롭다운 트리거 |
| AI Generate | 그래디언트 `#6366F1 → #8B5CF6`, 흰 텍스트 | 도입부 최적화 |
| AI Apply | `bg: #6366F1`, 흰 텍스트, radius 6px | 도입부 적용 |

### 카드
| 유형 | 스타일 | 사용처 |
|------|--------|--------|
| 위자드 카드 | 1px 보더, radius-sm, min-h 140px, 호버 translateY(-2px) | 카테고리/톤 선택 |
| 메트릭 카드 | 1px 보더, radius 10px, 텍스트 중앙 | SEO 체크리스트 |
| 도입부 카드 | 1px `#E2E8F0`, radius 10px, 호버 시 보더 인디고 | 도입부 대안 |
| 정보 카드 | bg `#F8FAFC`, 1px `#E2E8F0`, radius 12px | 맛집/제품 정보 |
| TIP 박스 | blockquote — bg `#FFF9E6`, 좌측 4px `#F59E0B` | 팁/조언 |

### 입력 필드
| 유형 | 스타일 | 사용처 |
|------|--------|--------|
| 기본 | 하단 보더만, 포커스 시 `--color-accent` 밑줄 | 일반 텍스트 입력 |
| 위자드 | 60% width, 2rem, 중앙 정렬, 하단 보더 | 주제 입력 |
| 제목 | clamp(2rem~2.5rem), 700, 보더 없음 | 에디터 제목 |

### 배지
| 유형 | 스타일 | 사용처 |
|------|--------|--------|
| 양호 | bg `#D1FAE5`, color `#065F46` | 도입부 분석 |
| 경고 | bg `#FEF3C7`, color `#92400E` | 가독성 제안 |
| 정보 | bg `#E0E7FF`, color `#3730A3` | 중립 배지 |
| 중립 | bg `#EEF2FF`, color `#3730A3` | 가독성 정보 |

### 드롭다운
```
공통 스타일:
- position: absolute
- bg: white
- border: 1px solid --color-border
- border-radius: 8~10px
- box-shadow: --shadow-lg
- z-index: 100~200
- 항목 호버: --color-surface-hover 또는 #FFF8F0 (AI)
```

## 아이콘 & 이모지 사용 규칙

- **UI 아이콘**: 이모지로 대체 (별도 아이콘 라이브러리 미사용)
- **카테고리**: 각 카테고리에 이모지 배정 (categories.js)
- **SEO 체크**: 통과 ✅ / 미통과 ⬜ (체크리스트)
- **버튼 아이콘**: 텍스트 앞 이모지 (📸, 🎬, 📊 등)
- **정보카드**: 맛집 📍, 제품 🏷️

## 반응형 브레이크포인트

현재 주요 반응형 처리:

| 요소 | 방식 |
|------|------|
| 위자드 그리드 | `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))` |
| 메트릭 카드 | `grid-template-columns: repeat(3, 1fr)` |
| 통계 대시보드 | `grid-template-columns: 1fr 1fr` |
| 제목 입력 | `font-size: clamp(2rem, 5vw, 2.5rem)` |
| 히스토리 | max-width 900px, 패딩 20px |
| 에디터 | MainContainer + AnalysisSidebar (사이드바 토글) |

## 애니메이션 & 트랜지션

### 공통 트랜지션
| 속성 | 값 | 사용처 |
|------|------|--------|
| 기본 | `all 0.2s ease` | 버튼, 카드 호버 |
| 빠른 | `all 0.1s` | 툴바 버튼 |
| 배경 | `background 0.15s` | 드롭다운 항목 |
| 크기 | `width 0.4s ease` | 바 차트 |
| 불투명 | `opacity 0.2s` | 버튼 hover, 위치 안내 |

### 키프레임 애니메이션
| 이름 | 효과 | 사용처 |
|------|------|--------|
| `fadeIn` | opacity 0→1, translateY 5px→0, 0.4s | 위자드 스텝 전환 |
| `ai-spin` | rotate 0→360deg, 0.6s linear infinite | AI 로딩 스피너 |
| `readability-flash` | 노란 배경 + 그림자 → 투명, 2.5s | 가독성 위치 하이라이트 |

## AI 전용 UI 패턴

### AI 로딩 스피너
```css
.ai-spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: ai-spin 0.6s linear infinite;
}
```

### 네이버 검색 미리보기 (IntroOptimizer)
```
┌─────────────────────────────────────┐
│ 제목 (파랑 #1A0DAB, 1.05rem, 700)    │
│ blog.naver.com (초록 #009A61)        │
│ 도입부 텍스트 미리보기 (2줄 clamp)     │
└─────────────────────────────────────┘
```

### AI 재작성 드롭다운 (BubbleMenu)
```
┌───────────────────┐
│ ✏️ 확장     (expand)   │
│ 📝 압축     (condense) │
│ 🔍 팩트보강 (factboost)│
│ ✨ 다듬기   (polish)   │
└───────────────────┘
```

### CTA 드롭다운
```
┌──────────────────────────────┐
│ 🎯 CTA 블록 삽입 ▾            │
├──────────────────────────────┤
│ 📌 구독 유도                   │
│    "이 글이 도움이 되셨다면..." │
│ 💬 댓글 유도                   │
│    "여러분의 경험도 공유해..."  │
│ 🔗 관련글 유도                 │
│    "함께 읽으면 좋은 글..."     │
└──────────────────────────────┘
```

### 결과 카드 (경쟁 분석)
```
평균값 표시 → 개별 블로그 5개 리스트
각 항목: 제목, 글자수, 이미지수, 소제목수
```
