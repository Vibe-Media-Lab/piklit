# 코드 품질 감사 보고서 (subtask-3-1)

## 1. Console 문 잔존 — 총 55개

### console.log (21개) — 디버깅용, 프로덕션 제거 필요
| 파일 | 라인 | 내용 |
|------|------|------|
| `openai.js` | 20, 40, 43 | 토큰 집계 로깅 |
| `openai.js` | 77 | JSON 파싱 성공 로깅 |
| `openai.js` | 233, 309, 346 | 키워드/시즌/경쟁 분석 로깅 |
| `openai.js` | 407 | fallback 재파싱 로깅 |
| `openai.js` | 1380 | 이미지 생성 완료 로깅 |
| `openai.js` | 1582-1585 | 누적 토큰 합계 출력 |
| `EditorPage.jsx` | 213, 222, 257, 260 | 키워드 분석 디버깅 |
| `EditorPage.jsx` | 461, 672, 708, 735 | AI 생성/이미지 ALT 로깅 |

### console.error (16개) — 에러 핸들링용, 패턴 불일관
| 파일 | 라인 | 비고 |
|------|------|------|
| `openai.js` | 129, 171, 1399 | AI 응답/에러 |
| `EditorPage.jsx` | 263, 351, 392, 468, 750, 807 | 각종 분석 오류 |
| `AuthContext.jsx` | 88, 97, 106, 115 | 로그인/로그아웃 |
| `ErrorBoundary.jsx` | 14 | 적절 |
| `PhotoUploader.jsx` | 235 | 이미지 처리 |
| `LandingPage.jsx` | 1017 | 로그인 실패 |

### console.warn (8개) — 경고용
| 파일 | 라인 |
|------|------|
| `openai.js` | 145, 411, 823, 899 |
| `EditorPage.jsx` | 388, 464, 711 |
| `fontLoader.js` | 31 |

**권장**: `console.log` 전량 제거 또는 `if (import.meta.env.DEV)` 가드 적용. `console.error/warn`은 에러 리포팅 서비스로 교체 검토.

---

## 2. 파일 크기 이슈 — 1000줄+ 파일 3개

| 파일 | 줄 수 | 문제점 | 분리 제안 |
|------|-------|--------|-----------|
| `EditorPage.jsx` | 1,829 | 위자드 4단계 + 에디터 + AI 호출 12개 함수 통합 | 위자드 스텝을 개별 컴포넌트로, AI 호출 함수를 커스텀 훅(`useAIGeneration`)으로 분리 |
| `openai.js` | 1,589 | AI 메서드 17개+ 단일 파일 | 도메인별 모듈 분리 (`keyword-service.js`, `content-service.js`, `image-service.js`) |
| `LandingPage.jsx` | 1,053 | 랜딩 페이지 전체 단일 컴포넌트 | 섹션별 컴포넌트 분리 (`HeroSection`, `FeatureSection`, `PricingSection`) |

---

## 3. 에러 핸들링 패턴 불일관

### 패턴 A: `console.error` + 사용자 알림 (양호)
```
catch (e) { console.error('오류:', e); setError('...사용자 메시지...'); }
```
사용처: `EditorPage.jsx` 대부분의 catch 블록

### 패턴 B: `console.error`만 (불량 — 사용자에게 피드백 없음)
- `PhotoUploader.jsx:235` — 이미지 처리 실패 시 무반응
- `LandingPage.jsx:1017` — 로그인 실패 시 무반응
- `PostListPage.jsx:29` — `.catch(err => console.error(...))`
- `SettingsModal.jsx:21` — 동일 패턴

### 패턴 C: `console.warn` + 폴백 (양호)
```
catch (e) { console.warn('실패, 기본값 사용:', e.message); return defaultValue; }
```
사용처: `openai.js:823, 899` — 업장/제품 정보 검색

### 패턴 D: 빈 catch (위험)
- `openai.js:61, 66` — `catch (e) { /* 계속 */ }` — `_tryParseJson` 내부, 의도적이나 문서화 부족

**권장**: 패턴 A를 표준으로 통일. 패턴 B는 사용자 피드백(Toast) 추가.

---

## 4. ErrorBoundary 범위 — 단일 최상위만 적용

- `App.jsx:53-55` — `<ErrorBoundary>`가 전체 앱을 감싸는 단일 인스턴스
- 개별 페이지/패널에 적용 없음 → 하위 컴포넌트 에러 시 전체 앱 크래시 UI 표시

**권장**: 에디터, 분석 패널, 이미지 업로더 등 독립 기능별 ErrorBoundary 추가.

---

## 5. PropTypes / JSDoc 부재

- **PropTypes**: 사용 파일 0개 (전체 컴포넌트에서 미사용)
- **JSDoc**: `utils/` 일부에만 존재 (11개 파일, 50개 블록). 컴포넌트 props 문서화 전무
- 주요 컴포넌트(`EditorPage`, `TiptapEditor`, `PhotoUploader`)의 props 정의 없음

**권장**: 최소한 공용 컴포넌트에 JSDoc `@param` 추가. TypeScript 마이그레이션 시 자동 해결.

---

## 요약 매트릭스

| 카테고리 | 심각도 | 항목 수 | 우선순위 |
|----------|--------|---------|----------|
| console.log 잔존 | 중 | 21개 | P2 — 프로덕션 배포 전 제거 |
| 에러 핸들링 불일관 | 높음 | 4개 파일 | P1 — 사용자 경험 직결 |
| 파일 크기 초과 | 중 | 3개 파일 | P2 — 유지보수성 |
| ErrorBoundary 범위 | 중 | 1개소 | P2 — 부분 크래시 방지 |
| PropTypes 부재 | 낮음 | 전체 | P3 — TS 마이그레이션 시 해결 |
