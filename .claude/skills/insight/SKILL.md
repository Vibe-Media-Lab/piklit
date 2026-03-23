# /insight — 세션 인사이트 보고

프로젝트 작업 통계와 패턴을 분석하여 한국어로 보고한다.

## 실행 순서

### 1. 데이터 수집 (병렬 실행)

**A. Claude Code 로컬 로그** (정확한 수치):
```bash
# 메시지 수, 세션 수, 기간, 프로젝트별 분포, 시간대별 패턴
cat ~/.claude/history.jsonl | python3 -c "
import json, sys
from collections import Counter
from datetime import datetime

sessions = set()
projects = Counter()
hours = Counter()
dates = []

for line in sys.stdin:
    d = json.loads(line)
    sessions.add(d.get('sessionId',''))
    proj = d.get('project','')
    # 프로젝트 경로에서 마지막 폴더명만 추출
    projects[proj.split('/')[-1] or proj] += 1
    ts = d.get('timestamp', 0)
    if ts:
        dt = datetime.fromtimestamp(ts/1000)
        hours[f'{dt.hour:02d}시'] += 1
        dates.append(dt)

dates.sort()
first = dates[0] if dates else None
last = dates[-1] if dates else None
days = (last - first).days + 1 if first and last else 0

print(f'기간: {first.strftime(\"%Y-%m-%d\")} ~ {last.strftime(\"%Y-%m-%d\")} ({days}일)')
print(f'총 메시지: {sum(projects.values())}')
print(f'총 세션: {len(sessions)}')
print(f'하루 평균: {sum(projects.values()) / max(days,1):.0f} 메시지')
print()
print('프로젝트별:')
for p, c in projects.most_common():
    print(f'  {p}: {c}')
print()
print('시간대별 TOP 3:')
for h, c in hours.most_common(3):
    print(f'  {h}: {c}')
"
```

**B. Git 이력** (정확한 수치):
```bash
# 지정 기간 커밋 통계 (기본: 전체)
git log --oneline --shortstat | python3 -c "
import sys, re
commits = 0
insertions = 0
deletions = 0
files = 0
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    stat = re.search(r'(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?', line)
    if stat:
        files += int(stat.group(1))
        insertions += int(stat.group(2) or 0)
        deletions += int(stat.group(3) or 0)
    elif line and not line.startswith(' '):
        commits += 1
print(f'커밋: {commits}')
print(f'파일 변경: {files}')
print(f'+{insertions} / -{deletions} 라인')
"

# 이번 세션 커밋 (오늘)
git log --oneline --since="today" --stat

# 소스 파일 수
find src/ -name "*.jsx" -o -name "*.js" -o -name "*.css" | wc -l
```

**C. 세션별 파일 수정 이력**:
```bash
# file-history에서 세션별 수정 파일 수 집계
for dir in ~/.claude/file-history/*/; do
    count=$(ls -1 "$dir" 2>/dev/null | wc -l | tr -d ' ')
    session=$(basename "$dir")
    echo "$count files — $session"
done | sort -rn
```

### 2. 분석

수집된 데이터를 기반으로:
- 주요 작업 영역: git log 커밋 메시지에서 키워드 분류 (fix, feat, docs, refactor 등)
- 잘하고 있는 점: 작업 패턴에서 긍정적 습관 식별
- 개선 필요 사항: 반복 패턴, 비효율 식별
- 시간대별 활동 패턴

### 3. 아래 형식으로 출력

```
기간: {시작일} ~ {오늘} ({N}일)

📊 전체 통계
- {메시지 수} 메시지 / {세션 수} 세션
- {커밋 수} 커밋 / +{추가} -{삭제} 라인
- {수정 파일 수} 파일 수정
- 하루 평균 {N} 메시지
- 소스 파일: {N}개

🎯 주요 작업 영역
1. {영역 1} ({커밋 수})
2. {영역 2} ({커밋 수})
3. {영역 3} ({커밋 수})

📁 프로젝트별 분포
- {프로젝트 1}: {메시지 수} ({비율}%)
- {프로젝트 2}: {메시지 수} ({비율}%)

✅ 잘하고 있는 점
- {패턴 1}
- {패턴 2}

⚠️ 개선 필요 사항
1. {이슈 1}
2. {이슈 2}

💡 추천 액션
1. {제안 1}
2. {제안 2}

🧠 미래 워크플로우 제안
- {제안 1}
- {제안 2}

📈 사용 패턴
- 가장 활발한 시간대: {시간대} ({메시지 수})
- 주요 커밋 유형: {fix/feat/docs 비율}
- 세션 특징: {특이사항}
```

## 데이터 소스 정리

| 데이터 | 소스 | 정확도 |
|--------|------|--------|
| 메시지 수 | `~/.claude/history.jsonl` | 정확 |
| 세션 수 | history.jsonl sessionId | 정확 |
| 기간/시간대 | history.jsonl timestamp | 정확 |
| 프로젝트 분포 | history.jsonl project | 정확 |
| 커밋/라인 변경 | `git log --shortstat` | 정확 |
| 수정 파일 수 | `git log --stat` + file-history | 정확 |
| 도구 사용 횟수 | 서버 로그 전용 | 수집 불가 — 생략 |
| 응답 시간 | 서버 로그 전용 | 수집 불가 — 생략 |

## 주의사항
- 모든 수치는 실제 로컬 로그·git 이력 기반 (추측 금지)
- 수집 불가능한 수치(도구 사용 횟수, 응답 시간)는 섹션 자체를 생략
- 간결하게 — 각 섹션 3항목 이내
- history.jsonl은 현재 기기 기준 (다른 기기 세션은 미포함)
